// SERVER-SIDE ONLY - Never expose to frontend
export const serverConfig = {
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY,
    webhookKey: process.env.STRIPE_WEBHOOK_KEY,
  },
  email: {
    emailjsServiceId: process.env.EMAILJS_SERVICE_ID,
    emailjsTemplateId: process.env.EMAILJS_TEMPLATE_ID,
    emailjsPublicKey: process.env.EMAILJS_PUBLIC_KEY,
    resendApiKey: process.env.RESEND_API_KEY,
  },
  sentry: {
    dsn: process.env.SENTRY_DSN,
  },
  supabase: {
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  },
};
