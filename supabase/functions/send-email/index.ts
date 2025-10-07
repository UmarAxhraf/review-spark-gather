import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface EmailRequest {
  to: string;
  subject: string;
  html: string;
  from?: string;
  fromName?: string;
  type?: string;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-csrf-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const validateCSRFToken = (request: Request): boolean => {
  // Skip CSRF validation for service role requests (internal function calls)
  const authHeader = request.headers.get("authorization");
  if (authHeader && authHeader.includes(Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '')) {
    return true;
  }
  
  const csrfToken = request.headers.get("X-CSRF-Token");
  if (!csrfToken) {
    console.warn("Missing CSRF token");
    return false;
  }
  return true;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!validateCSRFToken(req)) {
      return new Response(
        JSON.stringify({ error: "Invalid CSRF token" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const emailRequest: EmailRequest = await req.json();
    let result;

    // Use Hostinger SMTP as primary
    if (emailRequest.type === "supabase" || !emailRequest.type) {
      result = await sendWithHostingerSMTP(emailRequest);
    } else if (emailRequest.type === "resend") {
      result = await sendWithResend(emailRequest);
    }

    if (result?.success) {
      return new Response(
        JSON.stringify({ success: true, data: result.data }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    } else {
      return new Response(
        JSON.stringify({ error: result?.error || "Email sending failed" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
  } catch (error) {
    console.error("Error in send-email function:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

// Native SMTP implementation for Hostinger
async function sendWithHostingerSMTP(emailData: EmailRequest) {
  try {
    const smtpHost = Deno.env.get("SMTP_HOST") || "smtp.hostinger.com";
    const smtpPort = parseInt(Deno.env.get("SMTP_PORT") || "465");
    const smtpUser = Deno.env.get("SMTP_USER") || "support@syncreviews.com";
    const smtpPass = Deno.env.get("SMTP_PASSWORD");
    const smtpSecure = Deno.env.get("SMTP_SECURE") === "true";
    
    if (!smtpPass) {
      throw new Error("SMTP_PASSWORD environment variable is required");
    }

    // Connect to SMTP server
    const conn = await Deno.connectTls({
      hostname: smtpHost,
      port: smtpPort,
    });

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    // Helper function to send command and read response
    async function sendCommand(command: string): Promise<string> {
      await conn.write(encoder.encode(command + "\r\n"));
      const buffer = new Uint8Array(1024);
      const bytesRead = await conn.read(buffer);
      return decoder.decode(buffer.subarray(0, bytesRead || 0));
    }

    // SMTP conversation
    let response = await sendCommand(""); // Read initial greeting
    console.log("SMTP Greeting:", response);

    response = await sendCommand(`EHLO ${smtpHost}`);
    console.log("EHLO Response:", response);

    response = await sendCommand("AUTH LOGIN");
    console.log("AUTH LOGIN Response:", response);

    // Send username (base64 encoded)
    const username = btoa(smtpUser);
    response = await sendCommand(username);
    console.log("Username Response:", response);

    // Send password (base64 encoded)
    const password = btoa(smtpPass);
    response = await sendCommand(password);
    console.log("Password Response:", response);

    // Send MAIL FROM
    response = await sendCommand(`MAIL FROM:<${emailData.from || smtpUser}>`);
    console.log("MAIL FROM Response:", response);

    // Send RCPT TO
    response = await sendCommand(`RCPT TO:<${emailData.to}>`);
    console.log("RCPT TO Response:", response);

    // Send DATA
    response = await sendCommand("DATA");
    console.log("DATA Response:", response);

    // Send email content
    const emailContent = [
      `From: ${emailData.fromName || "SyncReviews"} <${emailData.from || smtpUser}>`,
      `To: ${emailData.to}`,
      `Subject: ${emailData.subject}`,
      "MIME-Version: 1.0",
      "Content-Type: text/html; charset=UTF-8",
      "",
      emailData.html,
      "."
    ].join("\r\n");

    response = await sendCommand(emailContent);
    console.log("Email Content Response:", response);

    // Send QUIT
    response = await sendCommand("QUIT");
    console.log("QUIT Response:", response);

    conn.close();

    return { success: true, data: { message: "Email sent successfully via Hostinger SMTP" } };
  } catch (error) {
    console.error("Hostinger SMTP error:", error);
    return { success: false, error: `Hostinger SMTP error: ${error.message}` };
  }
}

async function sendWithResend(emailData: EmailRequest) {
  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY environment variable is required");
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${emailData.fromName || "SyncReviews"} <${emailData.from || "support@syncreviews.com"}>`,
        to: [emailData.to],
        subject: emailData.subject,
        html: emailData.html,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Resend email error: ${response.status} - ${errorData}`);
    }

    const result = await response.json();
    return { success: true, data: result };
  } catch (error) {
    console.error("Resend error:", error);
    return { success: false, error: error.message };
  }
}
