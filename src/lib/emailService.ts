import emailjs from "@emailjs/browser";

// Initialize EmailJS with your public key
const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID;
const EMAILJS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

// Secure Email Service - No exposed API keys
import { config } from "./config";
import { secureApiCall } from "./csrf";

export interface EmailData {
  to: string;
  subject: string;
  message: string;
  companyName?: string;
  reviewerName?: string;
  employeeName?: string;
}

export const sendEmailWithResend = async (
  emailData: EmailData
): Promise<boolean> => {
  try {
    const response = await secureApiCall(
      `${config.supabase.url}/functions/v1/send-email`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.supabase.anonKey}`,
        },
        body: JSON.stringify({
          provider: "resend",
          ...emailData,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to send email");
    }

    return true;
  } catch (error) {
    console.error("Error sending email with Resend:", error);
    return false;
  }
};

// Consolidated sendReviewResponseEmail function
export const sendReviewResponseEmail = async ({
  customerEmail,
  customerName,
  reviewText,
  adminResponse,
  companyName = "Review Spark Gather",
}: {
  customerEmail: string;
  customerName: string;
  reviewText: string;
  adminResponse: string;
  companyName?: string;
}) => {
  try {
    // Try EmailJS first (direct client-side)
    if (EMAILJS_SERVICE_ID && EMAILJS_TEMPLATE_ID && EMAILJS_PUBLIC_KEY) {
      const templateParams = {
        to_name: customerName,
        review_text: reviewText,
        admin_response: adminResponse,
        from_name: "Admin",
        email: customerEmail,
      };

      const result = await emailjs.send(
        EMAILJS_SERVICE_ID,
        EMAILJS_TEMPLATE_ID,
        templateParams,
        EMAILJS_PUBLIC_KEY
      );

      return { success: true, messageId: result.text };
    }

    // Fallback to server-side email function
    const response = await fetch(
      `${config.supabase.url}/functions/v1/send-email`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.supabase.anonKey}`,
        },
        body: JSON.stringify({
          to: customerEmail,
          customerName,
          reviewText,
          adminResponse,
          companyName,
          type: "emailjs",
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Email API error: ${response.status} - ${errorData}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error("Email service error:", error);
    return { success: false, error: error.message };
  }
};
