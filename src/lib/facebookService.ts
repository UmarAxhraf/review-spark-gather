import { supabase } from "@/integrations/supabase/client";

// Facebook API interfaces
export interface FacebookPage {
  id: string;
  name: string;
  access_token: string;
  category: string;
  category_list?: Array<{ id: string; name: string }>;
  picture?: {
    data: {
      url: string;
    };
  };
}

export interface FacebookReview {
  id: string;
  reviewer: {
    name: string;
    id: string;
  };
  created_time: string;
  rating: number;
  review_text?: string;
  recommendation_type: "positive" | "negative" | "no_recommendation";
  open_graph_story?: {
    id: string;
    message?: string;
  };
}

export interface FacebookConnection {
  id: string;
  user_id: string;
  company_id: string;
  facebook_user_id: string;
  facebook_user_name: string;
  access_token: string;
  page_id: string;
  page_name: string;
  page_access_token: string;
  permissions: string[];
  is_active: boolean;
  last_sync_at?: string;
  created_at: string;
  updated_at: string;
}

class FacebookService {
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;
  private scope: string;

  constructor() {
    this.clientId = import.meta.env.VITE_FACEBOOK_APP_ID || "";
    this.clientSecret = import.meta.env.FACEBOOK_APP_SECRET || "";
    this.redirectUri = `${window.location.origin}/facebook-callback`;
    // Updated to include pages_show_list which is required for /me/accounts endpoint
    this.scope = "pages_show_list,pages_read_engagement,pages_manage_posts";
  }

