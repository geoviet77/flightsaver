import Stripe from 'stripe';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY || 'sk_test_mock_flightsaver_key_placeholder';

export const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2025-02-24.acacia' as any, // Pinned Stripe API version
  typescript: true,
  appInfo: {
    name: 'FlightSaver AI Travel',
    version: '1.2.0',
    url: 'https://flightsaver.io',
  },
});

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY && !process.env.STRIPE_SECRET_KEY.includes('mock'));
}
