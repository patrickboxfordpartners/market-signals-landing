#!/usr/bin/env npx tsx
/**
 * Street Insights Stripe Setup Script
 *
 * Creates products, prices, and webhook in Stripe.
 * Run once per environment: npx tsx scripts/stripe-setup.ts
 *
 * Outputs env vars to add to your .env file.
 */

import Stripe from 'stripe';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const WEBHOOK_URL = process.env.WEBHOOK_URL || 'https://getstreetinsights.com/api/webhooks/stripe';

if (!STRIPE_SECRET_KEY) {
  console.error('Error: STRIPE_SECRET_KEY environment variable is required');
  console.error('Usage: STRIPE_SECRET_KEY=sk_live_xxx npx tsx scripts/stripe-setup.ts');
  process.exit(1);
}

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia',
});

async function main() {
  console.log('Setting up Stripe for Street Insights...\n');

  // Create products
  console.log('Creating products...');

  const proProduct = await stripe.products.create({
    name: 'Street Insights Pro',
    description: 'ML price predictions, technical indicators, 100 tickers, 50 alerts/month',
    metadata: {
      app: 'street-insights',
      tier: 'pro',
    },
  });
  console.log(`  Created product: ${proProduct.name} (${proProduct.id})`);

  const enterpriseProduct = await stripe.products.create({
    name: 'Street Insights Enterprise',
    description: 'Unlimited tickers, unlimited alerts, API access, priority support',
    metadata: {
      app: 'street-insights',
      tier: 'enterprise',
    },
  });
  console.log(`  Created product: ${enterpriseProduct.name} (${enterpriseProduct.id})`);

  // Create prices
  console.log('\nCreating prices...');

  const proMonthly = await stripe.prices.create({
    product: proProduct.id,
    unit_amount: 4900, // $49.00
    currency: 'usd',
    recurring: { interval: 'month' },
    metadata: {
      app: 'street-insights',
      plan: 'pro',
      billing: 'monthly',
    },
  });
  console.log(`  Pro Monthly: $49/mo (${proMonthly.id})`);

  const proYearly = await stripe.prices.create({
    product: proProduct.id,
    unit_amount: 47000, // $470.00 (2 months free)
    currency: 'usd',
    recurring: { interval: 'year' },
    metadata: {
      app: 'street-insights',
      plan: 'pro',
      billing: 'yearly',
    },
  });
  console.log(`  Pro Yearly: $470/yr (${proYearly.id})`);

  const enterpriseMonthly = await stripe.prices.create({
    product: enterpriseProduct.id,
    unit_amount: 19900, // $199.00
    currency: 'usd',
    recurring: { interval: 'month' },
    metadata: {
      app: 'street-insights',
      plan: 'enterprise',
      billing: 'monthly',
    },
  });
  console.log(`  Enterprise Monthly: $199/mo (${enterpriseMonthly.id})`);

  const enterpriseYearly = await stripe.prices.create({
    product: enterpriseProduct.id,
    unit_amount: 190000, // $1900.00 (2 months free)
    currency: 'usd',
    recurring: { interval: 'year' },
    metadata: {
      app: 'street-insights',
      plan: 'enterprise',
      billing: 'yearly',
    },
  });
  console.log(`  Enterprise Yearly: $1900/yr (${enterpriseYearly.id})`);

  // Create webhook endpoint
  console.log('\nCreating webhook endpoint...');

  const webhook = await stripe.webhookEndpoints.create({
    url: WEBHOOK_URL,
    enabled_events: [
      'checkout.session.completed',
      'customer.subscription.created',
      'customer.subscription.updated',
      'customer.subscription.deleted',
      'invoice.payment_failed',
      'invoice.payment_succeeded',
    ],
    metadata: {
      app: 'street-insights',
    },
  });
  console.log(`  Webhook: ${webhook.url} (${webhook.id})`);

  // Output env vars
  console.log('\n' + '='.repeat(60));
  console.log('Add these to your .env file:');
  console.log('='.repeat(60) + '\n');

  console.log(`# Stripe Products`);
  console.log(`STRIPE_PRODUCT_PRO=${proProduct.id}`);
  console.log(`STRIPE_PRODUCT_ENTERPRISE=${enterpriseProduct.id}`);
  console.log('');
  console.log(`# Stripe Prices`);
  console.log(`STRIPE_PRICE_PRO_MONTHLY=${proMonthly.id}`);
  console.log(`STRIPE_PRICE_PRO_YEARLY=${proYearly.id}`);
  console.log(`STRIPE_PRICE_ENTERPRISE_MONTHLY=${enterpriseMonthly.id}`);
  console.log(`STRIPE_PRICE_ENTERPRISE_YEARLY=${enterpriseYearly.id}`);
  console.log('');
  console.log(`# Stripe Webhook`);
  console.log(`STRIPE_WEBHOOK_SECRET=${webhook.secret}`);
  console.log('\n' + '='.repeat(60));

  console.log('\nDone! Update your checkout.ts with the price IDs above.');
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
