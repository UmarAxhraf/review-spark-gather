import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface DailyNotificationData {
  company_name: string
  contact_name: string
  contact_email: string
  new_reviews_count: number
  avg_rating: string
  pending_responses: number
  has_new_reviews: boolean
  recent_reviews: Array<{
    customer_name: string
    rating: number
    comment: string
  }>
  dashboard_url: string
  settings_url: string
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get current date for tracking
    const today = new Date().toISOString().split('T')[0]
    
    // Get all companies with daily notifications enabled
    const { data: companies, error: companiesError } = await supabaseClient
      .from('profiles')
      .select(`
        id,
        company_name,
        email,
        review_notification_frequency,
        email_notifications
      `)
      .eq('review_notification_frequency', 'daily')
      .eq('email_notifications', true)

    if (companiesError) {
      throw companiesError
    }

    console.log(`Found ${companies?.length || 0} companies with daily notifications enabled`)

    for (const company of companies || []) {
      try {
        // Check if we already sent today's notification
        const { data: existingEmail } = await supabaseClient
          .from('email_send_history')
          .select('id')
          .eq('company_id', company.id)
          .eq('email_type', 'daily_notification')
          .eq('sent_date', today)
          .single()

        if (existingEmail) {
          console.log(`Daily notification already sent to ${company.company_name} today`)
          continue
        }

        // Get yesterday's reviews for this company
        const yesterday = new Date()
        yesterday.setDate(yesterday.getDate() - 1)
        const yesterdayStart = new Date(yesterday.setHours(0, 0, 0, 0)).toISOString()
        const yesterdayEnd = new Date(yesterday.setHours(23, 59, 59, 999)).toISOString()

        const { data: reviews, error: reviewsError } = await supabaseClient
          .from('reviews')
          .select(`
            id,
            customer_name,
            rating,
            comment,
            admin_response,
            created_at
          `)
          .eq('company_id', company.id)
          .gte('created_at', yesterdayStart)
          .lte('created_at', yesterdayEnd)
          .order('created_at', { ascending: false })

        if (reviewsError) {
          console.error(`Error fetching reviews for ${company.company_name}:`, reviewsError)
          continue
        }

        const newReviewsCount = reviews?.length || 0
        const avgRating = reviews?.length 
          ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
          : '0.0'
        const pendingResponses = reviews?.filter(r => !r.admin_response).length || 0
        const recentReviews = reviews?.slice(0, 3).map(r => ({
          customer_name: r.customer_name || 'Anonymous',
          rating: r.rating,
          comment: r.comment?.substring(0, 100) + (r.comment?.length > 100 ? '...' : '') || 'No comment'
        })) || []

        // Skip if no activity and no pending responses
        if (newReviewsCount === 0 && pendingResponses === 0) {
          console.log(`No activity for ${company.company_name}, skipping notification`)
          continue
        }

        // Get email template
        const { data: template, error: templateError } = await supabaseClient
          .from('email_templates')
          .select('subject, body')
          .eq('name', 'Daily Review Notification')
          .single()

        if (templateError || !template) {
          console.error('Daily notification template not found:', templateError)
          continue
        }

        // Prepare email data
        const emailData: DailyNotificationData = {
          company_name: company.company_name || 'Your Company',
          contact_name: company.company_name || 'there', // Use company_name as contact_name
          contact_email: company.email,
          new_reviews_count: newReviewsCount,
          avg_rating: avgRating,
          pending_responses: pendingResponses,
          has_new_reviews: newReviewsCount > 0,
          recent_reviews: recentReviews,
          dashboard_url: `${Deno.env.get('FRONTEND_URL')}/dashboard`,
          settings_url: `${Deno.env.get('FRONTEND_URL')}/company-settings`
        }

        // Replace template variables
        let subject = template.subject
        let body = template.body
        
        Object.entries(emailData).forEach(([key, value]) => {
          const placeholder = `{{${key}}}`
          subject = subject.replace(new RegExp(placeholder, 'g'), String(value))
          body = body.replace(new RegExp(placeholder, 'g'), String(value))
        })

        // Handle conditional blocks for recent reviews
        if (emailData.has_new_reviews && emailData.recent_reviews.length > 0) {
          let reviewsHtml = ''
          emailData.recent_reviews.forEach(review => {
            reviewsHtml += `
            <div style="border-left: 4px solid #007bff; padding-left: 15px; margin: 15px 0;">
              <p style="margin: 5px 0; color: #666;"><strong>${review.customer_name}</strong> - ${review.rating} stars</p>
              <p style="margin: 5px 0; color: #888; font-style: italic;">"${review.comment}"</p>
            </div>`
          })
          body = body.replace(/\{\{#if has_new_reviews\}\}[\s\S]*?\{\{#each recent_reviews\}\}[\s\S]*?\{\{\/each\}\}[\s\S]*?\{\{\/if\}\}/g, 
            `<div style="margin: 20px 0;">
              <h4 style="color: #333;">Recent Reviews:</h4>
              ${reviewsHtml}
            </div>`)
        } else {
          body = body.replace(/\{\{#if has_new_reviews\}\}[\s\S]*?\{\{\/if\}\}/g, '')
        }

        // Send email via existing send-email function
        console.log(`Sending email to ${company.email} for company ${company.name}`);
        const emailResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-email`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            type: 'supabase',
            to: company.email,
            subject: subject,
            html: body
          })
        });

        if (emailResponse.ok) {
          console.log(`✅ Email sent successfully to ${company.email}`);
          // Record successful send
          await supabaseClient
            .from('email_send_history')
            .insert({
              company_id: company.id,
              email_type: 'daily_notification',
              sent_date: today,
              email_data: emailData
            })
          
          console.log(`Daily notification sent successfully to ${company.company_name}`)
        } else {
          console.error(`Failed to send daily notification to ${company.company_name}:`, await emailResponse.text())
        }

      } catch (error) {
        console.error(`Error processing daily notification for ${company.company_name}:`, error)
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Processed daily notifications for ${companies?.length || 0} companies` 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Error in send-daily-notifications:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})