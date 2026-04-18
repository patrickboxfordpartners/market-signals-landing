import type { APIRoute } from 'astro';
import Stripe from 'stripe';

const stripe = new Stripe(import.meta.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia',
});

const PRICE_IDS: Record<string, string> = {
  pro_monthly: import.meta.env.STRIPE_PRICE_PRO_MONTHLY,
  pro_yearly: import.meta.env.STRIPE_PRICE_PRO_YEARLY,
  enterprise_monthly: import.meta.env.STRIPE_PRICE_ENTERPRISE_MONTHLY,
  enterprise_yearly: import.meta.env.STRIPE_PRICE_ENTERPRISE_YEARLY,
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const { priceKey, email, userId } = await request.json();

    if (!priceKey || !email) {
      return new Response(JSON.stringify({ error: 'Price and email are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const priceId = PRICE_IDS[priceKey as keyof typeof PRICE_IDS];
    if (!priceId) {
      return new Response(JSON.stringify({ error: 'Invalid price' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const session = await stripe.checkout.sessions.create({
      customer_email: email,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${import.meta.env.PUBLIC_APP_URL}/sign-up?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${import.meta.env.PUBLIC_LANDING_URL}/pricing?checkout=cancelled`,
      metadata: {
        user_id: userId || '',
        plan: priceKey.replace('_monthly', '').replace('_yearly', ''),
      },
      subscription_data: {
        metadata: {
          user_id: userId || '',
        },
      },
    });

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    console.error('Checkout error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
