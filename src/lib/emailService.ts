import emailjs from "@emailjs/browser";

// Initialize EmailJS with your public key
const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID;
const EMAILJS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

export interface EmailData {
  to: string;
  subject: string;
  html: string;
  customerName?: string;
  reviewText?: string;
  adminResponse?: string;
  companyName?: string;
}

export const sendEmailWithResend = async ({ to, subject, html }: EmailData) => {
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${import.meta.env.VITE_RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Review System <noreply@yourdomain.com>", // You can change this
        to: [to],
        subject,
        html,
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
    // EmailJS template parameters - matching your tested template
    const templateParams = {
      to_name: customerName,           // review giver name
      review_text: reviewText,         // from review
      admin_response: adminResponse,   // response by admin from the template
      from_name: "Admin",             // Admin
      email: customerEmail,            // get email from submitted review to send feedback
    };

    const result = await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID,
      templateParams,
      EMAILJS_PUBLIC_KEY
    );

    return { success: true, messageId: result.text };
  } catch (error) {
    console.error("EmailJS error:", error);
    return { success: false, error: error.message };
  }
};
