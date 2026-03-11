ALTER TABLE partners
ADD COLUMN IF NOT EXISTS presentation_currency VARCHAR(10),
ADD COLUMN IF NOT EXISTS presentation_value VARCHAR(10);

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
    additional_photos TEXT[],
    is_visible BOOLEAN,
    custom_price NUMERIC,
    margin_percent NUMERIC,
    show_net_prices BOOLEAN,
    presentation_currency TEXT,
    presentation_value TEXT,
    features JSONB,
    technical_spec JSONB
) AS $$
DECLARE
    v_partner_id UUID;
    v_default_margin_percent NUMERIC;
    v_show_net_prices BOOLEAN;
    v_presentation_currency TEXT;
    v_presentation_value TEXT;
BEGIN
    SELECT partners.id, partners.default_margin_percent, partners.show_net_prices, partners.presentation_currency, partners.presentation_value 
    INTO v_partner_id, v_default_margin_percent, v_show_net_prices, v_presentation_currency, v_presentation_value
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
        co.additional_photos,
        COALESCE(po.is_visible, true) as is_visible,
        COALESCE(po.custom_price, 0)::NUMERIC as custom_price,
        v_default_margin_percent as margin_percent,
        v_show_net_prices as show_net_prices,
        v_presentation_currency as presentation_currency,
        v_presentation_value as presentation_value,
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
