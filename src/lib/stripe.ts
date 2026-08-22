import Stripe from 'stripe'

const key = process.env.STRIPE_SECRET_KEY

export const stripe = key
  ? new Stripe(key, { apiVersion: '2026-02-25.clover', typescript: true })
  : null

export function requireStripe() {
  if (!stripe) throw new Error('Billing is not configured. Please contact the MealHisab administrator.')
  return stripe
}

export function requireManagerPriceId() {
  const priceId = process.env.STRIPE_MANAGER_PRICE_ID
  if (!priceId) throw new Error('Manager Plan pricing is not configured.')
  return priceId
}
