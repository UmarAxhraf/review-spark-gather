import { supabase } from "@/integrations/supabase/client";
import { 
  extractBusinessSlug, 
  parseBusinessNameFromSlug, 
  calculateBusinessNameSimilarity,
  isValidYelpBusinessUrl 
} from "./yelpUtils";

interface YelpBusiness {
  id: string;
  name: string;
  url: string;
  rating: number;
  review_count: number;
  location: {
    address1: string;
    city: string;
    state: string;
    zip_code: string;
  };
  phone: string;
  categories: Array<{
    alias: string;
    title: string;
  }>;
}

interface YelpReview {
  id: string;
  rating: number;
  user: {
    id: string;
    name: string;
    image_url?: string;
  };
  text: string;
  time_created: string;
  url: string;
}

interface YelpConnection {
  id: string;
  user_id: string;
  business_id: string;
  business_name: string;
  business_url: string;
  yelp_profile_url?: string;
  yelp_business_location?: string;
  yelp_business_id?: string;
  created_at: string;
  updated_at: string;
}

interface YelpSearchResult {
  businesses: YelpBusiness[];
  total: number;
}

interface BusinessMatchResult {
  business: YelpBusiness;
  confidence: number;
  matchedBy: 'exact_name' | 'high_similarity' | 'url_match' | 'location_match';
}

class YelpService {
  /**
   * Search for businesses using Yelp Business Search API
   */
  async searchBusinesses(
    term: string, 
    location: string, 
    options: {
      limit?: number;
      radius?: number;
      categories?: string;
    } = {}
  ): Promise<YelpSearchResult> {
    console.log("Searching businesses with:", { term, location, options });
  
    try {
      const { data, error } = await supabase.functions.invoke("yelp-api", {
        body: {
          action: "searchBusinesses",
          term,
          location,
          ...options,
        },
      });
  
      if (error) {
        console.error("searchBusinesses error:", error);
        
        // Provide specific error messages for common issues
        if (error.message?.includes('LOCATION_NOT_FOUND')) {
          throw new Error(`Location "${location}" not found. Please try a nearby city or use a zip code.`);
        }
        if (error.message?.includes('BUSINESS_UNAVAILABLE')) {
          throw new Error('Yelp API is temporarily unavailable. Please try again later.');
        }
        if (error.message?.includes('REQUEST_LIMIT_REACHED')) {
          throw new Error('API request limit reached. Please try again in a few minutes.');
        }
        
        throw new Error(error.message || "Failed to search businesses");
      }
  
      console.log("searchBusinesses response:", data);
      return data;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('An unexpected error occurred while searching businesses');
    }
  }

  /**
   * Find and match a business using URL and location with improved accuracy
   */
  async findAndMatchBusiness(
    profileUrl: string, 
    businessLocation: string
  ): Promise<BusinessMatchResult> {
    // Validate the Yelp URL
    if (!isValidYelpBusinessUrl(profileUrl)) {
      throw new Error("Invalid Yelp business URL format");
    }

    try {
      // Extract business name from URL slug
      const slug = extractBusinessSlug(profileUrl);
      const businessName = parseBusinessNameFromSlug(slug);
      
      console.log("Extracted business info:", { slug, businessName });

      // Search for businesses using the extracted name and provided location
      const searchResults = await this.searchBusinesses(
        businessName, 
        businessLocation,
        { limit: 20 } // Get more results for better matching
      );

      if (!searchResults.businesses || searchResults.businesses.length === 0) {
        throw new Error(
          `No businesses found for "${businessName}" in "${businessLocation}". ` +
          "Please check your business name and location, or try a nearby city."
        );
      }

      // Find the best match using multiple criteria
      const bestMatch = this.findBestBusinessMatch(
        searchResults.businesses,
        businessName,
        profileUrl,
        slug
      );

      if (!bestMatch) {
        throw new Error(
          `Could not find a reliable match for "${businessName}" in the search results. ` +
          "Please verify your Yelp URL and business location are correct."
        );
      }

      return bestMatch;
    } catch (error) {
      console.error("findAndMatchBusiness error:", error);
      throw error;
    }
  }

  /**
   * Find the best business match from search results using multiple criteria
   */
  private findBestBusinessMatch(
    businesses: YelpBusiness[],
    expectedName: string,
    originalUrl: string,
    originalSlug: string
  ): BusinessMatchResult | null {
    let bestMatch: BusinessMatchResult | null = null;
    let highestConfidence = 0;

    for (const business of businesses) {
      const matches = this.calculateBusinessMatch(business, expectedName, originalUrl, originalSlug);
      
      if (matches.confidence > highestConfidence) {
        highestConfidence = matches.confidence;
        bestMatch = matches;
      }
    }

    // Only return matches with reasonable confidence (>= 0.6)
    return bestMatch && bestMatch.confidence >= 0.6 ? bestMatch : null;
  }

