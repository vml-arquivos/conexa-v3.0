import Stripe from 'stripe';

// Inicializar Stripe com chave secreta
// Em produção, use process.env.STRIPE_SECRET_KEY
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_...', {
  apiVersion: '2026-01-28.clover',
});

/**
 * Criar sessão de checkout para doação com cartão
 */
export async function createCheckoutSession(params: {
  amount: number; // em centavos (R$ 10,00 = 1000)
  frequency: 'once' | 'monthly';
  donorEmail?: string;
  donorName?: string;
  destination?: string;
  message?: string;
  isAnonymous?: boolean;
  successUrl: string;
  cancelUrl: string;
}) {
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: params.frequency === 'monthly' ? 'subscription' : 'payment',
    line_items: [
      {
        price_data: {
          currency: 'brl',
          product_data: {
            name: `Doação para COCRIS${params.destination ? ` - ${params.destination}` : ''}`,
            description: params.message || 'Apoie a educação infantil de qualidade',
          },
          unit_amount: params.amount,
          ...(params.frequency === 'monthly' && {
            recurring: {
              interval: 'month',
            },
          }),
        },
        quantity: 1,
      },
    ],
    customer_email: params.donorEmail,
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    metadata: {
      donorName: params.donorName || '',
      destination: params.destination || 'geral',
      message: params.message || '',
      isAnonymous: params.isAnonymous ? 'true' : 'false',
      frequency: params.frequency,
    },
  });

  return {
    sessionId: session.id,
    url: session.url,
  };
}

/**
 * Criar pagamento PIX (requer Stripe com PIX habilitado)
 */
export async function createPixPayment(params: {
  amount: number;
  donorEmail?: string;
  donorName?: string;
  destination?: string;
  message?: string;
}) {
  const paymentIntent = await stripe.paymentIntents.create({
    amount: params.amount,
    currency: 'brl',
    payment_method_types: ['pix'],
    metadata: {
      donorName: params.donorName || '',
      donorEmail: params.donorEmail || '',
      destination: params.destination || 'geral',
      message: params.message || '',
    },
  });

  return {
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id,
  };
}

/**
 * Verificar status de pagamento
 */
export async function getPaymentStatus(paymentIntentId: string) {
  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
  
  return {
    status: paymentIntent.status,
    amount: paymentIntent.amount,
    currency: paymentIntent.currency,
    metadata: paymentIntent.metadata,
  };
}

/**
 * Processar webhook do Stripe
 */
export async function handleStripeWebhook(
  payload: string | Buffer,
  signature: string
): Promise<{ type: string; data: any }> {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';
  
  const event = stripe.webhooks.constructEvent(
    payload,
    signature,
    webhookSecret
  );

  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object as Stripe.Checkout.Session;
      return {
        type: 'payment_success',
        data: {
          sessionId: session.id,
          amount: session.amount_total,
          customerEmail: session.customer_email,
          metadata: session.metadata,
        },
      };

    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      return {
        type: 'payment_success',
        data: {
          paymentIntentId: paymentIntent.id,
          amount: paymentIntent.amount,
          metadata: paymentIntent.metadata,
        },
      };

    case 'payment_intent.payment_failed':
      const failedPayment = event.data.object as Stripe.PaymentIntent;
      return {
        type: 'payment_failed',
        data: {
          paymentIntentId: failedPayment.id,
          error: failedPayment.last_payment_error,
        },
      };

    default:
      return {
        type: event.type,
        data: event.data.object,
      };
  }
}

/**
 * Criar portal do cliente para gerenciar assinaturas
 */
export async function createCustomerPortalSession(customerId: string, returnUrl: string) {
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });

  return {
    url: session.url,
  };
}

export { stripe };
