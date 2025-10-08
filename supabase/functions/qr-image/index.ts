import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import QRCode from "https://esm.sh/qrcode@1.5.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const qrCodeId = url.pathname.split("/").pop();

    if (!qrCodeId) {
      return new Response("QR Code ID required", { status: 400, headers: corsHeaders });
    }

    // Create Supabase client with service role key (bypasses RLS and auth)
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        },
        global: {
          headers: {
            // Ensure we're using service role authentication
            'Authorization': `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`
          }
        }
      }
    );

    // Get company profile data using the correct table
    const { data: profileData, error } = await supabaseClient
      .from("profiles")
      .select("id, company_name, primary_color")
      .eq("company_qr_code_id", qrCodeId)
      .single();

    if (error || !profileData) {
      console.error("Profile lookup error:", error);
      return new Response("QR Code not found", { 
        status: 404, 
        headers: corsHeaders 
      });
    }

    // Generate QR code URL
    const qrUrl = `${Deno.env.get("FRONTEND_URL") || "https://review-spark-gather.vercel.app"}/review/company/${qrCodeId}`;

    // Generate QR code as PNG buffer with company branding
    const qrCodeBuffer = await QRCode.toBuffer(qrUrl, {
      type: "png",
      width: 200,
      margin: 2,
      color: {
        dark: profileData.primary_color || "#000000",
        light: "#FFFFFF",
      },
    });

    return new Response(qrCodeBuffer, {
      headers: {
        ...corsHeaders,
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=3600",
        // Add additional headers to ensure public access
        "Access-Control-Max-Age": "86400",
      },
    });
  } catch (error) {
    console.error("QR Code generation error:", error);
    return new Response("Internal server error", { 
      status: 500, 
      headers: corsHeaders 
    });
  }
});