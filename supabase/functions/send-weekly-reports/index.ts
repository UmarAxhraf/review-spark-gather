import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface WeeklyReportData {
  company_name: string;
  contact_name: string;
  contact_email: string;
  total_reviews: number;
  avg_rating: string;
  response_rate: number;
  qr_scans: number;
  five_star_count: number;
  five_star_percent: number;
  four_star_count: number;
  four_star_percent: number;
  three_star_count: number;
  three_star_percent: number;
  two_star_count: number;
  two_star_percent: number;
  one_star_count: number;
  one_star_percent: number;
  analytics_url: string;
  export_url: string;
  settings_url: string;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get current date for tracking (send on Mondays for previous week)
    const today = new Date();
    const currentDay = today.getDay(); // 0 = Sunday, 1 = Monday, etc.

    // Only run on Mondays (day 1)
    if (currentDay !== 1) {
      return new Response(
        JSON.stringify({ message: "Weekly reports only sent on Mondays" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - 7); // Last Monday
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(today);
    weekEnd.setDate(today.getDate() - 1); // Last Sunday
    weekEnd.setHours(23, 59, 59, 999);

    const todayStr = today.toISOString().split("T")[0];

    // Get all companies with weekly reports enabled
    const { data: companies, error: companiesError } = await supabaseClient
      .from("profiles")
      .select(
        `
        id,
        company_name,
      
        email,
        weekly_reports,
        email_notifications
      `
      )
      .eq("weekly_reports", true)
      .eq("email_notifications", true);

    if (companiesError) {
      throw companiesError;
    }

    console.log(
      `Found ${companies?.length || 0} companies with weekly reports enabled`
    );

    for (const company of companies || []) {
      try {
        // Check if we already sent this week's report
        const { data: existingEmail } = await supabaseClient
          .from("email_send_history")
          .select("id")
          .eq("company_id", company.id)
          .eq("email_type", "weekly_report")
          .eq("sent_date", todayStr)
          .single();

        if (existingEmail) {
          console.log(
            `Weekly report already sent to ${company.company_name} this week`
          );
          continue;
        }

        // Get week's reviews for this company
        const { data: reviews, error: reviewsError } = await supabaseClient
          .from("reviews")
          .select(
            `
            id,
            rating,
            response,
            created_at
          `
          )
          .eq("company_id", company.id)
          .gte("created_at", weekStart.toISOString())
          .lte("created_at", weekEnd.toISOString());

        if (reviewsError) {
          console.error(
            `Error fetching reviews for ${company.company_name}:`,
            reviewsError
          );
          continue;
        }

        // Get QR code scans for the week
        const { data: qrScans, error: qrError } = await supabaseClient
          .from("qr_code_scans")
          .select("id")
          .eq("company_id", company.id)
          .gte("scanned_at", weekStart.toISOString())
          .lte("scanned_at", weekEnd.toISOString());

        if (qrError) {
          console.error(
            `Error fetching QR scans for ${company.company_name}:`,
            qrError
          );
        }

        const totalReviews = reviews?.length || 0;
        const avgRating =
          totalReviews > 0
            ? (
                reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
              ).toFixed(1)
            : "0.0";
        const responseRate =
          totalReviews > 0
            ? Math.round(
                (reviews.filter((r) => r.response).length / totalReviews) * 100
              )
            : 0;
        const qrScansCount = qrScans?.length || 0;

        // Calculate rating breakdown
        const ratingCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        reviews?.forEach((review) => {
          ratingCounts[review.rating as keyof typeof ratingCounts]++;
        });

        const getRatingPercent = (count: number) =>
          totalReviews > 0 ? Math.round((count / totalReviews) * 100) : 0;

        // Skip if no activity
        if (totalReviews === 0 && qrScansCount === 0) {
          console.log(
            `No activity for ${company.company_name} this week, skipping report`
          );
          continue;
        }

        // Get email template
        const { data: template, error: templateError } = await supabaseClient
          .from("email_templates")
          .select("subject, body")
          .eq("name", "Weekly Report Email")
          .single();

        if (templateError || !template) {
          console.error("Weekly report template not found:", templateError);
          continue;
        }

        // Prepare email data
        const emailData: WeeklyReportData = {
          company_name: company.company_name || "Your Company",
          contact_name: company.company_name || "there",
          contact_email: company.email,
          total_reviews: totalReviews,
          avg_rating: avgRating,
          response_rate: responseRate,
          qr_scans: qrScansCount,
          five_star_count: ratingCounts[5],
          five_star_percent: getRatingPercent(ratingCounts[5]),
          four_star_count: ratingCounts[4],
          four_star_percent: getRatingPercent(ratingCounts[4]),
          three_star_count: ratingCounts[3],
          three_star_percent: getRatingPercent(ratingCounts[3]),
          two_star_count: ratingCounts[2],
          two_star_percent: getRatingPercent(ratingCounts[2]),
          one_star_count: ratingCounts[1],
          one_star_percent: getRatingPercent(ratingCounts[1]),
          analytics_url: `${Deno.env.get("FRONTEND_URL")}/analytics`,
          export_url: `${Deno.env.get("FRONTEND_URL")}/export-reports`,
          settings_url: `${Deno.env.get("FRONTEND_URL")}/company-settings`,
        };

        // Replace template variables
        let subject = template.subject;
        let body = template.body;

        Object.entries(emailData).forEach(([key, value]) => {
          const placeholder = `{{${key}}}`;
          subject = subject.replace(
            new RegExp(placeholder, "g"),
            String(value)
          );
          body = body.replace(new RegExp(placeholder, "g"), String(value));
        });

        // Send email via existing send-email function
        const emailResponse = await fetch(
          `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-email`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${Deno.env.get(
                "SUPABASE_SERVICE_ROLE_KEY"
              )}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              type: "hostinger",
              to: company.email,
              subject: subject,
              html: body,
            }),
          }
        );

        if (emailResponse.ok) {
          // Record successful send
          await supabaseClient.from("email_send_history").insert({
            company_id: company.id,
            email_type: "weekly_report",
            sent_date: todayStr,
            email_data: emailData,
          });

          console.log(
            `Weekly report sent successfully to ${company.company_name}`
          );
        } else {
          console.error(
            `Failed to send weekly report to ${company.company_name}:`,
            await emailResponse.text()
          );
        }
      } catch (error) {
        console.error(
          `Error processing weekly report for ${company.company_name}:`,
          error
        );
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed weekly reports for ${
          companies?.length || 0
        } companies`,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in send-weekly-reports:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
