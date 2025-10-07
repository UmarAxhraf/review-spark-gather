import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface DownloadReminderData {
  company_name: string;
  contact_name: string;
  contact_email: string;
  download_url: string;
  support_url: string;
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

    // Get current date for tracking (send on Tuesdays, day after weekly reports)
    const today = new Date();
    const currentDay = today.getDay(); // 0 = Sunday, 1 = Monday, etc.

    // Only run on Tuesdays (day 2)
    if (currentDay !== 2) {
      return new Response(
        JSON.stringify({ message: "Download reminders only sent on Tuesdays" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const todayStr = today.toISOString().split("T")[0];

    // Get all companies with download alerts enabled
    const { data: companies, error: companiesError } = await supabaseClient
      .from("profiles")
      .select(
        `
        id,
        company_name,
        email,
        weekly_report_download_alert,
        email_notifications
      `
      )
      .eq("weekly_report_download_alert", true)
      .eq("email_notifications", true);

    if (companiesError) {
      throw companiesError;
    }

    console.log(
      `Found ${companies?.length || 0} companies with download alerts enabled`
    );

    for (const company of companies || []) {
      try {
        // Check if we already sent this week's reminder
        const { data: existingEmail } = await supabaseClient
          .from("email_send_history")
          .select("id")
          .eq("company_id", company.id)
          .eq("email_type", "download_reminder")
          .eq("sent_date", todayStr)
          .single();

        if (existingEmail) {
          console.log(
            `Download reminder already sent to ${company.company_name} this week`
          );
          continue;
        }

        // Check if they received a weekly report yesterday (Monday)
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split("T")[0];

        const { data: weeklyReportSent } = await supabaseClient
          .from("email_send_history")
          .select("id")
          .eq("company_id", company.id)
          .eq("email_type", "weekly_report")
          .eq("sent_date", yesterdayStr)
          .single();

        // Only send download reminder if they received a weekly report
        if (!weeklyReportSent) {
          console.log(
            `No weekly report sent to ${company.company_name} yesterday, skipping download reminder`
          );
          continue;
        }

        // Get email template
        const { data: template, error: templateError } = await supabaseClient
          .from("email_templates")
          .select("subject, body")
          .eq("name", "Weekly Download Reminder")
          .single();

        if (templateError || !template) {
          console.error("Download reminder template not found:", templateError);
          continue;
        }

        // Prepare email data
        const emailData: DownloadReminderData = {
          company_name: company.company_name || "Your Company",
          contact_name: company.company_name || "there",
          contact_email: company.email,
          download_url: `${Deno.env.get("FRONTEND_URL")}/export-reports`,
          support_url: `${Deno.env.get("FRONTEND_URL")}/support`,
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
              Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
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
            email_type: "download_reminder",
            sent_date: todayStr,
            email_data: emailData,
          });

          console.log(
            `Download reminder sent successfully to ${company.company_name}`
          );
        } else {
          console.error(
            `Failed to send download reminder to ${company.company_name}:`,
            await emailResponse.text()
          );
        }
      } catch (error) {
        console.error(
          `Error processing download reminder for ${company.company_name}:`,
          error
        );
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed download reminders for ${
          companies?.length || 0
        } companies`,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in send-download-reminders:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
