-- Add email templates for automated notifications
INSERT INTO public.email_templates (name, subject, body, type, created_at, updated_at)
VALUES 
  (
    'Daily Review Notification',
    'Daily Review Summary - {{company_name}}',
    '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
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
    </div>',
    'notification',
    NOW(),
    NOW()
  ),
  (
    'Weekly Report Email',
    'Weekly Analytics Report - {{company_name}}',
    '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
      <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <h2 style="color: #333; margin-bottom: 20px;">Weekly Analytics Report</h2>
        <p style="color: #666; line-height: 1.6;">Hello {{contact_name}},</p>
        <p style="color: #666; line-height: 1.6;">Here''s your weekly performance summary for <strong>{{company_name}}</strong>:</p>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 6px; margin: 20px 0;">
          <h3 style="color: #333; margin-top: 0;">This Week''s Performance</h3>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
            <div>
              <h4 style="color: #007bff; margin: 0;">{{total_reviews}}</h4>
              <p style="color: #666; margin: 5px 0;">Total Reviews</p>
            </div>
            <div>
              <h4 style="color: #28a745; margin: 0;">{{avg_rating}}</h4>
              <p style="color: #666; margin: 5px 0;">Average Rating</p>
            </div>
            <div>
              <h4 style="color: #ffc107; margin: 0;">{{response_rate}}%</h4>
              <p style="color: #666; margin: 5px 0;">Response Rate</p>
            </div>
            <div>
              <h4 style="color: #17a2b8; margin: 0;">{{qr_scans}}</h4>
              <p style="color: #666; margin: 5px 0;">QR Code Scans</p>
            </div>
          </div>
        </div>
        
        <div style="background-color: #e9ecef; padding: 20px; border-radius: 6px; margin: 20px 0;">
          <h3 style="color: #333; margin-top: 0;">Rating Breakdown</h3>
          <div style="color: #666;">
            <p>⭐⭐⭐⭐⭐ 5 Stars: {{five_star_count}} ({{five_star_percent}}%)</p>
            <p>⭐⭐⭐⭐ 4 Stars: {{four_star_count}} ({{four_star_percent}}%)</p>
            <p>⭐⭐⭐ 3 Stars: {{three_star_count}} ({{three_star_percent}}%)</p>
            <p>⭐⭐ 2 Stars: {{two_star_count}} ({{two_star_percent}}%)</p>
            <p>⭐ 1 Star: {{one_star_count}} ({{one_star_percent}}%)</p>
          </div>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="{{analytics_url}}" style="background-color: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-right: 10px;">View Full Analytics</a>
          <a href="{{export_url}}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Download Report</a>
        </div>
        
        <p style="color: #999; font-size: 12px; text-align: center; margin-top: 30px;">
          You''re receiving this because you have weekly reports enabled. 
          <a href="{{settings_url}}" style="color: #007bff;">Update preferences</a>
        </p>
      </div>

      <!-- MyApps Footer -->
      <div class="myapps-footer" style="background: #1e293b; color: #94a3b8; padding: 15px; text-align: center; font-size: 12px;">
        <p>This email was sent using <a href="https://review-spark-gather.vercel.app" target="_blank" style="color: #60a5fa; text-decoration: none;">SyncReviews Platform</a></p>
        <p>© 2025 SyncReviews. All rights reserved.</p>
      </div>
    </div>',
    'report',
    NOW(),
    NOW()
  ),
  (
    'Weekly Download Reminder',
    'Weekly Report Ready for Download - {{company_name}}',
    '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
      <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <h2 style="color: #333; margin-bottom: 20px;">📊 Your Weekly Report is Ready!</h2>
        <p style="color: #666; line-height: 1.6;">Hello {{contact_name}},</p>
        <p style="color: #666; line-height: 1.6;">Your weekly analytics report for <strong>{{company_name}}</strong> is now available for download.</p>
        
        <div style="background-color: #e3f2fd; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #2196f3;">
          <h3 style="color: #1976d2; margin-top: 0;">Report Highlights</h3>
          <ul style="color: #666; line-height: 1.8;">
            <li>Complete review analytics and trends</li>
            <li>Customer feedback insights</li>
            <li>Performance metrics and comparisons</li>
            <li>QR code scan analytics</li>
            <li>Employee performance data</li>
          </ul>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="{{download_url}}" style="background-color: #2196f3; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">📥 Download Report</a>
        </div>
        
        <div style="background-color: #fff3cd; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #ffc107;">
          <p style="color: #856404; margin: 0; font-size: 14px;">
            <strong>💡 Tip:</strong> Reports are available for 30 days. Download now to keep your data for future reference.
          </p>
        </div>
        
        <p style="color: #666; line-height: 1.6; text-align: center;">
          Need help interpreting your data? 
          <a href="{{support_url}}" style="color: #2196f3;">Contact our support team</a>
        </p>
        
        <p style="color: #999; font-size: 12px; text-align: center; margin-top: 30px;">
          You''re receiving this because you have weekly download alerts enabled. 
          <a href="{{settings_url}}" style="color: #2196f3;">Update preferences</a>
        </p>
      </div>

      <!-- MyApps Footer -->
      <div class="myapps-footer" style="background: #1e293b; color: #94a3b8; padding: 15px; text-align: center; font-size: 12px;">
        <p>This email was sent using <a href="https://review-spark-gather.vercel.app" target="_blank" style="color: #60a5fa; text-decoration: none;">SyncReviews Platform</a></p>
        <p>© 2025 SyncReviews. All rights reserved.</p>
      </div>
    </div>',
    'reminder',
    NOW(),
    NOW()
  );

-- Create a table to track email sending history and prevent duplicates
CREATE TABLE IF NOT EXISTS public.email_send_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  email_type TEXT NOT NULL CHECK (email_type IN ('daily_notification', 'weekly_report', 'download_reminder')),
  sent_date DATE NOT NULL,
  email_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(company_id, email_type, sent_date)
);

-- Enable RLS on email_send_history
ALTER TABLE public.email_send_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for email_send_history
CREATE POLICY "Users can view their own email history" ON public.email_send_history
  FOR SELECT USING (company_id = auth.uid());

CREATE POLICY "System can insert email history" ON public.email_send_history
  FOR INSERT WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_email_send_history_company_date 
  ON public.email_send_history(company_id, sent_date);
CREATE INDEX IF NOT EXISTS idx_email_send_history_type_date 
  ON public.email_send_history(email_type, sent_date);
