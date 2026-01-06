-- Migration: Split contact name into firstname and lastname
-- Created: 2026-01-06
-- Description: Splits the 'name' column in contacts table into 'firstname' and 'lastname'

-- Add new columns
ALTER TABLE contacts
ADD COLUMN IF NOT EXISTS firstname TEXT,
ADD COLUMN IF NOT EXISTS lastname TEXT;

-- Migrate existing data: split name on first space
-- Everything before first space = firstname, everything after = lastname
UPDATE contacts
SET 
  firstname = CASE 
    WHEN position(' ' in name) > 0 THEN split_part(name, ' ', 1)
    ELSE name
  END,
  lastname = CASE 
    WHEN position(' ' in name) > 0 THEN substring(name from position(' ' in name) + 1)
    ELSE ''
  END
WHERE firstname IS NULL OR lastname IS NULL;

-- Add comments to describe the new columns
COMMENT ON COLUMN contacts.firstname IS 'Vorname der Ansprechperson';
COMMENT ON COLUMN contacts.lastname IS 'Nachname der Ansprechperson';

-- Keep the old 'name' column for backward compatibility during transition
-- It can be removed in a future migration once all code is updated
COMMENT ON COLUMN contacts.name IS 'DEPRECATED: Use firstname and lastname instead';
