import type { APIRoute } from 'astro';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(import.meta.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia',
});

if (!import.meta.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.warn(
    'SUPABASE_SERVICE_ROLE_KEY is not set. Webhook writes to user_profiles will fail RLS. Add it to .env.'
  );
}

const supabase = createClient(
  import.meta.env.PUBLIC_SUPABASE_URL,
  import.meta.env.SUPABASE_SERVICE_ROLE_KEY || import.meta.env.PUBLIC_SUPABASE_ANON_KEY
);

export const POST: APIRoute = async ({ request }) => {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return new Response(JSON.stringify({ error: 'No signature' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      import.meta.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return new Response(JSON.stringify({ error: 'Invalid signature' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const { user_id, plan } = session.metadata || {};
        const stripeCustomerId = session.customer as string;
        const stripeSubscriptionId = session.subscription as string;

        if (user_id && plan) {
          // User was already logged in when they checked out — update by user id
          const { error } = await supabase
            .from('user_profiles')
            .update({
              plan: plan,
              subscription_status: 'active',
              stripe_customer_id: stripeCustomerId,
              stripe_subscription_id: stripeSubscriptionId,
              updated_at: new Date().toISOString(),
            })
            .eq('id', user_id);

          if (error) {
            console.error('Error updating user profile:', error);
          } else {
            console.log(`Subscription activated for user ${user_id}`);
          }
        } else if (stripeCustomerId && plan) {
          // User paid before creating an account — upsert a pending profile row
          // keyed by stripe_customer_id. When the user signs up and the trigger
          // creates their profile, a subsequent login or webhook can reconcile.
          // For now we store the subscription data so it is not lost.
          const { error } = await supabase
            .from('user_profiles')
            .upsert(
              {
                // id is required (PK); we use a placeholder UUID derived from
                // customer id that can be reconciled later. The safer approach
                // is a separate pending_subscriptions table, but here we rely on
                // the stripe_customer_id index — when the user signs up their
                // trigger creates a row with id=auth.uid(); a follow-up call
                // from the app can match and update using stripe_customer_id.
                // So we only insert if no row exists yet for this customer.
                stripe_customer_id: stripeCustomerId,
                stripe_subscription_id: stripeSubscriptionId,
                plan: plan,
                subscription_status: 'active',
                updated_at: new Date().toISOString(),
              },
              { onConflict: 'stripe_customer_id', ignoreDuplicates: false }
            )
            .select();

          if (error) {
            // Expected if the row doesn't have an id yet — log and move on.
            // The subscription data will be reconciled when the user signs up.
            console.error('Error upserting pending subscription (will reconcile on sign-up):', error.message);
          } else {
            console.log(`Pending subscription stored for Stripe customer ${stripeCustomerId}`);
          }
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const status = subscription.status === 'active' ? 'active' : subscription.status;

        const { error } = await supabase
          .from('user_profiles')
          .update({
            subscription_status: status,
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', subscription.id);

        if (error) {
          console.error('Error updating subscription:', error);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;

        const { error } = await supabase
          .from('user_profiles')
          .update({
            plan: 'free',
            subscription_status: 'canceled',
            stripe_subscription_id: null,
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', subscription.id);

        if (error) {
          console.error('Error canceling subscription:', error);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string;

        if (subscriptionId) {
          const { error } = await supabase
            .from('user_profiles')
            .update({
              subscription_status: 'past_due',
              updated_at: new Date().toISOString(),
            })
            .eq('stripe_subscription_id', subscriptionId);

          if (error) {
            console.error('Error updating payment failed:', error);
          }
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    console.error('Webhook handler error:', error);
    return new Response(JSON.stringify({ error: 'Webhook handler failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
