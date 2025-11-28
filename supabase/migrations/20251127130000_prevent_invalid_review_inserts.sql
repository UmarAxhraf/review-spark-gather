-- Prevent invalid review submissions when QR codes are expired/deactivated
-- or when the company's subscription is expired or ended.

create or replace function prevent_invalid_review_insert()
returns trigger as $$
declare
  v_company_id uuid;
  v_qr_is_active boolean;
  v_qr_expires_at timestamptz;
  v_status text;
  v_subscription_end timestamptz;
  v_trial_end timestamptz;
begin
  -- Determine company from employee or explicit target
  if NEW.employee_id is not null then
    select e.company_id, e.qr_is_active, e.qr_expires_at
    into v_company_id, v_qr_is_active, v_qr_expires_at
    from employees e
    where e.id = NEW.employee_id;

    if v_company_id is null then
      raise exception 'Invalid employee for review' using errcode = 'P0001';
    end if;

    -- QR validations
    if v_qr_is_active is false then
      raise exception 'QR code is deactivated and cannot accept reviews' using errcode = 'P0001';
    end if;

    if v_qr_expires_at is not null and v_qr_expires_at <= now() then
      raise exception 'QR code has expired and cannot accept reviews' using errcode = 'P0001';
    end if;

    -- Ensure company_id consistency
    NEW.company_id := v_company_id;
  elsif NEW.target_company_id is not null then
    v_company_id := NEW.target_company_id;
  else
    v_company_id := NEW.company_id;
  end if;

  if v_company_id is null then
    raise exception 'Company not found for review submission' using errcode = 'P0001';
  end if;

  -- Subscription validations
  select p.subscription_status, p.subscription_end, p.trial_end
  into v_status, v_subscription_end, v_trial_end
  from profiles p
  where p.id = v_company_id;

  if v_status is null then
    -- Safe default: block when status unknown
    raise exception 'Company subscription is not active. Reviews are not allowed' using errcode = 'P0001';
  end if;

  if v_status in ('expired','ended') then
    raise exception 'Company subscription has expired or ended. Reviews are not allowed' using errcode = 'P0001';
  end if;

  if v_status = 'trial' and v_trial_end is not null and v_trial_end <= now() then
    raise exception 'Company trial has ended. Reviews are not allowed' using errcode = 'P0001';
  end if;

  if v_status in ('active','canceled') and v_subscription_end is not null and v_subscription_end <= now() then
    raise exception 'Company subscription period has ended. Reviews are not allowed' using errcode = 'P0001';
  end if;

  return NEW;
end;
$$ language plpgsql security definer;

create trigger trg_prevent_invalid_review_insert
before insert on reviews
for each row
execute procedure prevent_invalid_review_insert();