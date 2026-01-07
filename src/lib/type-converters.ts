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
    isAmbulant: dbOrg.is_ambulant ?? false,
    isStationaer: dbOrg.is_stationaer ?? false,
    isValidated: dbOrg.is_validated,
    parentOrganizationId: dbOrg.parent_organization_id || undefined,
    mondayParentCompany: dbOrg.monday_parent_company || undefined,
    contactPersonIds: [], // Will be populated separately from join table
    heyflowIds: [], // Will be populated separately from join table
    generalContactPerson: dbOrg.general_contact_person || undefined,
    phone: dbOrg.phone || undefined,
    email: dbOrg.email || undefined,
    invoiceEmail: dbOrg.invoice_email || undefined,
    applicationEmail: dbOrg.application_email || undefined,
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
  // Handle special case: "no-traeger" should be converted to null
  let parentOrgId = org.parentOrganizationId;
  if (parentOrgId === 'no-traeger' || parentOrgId === '' || !parentOrgId) {
    parentOrgId = null;
  }
  
  return {
    id: org.id,
    name: org.name.trim() || 'Unbekannt', // Pflichtfeld - nie leer
    street: org.street.trim() || '', // Kann leer sein
    zip_code: org.zipCode.trim() || '', // Kann leer sein
    city: org.city.trim() || '', // Kann leer sein
    type: org.type,
    is_ambulant: org.isAmbulant ?? false,
    is_stationaer: org.isStationaer ?? false,
    is_validated: org.isValidated,
    parent_organization_id: parentOrgId,
    monday_parent_company: org.mondayParentCompany?.trim() || null,
    general_contact_person: org.generalContactPerson?.trim() || null,
    phone: org.phone?.trim() || null,
    email: org.email?.trim() || null,
    invoice_email: org.invoiceEmail?.trim() || null,
    application_email: org.applicationEmail?.trim() || null,
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
    firstname: dbContact.firstname || '',
    lastname: dbContact.lastname || '',
    name: dbContact.name, // Keep for backward compatibility
    email: dbContact.email,
    note: dbContact.note || undefined,
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
  // Generate full name from firstname + lastname for backward compatibility
  const fullName = `${contact.firstname} ${contact.lastname}`.trim() || 'Unbekannt';
  
  return {
    id: contact.id,
    firstname: contact.firstname.trim() || '',
    lastname: contact.lastname.trim() || '',
    name: fullName,
    email: contact.email.trim() || '',
    note: contact.note?.trim() || null,
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