  /**
   * Calculate match confidence for a business using multiple criteria
   */
  private calculateBusinessMatch(
    business: YelpBusiness,
    expectedName: string,
    originalUrl: string,
    originalSlug: string
  ): BusinessMatchResult {
    let confidence = 0;
    let matchedBy: BusinessMatchResult['matchedBy'] = 'high_similarity';

    // 1. Exact URL match (highest confidence)
    if (business.url && originalUrl.includes(business.url.split('/').pop() || '')) {
      confidence = 1.0;
      matchedBy = 'url_match';
    }
    // 2. Exact name match (very high confidence)
    else if (business.name.toLowerCase() === expectedName.toLowerCase()) {
      confidence = 0.95;
      matchedBy = 'exact_name';
    }
    // 3. High name similarity
    else {
      const nameSimilarity = calculateBusinessNameSimilarity(business.name, expectedName);
      confidence = nameSimilarity;
      
      // Boost confidence if business URL slug matches original slug pattern
      if (business.url) {
        try {
          const businessSlug = extractBusinessSlug(business.url);
          const businessNameFromSlug = parseBusinessNameFromSlug(businessSlug);
          const slugSimilarity = calculateBusinessNameSimilarity(businessNameFromSlug, expectedName);
          
          if (slugSimilarity > 0.8) {
            confidence = Math.max(confidence, slugSimilarity * 0.9);
          }
        } catch (e) {
          // Ignore slug extraction errors
        }
      }
      
      // Additional boost for location consistency
      if (originalSlug.includes(business.location.city.toLowerCase().replace(/\s+/g, '-'))) {
        confidence += 0.1;
        matchedBy = 'location_match';
      }
    }

    return {
      business,
      confidence: Math.min(confidence, 1.0), // Cap at 1.0
      matchedBy
    };
  }

  /**
   * Connect to Yelp using improved business search and matching
   */
  async connectWithImprovedMatching(
    userId: string,
    profileUrl: string,
    businessLocation: string
  ): Promise<{ business: YelpBusiness; confidence: number; matchedBy: string }> {
    try {
      // Find and match the business
      const matchResult = await this.findAndMatchBusiness(profileUrl, businessLocation);
      
      // Save the connection with new fields
      await this.saveImprovedConnection(
        userId, 
        matchResult.business, 
        profileUrl, 
        businessLocation
      );

      return {
        business: matchResult.business,
        confidence: matchResult.confidence,
        matchedBy: matchResult.matchedBy
      };
    } catch (error) {
      console.error("connectWithImprovedMatching error:", error);
      throw error;
    }
  }

