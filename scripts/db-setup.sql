-- Idempotent schema + seed for the LopezXconstruction window & door site.
-- Run against any Postgres database (Neon, Supabase, Vercel Postgres, ...):
--   psql "$DATABASE_URL" -f scripts/db-setup.sql
-- Safe to run multiple times.

CREATE TABLE IF NOT EXISTS window_door_products (
  id text PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  category text NOT NULL,
  description text NOT NULL,
  starting_price integer NOT NULL,
  image_url text,
  active boolean NOT NULL DEFAULT true,
  featured boolean NOT NULL DEFAULT false,
  badge text,
  features text[] NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS window_door_quotes (
  id text PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  postal_code text NOT NULL,
  project_type text NOT NULL,
  product_id text NOT NULL REFERENCES window_door_products(id),
  quantity integer NOT NULL,
  timeframe text NOT NULL,
  include_installation boolean NOT NULL,
  include_removal boolean NOT NULL,
  estimate_low integer NOT NULL,
  estimate_high integer NOT NULL,
  status text NOT NULL DEFAULT 'new',
  notes text,
  admin_note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS window_door_business_settings (
  id text PRIMARY KEY,
  business_name text NOT NULL,
  phone text NOT NULL,
  email text NOT NULL,
  service_area text NOT NULL,
  currency text NOT NULL,
  installation_per_unit integer NOT NULL,
  removal_per_unit integer NOT NULL,
  estimate_buffer_percent integer NOT NULL
);

CREATE TABLE IF NOT EXISTS window_door_admin_users (
  id text PRIMARY KEY,
  username text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS window_door_reviews (
  id text PRIMARY KEY,
  name text NOT NULL,
  rating integer NOT NULL,
  comment text NOT NULL,
  approved boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO window_door_business_settings (
  id, business_name, phone, email, service_area, currency,
  installation_per_unit, removal_per_unit, estimate_buffer_percent
) VALUES (
  'default', 'LopezXconstruction', '(555) 014-2080', 'hello@lopezxconstruction.com',
  'Portland metro & surrounding areas', 'USD', 350, 150, 15
) ON CONFLICT (id) DO NOTHING;

-- Default admin account: admin / admin123  (change it after first login!)
INSERT INTO window_door_admin_users (id, username, password_hash) VALUES (
  'admin',
  'admin',
  'scrypt$a9f4af4d9862587589acd1555a543fc4$329dac8c677bde50690d96f0787d5412ea758fc9374fe5a5da00763d136726ea5e73ed8326a633c0a1850692449b478452b75289ae6cbad89b7363503afa7b8b'
) ON CONFLICT (username) DO NOTHING;

INSERT INTO window_door_products (
  id, slug, name, category, description, starting_price, image_url,
  active, featured, badge, features
) VALUES
  ('p-casement', 'casement-windows', 'Casement Windows', 'window',
   'Crank-out casement windows with tight seals and a bright, unobstructed view.',
   850, '/casement-windows.jpg', true, true, 'Most popular',
   ARRAY['WinGuard safety coating', 'PVC-U frame', 'Easy-clean hardware']),
  ('p-entry-door', 'entry-doors', 'Modern Entry Door', 'door',
   'A thermally broken entry door built to keep the weather out and the welcome in.',
   2400, '/entry-door.jpeg', true, true, 'Handcrafted',
   ARRAY['Triple-point locking', 'Fiberglass core', 'Custom finishes']),
  ('p-picture', 'picture-windows', 'Picture Windows', 'window',
   'Fixed panes of glass that frame the view with zero noise.',
   700, '/picture-windows.jpg', true, false, NULL,
   ARRAY['Double-glazed', 'UV coating'])
ON CONFLICT (id) DO NOTHING;
