-- Fix for "Returned type bigint does not match expected type numeric in column 7."
-- in the get_partner_offers function.
-- Run this script in your Supabase SQL Editor.

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
        co.price::NUMERIC                        AS price,
        COALESCE(
            CASE
                WHEN po.custom_price IS NOT NULL THEN po.custom_price::NUMERIC
                WHEN v_default_margin_percent > 0 THEN FLOOR(co.price * (1 + v_default_margin_percent / 100))::NUMERIC
                ELSE co.price::NUMERIC
            END,
            co.price::NUMERIC
        )::NUMERIC                               AS display_price,
        FLOOR(
            COALESCE(
                CASE
                    WHEN po.custom_price IS NOT NULL THEN po.custom_price::NUMERIC
                    WHEN v_default_margin_percent > 0 THEN FLOOR(co.price * (1 + v_default_margin_percent / 100))::NUMERIC
                    ELSE co.price::NUMERIC
                END,
                co.price::NUMERIC
            ) / 1.23
        )::NUMERIC                               AS display_price_net,
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
