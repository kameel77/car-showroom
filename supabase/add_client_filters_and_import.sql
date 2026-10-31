-- ============================================================================
-- Migration: Multi-Filter per Client (Partner) + Car-Scout CSV Import Support
-- ============================================================================
-- Run this script in the Supabase SQL Editor.
-- It is idempotent and safely migrates existing partners, filters, cost
-- overrides, and any fallback metadata stored in partners.notes.
-- ============================================================================

BEGIN;

-- 1. Ensure all optional columns exist on partners & app_settings
ALTER TABLE partners
  ADD COLUMN IF NOT EXISTS show_secondary_currency BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS financing_cost_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS additional_cost_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS transport_cost_tiers_eur JSONB NOT NULL DEFAULT '{"1":0,"2":0,"4":0,"8":0,"9":0}'::jsonb,
  ADD COLUMN IF NOT EXISTS presentation_currency VARCHAR(10),
  ADD COLUMN IF NOT EXISTS presentation_value VARCHAR(10),
  ADD COLUMN IF NOT EXISTS export_vat NUMERIC(5,2) NOT NULL DEFAULT 0.00;

ALTER TABLE app_settings
  ADD COLUMN IF NOT EXISTS pl_vat NUMERIC(5,2) NOT NULL DEFAULT 23.00;

-- 2. Create client_filters table (multiple filters / showrooms per client)
CREATE TABLE IF NOT EXISTS client_filters (
    id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    partner_id                  UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    name                        TEXT NOT NULL,
    slug                        TEXT NOT NULL,
    description                 TEXT,
    source_query                TEXT,
    notes                       TEXT,
    margin_percent              DECIMAL(5,2),
    financing_cost_percent      NUMERIC(5,2),
    additional_cost_items       JSONB,
    transport_cost_tiers_eur    JSONB,
    is_active                   BOOLEAN DEFAULT true,
    last_imported_at            TIMESTAMP WITH TIME ZONE,
    last_import_filename        TEXT,
    last_import_count           INTEGER DEFAULT 0,
    created_at                  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at                  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(partner_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_client_filters_partner ON client_filters(partner_id);
CREATE INDEX IF NOT EXISTS idx_client_filters_slug    ON client_filters(slug);
CREATE INDEX IF NOT EXISTS idx_client_filters_active  ON client_filters(is_active);

ALTER TABLE client_filters ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'client_filters' AND policyname = 'Allow all client_filters'
    ) THEN
        CREATE POLICY "Allow all client_filters" ON client_filters FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;

COMMENT ON TABLE client_filters IS 'Named search filters / showrooms belonging to a partner (client)';

-- 3. Drop legacy global triggers that auto-distributed offers without filter context
DROP TRIGGER IF EXISTS tr_auto_create_partner_offers ON car_offers;
DROP FUNCTION IF EXISTS auto_create_partner_offers() CASCADE;

DROP TRIGGER IF EXISTS tr_sync_partner_offers_on_filter ON partner_filters;
DROP FUNCTION IF EXISTS sync_partner_offers_on_filter_change() CASCADE;

-- 4. Extend partner_offers and partner_filters with filter_id
ALTER TABLE partner_offers
  ADD COLUMN IF NOT EXISTS filter_id UUID REFERENCES client_filters(id) ON DELETE CASCADE;

ALTER TABLE partner_offers
  DROP CONSTRAINT IF EXISTS partner_offers_partner_id_offer_id_key;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'partner_offers_filter_id_offer_id_key'
    ) THEN
        ALTER TABLE partner_offers
          ADD CONSTRAINT partner_offers_filter_id_offer_id_key UNIQUE (filter_id, offer_id);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_partner_offers_filter ON partner_offers(filter_id);

ALTER TABLE partner_filters
  ADD COLUMN IF NOT EXISTS filter_id UUID REFERENCES client_filters(id) ON DELETE CASCADE;