  // Generate Facebook OAuth URL
  getAuthUrl(): string {
    const state = crypto.randomUUID();

    // Store state for validation
    sessionStorage.setItem("facebook_oauth_state", state);
    sessionStorage.setItem("facebook_oauth_timestamp", Date.now().toString());
    sessionStorage.setItem("facebook_oauth_redirect_uri", this.redirectUri);

    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      scope: this.scope,
      response_type: "code",
      state: state,
    });

    const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?${params.toString()}`;
    console.log("Generated Facebook OAuth URL:", authUrl);
    return authUrl;
  }

  // Exchange authorization code for access token
  async exchangeCodeForToken(code: string, state: string): Promise<any> {
    // Validate state
    const storedState = sessionStorage.getItem("facebook_oauth_state");
    const storedTimestamp = sessionStorage.getItem("facebook_oauth_timestamp");
    const storedRedirectUri = sessionStorage.getItem(
      "facebook_oauth_redirect_uri"
    );

    if (!storedState || storedState !== state) {
      throw new Error("Invalid OAuth state parameter");
    }

    if (!storedTimestamp || Date.now() - parseInt(storedTimestamp) > 600000) {
      throw new Error("OAuth state expired");
    }

    if (!storedRedirectUri || storedRedirectUri !== this.redirectUri) {
      throw new Error("Redirect URI mismatch");
    }

    try {
      // Call Supabase Edge Function to exchange code for token
      const { data, error } = await supabase.functions.invoke(
        "facebook-oauth-token",
        {
          body: {
            code,
            redirect_uri: this.redirectUri,
          },
        }
      );

      if (error) {
        console.error("Token exchange error:", error);
        throw new Error(
          error.message || "Failed to exchange authorization code"
        );
      }

      return data;
    } catch (error) {
      console.error("Facebook token exchange failed:", error);
      throw error;
    }
  }

  // Get user's Facebook pages
  async getUserPages(accessToken: string): Promise<FacebookPage[]> {
    try {
      const { data, error } = await supabase.functions.invoke("facebook-api", {
        body: {
          endpoint: "/me/accounts",
          access_token: accessToken,
          fields: "id,name,access_token,category,category_list,picture",
        },
      });

      if (error) {
        throw new Error(error.message || "Failed to fetch Facebook pages");
      }

      return data.data || [];
    } catch (error) {
      console.error("Failed to fetch Facebook pages:", error);
      throw error;
    }
  }

  // Get page reviews/ratings
  async getPageReviews(
    pageId: string,
    pageAccessToken: string
  ): Promise<FacebookReview[]> {
    try {
      const { data, error } = await supabase.functions.invoke("facebook-api", {
        body: {
          endpoint: `/${pageId}/ratings`,
          access_token: pageAccessToken,
          fields:
            "reviewer,created_time,rating,review_text,recommendation_type,open_graph_story",
          limit: 100,
        },
      });

      if (error) {
        throw new Error(error.message || "Failed to fetch Facebook reviews");
      }

      return data.data || [];
    } catch (error) {
      console.error("Failed to fetch Facebook reviews:", error);
      throw error;
    }
  }

  // Save Facebook connection to database
  async saveConnection(
    userId: string,
    companyId: string,
    facebookUserId: string,
    facebookUserName: string,
    accessToken: string,
    selectedPage: FacebookPage,
    permissions: string[]
  ): Promise<FacebookConnection> {
    try {
      const connectionData = {
        user_id: userId,
        company_id: companyId,
        facebook_user_id: facebookUserId,
        facebook_user_name: facebookUserName,
        access_token: accessToken,
        page_id: selectedPage.id,
        page_name: selectedPage.name,
        page_access_token: selectedPage.access_token,
        permissions: permissions,
        is_active: true,
        last_sync_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from("facebook_connections")
        .upsert(connectionData, {
          onConflict: "user_id,page_id",
        })
        .select()
        .single();

      if (error) {
        console.error("Failed to save Facebook connection:", error);
        throw new Error("Failed to save Facebook connection");
      }

      return data;
    } catch (error) {
      console.error("Error saving Facebook connection:", error);
      throw error;
    }
  }

  // Get existing Facebook connection
  async getConnection(
    userId: string,
    companyId: string
  ): Promise<FacebookConnection | null> {
    try {
      const { data, error } = await supabase
        .from("facebook_connections")
        .select("*")
        .eq("user_id", userId)
        .eq("company_id", companyId)
        .eq("is_active", true)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("Failed to get Facebook connection:", error);
        throw new Error("Failed to get Facebook connection");
      }

      return data || null;
    } catch (error) {
      console.error("Error getting Facebook connection:", error);
      return null;
    }
  }

  // Save reviews to database
  async saveReviews(
    connectionId: string,
    pageId: string,
    reviews: FacebookReview[]
  ): Promise<void> {
    try {
      const reviewsData = reviews.map((review) => ({
        connection_id: connectionId,
        facebook_review_id: review.id,
        page_id: pageId,
        reviewer_name: review.reviewer.name,
        reviewer_id: review.reviewer.id,
        rating: review.rating,
        review_text: review.review_text || null,
        recommendation_type: review.recommendation_type,
        created_time: review.created_time,
        raw_data: review,
      }));

      const { error } = await supabase
        .from("facebook_reviews")
        .upsert(reviewsData, {
          onConflict: "facebook_review_id",
        });

      if (error) {
        console.error("Failed to save Facebook reviews:", error);
        throw new Error("Failed to save Facebook reviews");
      }
    } catch (error) {
      console.error("Error saving Facebook reviews:", error);
      throw error;
    }
  }

  // Get stored reviews
  async getUserReviews(
    userId: string,
    companyId: string,
    options: {
      limit?: number;
      offset?: number;
      sortBy?: "created_time" | "rating";
      sortOrder?: "asc" | "desc";
      ratingFilter?: number;
    } = {}
  ): Promise<{ reviews: any[]; total: number }> {
    try {
      let query = supabase
        .from("facebook_reviews")
        .select(
          `
          *,
          facebook_connections!inner(
            user_id,
            company_id,
            page_name
          )
        `,
          { count: "exact" }
        )
        .eq("facebook_connections.user_id", userId)
        .eq("facebook_connections.company_id", companyId);

      // Apply filters
      if (options.ratingFilter) {
        query = query.eq("rating", options.ratingFilter);
      }

      // Apply sorting
      const sortBy = options.sortBy || "created_time";
      const sortOrder = options.sortOrder || "desc";
      query = query.order(sortBy, { ascending: sortOrder === "asc" });

      // Apply pagination
      if (options.limit) {
        query = query.limit(options.limit);
      }
      if (options.offset) {
        query = query.range(
          options.offset,
          options.offset + (options.limit || 10) - 1
        );
      }

      const { data, error, count } = await query;

      if (error) {
        console.error("Failed to get Facebook reviews:", error);
        throw new Error("Failed to get Facebook reviews");
      }

      return {
        reviews: data || [],
        total: count || 0,
      };
    } catch (error) {
      console.error("Error getting Facebook reviews:", error);
      throw error;
    }
  }

  // Get review statistics
  async getReviewStats(userId: string, companyId: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .from("facebook_reviews")
        .select(
          `
          rating,
          created_time,
          facebook_connections!inner(
            user_id,
            company_id
          )
        `
        )
        .eq("facebook_connections.user_id", userId)
        .eq("facebook_connections.company_id", companyId);

      if (error) {
        console.error("Failed to get Facebook review stats:", error);
        throw new Error("Failed to get Facebook review stats");
      }

      const reviews = data || [];
      const totalReviews = reviews.length;
      const averageRating =
        totalReviews > 0
          ? reviews.reduce((sum, review) => sum + review.rating, 0) /
            totalReviews
          : 0;

      const ratingDistribution = [1, 2, 3, 4, 5].map((rating) => ({
        rating,
        count: reviews.filter((review) => review.rating === rating).length,
      }));

      const lastSync = await this.getConnection(userId, companyId).then(
        (conn) => conn?.last_sync_at
      );

      return {
        totalReviews,
        averageRating: Math.round(averageRating * 10) / 10,
        ratingDistribution,
        lastSync,
      };
    } catch (error) {
      console.error("Error getting Facebook review stats:", error);
      return {
        totalReviews: 0,
        averageRating: 0,
        ratingDistribution: [],
        lastSync: null,
      };
    }
  }

  // Sync reviews (fetch and store)
  async syncReviews(userId: string, companyId: string): Promise<void> {
    try {
      const connection = await this.getConnection(userId, companyId);
      if (!connection) {
        throw new Error("No Facebook connection found");
      }

      // Fetch reviews from Facebook
      const reviews = await this.getPageReviews(
        connection.page_id,
        connection.page_access_token
      );

      // Save reviews to database
      await this.saveReviews(connection.id, connection.page_id, reviews);

      // Update last sync time
      await supabase
        .from("facebook_connections")
        .update({ last_sync_at: new Date().toISOString() })
        .eq("id", connection.id);
    } catch (error) {
      console.error("Error syncing Facebook reviews:", error);
      throw error;
    }
  }

  // Disconnect Facebook integration
  async disconnect(userId: string, companyId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from("facebook_connections")
        .update({ is_active: false })
        .eq("user_id", userId)
        .eq("company_id", companyId);

      if (error) {
        throw new Error(`Failed to disconnect Facebook: ${error.message}`);
      }

      console.log("Facebook integration disconnected successfully");
    } catch (error) {
      console.error("Error disconnecting Facebook:", error);
      throw error;
    }
  }

  // Permanently delete Facebook connection
  async deleteConnection(userId: string, companyId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from("facebook_connections")
        .delete()
        .eq("user_id", userId)
        .eq("company_id", companyId);

      if (error) {
        throw new Error(
          `Failed to delete Facebook connection: ${error.message}`
        );
      }

      console.log("Facebook connection deleted successfully");
    } catch (error) {
      console.error("Error deleting Facebook connection:", error);
      throw error;
    }
  }
}

export const facebookService = new FacebookService();
