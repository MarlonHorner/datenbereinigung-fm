-- Migration: Add contact fields to organizations table
-- Created: 2026-01-06
-- Description: Adds direct contact fields (general contact person, phone, email, invoice email, application email) to organizations table

-- Add contact fields to organizations table
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS general_contact_person TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS invoice_email TEXT,
ADD COLUMN IF NOT EXISTS application_email TEXT;

-- Add comments to describe the new columns
COMMENT ON COLUMN organizations.general_contact_person IS 'Ansprechperson Allgemein';
COMMENT ON COLUMN organizations.phone IS 'Telefon';
COMMENT ON COLUMN organizations.email IS 'E-Mail';
COMMENT ON COLUMN organizations.invoice_email IS 'Rechnung E-Mail';
COMMENT ON COLUMN organizations.application_email IS 'Bewerbung E-Mail';
