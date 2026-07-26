-- INVENTORY OGDC - AKTIVASI USER SUPABASE AUTH
-- Jalankan SETELAH user dibuat dari:
-- Supabase Dashboard > Authentication > Users > Add user
-- Centang/aktifkan Auto Confirm User.

-- Akun Admin: admin@ogdc.local
update public.profiles p
set
  username = 'admin',
  display_name = 'ADMIN',
  role = 'ADMIN',
  vendor_id = null,
  status = 'Active'
from auth.users u
where p.id = u.id
  and lower(u.email) = 'admin@ogdc.local';

-- Akun Operator: operator@ogdc.local
update public.profiles p
set
  username = 'operator',
  display_name = 'OPERATOR',
  role = 'OPERATOR',
  vendor_id = null,
  status = 'Active'
from auth.users u
where p.id = u.id
  and lower(u.email) = 'operator@ogdc.local';

-- Akun Oilman: oilman@ogdc.local
update public.profiles p
set
  username = 'oilman',
  display_name = 'OILMAN',
  role = 'OILMAN',
  vendor_id = null,
  status = 'Active'
from auth.users u
where p.id = u.id
  and lower(u.email) = 'oilman@ogdc.local';

-- OPSIONAL - Akun Vendor EON: eon@ogdc.local
-- Buat user ini di Authentication apabila diperlukan.
update public.profiles p
set
  username = 'eon',
  display_name = 'EON',
  role = 'VENDOR',
  vendor_id = 'VEN-001',
  status = 'Active'
from auth.users u
where p.id = u.id
  and lower(u.email) = 'eon@ogdc.local';

-- Verifikasi hasil
select
  p.username,
  p.display_name,
  p.role,
  p.vendor_id,
  v.vendor_name,
  p.status,
  u.email
from public.profiles p
join auth.users u on u.id = p.id
left join public.vendors v on v.vendor_id = p.vendor_id
order by p.username;
