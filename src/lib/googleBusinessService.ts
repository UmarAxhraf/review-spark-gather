import { supabase } from "@/integrations/supabase/client";
import { cacheManager, createCachedQuery } from "@/utils/cacheUtils";

interface GoogleBusinessLocation {
  name: string;
  title: string;
  phoneNumber?: string;
  websiteUri?: string;
  regularHours?: any;
  categories?: any[];
  latlng?: {
    latitude: number;
    longitude: number;
  };
  address?: {
    addressLines: string[];
    locality: string;
    administrativeArea: string;
    postalCode: string;
    regionCode: string;
  };
}

interface GoogleBusinessReview {
  name: string;
  reviewer: {
    displayName: string;
    profilePhotoUrl?: string;
  };
  starRating: "ONE" | "TWO" | "THREE" | "FOUR" | "FIVE";
  comment?: string;
  createTime: string;
  updateTime: string;
  reviewReply?: {
    comment: string;
    updateTime: string;
  };
}

interface TokenRefreshResult {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
}

class GoogleBusinessService {
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;
  private scope = [
    "https://www.googleapis.com/auth/business.manage",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
  ].join(" ");

  // Enhanced rate limiting and quota management
  private readonly QUOTA_KEY = "google_business_api";
  private readonly DAILY_QUOTA_LIMIT = 1000; // Conservative limit
  private readonly MIN_DELAY_BETWEEN_CALLS = 2000; // 2 seconds minimum
  private readonly MAX_RETRIES = 3;

  constructor() {
    this.clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    this.clientSecret = import.meta.env.VITE_GOOGLE_CLIENT_SECRET;

    if (!this.clientId) {
      throw new Error("VITE_GOOGLE_CLIENT_ID environment variable is required");
    }

    if (!this.clientSecret) {
      throw new Error(
        "VITE_GOOGLE_CLIENT_SECRET environment variable is required"
      );
    }

    this.redirectUri = `${window.location.origin}/google-business-callback`;

    // Initialize quota tracker with very conservative limits
    cacheManager.initQuotaTracker(
      this.QUOTA_KEY,
      100, // Daily limit (very conservative)
      1 // Per-minute limit (extremely conservative)
    );

    // console.log("Google OAuth Configuration:");
    // console.log("Client ID:", this.clientId?.substring(0, 20) + "...");
    // console.log("Redirect URI:", this.redirectUri);
  }

