import { Organization, ContactPerson, Heyflow } from '@/types/organization';
import { Database } from './supabase';

type DbOrganization = Database['public']['Tables']['organizations']['Row'];
type DbContact = Database['public']['Tables']['contacts']['Row'];
type DbHeyflow = Database['public']['Tables']['heyflows']['Row'];

/**
 * Converts a database organization row to the app's Organization type
 */
export function dbToOrganization(dbOrg: DbOrganization): Organization {
  return {
    id: dbOrg.id,
    name: dbOrg.name,
    street: dbOrg.street,
    zipCode: dbOrg.zip_code,
    city: dbOrg.city,
    type: dbOrg.type,
    isValidated: dbOrg.is_validated,
    parentOrganizationId: dbOrg.parent_organization_id || undefined,
    contactPersonIds: [], // Will be populated separately from join table
    heyflowIds: [], // Will be populated separately from join table
    createdAt: dbOrg.created_at,
    updatedAt: dbOrg.updated_at,
  };
}

/**
 * Converts an app Organization to database insert format
 */
export function organizationToDb(
  org: Organization
): Database['public']['Tables']['organizations']['Insert'] {
  return {
    id: org.id,
    name: org.name.trim() || 'Unbekannt', // Pflichtfeld - nie leer
    street: org.street.trim() || '', // Kann leer sein
    zip_code: org.zipCode.trim() || '', // Kann leer sein
    city: org.city.trim() || '', // Kann leer sein
    type: org.type,
    is_validated: org.isValidated,
    parent_organization_id: org.parentOrganizationId || null,
    status: 'in Bearbeitung', // Default status for new imports
    created_at: org.createdAt,
    updated_at: org.updatedAt,
  };
}

/**
 * Converts a database contact row to the app's ContactPerson type
 */
export function dbToContact(dbContact: DbContact): ContactPerson {
  return {
    id: dbContact.id,
    name: dbContact.name,
    email: dbContact.email,
    department: dbContact.department || undefined,
    createdAt: dbContact.created_at,
    updatedAt: dbContact.updated_at,
  };
}

/**
 * Converts an app ContactPerson to database insert format
 */
export function contactToDb(
  contact: ContactPerson
): Database['public']['Tables']['contacts']['Insert'] {
  return {
    id: contact.id,
    name: contact.name.trim() || 'Unbekannt',
    email: contact.email.trim() || '',
    department: contact.department?.trim() || null,
    created_at: contact.createdAt,
    updated_at: contact.updatedAt,
  };
}

/**
 * Converts a database heyflow row to the app's Heyflow type
 */
export function dbToHeyflow(dbHeyflow: DbHeyflow): Heyflow {
  return {
    id: dbHeyflow.id,
    heyflowId: dbHeyflow.heyflow_id,
    url: dbHeyflow.url,
    designation: dbHeyflow.designation,
    createdAt: dbHeyflow.created_at,
    updatedAt: dbHeyflow.updated_at,
  };
}

/**
 * Converts an app Heyflow to database insert format
 */
export function heyflowToDb(
  heyflow: Heyflow
): Database['public']['Tables']['heyflows']['Insert'] {
  return {
    id: heyflow.id,
    heyflow_id: heyflow.heyflowId.trim() || '',
    url: heyflow.url.trim() || '',
    designation: heyflow.designation.trim() || 'Unbekannt',
    created_at: heyflow.createdAt,
    updated_at: heyflow.updatedAt,
  };
}
