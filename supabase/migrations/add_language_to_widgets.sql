-- Migration: Add language column to widgets table
-- Run this if you already have the widgets table and want to add language support

DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='widgets' AND column_name='language') THEN
        ALTER TABLE widgets ADD COLUMN language TEXT;
        COMMENT ON COLUMN widgets.language IS 'NULL means all languages, otherwise pl, en, de';
    END IF;
END $$;
