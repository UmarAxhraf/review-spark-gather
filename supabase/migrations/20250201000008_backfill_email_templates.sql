-- Backfill default email templates for existing users who don't have them

-- Insert Positive Response template for users who don't have it
INSERT INTO public.review_templates (company_id, name, subject, content, category, is_active)
SELECT 
  p.id as company_id,
  'Positive Response' as name,
  'Thank you for your wonderful review!' as subject,
  'Thank you so much for taking the time to leave us such a positive review! We''re thrilled to hear about your great experience with our team. Your feedback means the world to us and motivates us to continue providing excellent service.' as content,
  'positive' as category,
  true as is_active
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.review_templates rt 
  WHERE rt.company_id = p.id AND rt.name = 'Positive Response'
);

-- Insert Negative Response template for users who don't have it
INSERT INTO public.review_templates (company_id, name, subject, content, category, is_active)
SELECT 
  p.id as company_id,
  'Negative Response' as name,
  'We apologize and want to make this right' as subject,
  'Thank you for bringing this to our attention. We sincerely apologize for not meeting your expectations. Your feedback is valuable to us, and we would love the opportunity to discuss this further and make things right. Please contact us directly so we can address your concerns.' as content,
  'negative' as category,
  true as is_active
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.review_templates rt 
  WHERE rt.company_id = p.id AND rt.name = 'Negative Response'
);

-- Insert General Thank You template for users who don't have it
INSERT INTO public.review_templates (company_id, name, subject, content, category, is_active)
SELECT 
  p.id as company_id,
  'General Thank You' as name,
  'Thank you for your feedback' as subject,
  'Thank you for taking the time to share your feedback with us. We appreciate all reviews as they help us improve our service and better serve our customers.' as content,
  'general' as category,
  true as is_active
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.review_templates rt 
  WHERE rt.company_id = p.id AND rt.name = 'General Thank You'
);