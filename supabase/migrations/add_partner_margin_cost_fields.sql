-- Add partner-specific margin calculator cost settings
ALTER TABLE partners
  ADD COLUMN IF NOT EXISTS financing_cost_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS additional_cost_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS transport_cost_tiers_eur JSONB NOT NULL DEFAULT '{"1":0,"2":0,"4":0,"8":0,"9":0}'::jsonb;

COMMENT ON COLUMN partners.financing_cost_percent IS 'Financing cost percentage applied to purchase net EUR';
COMMENT ON COLUMN partners.additional_cost_items IS 'Array of additional net costs in EUR per vehicle: [{description, valueEurNet}]';
COMMENT ON COLUMN partners.transport_cost_tiers_eur IS 'Transport cost tiers in EUR for car counts 1,2,4,8,9';
