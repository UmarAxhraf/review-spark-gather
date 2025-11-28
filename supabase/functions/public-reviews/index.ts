import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "GET") {
    return new Response(
      JSON.stringify({ error: `Method ${req.method} not allowed. Use GET.` }),
      {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  try {
    const url = new URL(req.url);
    const companyId = url.searchParams.get("company_id");
    const limitParam = url.searchParams.get("limit");
    const limit = Math.min(Math.max(Number(limitParam) || 10, 1), 50);

    if (!companyId) {
      return new Response(JSON.stringify({ error: "company_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use anon key to enforce RLS policies
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Only approved, non-spam, company-targeted reviews
    const { data, error } = await supabase
      .from("reviews")
      .select(
        `id, rating, comment, review_type, video_url, created_at, customer_name`
      )
      .eq("review_target_type", "company")
      .or(`company_id.eq.${companyId},target_company_id.eq.${companyId}`)
      .eq("moderation_status", "approved")
      .eq("flagged_as_spam", false)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Sanitize output: remove any unexpected keys
    const safeReviews = (data || []).map((r: any) => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment || null,
      review_type: r.review_type,
      video_url: r.video_url || null,
      created_at: r.created_at,
      customer_name: r.customer_name || "Anonymous",
    }));

    return new Response(JSON.stringify({ reviews: safeReviews }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: "Unexpected error", details: String(e) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
