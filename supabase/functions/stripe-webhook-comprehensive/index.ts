import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.21.0'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
})

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.text()
    const signature = req.headers.get('stripe-signature')
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')

    if (!signature || !webhookSecret) {
      return new Response('Missing signature or webhook secret', { status: 400 })
    }

    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    console.log('Webhook event received:', event.type)

    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
        break
      
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionChange(event.data.object as Stripe.Subscription)
        break
      
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break
      
      case 'invoice.payment_succeeded':
      case 'invoice.payment_failed':
        await handleInvoicePayment(event.data.object as Stripe.Invoice)
        break
      
      case 'customer.created':
      case 'customer.updated':
        await handleCustomerChange(event.data.object as Stripe.Customer)
        break
    }

    return new Response('Webhook processed successfully', { 
      status: 200, 
      headers: corsHeaders 
    })
  } catch (error) {
    console.error('Webhook error:', error)
    return new Response(`Webhook error: ${error.message}`, { 
      status: 400, 
      headers: corsHeaders 
    })
  }
})

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId
  if (!userId) return

  // Get subscription details from Stripe
  const subscription = await stripe.subscriptions.retrieve(session.subscription as string)
  const customer = await stripe.customers.retrieve(session.customer as string) as Stripe.Customer
  
  await upsertSubscription(userId, subscription, customer)
}

async function handleSubscriptionChange(subscription: Stripe.Subscription) {
  // Find user by customer ID
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('stripe_customer_id', subscription.customer)
    .single()
  
  if (profile) {
    const customer = await stripe.customers.retrieve(subscription.customer as string) as Stripe.Customer
    await upsertSubscription(profile.id, subscription, customer)
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  await supabase
    .from('subscriptions')
    .update({ 
      status: 'canceled',
      cancel_at_period_end: true,
      updated_at: new Date().toISOString()
    })
    .eq('stripe_subscription_id', subscription.id)
}

async function handleInvoicePayment(invoice: Stripe.Invoice) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('stripe_customer_id', invoice.customer)
    .single()
  
  if (profile) {
    // Record payment history
    await supabase
      .from('payment_history')
      .insert({
        user_id: profile.id,
        stripe_payment_intent_id: invoice.payment_intent as string,
        amount: invoice.amount_paid,
        currency: invoice.currency,
        status: invoice.status,
        invoice_id: invoice.id,
        payment_method: invoice.default_payment_method as string,
        metadata: {
          invoice_number: invoice.number,
          period_start: invoice.period_start,
          period_end: invoice.period_end
        }
      })
    
    // Update last payment date
    if (invoice.status === 'paid') {
      await supabase
        .from('profiles')
        .update({ last_payment_date: new Date().toISOString() })
        .eq('id', profile.id)
    }
  }
}

async function handleCustomerChange(customer: Stripe.Customer) {
  await supabase
    .from('profiles')
    .update({ 
      email: customer.email,
      updated_at: new Date().toISOString()
    })
    .eq('stripe_customer_id', customer.id)
}

async function upsertSubscription(userId: string, subscription: Stripe.Subscription, customer: Stripe.Customer) {
  const priceId = subscription.items.data[0].price.id
  const price = await stripe.prices.retrieve(priceId)
  const product = await stripe.products.retrieve(price.product as string)
  
  // Upsert subscription
  await supabase
    .from('subscriptions')
    .upsert({
      user_id: userId,
      stripe_customer_id: customer.id,
      stripe_subscription_id: subscription.id,
      stripe_price_id: priceId,
      plan_name: product.name,
      subscription_price: price.unit_amount,
      status: subscription.status,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      cancel_at_period_end: subscription.cancel_at_period_end,
      trial_start: subscription.trial_start ? new Date(subscription.trial_start * 1000).toISOString() : null,
      trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
      metadata: subscription.metadata,
      updated_at: new Date().toISOString()
    })
}