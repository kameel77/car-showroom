-- Partners System Schema
-- This schema supports multi-partner showroom with custom pricing

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Migration: Add show_net_prices column to existing partners table
ALTER TABLE partners 
ADD COLUMN IF NOT EXISTS show_net_prices BOOLEAN DEFAULT false;

-- Partners table - stores partner company information
CREATE TABLE IF NOT EXISTS partners (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug TEXT UNIQUE NOT NULL,
    company_name TEXT NOT NULL,
    company_address TEXT,
    vat_number TEXT,
    contact_person TEXT,
    phone TEXT,
    email TEXT,
    website TEXT,
    default_margin_percent DECIMAL(5,2) DEFAULT 0,
    show_net_prices BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Partner filters - defines which brands/models each partner sees
CREATE TABLE IF NOT EXISTS partner_filters (
    id BIGSERIAL PRIMARY KEY,
    partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    brand_name TEXT NOT NULL,
    model_name TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(partner_id, brand_name, model_name)
);

-- Partner offers - stores custom pricing and visibility for each offer
CREATE TABLE IF NOT EXISTS partner_offers (
    id BIGSERIAL PRIMARY KEY,
    partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    offer_id UUID NOT NULL REFERENCES car_offers(id) ON DELETE CASCADE,
    custom_price INTEGER,
    is_visible BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(partner_id, offer_id)
);

-- Function to calculate display price for partner
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

-- Function to get partner offers with calculated prices
DROP FUNCTION IF EXISTS get_partner_offers(TEXT);
CREATE OR REPLACE FUNCTION get_partner_offers(partner_slug TEXT)
RETURNS TABLE (
    offer_id UUID,
    brand TEXT,
    model TEXT,
    model_version TEXT,
    year INTEGER,
    mileage BIGINT,
    price NUMERIC,
    display_price NUMERIC,
    display_price_net NUMERIC,
    fuel_type TEXT,
    engine_power TEXT,
    transmission TEXT,
    main_photo_url TEXT,
    is_visible BOOLEAN,
    custom_price NUMERIC,
    margin_percent NUMERIC,
    show_net_prices BOOLEAN,
    features JSONB,
    technical_spec JSONB
) AS $$
DECLARE
    v_partner_id UUID;
    v_default_margin_percent NUMERIC;
    v_show_net_prices BOOLEAN;
BEGIN
    SELECT id, default_margin_percent, show_net_prices 
    INTO v_partner_id, v_default_margin_percent, v_show_net_prices
    FROM partners
    WHERE partners.slug = get_partner_offers.partner_slug AND partners.is_active = true;
    
    IF v_partner_id IS NULL OR v_default_margin_percent IS NULL THEN
        RETURN;
    END IF;
    
    RETURN QUERY
    SELECT 
        co.id as offer_id,
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
        ) as display_price,
        -- Calculate net price (remove 23% VAT)
        FLOOR(
            COALESCE(
                CASE 
                    WHEN po.custom_price IS NOT NULL THEN po.custom_price::NUMERIC
                    WHEN v_default_margin_percent > 0 THEN FLOOR(co.price * (1 + v_default_margin_percent / 100))
                    ELSE co.price
                END,
                co.price
            ) / 1.23
        ) as display_price_net,
        co.fuel_type,
        co.engine_power,
        co.transmission,
        co.main_photo_url,
        COALESCE(po.is_visible, true) as is_visible,
        COALESCE(po.custom_price, 0)::NUMERIC as custom_price,
        v_default_margin_percent as margin_percent,
        v_show_net_prices as show_net_prices,
        co.features,
        co.technical_spec
    FROM car_offers co
    LEFT JOIN partner_offers po ON po.offer_id = co.id AND po.partner_id = v_partner_id
    WHERE 
        (
            NOT EXISTS (
                SELECT 1 FROM partner_filters pf 
                WHERE pf.partner_id = v_partner_id AND pf.is_active = true
            )
            OR
            EXISTS (
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

-- Function to auto-create partner_offers for new car_offers
DROP FUNCTION IF EXISTS auto_create_partner_offers() CASCADE;
CREATE OR REPLACE FUNCTION auto_create_partner_offers()
RETURNS TRIGGER AS $$
DECLARE
    partner_record RECORD;
    matches_filter BOOLEAN;
BEGIN
    -- For each active partner
    FOR partner_record IN 
        SELECT id, default_margin_percent 
        FROM partners 
        WHERE is_active = true
    LOOP
        -- Check if offer matches partner filters
        matches_filter := EXISTS (
            SELECT 1 FROM partner_filters pf
            WHERE pf.partner_id = partner_record.id 
            AND pf.is_active = true
            AND LOWER(pf.brand_name) = LOWER(NEW.brand)
            AND (
                pf.model_name IS NULL 
                OR LOWER(pf.model_name) = LOWER(NEW.model)
            )
        );
        
        -- If no filters exist for partner, or offer matches filters
        IF NOT EXISTS (
            SELECT 1 FROM partner_filters pf 
            WHERE pf.partner_id = partner_record.id AND pf.is_active = true
        ) OR matches_filter THEN
            
            -- Insert into partner_offers if not exists
            INSERT INTO partner_offers (partner_id, offer_id, is_visible)
            VALUES (partner_record.id, NEW.id, true)
            ON CONFLICT (partner_id, offer_id) DO NOTHING;
        END IF;
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-creating partner_offers
DROP TRIGGER IF EXISTS tr_auto_create_partner_offers ON car_offers;
CREATE TRIGGER tr_auto_create_partner_offers
    AFTER INSERT ON car_offers
    FOR EACH ROW
    EXECUTE FUNCTION auto_create_partner_offers();

-- Function to update partner_offers when filters change
DROP FUNCTION IF EXISTS sync_partner_offers_on_filter_change() CASCADE;
CREATE OR REPLACE FUNCTION sync_partner_offers_on_filter_change()
RETURNS TRIGGER AS $$
DECLARE
    partner_record RECORD;
    offer_record RECORD;
BEGIN
    -- If inserting or updating to active
    IF (TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.is_active = true)) THEN
        -- Find all matching offers and create partner_offers entries
        FOR offer_record IN 
            SELECT id FROM car_offers co
            WHERE LOWER(co.brand) = LOWER(NEW.brand_name)
            AND (
                NEW.model_name IS NULL 
                OR LOWER(co.model) = LOWER(NEW.model_name)
            )
        LOOP
            INSERT INTO partner_offers (partner_id, offer_id, is_visible)
            VALUES (NEW.partner_id, offer_record.id, true)
            ON CONFLICT (partner_id, offer_id) DO NOTHING;
        END LOOP;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for syncing offers when filters change
DROP TRIGGER IF EXISTS tr_sync_partner_offers_on_filter ON partner_filters;
CREATE TRIGGER tr_sync_partner_offers_on_filter
    AFTER INSERT OR UPDATE ON partner_filters
    FOR EACH ROW
    EXECUTE FUNCTION sync_partner_offers_on_filter_change();

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_partners_slug ON partners(slug);
CREATE INDEX IF NOT EXISTS idx_partners_active ON partners(is_active);
CREATE INDEX IF NOT EXISTS idx_partner_filters_partner ON partner_filters(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_offers_partner ON partner_offers(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_offers_offer ON partner_offers(offer_id);
CREATE INDEX IF NOT EXISTS idx_partner_offers_visible ON partner_offers(is_visible);

-- Enable RLS (Row Level Security) - optional, for future authentication
ALTER TABLE partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_filters ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_offers ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Allow all" ON partners;
DROP POLICY IF EXISTS "Allow all" ON partner_filters;
DROP POLICY IF EXISTS "Allow all" ON partner_offers;

-- Create policies (allow all for now, will restrict later)
CREATE POLICY "Allow all" ON partners FOR ALL USING (true);
CREATE POLICY "Allow all" ON partner_filters FOR ALL USING (true);
CREATE POLICY "Allow all" ON partner_offers FOR ALL USING (true);

COMMENT ON TABLE partners IS 'Partner companies with custom showroom access';
COMMENT ON TABLE partner_filters IS 'Brand/model filters for each partner';
COMMENT ON TABLE partner_offers IS 'Custom pricing and visibility for partner offers';
