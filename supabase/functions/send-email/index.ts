import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-csrf-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// CSRF token validation
const validateCSRFToken = (request: Request): boolean => {
  const csrfToken = request.headers.get("X-CSRF-Token");

  if (!csrfToken) {
    return false;
  }

  // In a production environment, you'd validate against a server-side store
  // For now, we'll validate the token format and ensure it's not empty
  return csrfToken.length === 64 && /^[a-f0-9]+$/.test(csrfToken);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Validate CSRF token
    if (!validateCSRFToken(req)) {
      return new Response(
        JSON.stringify({ error: "Invalid or missing CSRF token" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const emailRequest: EmailRequest = await req.json();

    let result;

    if (emailRequest.type === "resend") {
      result = await sendWithResend(emailRequest);
    } else if (emailRequest.type === "emailjs") {
      result = await sendWithEmailJS(emailRequest);
    } else {
      throw new Error("Invalid email service type");
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: result.success ? 200 : 400,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function sendWithResend(emailData: EmailRequest) {
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Review System <noreply@yourdomain.com>",
        to: [emailData.to],
        subject: emailData.subject,
        html: emailData.html,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Resend API error: ${response.status} - ${errorData}`);
    }

    const result = await response.json();
    return { success: true, messageId: result.id };
  } catch (error) {
    console.error("Resend email error:", error);
    return { success: false, error: error.message };
  }
}

async function sendWithEmailJS(emailData: EmailRequest) {
  try {
    // EmailJS server-side implementation
    const templateParams = {
      to_name: emailData.customerName,
      review_text: emailData.reviewText,
      admin_response: emailData.adminResponse,
      from_name: "Admin",
      email: emailData.to,
    };

    const response = await fetch(
      "https://api.emailjs.com/api/v1.0/email/send",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          service_id: Deno.env.get("EMAILJS_SERVICE_ID"),
          template_id: Deno.env.get("EMAILJS_TEMPLATE_ID"),
          user_id: Deno.env.get("EMAILJS_PUBLIC_KEY"),
          template_params: templateParams,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`EmailJS API error: ${response.status}`);
    }

    return { success: true, messageId: "emailjs-sent" };
  } catch (error) {
    console.error("EmailJS error:", error);
    return { success: false, error: error.message };
  }
}
