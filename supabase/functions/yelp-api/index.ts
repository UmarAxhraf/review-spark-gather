import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  console.log(`${req.method} ${req.url}`);
  
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Only allow POST requests
  if (req.method !== "POST") {
    console.log("Method not allowed:", req.method);
    return new Response(
      JSON.stringify({ error: `Method ${req.method} not allowed. Use POST.` }),
      {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  try {
    // Log environment check
    const yelpApiKey = Deno.env.get("YELP_API_KEY");
    console.log("YELP_API_KEY present:", !!yelpApiKey);
    
    if (!yelpApiKey) {
      console.error("YELP_API_KEY environment variable not set");
      return new Response(
        JSON.stringify({ error: "Yelp API key not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Parse request body
    let requestBody;
    try {
      const bodyText = await req.text();
      console.log("Request body text:", bodyText);
      
      if (!bodyText || bodyText.trim() === "") {
        console.error("Empty request body");
        return new Response(
          JSON.stringify({ error: "Request body is empty" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      
      requestBody = JSON.parse(bodyText);
      console.log("Parsed request body:", requestBody);
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      return new Response(
        JSON.stringify({ 
          error: "Invalid JSON in request body",
          details: parseError.message 
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { action, businessUrl, businessId } = requestBody;
    console.log("Action:", action, "BusinessUrl:", businessUrl, "BusinessId:", businessId);

    // Handle getBusinessByUrl action
    if (action === "getBusinessByUrl") {
      if (!businessUrl) {
        return new Response(
          JSON.stringify({ error: "businessUrl is required for getBusinessByUrl action" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const extractedBusinessId = extractBusinessIdFromUrl(businessUrl);
      console.log("Extracted business ID:", extractedBusinessId);
      
      if (!extractedBusinessId) {
        return new Response(
          JSON.stringify({ error: "Invalid Yelp business URL format. Expected format: https://www.yelp.com/biz/business-name" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      try {
        console.log("Calling Yelp API for business:", extractedBusinessId);
        const response = await fetch(
          `https://api.yelp.com/v3/businesses/${extractedBusinessId}`,
          {
            headers: {
              "Authorization": `Bearer ${yelpApiKey}`,
              "Accept": "application/json",
            },
          }
        );

        console.log("Yelp API response status:", response.status);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error("Yelp API error response:", errorText);
          
          if (response.status === 404) {
            return new Response(
              JSON.stringify({ error: "Business not found. Please verify the Yelp URL is correct." }),
              {
                status: 404,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              }
            );
          }
          
          return new Response(
            JSON.stringify({ 
              error: `Yelp API error: ${response.status}`,
              details: errorText 
            }),
            {
              status: response.status,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }

        const business = await response.json();
        console.log("Business found:", business.name);
        
        return new Response(JSON.stringify(business), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (fetchError) {
        console.error("Fetch error:", fetchError);
        return new Response(
          JSON.stringify({ 
            error: "Failed to fetch business data",
            details: fetchError.message 
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    // Handle getBusinessReviews action
    if (action === "getBusinessReviews") {
      if (!businessId) {
        return new Response(
          JSON.stringify({ error: "businessId is required for getBusinessReviews action" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      try {
        console.log("Calling Yelp API for reviews:", businessId);
        const response = await fetch(
          `https://api.yelp.com/v3/businesses/${businessId}/reviews`,
          {
            headers: {
              "Authorization": `Bearer ${yelpApiKey}`,
              "Accept": "application/json",
            },
          }
        );

        console.log("Yelp reviews API response status:", response.status);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error("Yelp reviews API error:", errorText);
          
          if (response.status === 404) {
            return new Response(
              JSON.stringify({ 
                error: "Business not found in Yelp database",
                details: `The business ID '${businessId}' does not exist. Please verify your Yelp business URL is correct and corresponds to an active business listing.`,
                suggestions: [
                  "Visit your actual Yelp business page",
                  "Copy the URL directly from your browser's address bar",
                  "Ensure the URL format is: https://www.yelp.com/biz/business-name-location",
                  "Verify the business is still active on Yelp"
                ]
              }),
              {
                status: 404,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              }
            );
          }
          
          return new Response(
            JSON.stringify({ 
              error: `Failed to fetch reviews: ${response.status}`,
              details: errorText 
            }),
            {
              status: response.status,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }

        const data = await response.json();
        const reviews = data.reviews || [];
        console.log(`Found ${reviews.length} reviews`);
        
        return new Response(JSON.stringify(reviews), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (fetchError) {
        console.error("Reviews fetch error:", fetchError);
        return new Response(
          JSON.stringify({ 
            error: "Failed to fetch reviews data",
            details: fetchError.message 
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    // Handle searchBusinesses action
    if (action === "searchBusinesses") {
      const { term, location, limit = 20, radius, categories } = requestBody;
      
      if (!term || !location) {
        return new Response(
          JSON.stringify({ error: "term and location are required for searchBusinesses action" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      try {
        console.log("Calling Yelp Search API with:", { term, location, limit });
        
        // Build query parameters
        const params = new URLSearchParams({
          term,
          location,
          limit: limit.toString(),
        });
        
        if (radius) params.append('radius', radius.toString());
        if (categories) params.append('categories', categories);
        
        const response = await fetch(
          `https://api.yelp.com/v3/businesses/search?${params}`,
          {
            headers: {
              "Authorization": `Bearer ${yelpApiKey}`,
              "Accept": "application/json",
            },
          }
        );

        console.log("Yelp Search API response status:", response.status);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error("Yelp Search API error:", errorText);
          
          if (response.status === 400) {
            return new Response(
              JSON.stringify({ 
                error: "LOCATION_NOT_FOUND",
                message: `Location "${location}" not found. Please try a nearby city or use a zip code.`
              }),
              {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              }
            );
          }
          
          return new Response(
            JSON.stringify({ 
              error: `Yelp Search API error: ${response.status}`,
              details: errorText 
            }),
            {
              status: response.status,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }

        const data = await response.json();
        console.log(`Found ${data.businesses?.length || 0} businesses`);
        
        return new Response(JSON.stringify({
          businesses: data.businesses || [],
          total: data.total || 0
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (fetchError) {
        console.error("Search fetch error:", fetchError);
        return new Response(
          JSON.stringify({ 
            error: "Failed to search businesses",
            details: fetchError.message 
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    // Invalid action
    console.log("Invalid action received:", action);
    return new Response(
      JSON.stringify({
        error: 'Invalid action. Must be "getBusinessByUrl", "getBusinessReviews", or "searchBusinesses"',
        receivedAction: action
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
    
  } catch (error) {
    console.error("Unexpected error in Yelp API function:", error);
    return new Response(
      JSON.stringify({ 
        error: "Internal server error",
        details: error.message,
        stack: error.stack 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

function extractBusinessIdFromUrl(url: string): string | null {
  try {
    console.log("Extracting business ID from URL:", url);
    
    // Validate URL format first
    if (!url || typeof url !== 'string') {
      console.log("Invalid URL provided:", url);
      return null;
    }
    
    // Handle different Yelp URL formats
    const patterns = [
      /\/biz\/([^?&#\/]+)/,  // Standard format
      /yelp\.com\/biz\/([^?&#\/]+)/, // With domain
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        const businessId = match[1];
        console.log("Extracted business ID:", businessId);
        
        // Basic validation - Yelp business IDs are typically alphanumeric with hyphens
        if (!/^[a-zA-Z0-9_-]+$/.test(businessId)) {
          console.log("Invalid business ID format:", businessId);
          return null;
        }
        
        return businessId;
      }
    }
    
    console.log("No business ID found in URL");
    return null;
  } catch (error) {
    console.error("Error extracting business ID:", error);
    return null;
  }
}
