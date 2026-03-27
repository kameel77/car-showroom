-- 1. Add pl_vat to app_settings
ALTER TABLE app_settings 
ADD COLUMN IF NOT EXISTS pl_vat numeric(5,2) DEFAULT 23.00;

-- 2. Add export_vat to partners
ALTER TABLE partners 
ADD COLUMN IF NOT EXISTS export_vat numeric(5,2) DEFAULT 0.00;

-- 3. In case any existing row needs the default
UPDATE app_settings SET pl_vat = 23.00 WHERE pl_vat IS NULL;
UPDATE partners SET export_vat = 0.00 WHERE export_vat IS NULL;