ALTER TABLE partner_filters
  DROP CONSTRAINT IF EXISTS partner_filters_partner_id_brand_name_model_name_key;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'partner_filters_filter_id_brand_name_model_name_key'
    ) THEN
        ALTER TABLE partner_filters
          ADD CONSTRAINT partner_filters_filter_id_brand_name_model_name_key UNIQUE (filter_id, brand_name, model_name);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_partner_filters_filter ON partner_filters(filter_id);

-- 5. Data Migration:
--    5A) Migrate any fallback metadata stored in partners.notes (<!--__CLIENT_FILTERS_META__:...-->)
--    5B) Handle pre-consolidated Abdenour & co. records if still present
--    5C) Link any orphaned partner_filters / partner_offers to their partner's first filter
DO $$
DECLARE
    v_partner RECORD;
    v_meta_start INT;
    v_meta_end INT;
    v_json_str TEXT;
    v_clean_notes TEXT;
    v_meta JSONB;
    v_filter JSONB;
    v_filter_id UUID;
    v_offer_key TEXT;
    v_offer_val JSONB;

    v_abdenour_toyota_id UUID := '97d43c84-7aac-49af-9088-230cfe67429b';
    v_abdenour_kia_id UUID := 'b7d73a47-900b-48e3-89fe-d2358ff7265e';
    v_abdenour_suv_id UUID := 'e57414a3-51de-4dd2-bf73-3969f9b5fa38';
    v_cars_syria_id UUID := 'bd6494c3-e2d9-46c6-9354-9ecc924bf4b1';
    v_carsalon_id UUID := '2646f225-1162-48c5-8792-0f6dec254a7c';
    v_test_id UUID := '1b8c33ac-4a56-41b4-94cd-d0467119de2b';

    v_first_filter_id UUID;
