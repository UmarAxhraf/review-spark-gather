// Environment configuration helper
export const config = {
  // Supabase
  supabase: {
    url: import.meta.env.VITE_SUPABASE_URL,
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
  },

  // Application
  app: {
    name: import.meta.env.VITE_APP_NAME || "Review Spark Gather",
    url: import.meta.env.VITE_APP_URL || "http://localhost:8080",
    environment: import.meta.env.VITE_APP_ENVIRONMENT || "development",
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

  // Email
  email: {
    supportEmail:
      import.meta.env.VITE_SUPPORT_EMAIL || "support@reviewsparkgather.com",
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

// Validation function to ensure required environment variables are set
export const validateConfig = () => {
  const requiredVars = ["VITE_SUPABASE_URL", "VITE_SUPABASE_ANON_KEY"];

  const missing = requiredVars.filter((varName) => !import.meta.env[varName]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}. ` +
        "Please check your .env.local file."
    );
  }
};
