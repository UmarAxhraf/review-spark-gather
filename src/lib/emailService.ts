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
    // Use secureApiCall instead of direct fetch to handle CSRF tokens
    const response = await secureApiCall(
      `${config.supabase.url}/functions/v1/send-email`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.supabase.anonKey}`,
        },
        body: JSON.stringify({
          type: "review_response",
          to: customerEmail,
          customer_name: customerName,
          review_text: reviewText,
          admin_response: adminResponse,
          company_name: companyName,
        }),
      }
    );

    // Parse the response properly
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return { success: true, data: result };
  } catch (error) {
    console.error("Email service error:", error);
    return { success: false, error: error.message };
  }
};