BEGIN
    -- 5A) Migrate fallback metadata from partners.notes if present
    FOR v_partner IN SELECT * FROM partners LOOP
        IF v_partner.notes IS NOT NULL AND POSITION('<!--__CLIENT_FILTERS_META__:' IN v_partner.notes) > 0 THEN
            v_meta_start := POSITION('<!--__CLIENT_FILTERS_META__:' IN v_partner.notes) + LENGTH('<!--__CLIENT_FILTERS_META__:');
            v_meta_end := POSITION('-->' IN SUBSTRING(v_partner.notes FROM v_meta_start));
            IF v_meta_end > 0 THEN
                v_json_str := SUBSTRING(v_partner.notes FROM v_meta_start FOR v_meta_end - 1);
                v_clean_notes := NULLIF(BTRIM(SUBSTRING(v_partner.notes FROM 1 FOR POSITION('<!--__CLIENT_FILTERS_META__:' IN v_partner.notes) - 1), E' \n\r\t'), '');
                v_meta := v_json_str::JSONB;

                IF v_meta ? 'filters' THEN
                    FOR v_filter IN SELECT * FROM jsonb_array_elements(v_meta->'filters') LOOP
                        v_filter_id := (v_filter->>'id')::UUID;
                        INSERT INTO client_filters (
                            id, partner_id, name, slug, description, source_query, notes,
                            margin_percent, financing_cost_percent, additional_cost_items, transport_cost_tiers_eur,
                            is_active, last_imported_at, last_import_filename, last_import_count
                        )
                        VALUES (
                            v_filter_id,
                            v_partner.id,
                            v_filter->>'name',
                            v_filter->>'slug',
                            v_filter->>'description',
                            v_filter->>'source_query',
                            v_filter->>'notes',
                            (v_filter->>'margin_percent')::NUMERIC,
                            (v_filter->>'financing_cost_percent')::NUMERIC,
                            CASE WHEN v_filter ? 'additional_cost_items' AND jsonb_typeof(v_filter->'additional_cost_items') = 'array' THEN v_filter->'additional_cost_items' ELSE NULL END,
                            CASE WHEN v_filter ? 'transport_cost_tiers_eur' AND jsonb_typeof(v_filter->'transport_cost_tiers_eur') = 'object' THEN v_filter->'transport_cost_tiers_eur' ELSE NULL END,
                            COALESCE((v_filter->>'is_active')::BOOLEAN, true),
                            (v_filter->>'last_imported_at')::TIMESTAMPTZ,
                            v_filter->>'last_import_filename',
                            COALESCE((v_filter->>'last_import_count')::INT, 0)
                        )
                        ON CONFLICT (partner_id, slug) DO UPDATE
                        SET name = EXCLUDED.name,
                            description = COALESCE(EXCLUDED.description, client_filters.description),
                            notes = COALESCE(EXCLUDED.notes, client_filters.notes),
                            margin_percent = COALESCE(EXCLUDED.margin_percent, client_filters.margin_percent),
                            financing_cost_percent = COALESCE(EXCLUDED.financing_cost_percent, client_filters.financing_cost_percent),
                            additional_cost_items = COALESCE(EXCLUDED.additional_cost_items, client_filters.additional_cost_items),
                            transport_cost_tiers_eur = COALESCE(EXCLUDED.transport_cost_tiers_eur, client_filters.transport_cost_tiers_eur),
                            last_imported_at = COALESCE(EXCLUDED.last_imported_at, client_filters.last_imported_at),
                            last_import_filename = COALESCE(EXCLUDED.last_import_filename, client_filters.last_import_filename),
                            last_import_count = GREATEST(EXCLUDED.last_import_count, client_filters.last_import_count)
                        RETURNING id INTO v_filter_id;

                        IF (v_meta->'filterOffers') ? (v_filter->>'id') THEN
                            FOR v_offer_key, v_offer_val IN
                                SELECT * FROM jsonb_each(v_meta->'filterOffers'->(v_filter->>'id'))
                            LOOP
                                IF EXISTS (SELECT 1 FROM car_offers WHERE id = v_offer_key::UUID) THEN
                                    INSERT INTO partner_offers (partner_id, filter_id, offer_id, custom_price, is_visible, notes)
                                    VALUES (
                                        v_partner.id,
                                        v_filter_id,
                                        v_offer_key::UUID,
                                        (v_offer_val->>'custom_price')::NUMERIC,
                                        COALESCE((v_offer_val->>'is_visible')::BOOLEAN, true),
                                        v_offer_val->>'notes'
                                    )
                                    ON CONFLICT (filter_id, offer_id) DO UPDATE
                                    SET custom_price = COALESCE(EXCLUDED.custom_price, partner_offers.custom_price),
                                        is_visible = EXCLUDED.is_visible;
                                END IF;
                            END LOOP;
                        END IF;
                    END LOOP;
                END IF;

                UPDATE partners SET notes = v_clean_notes WHERE id = v_partner.id;
            END IF;
        END IF;
    END LOOP;

    -- 5B) If duplicate Abdenour rows still exist in partners (un-consolidated DB), merge into v_abdenour_toyota_id
    IF EXISTS (SELECT 1 FROM partners WHERE id = v_abdenour_toyota_id) THEN
        UPDATE partners
        SET slug = 'abdenour',
            company_address = COALESCE(company_address, 'Van Groenewegenstraat 100<br>' || E'\n' || '2614 BH Delft Netherlands'),
            updated_at = NOW()
        WHERE id = v_abdenour_toyota_id;

        INSERT INTO client_filters (id, partner_id, name, slug, margin_percent, financing_cost_percent, notes, description, is_active)
        VALUES (v_abdenour_toyota_id, v_abdenour_toyota_id, 'Toyota', 'toyota', 0, 3.5, 'salon z Toyotami gros x gros', 'salon z Toyotami gros x gros', true)
        ON CONFLICT (partner_id, slug) DO NOTHING;

        INSERT INTO client_filters (id, partner_id, name, slug, margin_percent, is_active)
        VALUES (v_abdenour_kia_id, v_abdenour_toyota_id, 'KIA & Renault', 'kia-renault', 5, true)
        ON CONFLICT (partner_id, slug) DO NOTHING;

        INSERT INTO client_filters (id, partner_id, name, slug, margin_percent, is_active)
        VALUES (v_abdenour_suv_id, v_abdenour_toyota_id, 'SUV Pano', 'suv-pano', 0, true)
        ON CONFLICT (partner_id, slug) DO NOTHING;

        IF EXISTS (SELECT 1 FROM partners WHERE id = v_abdenour_kia_id) THEN
            UPDATE partner_filters SET partner_id = v_abdenour_toyota_id, filter_id = v_abdenour_kia_id WHERE partner_id = v_abdenour_kia_id;
            UPDATE partner_offers SET partner_id = v_abdenour_toyota_id, filter_id = v_abdenour_kia_id WHERE partner_id = v_abdenour_kia_id;
            DELETE FROM partners WHERE id = v_abdenour_kia_id;
        END IF;

        IF EXISTS (SELECT 1 FROM partners WHERE id = v_abdenour_suv_id) THEN
            UPDATE partner_filters SET partner_id = v_abdenour_toyota_id, filter_id = v_abdenour_suv_id WHERE partner_id = v_abdenour_suv_id;
            UPDATE partner_offers SET partner_id = v_abdenour_toyota_id, filter_id = v_abdenour_suv_id WHERE partner_id = v_abdenour_suv_id;
            DELETE FROM partners WHERE id = v_abdenour_suv_id;
        END IF;
    END IF;

    IF EXISTS (SELECT 1 FROM partners WHERE id = v_cars_syria_id) THEN
        UPDATE partners SET slug = 'cars-to-syria' WHERE id = v_cars_syria_id;
        INSERT INTO client_filters (id, partner_id, name, slug, margin_percent, is_active)
        VALUES (v_cars_syria_id, v_cars_syria_id, 'BMW X5 M', 'bmw-m50', 0, true)
        ON CONFLICT (partner_id, slug) DO NOTHING;
    END IF;

    IF EXISTS (SELECT 1 FROM partners WHERE id = v_carsalon_id) THEN
        UPDATE partners SET slug = 'carsalon' WHERE id = v_carsalon_id;
        INSERT INTO client_filters (id, partner_id, name, slug, margin_percent, is_active)
        VALUES (v_carsalon_id, v_carsalon_id, 'Jadwiga', 'jadwiga', 0, true)
        ON CONFLICT (partner_id, slug) DO NOTHING;
    END IF;

    IF EXISTS (SELECT 1 FROM partners WHERE id = v_test_id) THEN
        INSERT INTO client_filters (id, partner_id, name, slug, margin_percent, notes, description, is_active)
        VALUES (v_test_id, v_test_id, 'Test', 'test', 5, 'partner testowy z marżą 5%', 'partner testowy z marżą 5%', true)
        ON CONFLICT (partner_id, slug) DO NOTHING;
    END IF;

    -- Fallback for any other partner without a filter
    INSERT INTO client_filters (partner_id, name, slug, margin_percent, is_active)
    SELECT p.id, p.company_name, p.slug, p.default_margin_percent, p.is_active
    FROM partners p
    WHERE NOT EXISTS (SELECT 1 FROM client_filters cf WHERE cf.partner_id = p.id);

    -- 5C) Link any remaining partner_filters / partner_offers where filter_id IS NULL to their partner's first filter
    FOR v_partner IN SELECT id FROM partners LOOP
        SELECT id INTO v_first_filter_id
        FROM client_filters
        WHERE partner_id = v_partner.id
        ORDER BY created_at ASC
        LIMIT 1;

        IF v_first_filter_id IS NOT NULL THEN
            UPDATE partner_filters
            SET filter_id = v_first_filter_id
            WHERE partner_id = v_partner.id AND filter_id IS NULL;

            UPDATE partner_offers
            SET filter_id = v_first_filter_id
            WHERE partner_id = v_partner.id AND filter_id IS NULL;
        END IF;
    END LOOP;
END $$;

COMMIT;
