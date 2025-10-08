-- Update the review response email template to fix duplicate responses and company name
UPDATE public.email_templates 
SET body = '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
  <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <h2 style="color: #333; margin-bottom: 20px;">Thank you for your review!</h2>
    <p style="color: #666; line-height: 1.6;">Hi {{customer_name}},</p>
    
    <div style="background-color: #f8f9fa; padding: 15px; border-radius: 6px; margin: 20px 0;">
      <h3 style="color: #333; margin-top: 0;">Your Review:</h3>
      <p style="color: #666; line-height: 1.6; font-style: italic;">"{{review_text}}"</p>
    </div>
    
    <div style="background-color: #e3f2fd; padding: 15px; border-radius: 6px; margin: 20px 0;">
      <h3 style="color: #333; margin-top: 0;">Our Response:</h3>
      <p style="color: #666; line-height: 1.6;">{{admin_response}}</p>
    </div>
    
    <p style="color: #666; line-height: 1.6;">We truly value your feedback and appreciate you taking the time to share your experience with us.</p>
    
    <p style="color: #666; line-height: 1.6;">Best regards,<br>The {{company_name}} Team</p>
  </div>

  <!-- Footer -->
  <div style="background: #1e293b; color: #94a3b8; padding: 15px; text-align: center; font-size: 12px;">
    <p>This email was sent using <a href="https://review-spark-gather.vercel.app" target="_blank" style="color: #60a5fa; text-decoration: none;">SyncReviews Platform</a></p>
    <p>© 2025 SyncReviews. All rights reserved.</p>
  </div>
</div>'
WHERE name = 'Review Response Email';