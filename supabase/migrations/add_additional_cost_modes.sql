-- Additional cost items model v2
-- Business rule: additional costs are always per-vehicle.
-- Each item supports mode:
-- - fixed_eur (valueEurNet)
-- - percent_of_net_plus_financing (percentValue)

UPDATE partners
SET additional_cost_items = (
  SELECT COALESCE(jsonb_agg(
    CASE
      WHEN (item ? 'mode') THEN item
      ELSE jsonb_build_object(
        'description', COALESCE(item->>'description', ''),
        'mode', 'fixed_eur',
        'valueEurNet', COALESCE((item->>'valueEurNet')::numeric, 0),
        'percentValue', 0
      )
    END
  ), '[]'::jsonb)
  FROM jsonb_array_elements(COALESCE(partners.additional_cost_items, '[]'::jsonb)) item
)
WHERE additional_cost_items IS NOT NULL;

COMMENT ON COLUMN partners.additional_cost_items IS 'Per-vehicle additional costs: [{description, mode: fixed_eur|percent_of_net_plus_financing, valueEurNet, percentValue}]';
