-- Fix the Daily Review Notification template
UPDATE public.email_templates 
SET body = '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
  <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <h2 style="color: #333; margin-bottom: 20px;">Daily Review Summary</h2>
    <p style="color: #666; line-height: 1.6;">Hello {{contact_name}},</p>
    <p style="color: #666; line-height: 1.6;">Here''s your daily review summary for <strong>{{company_name}}</strong>:</p>
    
    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 6px; margin: 20px 0;">
      <h3 style="color: #333; margin-top: 0;">Today''s Activity</h3>
      <ul style="color: #666; line-height: 1.8;">
        <li><strong>{{new_reviews_count}}</strong> new reviews received</li>
        <li><strong>{{avg_rating}}</strong> average rating</li>
        <li><strong>{{pending_responses}}</strong> reviews pending response</li>
      </ul>
    </div>
    
    {{#if has_new_reviews}}
    <div style="margin: 20px 0;">
      <h4 style="color: #333;">Recent Reviews:</h4>
      {{#each recent_reviews}}
      <div style="border-left: 4px solid #007bff; padding-left: 15px; margin: 15px 0;">
        <p style="margin: 5px 0; color: #666;"><strong>{{customer_name}}</strong> - {{rating}} stars</p>
        <p style="margin: 5px 0; color: #888; font-style: italic;">"{{comment}}"</p>
      </div>
      {{/each}}
    </div>
    {{/if}}
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{dashboard_url}}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View Dashboard</a>
    </div>
    
    <p style="color: #999; font-size: 12px; text-align: center; margin-top: 30px;">
      You''re receiving this because you have daily review notifications enabled. 
      <a href="{{settings_url}}" style="color: #007bff;">Update preferences</a>
    </p>
  </div>

  <!-- MyApps Footer -->
  <div class="myapps-footer" style="background: #1e293b; color: #94a3b8; padding: 15px; text-align: center; font-size: 12px;">
    <p>This email was sent using <a href="https://review-spark-gather.vercel.app" target="_blank" style="color: #60a5fa; text-decoration: none;">SyncReviews Platform</a></p>
    <p>© 2025 SyncReviews. All rights reserved.</p>
  </div>
</div>'
WHERE name = 'Daily Review Notification';