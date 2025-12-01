// Secure Environment configuration - FRONTEND SAFE
const APP_URL =
  import.meta.env.VITE_APP_URL ||
  (import.meta.env.PROD
    ? "https://review-spark-gather.vercel.app"
    : "http://localhost:8080");

// Derive Supabase Functions base URL from Supabase URL (always public)
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
const SUPABASE_FUNCTIONS_URL = SUPABASE_URL
  ? SUPABASE_URL.replace(".supabase.co", ".functions.supabase.co")
  : "https://uiszftfrxbqjqdgybbmk.functions.supabase.co"; // fallback to current project

// Ensure emails use a public-facing app URL even in development
const PUBLIC_APP_URL =
  import.meta.env.VITE_PUBLIC_APP_URL ||
  (APP_URL.includes("localhost")
    ? "https://review-spark-gather.vercel.app"
    : APP_URL);

export const config = {
  // Supabase - Public keys only
  supabase: {
    url: import.meta.env.VITE_SUPABASE_URL,
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
    functionsUrl: SUPABASE_FUNCTIONS_URL,
  },

  // Application
  app: {
    name: import.meta.env.VITE_APP_NAME || "SyncReviews",
    url: APP_URL,
    publicUrl: PUBLIC_APP_URL,
    environment: import.meta.env.VITE_APP_ENVIRONMENT || "development",
  },

  // Stripe Configuration - PUBLIC KEYS ONLY
  stripe: {
    mode: import.meta.env.VITE_STRIPE_MODE || "test",
    publishableKey:
      import.meta.env.VITE_STRIPE_MODE === "live"
        ? import.meta.env.VITE_STRIPE_LIVE_PUBLISHABLE_KEY
        : import.meta.env.VITE_STRIPE_TEST_PUBLISHABLE_KEY,
    // REMOVED: secretKey, webhookKey - moved to server-side
    priceIds: {
      starter:
        import.meta.env.VITE_STRIPE_MODE === "live"
          ? import.meta.env.VITE_STRIPE_LIVE_STARTER_PRICE_ID
          : import.meta.env.VITE_STRIPE_TEST_STARTER_PRICE_ID,
      professional:
        import.meta.env.VITE_STRIPE_MODE === "live"
          ? import.meta.env.VITE_STRIPE_LIVE_PROFESSIONAL_PRICE_ID
          : import.meta.env.VITE_STRIPE_TEST_PROFESSIONAL_PRICE_ID,
      enterprise:
        import.meta.env.VITE_STRIPE_MODE === "live"
          ? import.meta.env.VITE_STRIPE_LIVE_ENTERPRISE_PRICE_ID
          : import.meta.env.VITE_STRIPE_TEST_ENTERPRISE_PRICE_ID,
    },
    isTestMode: import.meta.env.VITE_STRIPE_MODE !== "live",
  },

  // Storage
  storage: {
    companyAssetsBucket:
      import.meta.env.VITE_STORAGE_BUCKET_COMPANY_ASSETS || "company-assets",
    videosBucket: import.meta.env.VITE_STORAGE_BUCKET_VIDEOS || "videos",
  },

  // File Upload Limits
  upload: {
    maxFileSizeMB: parseInt(import.meta.env.VITE_MAX_FILE_SIZE_MB || "5"),
    maxVideoSizeMB: parseInt(import.meta.env.VITE_MAX_VIDEO_SIZE_MB || "50"),
  },

  // QR Code
  qrCode: {
    baseUrl:
      import.meta.env.VITE_QR_CODE_BASE_URL || "http://localhost:8080/review",
  },

  // Email - PUBLIC INFO ONLY
  email: {
    supportEmail:
      import.meta.env.VITE_SUPPORT_EMAIL || "support@reviewsparkgather.com",
    // REMOVED: EmailJS keys - moved to server-side
  },

  // Analytics
  analytics: {
    enabled: import.meta.env.VITE_ENABLE_ANALYTICS === "true",
    retentionDays: parseInt(
      import.meta.env.VITE_ANALYTICS_RETENTION_DAYS || "365"
    ),
  },

  // Development helpers
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
} as const;

// Validation function - ONLY for public keys
export const validateConfig = () => {
  const requiredVars = [
    "VITE_SUPABASE_URL",
    "VITE_SUPABASE_ANON_KEY",
    "VITE_STRIPE_MODE",
  ];

  // Add Stripe publishable key validation
  const stripeMode = import.meta.env.VITE_STRIPE_MODE || "test";
  if (stripeMode === "live") {
    requiredVars.push(
      "VITE_STRIPE_LIVE_PUBLISHABLE_KEY",
      "VITE_STRIPE_LIVE_STARTER_PRICE_ID",
      "VITE_STRIPE_LIVE_PROFESSIONAL_PRICE_ID",
      "VITE_STRIPE_LIVE_ENTERPRISE_PRICE_ID"
    );
  } else {
    requiredVars.push(
      "VITE_STRIPE_TEST_PUBLISHABLE_KEY",
      "VITE_STRIPE_TEST_STARTER_PRICE_ID",
      "VITE_STRIPE_TEST_PROFESSIONAL_PRICE_ID",
      "VITE_STRIPE_TEST_ENTERPRISE_PRICE_ID"
    );
  }

  const missing = requiredVars.filter((varName) => !import.meta.env[varName]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}. ` +
        "Please check your .env.local file."
    );
  }

  // console.log(
  //   `🔧 Stripe Mode: ${config.stripe.mode} (Test Mode: ${config.stripe.isTestMode})`
  // );
};

// Helper function to get Stripe configuration - PUBLIC ONLY
export const getStripeConfig = () => {
  return {
    publishableKey: config.stripe.publishableKey,
    priceIds: config.stripe.priceIds,
    isTestMode: config.stripe.isTestMode,
    mode: config.stripe.mode,
  };
};
