type SslcommerzPaymentInput = {
  userId: string
  paymentId: string
  amount: number
  customerName: string
  customerEmail?: string
  customerPhone?: string
}

type SslcommerzResponse = {
  status?: string
  failedreason?: string
  sessionkey?: string
  GatewayPageURL?: string
  redirectGatewayURL?: string
}

function env(name: string) {
  const value = process.env[name]
  if (!value) throw new Error(`${name} is not configured.`)
  return value
}

export async function createSslcommerzPayment(input: SslcommerzPaymentInput) {
  const storeId = env('SSLCOMMERZ_STORE_ID')
  const storePassword = env('SSLCOMMERZ_STORE_PASSWORD')
  const appUrl = env('NEXT_PUBLIC_APP_URL')
  const sandbox = process.env.SSLCOMMERZ_SANDBOX === 'true'
  const endpoint = sandbox
    ? 'https://sandbox.sslcommerz.com/gwprocess/v4/api.php'
    : 'https://securepay.sslcommerz.com/gwprocess/v4/api.php'

  const form = new URLSearchParams({
    store_id: storeId,
    store_passwd: storePassword,
    total_amount: input.amount.toFixed(2),
    currency: 'BDT',
    tran_id: input.paymentId,
    product_category: 'SaaS subscription',
    product_name: 'MealHisab Manager Plan',
    product_profile: 'general',
    success_url: `${appUrl}/api/payments/sslcommerz/success`,
    fail_url: `${appUrl}/api/payments/sslcommerz/fail`,
    cancel_url: `${appUrl}/api/payments/sslcommerz/cancel`,
    ipn_url: `${appUrl}/api/payments/sslcommerz/ipn`,
    cus_name: input.customerName,
    cus_email: input.customerEmail || 'manager@mealhisab.app',
    cus_phone: input.customerPhone || '01700000000',
    cus_add1: 'Bangladesh',
    cus_city: 'Dhaka',
    cus_country: 'Bangladesh',
    value_a: input.userId,
    value_b: input.paymentId,
    emi_option: '0',
  })

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
    cache: 'no-store',
  })

  if (!response.ok) throw new Error('Payment gateway is unavailable. Please try again.')
  const data = await response.json() as SslcommerzResponse
  if (data.status !== 'SUCCESS' || !data.redirectGatewayURL) {
    throw new Error(data.failedreason || 'Could not start the payment.')
  }
  return data
}

export async function validateSslcommerzTransaction(valId: string) {
  const storeId = env('SSLCOMMERZ_STORE_ID')
  const storePassword = env('SSLCOMMERZ_STORE_PASSWORD')
  const sandbox = process.env.SSLCOMMERZ_SANDBOX === 'true'
  const endpoint = sandbox
    ? 'https://sandbox.sslcommerz.com/validator/api/validationserverAPI.php'
    : 'https://securepay.sslcommerz.com/validator/api/validationserverAPI.php'

  const url = new URL(endpoint)
  url.searchParams.set('val_id', valId)
  url.searchParams.set('store_id', storeId)
  url.searchParams.set('store_passwd', storePassword)
  url.searchParams.set('format', 'json')

  const response = await fetch(url, { cache: 'no-store' })
  if (!response.ok) throw new Error('Payment validation failed.')
  return await response.json() as {
    status?: string
    tran_id?: string
    amount?: string | number
    currency?: string
    val_id?: string
    bank_tran_id?: string
    card_type?: string
    risk_level?: string
    risk_title?: string
  }
}
