export interface Employee {
  id: string;
  name: string;
  email: string;
  department: string;
  position: string;
  company_id: string;
  qr_is_active: boolean;
  qr_expires_at?: string;
  qr_scan_limit?: number;
  scan_count?: number;
  category_id?: string;
  category?: {
    id: string;
    name: string;
    color: string;
  };
  employee_tags?: {
    tag_id: string;
    tag: {
      id: string;
      name: string;
      color: string;
    };
  }[];
  created_at: string;
  updated_at: string;
}