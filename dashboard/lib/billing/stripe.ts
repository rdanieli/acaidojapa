/**
 * Stripe helpers for the dashboard.
 *
 * The dashboard isn't the primary Stripe consumer (the japa-site landing
 * is — it owns Checkout creation and webhook handling). What the dashboard
 * does need is:
 *   - Customer Portal session creation, so authenticated tenants can
 *     update card / cancel subscription / view invoices in Stripe-hosted UI.
 *   - Reading subscription status for the /api/billing/status endpoint
 *     (so Configurações shows the right plan + renewal date).
 */
import 'server-only';
import Stripe from 'stripe';

let cached: Stripe | null = null;

export function getStripe(): Stripe {
  if (cached) return cached;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error('STRIPE_SECRET_KEY not configured');
  }
  cached = new Stripe(key, {
    apiVersion: '2025-02-24.acacia',
  });
  return cached;
}
