-- Insert default categories for all existing companies
INSERT INTO categories (name, description, color, company_id)
SELECT 
  category_name,
  category_description,
  category_color,
  profiles.id as company_id
FROM profiles
CROSS JOIN (
  VALUES 
    ('Employee', 'Individual team members', '#3B82F6'),
    ('Campaign', 'Marketing and promotional campaigns', '#10B981'),
    ('Branch', 'Office locations and branches', '#F59E0B'),
    ('Event', 'Events and special occasions', '#EF4444'),
    ('Product', 'Products and services', '#8B5CF6')
) AS default_categories(category_name, category_description, category_color)
WHERE NOT EXISTS (
  SELECT 1 FROM categories 
  WHERE categories.company_id = profiles.id 
  AND categories.name = category_name
);

-- Insert default tags for all existing companies
INSERT INTO tags (name, description, color, company_id)
SELECT 
  tag_name,
  tag_description,
  tag_color,
  profiles.id as company_id
FROM profiles
CROSS JOIN (
  VALUES 
    ('VIP', 'Very Important Person', '#FFD700'),
    ('New', 'New team member', '#22C55E'),
    ('Manager', 'Management level', '#3B82F6'),
    ('Remote', 'Remote worker', '#8B5CF6'),
    ('Part-time', 'Part-time employee', '#F59E0B')
) AS default_tags(tag_name, tag_description, tag_color)
WHERE NOT EXISTS (
  SELECT 1 FROM tags 
  WHERE tags.company_id = profiles.id 
  AND tags.name = tag_name
);