  /**
   * Save connection with improved schema including new fields
   */
  async saveImprovedConnection(
    userId: string, 
    business: YelpBusiness, 
    profileUrl: string, 
    businessLocation: string
  ): Promise<void> {
    const { error } = await supabase.from("yelp_connections").upsert({
      user_id: userId,
      business_id: business.id, // Keep for backward compatibility
      business_name: business.name,
      business_url: business.url,
      yelp_profile_url: profileUrl,
      yelp_business_location: businessLocation,
      yelp_business_id: business.id,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      console.error("saveImprovedConnection error:", error);
      throw new Error(`Failed to save Yelp connection: ${error.message}`);
    }
  }

  async getBusinessByUrl(businessUrl: string): Promise<YelpBusiness> {
    console.log("Calling getBusinessByUrl with:", businessUrl);

    const { data, error } = await supabase.functions.invoke("yelp-api", {
      body: {
        action: "getBusinessByUrl",
        businessUrl,
      },
    });

    if (error) {
      console.error("getBusinessByUrl error:", error);
      throw new Error(error.message || "Failed to fetch business information");
    }

    console.log("getBusinessByUrl response:", data);
    return data;
  }

  // In the getBusinessReviews method, around line 329
  async getBusinessReviews(businessId: string): Promise<YelpReview[]> {
    console.log("Calling getBusinessReviews with:", businessId);
    
    const { data, error } = await supabase.functions.invoke("yelp-api", {
      body: { action: "getBusinessReviews", businessId },
    });
  
    if (error) {
      console.error("getBusinessReviews error:", error);
      // Handle edge function errors (like 404 from Yelp API)
      if (error.message && error.message.includes("404")) {
        console.warn(`Business ${businessId} not found or has no reviews available`);
        return []; // Return empty array instead of throwing error
      }
      throw new Error(`Failed to fetch reviews: ${error.message}`);
    }
  
    // Handle structured error responses from the edge function
    if (data && data.error) {
      console.warn(`Yelp API error for business ${businessId}:`, data.error);
      // For business not found errors, return empty array instead of throwing
      if (data.error.includes("Business not found") || 
          data.error.includes("NOT_FOUND") ||
          data.error === "BUSINESS_NOT_FOUND") {
        console.warn(`Business ${businessId} not found or has no reviews available`);
        return []; // Return empty array instead of throwing error
      }
      if (data.error === "REVIEWS_UNAVAILABLE") {
        console.warn(`Reviews unavailable for business ${businessId}`);
        return [];
      }
      // For other errors, still throw but with better messaging
      throw new Error(`Yelp API error: ${data.error}`);
    }
  
    return data || [];
  }

  async saveConnection(userId: string, business: YelpBusiness): Promise<void> {
    const { error } = await supabase.from("yelp_connections").upsert({
      user_id: userId,
      business_id: business.id,
      business_name: business.name,
      business_url: business.url,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      throw new Error("Failed to save Yelp connection");
    }
  }

  async getConnection(userId: string): Promise<YelpConnection | null> {
    const { data, error } = await supabase
      .from("yelp_connections")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error && error.code !== "PGRST116") {
      throw new Error("Failed to fetch Yelp connection");
    }

    return data;
  }

  async saveReviews(
    userId: string,
    businessId: string,
    reviews: YelpReview[]
  ): Promise<void> {
    if (!reviews || reviews.length === 0) {
      console.log("No reviews to save");
      return;
    }

    const reviewsToInsert = reviews.map((review) => ({
      user_id: userId,
      business_id: businessId,
      yelp_review_id: review.id,
      rating: review.rating,
      reviewer_name: review.user.name,
      reviewer_image_url: review.user.image_url || null,
      text: review.text,
      created_time: review.time_created,
      review_url: review.url,
    }));

    const { error } = await supabase
      .from("yelp_reviews")
      .upsert(reviewsToInsert, { onConflict: "user_id,yelp_review_id" });

    if (error) {
      console.error("Error saving reviews:", error);
      throw new Error(`Failed to save reviews: ${error.message}`);
    }
  }

  async getUserReviews(
    userId: string,
    options: {
      limit?: number;
      offset?: number;
      sortBy?: "created_time" | "rating";
      sortOrder?: "asc" | "desc";
      minRating?: number;
      maxRating?: number;
    } = {}
  ): Promise<any[]> {
    const {
      limit = 10,
      offset = 0,
      sortBy = "created_time",
      sortOrder = "desc",
      minRating,
      maxRating,
    } = options;

    let query = supabase.from("yelp_reviews").select("*").eq("user_id", userId);

    if (minRating !== undefined) {
      query = query.gte("rating", minRating);
    }
    if (maxRating !== undefined) {
      query = query.lte("rating", maxRating);
    }

    query = query
      .order(sortBy, { ascending: sortOrder === "asc" })
      .range(offset, offset + limit - 1);

    const { data, error } = await query;

    if (error) {
      throw new Error("Failed to fetch reviews");
    }

    return data || [];
  }

  async getReviewStats(userId: string): Promise<{
    totalReviews: number;
    averageRating: number;
    ratingDistribution: Record<number, number>;
  }> {
    const { data, error } = await supabase
      .from("yelp_reviews")
      .select("rating")
      .eq("user_id", userId);

    if (error) {
      throw new Error("Failed to fetch review stats");
    }

    const reviews = data || [];
    const totalReviews = reviews.length;
    const averageRating =
      totalReviews > 0
        ? reviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews
        : 0;

    const ratingDistribution: Record<number, number> = {};
    for (let i = 1; i <= 5; i++) {
      ratingDistribution[i] = reviews.filter(
        (review) => review.rating === i
      ).length;
    }

    return {
      totalReviews,
      averageRating: Math.round(averageRating * 10) / 10,
      ratingDistribution,
    };
  }

  // In the syncReviews method, around line 507
  async syncReviews(userId: string): Promise<{
    success: boolean;
    reviewsCount?: number;
    error?: string;
  }> {
    try {
      const connection = await this.getConnection(userId);
      if (!connection) {
        return { success: false, error: "No Yelp connection found" };
      }
  
      // Use the stored yelp_business_id if available, otherwise fall back to business_id
      const businessId = connection.yelp_business_id || connection.business_id;
      
      if (!businessId) {
        return { success: false, error: "No business ID available for review sync" };
      }
  
      const reviews = await this.getBusinessReviews(businessId);
      
      if (reviews.length === 0) {
        console.log("No reviews available for this business");
        return { success: true, reviewsCount: 0 };
      }
  
      await this.saveReviews(userId, businessId, reviews);
      return { success: true, reviewsCount: reviews.length };
    } catch (error) {
      console.error("Error syncing reviews:", error);
      return { success: false, error: error.message };
    }
  }

  async disconnect(userId: string): Promise<void> {
    try {
      await this.deleteConnection(userId);
      console.log("Yelp integration disconnected successfully");
    } catch (error) {
      console.error("Error disconnecting Yelp:", error);
      throw error;
    }
  }

  async deleteConnection(userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from("yelp_connections")
        .delete()
        .eq("user_id", userId);

      if (error) {
        throw new Error(`Failed to delete Yelp connection: ${error.message}`);
      }

      console.log("Yelp connection deleted successfully");
    } catch (error) {
      console.error("Error deleting Yelp connection:", error);
      throw error;
    }
  }
}

export const yelpService = new YelpService();
