-- ============================================================================
-- Car Showroom — Complete Supabase Setup Script
-- ============================================================================
-- Run this ONCE in the SQL Editor of a freshly-created Supabase project.
-- It creates all tables, functions, triggers, indexes, RLS policies,
-- and inserts default seed data.
--
-- Table dependency order:
--   1. car_offers       (core — imported by scraper)
--   2. partners         (partner companies)
--   3. partner_filters  (brand/model filters per partner)
--   4. partner_offers   (custom pricing & visibility per partner×offer)
--   5. brand_filters    (global brand whitelist)
--   6. model_filters    (model whitelist per brand)
--   7. app_settings     (global application config — singleton)
--   8. widgets          (sidebar / content widgets)
--   9. widget_partners  (widget ↔ partner junction)
-- ============================================================================


-- 0. EXTENSIONS ----------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ========================================================================
-- 1. CAR_OFFERS  (core table — populated by the auto-scraper)
-- ========================================================================
CREATE TABLE IF NOT EXISTS car_offers (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Advert metadata
    advert_id       TEXT UNIQUE,
    advert_url      TEXT,
    status          TEXT,
    offer_published TEXT,

    -- Vehicle identity
    brand           TEXT,
    model           TEXT,
    model_version   TEXT,
    year            INTEGER,
    generation      TEXT,
    new_used        TEXT,
    body_type       TEXT,

    -- Pricing
    price           BIGINT,
    vat_invoice     BOOLEAN,

    -- Technical
    mileage         BIGINT,
    fuel_type       TEXT,
    engine_power    TEXT,
    transmission    TEXT,

    -- Appearance
    color           TEXT,
    colour_type     TEXT,

    -- Origin
    country_origin  TEXT,
    no_accident     BOOLEAN,

    -- Structured data
    technical_spec  JSONB,
    features        JSONB,

    -- Photos
    main_photo_url      TEXT,
    additional_photos   TEXT[],

    -- Description
    description     TEXT,

    -- Seller info
    seller_type         TEXT,
    seller_id           TEXT,
    seller_name         TEXT,
    seller_address      TEXT,
    seller_city         TEXT,
    seller_region       TEXT,
    seller_country      TEXT,
    seller_postal_code  TEXT,
    google_maps_url     TEXT
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_car_offers_brand       ON car_offers(brand);
CREATE INDEX IF NOT EXISTS idx_car_offers_model       ON car_offers(model);
CREATE INDEX IF NOT EXISTS idx_car_offers_year        ON car_offers(year);
CREATE INDEX IF NOT EXISTS idx_car_offers_price       ON car_offers(price);
CREATE INDEX IF NOT EXISTS idx_car_offers_created     ON car_offers(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_car_offers_advert_id   ON car_offers(advert_id);

-- RLS
ALTER TABLE car_offers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read car_offers"  ON car_offers FOR SELECT USING (true);
CREATE POLICY "Allow service write car_offers" ON car_offers FOR ALL USING (true) WITH CHECK (true);

COMMENT ON TABLE car_offers IS 'Car offers imported by the auto-scraper';


-- ========================================================================
-- 2. PARTNERS
-- ========================================================================
CREATE TABLE IF NOT EXISTS partners (
    id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug                        TEXT UNIQUE NOT NULL,
    company_name                TEXT NOT NULL,
    company_address             TEXT,
    vat_number                  TEXT,
    contact_person              TEXT,
    phone                       TEXT,
    email                       TEXT,
    website                     TEXT,
    default_margin_percent      DECIMAL(5,2) DEFAULT 0,
    show_net_prices             BOOLEAN DEFAULT false,
    show_secondary_currency     BOOLEAN DEFAULT false,
    financing_cost_percent      NUMERIC(5,2) NOT NULL DEFAULT 0,
    additional_cost_items       JSONB NOT NULL DEFAULT '[]'::jsonb,
    transport_cost_tiers_eur    JSONB NOT NULL DEFAULT '{"1":0,"2":0,"4":0,"8":0,"9":0}'::jsonb,
    presentation_currency       VARCHAR(10),
    presentation_value          VARCHAR(10),
    is_active                   BOOLEAN DEFAULT true,
    notes                       TEXT,
    created_at                  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at                  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_partners_slug   ON partners(slug);
CREATE INDEX IF NOT EXISTS idx_partners_active ON partners(is_active);

ALTER TABLE partners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all partners" ON partners FOR ALL USING (true) WITH CHECK (true);

COMMENT ON TABLE partners IS 'Partner companies with custom showroom access';
COMMENT ON COLUMN partners.financing_cost_percent IS 'Financing cost percentage applied to purchase net EUR';
COMMENT ON COLUMN partners.additional_cost_items IS 'Per-vehicle additional costs: [{description, mode: fixed_eur|percent_of_net_plus_financing, valueEurNet, percentValue}]';
COMMENT ON COLUMN partners.transport_cost_tiers_eur IS 'Transport cost tiers in EUR for car counts 1,2,4,8,9';


-- ========================================================================
-- 3. PARTNER_FILTERS
-- ========================================================================
CREATE TABLE IF NOT EXISTS partner_filters (
    id          BIGSERIAL PRIMARY KEY,
    partner_id  UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    brand_name  TEXT NOT NULL,
    model_name  TEXT,
    is_active   BOOLEAN DEFAULT true,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(partner_id, brand_name, model_name)
);

CREATE INDEX IF NOT EXISTS idx_partner_filters_partner ON partner_filters(partner_id);

ALTER TABLE partner_filters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all partner_filters" ON partner_filters FOR ALL USING (true) WITH CHECK (true);

COMMENT ON TABLE partner_filters IS 'Brand/model filters for each partner';


-- ========================================================================
-- 4. PARTNER_OFFERS
-- ========================================================================
CREATE TABLE IF NOT EXISTS partner_offers (
    id          BIGSERIAL PRIMARY KEY,
    partner_id  UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    offer_id    UUID NOT NULL REFERENCES car_offers(id) ON DELETE CASCADE,
    custom_price INTEGER,
    is_visible  BOOLEAN DEFAULT true,
    notes       TEXT,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(partner_id, offer_id)
);

CREATE INDEX IF NOT EXISTS idx_partner_offers_partner  ON partner_offers(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_offers_offer    ON partner_offers(offer_id);
CREATE INDEX IF NOT EXISTS idx_partner_offers_visible  ON partner_offers(is_visible);

ALTER TABLE partner_offers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all partner_offers" ON partner_offers FOR ALL USING (true) WITH CHECK (true);

COMMENT ON TABLE partner_offers IS 'Custom pricing and visibility for partner offers';


-- ========================================================================
-- 5. BRAND_FILTERS (global whitelist)
-- ========================================================================
CREATE TABLE IF NOT EXISTS brand_filters (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    brand_name    TEXT NOT NULL UNIQUE,
    is_active     BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    notes         TEXT
);

ALTER TABLE brand_filters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public select brand_filters" ON brand_filters FOR SELECT USING (true);
CREATE POLICY "Allow public insert brand_filters" ON brand_filters FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update brand_filters" ON brand_filters FOR UPDATE USING (true);
CREATE POLICY "Allow public delete brand_filters" ON brand_filters FOR DELETE USING (true);


-- ========================================================================
-- 6. MODEL_FILTERS
-- ========================================================================
CREATE TABLE IF NOT EXISTS model_filters (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    brand_filter_id BIGINT REFERENCES brand_filters(id) ON DELETE CASCADE,
    model_name      TEXT NOT NULL,
    is_active       BOOLEAN DEFAULT true,
    UNIQUE(brand_filter_id, model_name)
);

ALTER TABLE model_filters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public select model_filters" ON model_filters FOR SELECT USING (true);
CREATE POLICY "Allow public insert model_filters" ON model_filters FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update model_filters" ON model_filters FOR UPDATE USING (true);
CREATE POLICY "Allow public delete model_filters" ON model_filters FOR DELETE USING (true);


-- ========================================================================
-- 7. APP_SETTINGS (singleton config)
-- ========================================================================
CREATE TABLE IF NOT EXISTS app_settings (
    id                          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    created_at                  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at                  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Branding
    site_name                   TEXT DEFAULT 'CarShowroom',
    logo_url                    TEXT,
    favicon_url                 TEXT,

    -- Currency
    default_currency            TEXT DEFAULT 'PLN',
    exchange_rate_eur           NUMERIC DEFAULT 4.5,
    show_eur_prices             BOOLEAN DEFAULT true,
    show_secondary_currency     BOOLEAN DEFAULT false,

    -- Contact
    contact_phone               TEXT,
    contact_email               TEXT,
    show_contact_buttons        BOOLEAN DEFAULT true,

    -- Dealer info visibility
    show_dealer_info            BOOLEAN DEFAULT true,
    show_dealer_name            BOOLEAN DEFAULT true,
    show_dealer_address         BOOLEAN DEFAULT true,
    show_dealer_rating          BOOLEAN DEFAULT false,

    -- Features
    enable_financing_calculator BOOLEAN DEFAULT false,
    enable_contact_form         BOOLEAN DEFAULT true,
    enable_whatsapp_button      BOOLEAN DEFAULT false,

    -- SEO
    meta_title                  TEXT,
    meta_description            TEXT,
    og_image_url                TEXT
);

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public select app_settings" ON app_settings FOR SELECT USING (true);
CREATE POLICY "Allow public update app_settings" ON app_settings FOR UPDATE USING (true);
CREATE POLICY "Allow public insert app_settings" ON app_settings FOR INSERT WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_app_settings_id ON app_settings(id);


-- ========================================================================
-- 8. WIDGETS
-- ========================================================================
CREATE TABLE IF NOT EXISTS widgets (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name          TEXT NOT NULL,
    type          TEXT NOT NULL CHECK (type IN ('sidebar', 'content')),
    content_type  TEXT NOT NULL CHECK (content_type IN ('image', 'html')),
    content       TEXT NOT NULL,
    is_global     BOOLEAN DEFAULT false,
    is_active     BOOLEAN DEFAULT true,
    language      TEXT,  -- NULL = all languages, otherwise 'pl', 'en', 'de'
    created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_widgets_active ON widgets(is_active);
CREATE INDEX IF NOT EXISTS idx_widgets_global ON widgets(is_global);

ALTER TABLE widgets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all widgets" ON widgets FOR ALL USING (true);

COMMENT ON TABLE widgets IS 'Widgets for sidebars and content area';
COMMENT ON COLUMN widgets.language IS 'NULL means all languages, otherwise pl, en, de';


-- ========================================================================
-- 9. WIDGET_PARTNERS (junction)
-- ========================================================================
CREATE TABLE IF NOT EXISTS widget_partners (
    id          BIGSERIAL PRIMARY KEY,
    widget_id   UUID NOT NULL REFERENCES widgets(id) ON DELETE CASCADE,
    partner_id  UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(widget_id, partner_id)
);

CREATE INDEX IF NOT EXISTS idx_widget_partners_widget  ON widget_partners(widget_id);
CREATE INDEX IF NOT EXISTS idx_widget_partners_partner ON widget_partners(partner_id);

ALTER TABLE widget_partners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all widget_partners" ON widget_partners FOR ALL USING (true);

COMMENT ON TABLE widget_partners IS 'Mapping widgets to specific partners';


-- ========================================================================
-- FUNCTIONS
-- ========================================================================

-- ── updated_at trigger function ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_brand_filters_updated_at ON brand_filters;
CREATE TRIGGER update_brand_filters_updated_at
    BEFORE UPDATE ON brand_filters
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_app_settings_updated_at ON app_settings;
CREATE TRIGGER update_app_settings_updated_at
    BEFORE UPDATE ON app_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ── calculate_partner_price ──────────────────────────────────────────────
DROP FUNCTION IF EXISTS calculate_partner_price(NUMERIC, NUMERIC, NUMERIC);
CREATE OR REPLACE FUNCTION calculate_partner_price(
    base_price NUMERIC,
    margin_percent NUMERIC,
    custom_price NUMERIC
) RETURNS NUMERIC AS $$
BEGIN
    IF custom_price IS NOT NULL THEN
        RETURN custom_price;
    END IF;
    IF margin_percent IS NOT NULL AND margin_percent > 0 THEN
        RETURN FLOOR(base_price * (1 + margin_percent / 100));
    END IF;
    RETURN base_price;
END;
$$ LANGUAGE plpgsql;


-- ── get_partner_offers (latest version with all fields) ──────────────────
DROP FUNCTION IF EXISTS get_partner_offers(TEXT);
CREATE OR REPLACE FUNCTION get_partner_offers(partner_slug TEXT)
RETURNS TABLE (
    offer_id              UUID,
    brand                 TEXT,
    model                 TEXT,
    model_version         TEXT,
    year                  INTEGER,
    mileage               BIGINT,
    price                 NUMERIC,
    display_price         NUMERIC,
    display_price_net     NUMERIC,
    fuel_type             TEXT,
    engine_power          TEXT,
    transmission          TEXT,
    main_photo_url        TEXT,
    additional_photos     TEXT[],
    is_visible            BOOLEAN,
    custom_price          NUMERIC,
    margin_percent        NUMERIC,
    show_net_prices       BOOLEAN,
    show_secondary_currency BOOLEAN,
    presentation_currency TEXT,
    presentation_value    TEXT,
    features              JSONB,
    technical_spec        JSONB
) AS $$
DECLARE
    v_partner_id             UUID;
    v_default_margin_percent NUMERIC;
    v_show_net_prices        BOOLEAN;
    v_show_secondary_currency BOOLEAN;
    v_presentation_currency  TEXT;
    v_presentation_value     TEXT;
BEGIN
    SELECT p.id, p.default_margin_percent, p.show_net_prices,
           p.show_secondary_currency, p.presentation_currency, p.presentation_value
    INTO   v_partner_id, v_default_margin_percent, v_show_net_prices,
           v_show_secondary_currency, v_presentation_currency, v_presentation_value
    FROM   partners p
    WHERE  p.slug = get_partner_offers.partner_slug AND p.is_active = true;

    IF v_partner_id IS NULL OR v_default_margin_percent IS NULL THEN
        RETURN;
    END IF;

    RETURN QUERY
    SELECT
        co.id                                    AS offer_id,
        co.brand,
        co.model,
        co.model_version,
        co.year,
        co.mileage,
        co.price,
        COALESCE(
            CASE
                WHEN po.custom_price IS NOT NULL THEN po.custom_price::NUMERIC
                WHEN v_default_margin_percent > 0 THEN FLOOR(co.price * (1 + v_default_margin_percent / 100))
                ELSE co.price
            END,
            co.price
        )                                        AS display_price,
        FLOOR(
            COALESCE(
                CASE
                    WHEN po.custom_price IS NOT NULL THEN po.custom_price::NUMERIC
                    WHEN v_default_margin_percent > 0 THEN FLOOR(co.price * (1 + v_default_margin_percent / 100))
                    ELSE co.price
                END,
                co.price
            ) / 1.23
        )                                        AS display_price_net,
        co.fuel_type,
        co.engine_power,
        co.transmission,
        co.main_photo_url,
        co.additional_photos,
        COALESCE(po.is_visible, true)            AS is_visible,
        COALESCE(po.custom_price, 0)::NUMERIC    AS custom_price,
        v_default_margin_percent                 AS margin_percent,
        v_show_net_prices                        AS show_net_prices,
        v_show_secondary_currency                AS show_secondary_currency,
        v_presentation_currency                  AS presentation_currency,
        v_presentation_value                     AS presentation_value,
        co.features,
        co.technical_spec
    FROM   car_offers co
    LEFT JOIN partner_offers po
           ON po.offer_id = co.id AND po.partner_id = v_partner_id
    WHERE  (
               NOT EXISTS (
                   SELECT 1 FROM partner_filters pf
                   WHERE pf.partner_id = v_partner_id AND pf.is_active = true
               )
               OR EXISTS (
                   SELECT 1 FROM partner_filters pf
                   WHERE pf.partner_id = v_partner_id
                     AND pf.is_active = true
                     AND LOWER(pf.brand_name) = LOWER(co.brand)
                     AND (pf.model_name IS NULL OR LOWER(pf.model_name) = LOWER(co.model))
               )
           )
           AND COALESCE(po.is_visible, true) = true
    ORDER BY co.created_at DESC;
END;
$$ LANGUAGE plpgsql;


-- ── auto_create_partner_offers (trigger on car_offers INSERT) ────────────
DROP FUNCTION IF EXISTS auto_create_partner_offers() CASCADE;
CREATE OR REPLACE FUNCTION auto_create_partner_offers()
RETURNS TRIGGER AS $$
DECLARE
    partner_record RECORD;
    matches_filter BOOLEAN;
BEGIN
    FOR partner_record IN
        SELECT id, default_margin_percent
        FROM   partners
        WHERE  is_active = true
    LOOP
        matches_filter := EXISTS (
            SELECT 1 FROM partner_filters pf
            WHERE pf.partner_id = partner_record.id
              AND pf.is_active = true
              AND LOWER(pf.brand_name) = LOWER(NEW.brand)
              AND (pf.model_name IS NULL OR LOWER(pf.model_name) = LOWER(NEW.model))
        );

        IF NOT EXISTS (
            SELECT 1 FROM partner_filters pf
            WHERE pf.partner_id = partner_record.id AND pf.is_active = true
        ) OR matches_filter THEN
            INSERT INTO partner_offers (partner_id, offer_id, is_visible)
            VALUES (partner_record.id, NEW.id, true)
            ON CONFLICT (partner_id, offer_id) DO NOTHING;
        END IF;
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_auto_create_partner_offers ON car_offers;
CREATE TRIGGER tr_auto_create_partner_offers
    AFTER INSERT ON car_offers
    FOR EACH ROW
    EXECUTE FUNCTION auto_create_partner_offers();


-- ── sync_partner_offers_on_filter_change ─────────────────────────────────
DROP FUNCTION IF EXISTS sync_partner_offers_on_filter_change() CASCADE;
CREATE OR REPLACE FUNCTION sync_partner_offers_on_filter_change()
RETURNS TRIGGER AS $$
DECLARE
    offer_record RECORD;
BEGIN
    IF (TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.is_active = true)) THEN
        FOR offer_record IN
            SELECT id FROM car_offers co
            WHERE LOWER(co.brand) = LOWER(NEW.brand_name)
              AND (NEW.model_name IS NULL OR LOWER(co.model) = LOWER(NEW.model_name))
        LOOP
            INSERT INTO partner_offers (partner_id, offer_id, is_visible)
            VALUES (NEW.partner_id, offer_record.id, true)
            ON CONFLICT (partner_id, offer_id) DO NOTHING;
        END LOOP;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_sync_partner_offers_on_filter ON partner_filters;
CREATE TRIGGER tr_sync_partner_offers_on_filter
    AFTER INSERT OR UPDATE ON partner_filters
    FOR EACH ROW
    EXECUTE FUNCTION sync_partner_offers_on_filter_change();


-- ── get_allowed_brands ───────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_allowed_brands()
RETURNS TEXT[] AS $$
BEGIN
    RETURN ARRAY(
        SELECT brand_name
        FROM   brand_filters
        WHERE  is_active = true
        ORDER BY display_order, brand_name
    );
END;
$$ LANGUAGE plpgsql;


-- ── is_offer_allowed ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION is_offer_allowed(brand TEXT, model TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    brand_allowed BOOLEAN;
    model_allowed BOOLEAN;
    v_brand_id    BIGINT;
BEGIN
    SELECT EXISTS(
        SELECT 1 FROM brand_filters
        WHERE brand_name = brand AND is_active = true
    ) INTO brand_allowed;

    IF NOT brand_allowed THEN
        RETURN false;
    END IF;

    SELECT id INTO v_brand_id
    FROM   brand_filters
    WHERE  brand_name = brand AND is_active = true;

    SELECT NOT EXISTS(
        SELECT 1 FROM model_filters WHERE brand_filter_id = v_brand_id
    ) INTO model_allowed;

    IF model_allowed THEN
        RETURN true;
    END IF;

    SELECT EXISTS(
        SELECT 1 FROM model_filters
        WHERE brand_filter_id = v_brand_id AND model_name = model AND is_active = true
    ) INTO model_allowed;

    RETURN model_allowed;
END;
$$ LANGUAGE plpgsql;


-- ========================================================================
-- SEED DATA
-- ========================================================================

-- Default app_settings (insert only if table empty)
INSERT INTO app_settings (
    site_name, logo_url, default_currency, exchange_rate_eur, show_eur_prices,
    contact_phone, contact_email, show_contact_buttons,
    show_dealer_info, show_dealer_name, show_dealer_address, show_dealer_rating
)
SELECT
    'CarShowroom', NULL, 'PLN', 4.5, true,
    '+48 123 456 789', 'kontakt@carshowroom.pl', true,
    true, true, true, false
WHERE NOT EXISTS (SELECT 1 FROM app_settings);


-- ========================================================================
-- DONE 🎉
-- ========================================================================
-- After running this script:
-- 1. Go to Settings → API and copy your SUPABASE_URL, SUPABASE_ANON_KEY,
--    and SUPABASE_SERVICE_ROLE_KEY
-- 2. Add them as env variables in Coolify for the car-showroom app
-- 3. The auto-scraper should use SUPABASE_SERVICE_ROLE_KEY to write to
--    car_offers; the frontend uses SUPABASE_ANON_KEY for reads
-- ========================================================================
