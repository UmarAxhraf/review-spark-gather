-- Function to get daily QR code scans
CREATE OR REPLACE FUNCTION get_daily_qr_scans(company_id_param UUID, days_param INTEGER)
RETURNS TABLE (date TEXT, count BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    TO_CHAR(DATE_TRUNC('day', created_at), 'YYYY-MM-DD') as date,
    COUNT(*) as count
  FROM qr_code_scans
  WHERE 
    company_id = company_id_param AND
    created_at >= CURRENT_DATE - days_param * INTERVAL '1 day'
  GROUP BY DATE_TRUNC('day', created_at)
  ORDER BY DATE_TRUNC('day', created_at);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get top employees by scan count
CREATE OR REPLACE FUNCTION get_top_employees_by_scans(company_id_param UUID, days_param INTEGER, limit_param INTEGER)
RETURNS TABLE (employee_id UUID, employee_name TEXT, scan_count BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id as employee_id,
    e.name as employee_name,
    COUNT(qcs.id) as scan_count
  FROM employees e
  LEFT JOIN qr_code_scans qcs ON e.id = qcs.employee_id AND qcs.created_at >= CURRENT_DATE - days_param * INTERVAL '1 day'
  WHERE e.company_id = company_id_param
  GROUP BY e.id, e.name
  ORDER BY scan_count DESC
  LIMIT limit_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get QR code to review conversion rate
CREATE OR REPLACE FUNCTION get_qr_conversion_rate(company_id_param UUID, days_param INTEGER)
RETURNS TABLE (conversion_rate FLOAT) AS $$
BEGIN
  RETURN QUERY
  WITH scan_count AS (
    SELECT COUNT(*) as total
    FROM qr_code_scans
    WHERE 
      company_id = company_id_param AND
      created_at >= CURRENT_DATE - days_param * INTERVAL '1 day'
  ),
  review_count AS (
    SELECT COUNT(*) as total
    FROM reviews r
    JOIN employees e ON r.employee_id = e.id
    WHERE 
      e.company_id = company_id_param AND
      r.created_at >= CURRENT_DATE - days_param * INTERVAL '1 day'
  )
  SELECT 
    CASE 
      WHEN scan_count.total = 0 THEN 0
      ELSE review_count.total::FLOAT / scan_count.total::FLOAT
    END as conversion_rate
  FROM scan_count, review_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;