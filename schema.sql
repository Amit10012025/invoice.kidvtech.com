-- ============================================================
--  KIDV Invoice — Supabase PostgreSQL Schema
--  Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- ── Enable UUID extension ──────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. USER PROFILES
--    Supabase Auth handles password/email — yahan extra data
-- ============================================================
CREATE TABLE IF NOT EXISTS user_profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL DEFAULT '',
  mobile        TEXT DEFAULT '',
  is_admin      BOOLEAN DEFAULT FALSE,
  status        TEXT DEFAULT 'pending',   -- pending | active | suspended | expired
  plan          TEXT DEFAULT 'trial',     -- trial | basic | pro
  plan_expiry   DATE,
  mobile_verified BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 2. COMPANY SETTINGS (per user)
-- ============================================================
CREATE TABLE IF NOT EXISTS company_settings (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name          TEXT DEFAULT '',
  gstin         TEXT DEFAULT '',
  address       TEXT DEFAULT '',
  city          TEXT DEFAULT '',
  state         TEXT DEFAULT '',
  pincode       TEXT DEFAULT '',
  phone         TEXT DEFAULT '',
  email         TEXT DEFAULT '',
  website       TEXT DEFAULT '',
  bank_name     TEXT DEFAULT '',
  bank_account  TEXT DEFAULT '',
  bank_ifsc     TEXT DEFAULT '',
  bank_branch   TEXT DEFAULT '',
  logo_url      TEXT DEFAULT '',
  invoice_prefix TEXT DEFAULT 'INV-',
  invoice_next_no INTEGER DEFAULT 1,
  invoice_footer TEXT DEFAULT '',
  gst_type      TEXT DEFAULT 'regular',  -- regular | composition
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- ============================================================
-- 3. CLIENTS / CUSTOMERS
-- ============================================================
CREATE TABLE IF NOT EXISTS clients (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  gstin         TEXT DEFAULT '',
  mobile        TEXT DEFAULT '',
  email         TEXT DEFAULT '',
  address       TEXT DEFAULT '',
  city          TEXT DEFAULT '',
  state         TEXT DEFAULT '',
  pincode       TEXT DEFAULT '',
  notes         TEXT DEFAULT '',
  balance       NUMERIC(12,2) DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 4. SUPPLIERS
-- ============================================================
CREATE TABLE IF NOT EXISTS suppliers (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  gstin         TEXT DEFAULT '',
  mobile        TEXT DEFAULT '',
  email         TEXT DEFAULT '',
  address       TEXT DEFAULT '',
  city          TEXT DEFAULT '',
  state         TEXT DEFAULT '',
  pincode       TEXT DEFAULT '',
  notes         TEXT DEFAULT '',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 5. PRODUCTS / SERVICES
-- ============================================================
CREATE TABLE IF NOT EXISTS products (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  hsn_sac       TEXT DEFAULT '',
  unit          TEXT DEFAULT 'Nos',
  price         NUMERIC(12,2) DEFAULT 0,
  gst_rate      NUMERIC(5,2) DEFAULT 18,
  type          TEXT DEFAULT 'product',  -- product | service
  description   TEXT DEFAULT '',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 6. INVOICES
-- ============================================================
CREATE TABLE IF NOT EXISTS invoices (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invoice_no    TEXT NOT NULL,
  client_id     UUID REFERENCES clients(id) ON DELETE SET NULL,
  client_name   TEXT NOT NULL DEFAULT '',
  client_gstin  TEXT DEFAULT '',
  client_address TEXT DEFAULT '',
  date          DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date      DATE,
  status        TEXT DEFAULT 'pending',  -- pending | paid | partial | overdue | cancelled
  subtotal      NUMERIC(12,2) DEFAULT 0,
  cgst          NUMERIC(12,2) DEFAULT 0,
  sgst          NUMERIC(12,2) DEFAULT 0,
  igst          NUMERIC(12,2) DEFAULT 0,
  total_tax     NUMERIC(12,2) DEFAULT 0,
  discount      NUMERIC(12,2) DEFAULT 0,
  total         NUMERIC(12,2) DEFAULT 0,
  amount_paid   NUMERIC(12,2) DEFAULT 0,
  amount_due    NUMERIC(12,2) DEFAULT 0,
  notes         TEXT DEFAULT '',
  terms         TEXT DEFAULT '',
  is_einvoice   BOOLEAN DEFAULT FALSE,
  irn           TEXT DEFAULT '',
  ack_no        TEXT DEFAULT '',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 7. INVOICE LINE ITEMS
-- ============================================================
CREATE TABLE IF NOT EXISTS invoice_items (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id    UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id    UUID REFERENCES products(id) ON DELETE SET NULL,
  name          TEXT NOT NULL,
  hsn_sac       TEXT DEFAULT '',
  quantity      NUMERIC(10,3) DEFAULT 1,
  unit          TEXT DEFAULT 'Nos',
  price         NUMERIC(12,2) DEFAULT 0,
  discount_pct  NUMERIC(5,2) DEFAULT 0,
  gst_rate      NUMERIC(5,2) DEFAULT 18,
  taxable_amount NUMERIC(12,2) DEFAULT 0,
  cgst_amount   NUMERIC(12,2) DEFAULT 0,
  sgst_amount   NUMERIC(12,2) DEFAULT 0,
  igst_amount   NUMERIC(12,2) DEFAULT 0,
  total         NUMERIC(12,2) DEFAULT 0,
  sort_order    INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 8. PAYMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS payments (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invoice_id    UUID REFERENCES invoices(id) ON DELETE SET NULL,
  client_id     UUID REFERENCES clients(id) ON DELETE SET NULL,
  client_name   TEXT DEFAULT '',
  invoice_no    TEXT DEFAULT '',
  amount        NUMERIC(12,2) NOT NULL DEFAULT 0,
  mode          TEXT DEFAULT 'cash',  -- cash | bank | upi | cheque | card
  date          DATE NOT NULL DEFAULT CURRENT_DATE,
  reference     TEXT DEFAULT '',
  notes         TEXT DEFAULT '',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 9. QUOTATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS quotations (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quote_no      TEXT NOT NULL,
  client_id     UUID REFERENCES clients(id) ON DELETE SET NULL,
  client_name   TEXT DEFAULT '',
  date          DATE DEFAULT CURRENT_DATE,
  valid_till    DATE,
  status        TEXT DEFAULT 'draft',  -- draft | sent | accepted | rejected
  total         NUMERIC(12,2) DEFAULT 0,
  notes         TEXT DEFAULT '',
  items         JSONB DEFAULT '[]',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 10. E-WAY BILLS
-- ============================================================
CREATE TABLE IF NOT EXISTS ewaybills (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invoice_id    UUID REFERENCES invoices(id) ON DELETE SET NULL,
  ewb_no        TEXT DEFAULT '',
  date          DATE DEFAULT CURRENT_DATE,
  valid_till    TIMESTAMPTZ,
  transporter   TEXT DEFAULT '',
  vehicle_no    TEXT DEFAULT '',
  distance_km   INTEGER DEFAULT 0,
  status        TEXT DEFAULT 'active',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 11. HSN MASTER (custom additions)
-- ============================================================
CREATE TABLE IF NOT EXISTS hsn_master (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  hsn_sac       TEXT NOT NULL,
  description   TEXT DEFAULT '',
  gst_rate      NUMERIC(5,2) DEFAULT 18,
  type          TEXT DEFAULT 'HSN',  -- HSN | SAC
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ROW LEVEL SECURITY (RLS) — Users sirf apna data dekhe
-- ============================================================
ALTER TABLE user_profiles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients          ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers        ENABLE ROW LEVEL SECURITY;
ALTER TABLE products         ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices         ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items    ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments         ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotations       ENABLE ROW LEVEL SECURITY;
ALTER TABLE ewaybills        ENABLE ROW LEVEL SECURITY;
ALTER TABLE hsn_master       ENABLE ROW LEVEL SECURITY;

-- Policies — each user sees only their own rows
DO $$ 
DECLARE
  tbl TEXT;
  tbls TEXT[] := ARRAY[
    'clients','suppliers','products','invoices',
    'invoice_items','payments','quotations','ewaybills','hsn_master'
  ];
BEGIN
  FOREACH tbl IN ARRAY tbls LOOP
    EXECUTE format('
      CREATE POLICY "%s_own_data" ON %I
        USING (user_id = auth.uid())
        WITH CHECK (user_id = auth.uid());
    ', tbl, tbl);
  END LOOP;
END $$;

CREATE POLICY "profiles_own" ON user_profiles
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE POLICY "company_own" ON company_settings
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Admin policy — admin users can see all (optional)
-- CREATE POLICY "admin_all" ON invoices USING (
--   EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = TRUE)
-- );

-- ============================================================
-- INDEXES — Query fast karo
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_invoices_user     ON invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status   ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_date     ON invoices(date DESC);
CREATE INDEX IF NOT EXISTS idx_clients_user      ON clients(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_user     ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_products_user     ON products(user_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_inv ON invoice_items(invoice_id);

-- ============================================================
-- AUTO-UPDATE updated_at trigger
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  tbl TEXT;
  tbls TEXT[] := ARRAY[
    'user_profiles','company_settings','clients','suppliers',
    'products','invoices','payments','quotations'
  ];
BEGIN
  FOREACH tbl IN ARRAY tbls LOOP
    EXECUTE format('
      CREATE TRIGGER trg_%s_updated
      BEFORE UPDATE ON %I
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
    ', tbl, tbl);
  END LOOP;
END $$;

-- ============================================================
-- AUTO-CREATE user_profile when new user signs up
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_profiles (id, name, mobile, status, plan)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'mobile', ''),
    'pending',
    'trial'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- DONE ✅
-- ============================================================
SELECT 'KIDV Invoice schema created successfully!' AS status;