  // Generate OAuth 2.0 authorization URL
  getAuthUrl(): string {
    const state = crypto.randomUUID();

    sessionStorage.setItem("oauth_state", state);
    sessionStorage.setItem("oauth_timestamp", Date.now().toString());
    sessionStorage.setItem("oauth_redirect_uri", this.redirectUri);

    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      scope: this.scope,
      response_type: "code",
      access_type: "offline",
      prompt: "consent",
      state: state,
      include_granted_scopes: "true",
    });

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    console.log("Generated OAuth URL:", authUrl);
    return authUrl;
  }

  // Enhanced token exchange with better error handling
  async exchangeCodeForToken(
    code: string,
    redirectUri: string
  ): Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
  }> {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("Token exchange failed:", errorData);
      throw new Error(`Token exchange failed: ${response.status}`);
    }

    const data = await response.json();

    if (!data.access_token) {
      throw new Error("No access token received");
    }

    if (!data.refresh_token) {
      console.warn("No refresh token received - user may need to re-authorize");
    }

    return data;
  }

  // Enhanced token refresh with retry logic
  async refreshAccessToken(refreshToken: string): Promise<TokenRefreshResult> {
    if (!refreshToken) {
      throw new Error("No refresh token available");
    }

    let lastError: Error;

    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        console.log(`Token refresh attempt ${attempt}/${this.MAX_RETRIES}`);

        // In the refreshAccessToken method, around line 161
        const response = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            client_id: this.clientId,
            client_secret: import.meta.env.VITE_GOOGLE_CLIENT_SECRET, // Add this line
            refresh_token: refreshToken,
            grant_type: "refresh_token",
          }),
        });

        if (!response.ok) {
          const errorData = await response.text();
          console.error(
            `Token refresh failed (attempt ${attempt}):`,
            errorData
          );

          if (response.status === 400) {
            // Invalid refresh token - don't retry
            throw new Error(
              "Refresh token is invalid or expired. Please re-authorize."
            );
          }

          throw new Error(
            `Token refresh failed: ${response.status} ${response.statusText}`
          );
        }

        const data = await response.json();

        if (!data.access_token) {
          throw new Error("No access token received from refresh");
        }

        console.log("Token refreshed successfully");
        return {
          access_token: data.access_token,
          expires_in: data.expires_in || 3600,
          refresh_token: data.refresh_token || refreshToken, // Keep existing if not provided
        };
      } catch (error) {
        lastError = error as Error;

        if (attempt < this.MAX_RETRIES && !error.message.includes("invalid")) {
          const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
          console.log(`Retrying token refresh in ${delay}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  }

  // Enhanced connection management with automatic token refresh
  async getValidAccessToken(userId: string): Promise<string> {
    const connection = await this.getConnection(userId);
    if (!connection) {
      throw new Error("No Google Business connection found");
    }

    // Check if token is still valid (with 5-minute buffer)
    const expiresAt = new Date(connection.token_expires_at);
    const now = new Date();
    const bufferTime = 5 * 60 * 1000; // 5 minutes

    if (expiresAt.getTime() - now.getTime() > bufferTime) {
      return connection.access_token;
    }

    // Token needs refresh
    console.log("Token expired or expiring soon, refreshing...");

    try {
      const refreshed = await this.refreshAccessToken(connection.refresh_token);

      // Update connection with new token
      await supabase
        .from("google_business_connections")
        .update({
          access_token: refreshed.access_token,
          refresh_token: refreshed.refresh_token,
          token_expires_at: new Date(
            Date.now() + refreshed.expires_in * 1000
          ).toISOString(),
        })
        .eq("user_id", userId);

      return refreshed.access_token;
    } catch (error) {
      console.error("Failed to refresh token:", error);

      // If refresh fails, mark connection as invalid
      await supabase
        .from("google_business_connections")
        .update({ is_active: false })
        .eq("user_id", userId);

      throw new Error(
        "Token refresh failed. Please re-authorize your Google Business account."
      );
    }
  }

  // Cached business accounts fetching
  async getBusinessAccounts(accessToken: string): Promise<any[]> {
    // Use user-based cache key instead of token-based
    const cacheKey = `google_accounts_user_${this.userId || "default"}`;

    const cachedFetcher = createCachedQuery(
      cacheKey,
      async () => {
        console.log("Fetching business accounts from Google API...");

        const response = await fetch(
          "https://mybusinessaccountmanagement.googleapis.com/v1/accounts",
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) {
          if (response.status === 429) {
            throw new Error("Rate limit exceeded. Please try again later.");
          }
          throw new Error(`Failed to fetch accounts: ${response.status}`);
        }

        const data = await response.json();
        return data.accounts || [];
      },
      24 * 60 * 60 * 1000, // 24 hours cache
      this.QUOTA_KEY
    );

    return await cachedFetcher();
  }

  // Cached business locations fetching
  async getBusinessLocations(
    accessToken: string,
    accountName: string
  ): Promise<GoogleBusinessLocation[]> {
    const cacheKey = `google_locations_${accountName.replace(
      /[^a-zA-Z0-9]/g,
      "_"
    )}`;

    const cachedFetcher = createCachedQuery(
      cacheKey,
      async () => {
        console.log(`Fetching locations for account: ${accountName}`);

        const response = await fetch(
          `https://mybusinessbusinessinformation.googleapis.com/v1/${accountName}/locations`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) {
          if (response.status === 429) {
            throw new Error("Rate limit exceeded. Please try again later.");
          }
          throw new Error(`Failed to fetch locations: ${response.status}`);
        }

        const data = await response.json();
        return data.locations || [];
      },
      24 * 60 * 60 * 1000, // 24 hours cache
      this.QUOTA_KEY
    );

    return await cachedFetcher();
  }

  // Fetch Google account info
  async getGoogleAccountInfo(accessToken: string): Promise<any> {
    const response = await fetch(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error("Failed to fetch user info");
    }

    return await response.json();
  }

  async getLocationReviews(
    accessToken: string,
    locationName: string
  ): Promise<GoogleBusinessReview[]> {
    const cacheKey = `google_reviews_${locationName.replace(
      /[^a-zA-Z0-9]/g,
      "_"
    )}`;

    const cachedFetcher = createCachedQuery(
      cacheKey,
      async () => {
        console.log(`Fetching reviews for location: ${locationName}`);

        const response = await fetch(
          `https://mybusiness.googleapis.com/v4/${locationName}/reviews`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) {
          if (response.status === 429) {
            throw new Error("Rate limit exceeded. Please try again later.");
          }
          throw new Error(`Failed to fetch reviews: ${response.status}`);
        }

        const data = await response.json();
        return data.reviews || [];
      },
      60 * 60 * 1000, // 1 hour cache for reviews
      this.QUOTA_KEY
    );

    return await cachedFetcher();
  }

  async saveConnection(
    userId: string,
    accessToken: string,
    refreshToken: string,
    expiresIn: number
  ): Promise<void> {
    // Get Google account info to use as google_account_id
    const accountInfo = await this.getGoogleAccountInfo(accessToken);

    const { data, error } = await supabase
      .from("google_business_connections")
      .upsert(
        {
          user_id: userId,
          company_id: userId, // In this system, user_id is the same as company_id
          google_account_id: accountInfo.id,
          google_account_name: accountInfo.name,
          google_account_email: accountInfo.email,
          access_token: accessToken,
          refresh_token: refreshToken,
          token_expires_at: new Date(
            Date.now() + expiresIn * 1000
          ).toISOString(),
          is_active: true,
        },
        {
          onConflict: "user_id,google_account_id",
        }
      );

    if (error) {
      throw new Error(`Failed to save connection: ${error.message}`);
    }
  }

  async getConnection(userId: string): Promise<any> {
    const { data, error } = await supabase
      .from("google_business_connections")
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true)
      .single();

    if (error && error.code !== "PGRST116") {
      throw new Error(`Failed to get connection: ${error.message}`);
    }

    return data;
  }

  private convertStarRating(rating: string): number {
    const ratingMap = {
      ONE: 1,
      TWO: 2,
      THREE: 3,
      FOUR: 4,
      FIVE: 5,
    };
    return ratingMap[rating as keyof typeof ratingMap] || 0;
  }

  // Enhanced sync method with intelligent caching
  async syncReviews(userId: string): Promise<{
    success: boolean;
    reviewsCount: number;
    locationsCount: number;
    error?: string;
  }> {
    try {
      // Get valid access token (with automatic refresh)
      const accessToken = await this.getValidAccessToken(userId);
      const connection = await this.getConnection(userId);

      const syncLogId = crypto.randomUUID();

      // Start sync log
      await supabase.from("google_sync_logs").insert({
        id: syncLogId,
        connection_id: connection.id,
        sync_type: "manual",
        sync_scope: "reviews",
        status: "running",
        started_at: new Date().toISOString(),
      });

      // Check quota before proceeding
      if (!cacheManager.canMakeApiCall(this.QUOTA_KEY)) {
        const quotaStatus = cacheManager.getQuotaStatus(this.QUOTA_KEY);
        throw new Error(
          `Daily API quota exceeded. Used: ${quotaStatus?.usedQuota}/${quotaStatus?.dailyQuota}`
        );
      }

      // STEP 1: Get cached or fetch accounts
      console.log("Fetching business accounts...");
      const accounts = await this.getBusinessAccounts(accessToken);

      if (accounts.length === 0) {
        await supabase
          .from("google_sync_logs")
          .update({
            status: "failed",
            error_message: "No Google Business accounts found",
            completed_at: new Date().toISOString(),
          })
          .eq("id", syncLogId);

        return {
          success: false,
          reviewsCount: 0,
          locationsCount: 0,
          error: "No Google Business accounts found for this user",
        };
      }

      console.log(`Found ${accounts.length} account(s)`);
      let allLocations: any[] = [];

      // STEP 2: Process accounts and get locations (with caching)
      for (const account of accounts) {
        // Save account to database
        const { data: savedAccount } = await supabase
          .from("google_business_accounts")
          .upsert(
            {
              connection_id: connection.id,
              google_account_name: account.name,
              account_display_name: account.accountName || account.name,
              account_type: account.type || "PERSONAL",
              is_active: true,
            },
            {
              onConflict: "connection_id,google_account_name",
            }
          )
          .select()
          .single();

        if (!savedAccount) continue;

        // Get cached or fetch locations
        const accountLocations = await this.getBusinessLocations(
          accessToken,
          account.name
        );

        console.log(
          `Found ${accountLocations.length} locations for account ${account.name}`
        );

        // Save locations to database
        for (const location of accountLocations) {
          const { data: savedLocation } = await supabase
            .from("google_business_locations")
            .upsert(
              {
                account_id: savedAccount.id,
                google_location_name: location.name,
                location_display_name: location.title,
                phone_number: location.phoneNumber,
                website_url: location.websiteUri,
                address_lines: location.address?.addressLines,
                locality: location.address?.locality,
                administrative_area: location.address?.administrativeArea,
                postal_code: location.address?.postalCode,
                region_code: location.address?.regionCode,
                latitude: location.latlng?.latitude,
                longitude: location.latlng?.longitude,
                is_active: true,
              },
              {
                onConflict: "account_id,google_location_name",
              }
            )
            .select()
            .single();

          if (savedLocation) {
            allLocations.push({
              ...savedLocation,
              google_business_accounts: savedAccount,
            });
          }
        }
      }

      if (allLocations.length === 0) {
        await supabase
          .from("google_sync_logs")
          .update({
            status: "success",
            reviews_synced: 0,
            locations_synced: 0,
            completed_at: new Date().toISOString(),
          })
          .eq("id", syncLogId);

        return {
          success: true,
          reviewsCount: 0,
          locationsCount: 0,
          error: "No business locations found",
        };
      }

      // STEP 3: Fetch reviews for each location (with caching and rate limiting)
      let totalReviewsCount = 0;

      for (const location of allLocations) {
        try {
          console.log(
            `Fetching reviews for: ${location.location_display_name}`
          );

          const reviews = await this.getLocationReviews(
            accessToken,
            location.google_location_name
          );

          console.log(`Found ${reviews.length} reviews`);

          for (const review of reviews) {
            await supabase.from("google_reviews").upsert(
              {
                location_id: location.id,
                google_review_name: review.name,
                reviewer_display_name: review.reviewer.displayName,
                reviewer_profile_photo_url: review.reviewer.profilePhotoUrl,
                star_rating: this.convertStarRating(review.starRating),
                comment: review.comment,
                create_time: review.createTime,
                update_time: review.updateTime,
                review_reply_comment: review.reviewReply?.comment,
                review_reply_update_time: review.reviewReply?.updateTime,
              },
              {
                onConflict: "location_id,google_review_name",
              }
            );
          }

          totalReviewsCount += reviews.length;
        } catch (error) {
          console.error(
            `Error syncing reviews for location ${location.id}:`,
            error
          );
          // Continue with other locations
        }
      }

      // Update sync log
      await supabase
        .from("google_sync_logs")
        .update({
          status: "success",
          reviews_synced: totalReviewsCount,
          locations_synced: allLocations.length,
          completed_at: new Date().toISOString(),
        })
        .eq("id", syncLogId);

      // Update connection last sync time
      await supabase
        .from("google_business_connections")
        .update({ last_sync_at: new Date().toISOString() })
        .eq("user_id", userId);

      return {
        success: true,
        reviewsCount: totalReviewsCount,
        locationsCount: allLocations.length,
      };
    } catch (error) {
      console.error("Error syncing reviews:", error);
      return {
        success: false,
        reviewsCount: 0,
        locationsCount: 0,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // New method to get user's reviews
  async getUserReviews(
    userId: string,
    options?: {
      limit?: number;
      offset?: number;
      locationId?: string;
      sortBy?: "create_time" | "star_rating" | "update_time";
      sortOrder?: "asc" | "desc";
    }
  ) {
    const {
      limit = 50,
      offset = 0,
      locationId,
      sortBy = "create_time",
      sortOrder = "desc",
    } = options || {};

    let query = supabase
      .from("google_reviews")
      .select(
        `
        *,
        google_business_locations!inner(
          location_display_name,
          google_business_accounts!inner(
            google_business_connections!inner(
              user_id
            )
          )
        )
      `
      )
      .eq(
        "google_business_locations.google_business_accounts.google_business_connections.user_id",
        userId
      );

    if (locationId) {
      query = query.eq("location_id", locationId);
    }

    query = query
      .order(sortBy, { ascending: sortOrder === "asc" })
      .range(offset, offset + limit - 1);

    const { data: reviews, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch reviews: ${error.message}`);
    }

    return reviews || [];
  }

  // New method to get review statistics
  async getReviewStats(userId: string) {
    const { data: stats, error } = await supabase
      .from("google_reviews")
      .select(
        `
        star_rating,
        google_business_locations!inner(
          google_business_accounts!inner(
            google_business_connections!inner(
              user_id
            )
          )
        )
      `
      )
      .eq(
        "google_business_locations.google_business_accounts.google_business_connections.user_id",
        userId
      );

    if (error) {
      throw new Error(`Failed to fetch review stats: ${error.message}`);
    }

    const totalReviews = stats?.length || 0;
    const averageRating =
      totalReviews > 0
        ? stats.reduce((sum, review) => sum + review.star_rating, 0) /
          totalReviews
        : 0;

    const ratingDistribution = {
      1: stats?.filter((r) => r.star_rating === 1).length || 0,
      2: stats?.filter((r) => r.star_rating === 2).length || 0,
      3: stats?.filter((r) => r.star_rating === 3).length || 0,
      4: stats?.filter((r) => r.star_rating === 4).length || 0,
      5: stats?.filter((r) => r.star_rating === 5).length || 0,
    };

    return {
      totalReviews,
      averageRating: Math.round(averageRating * 10) / 10,
      ratingDistribution,
    };
  }

  // Disconnect Google Business integration (clean deletion)
  async disconnect(userId: string): Promise<void> {
    try {
      // Use deleteConnection for a clean disconnect that allows easy reconnection
      await this.deleteConnection(userId);
      console.log("Google Business integration disconnected successfully");
    } catch (error) {
      console.error("Error disconnecting Google Business:", error);
      throw error;
    }
  }

  // Permanently delete Google Business connection
  async deleteConnection(userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from("google_business_connections")
        .delete()
        .eq("user_id", userId);

      if (error) {
        throw new Error(
          `Failed to delete Google Business connection: ${error.message}`
        );
      }

      console.log("Google Business connection deleted successfully");
    } catch (error) {
      console.error("Error deleting Google Business connection:", error);
      throw error;
    }
  }
}

export const googleBusinessService = new GoogleBusinessService();
