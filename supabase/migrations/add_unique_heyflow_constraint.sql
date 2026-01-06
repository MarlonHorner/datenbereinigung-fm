-- Migration: Add UNIQUE constraint on heyflow_id to enforce 1:N relationship
-- Ein Heyflow kann nur einer Einrichtung zugewiesen werden
-- Eine Einrichtung kann mehrere Heyflows haben

-- Add UNIQUE constraint to ensure each heyflow can only be assigned to one organization
ALTER TABLE organization_heyflows
ADD CONSTRAINT organization_heyflows_heyflow_id_unique UNIQUE (heyflow_id);

-- Add comment to explain the relationship
COMMENT ON CONSTRAINT organization_heyflows_heyflow_id_unique ON organization_heyflows IS 
'Ensures that each heyflow can only be assigned to one organization (1:N relationship from organization to heyflow)';

COMMENT ON TABLE organization_heyflows IS 
'Junction table for organization-heyflow relationship. Each heyflow can only belong to ONE organization, but each organization can have MULTIPLE heyflows.';
