import { supabase } from './supabase';
import { Organization, ContactPerson, Heyflow, WizardState } from '@/types/organization';
import {
  organizationToDb,
  dbToOrganization,
  contactToDb,
  dbToContact,
  heyflowToDb,
  dbToHeyflow,
} from './type-converters';

/**
 * Saves organizations to the database
 * Returns the saved organizations with database-generated IDs
 */
export async function saveOrganizations(organizations: Organization[]): Promise<Organization[]> {
  if (organizations.length === 0) return [];

  const dbOrganizations = organizations.map(organizationToDb);

  const { data, error } = await supabase
    .from('organizations')
    .upsert(dbOrganizations, { onConflict: 'id' })
    .select();

  if (error) {
    console.error('Error saving organizations:', error);
    throw new Error(`Fehler beim Speichern der Organisationen: ${error.message}`);
  }

  return data.map(dbToOrganization);
}

/**
 * Loads organizations from the database
 */
export async function loadOrganizations(): Promise<Organization[]> {
  const { data, error } = await supabase
    .from('organizations')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error loading organizations:', error);
    throw new Error(`Fehler beim Laden der Organisationen: ${error.message}`);
  }

  if (!data || data.length === 0) return [];

  // Load organizations
  const organizations = data.map(dbToOrganization);
  
  // Batch load all contact relationships
  const { data: contactLinks } = await supabase
    .from('organization_contacts')
    .select('organization_id, contact_id');
  
  // Batch load all heyflow relationships
  const { data: heyflowLinks } = await supabase
    .from('organization_heyflows')
    .select('organization_id, heyflow_id');

  // Map relationships to organizations
  const contactMap = new Map<string, string[]>();
  const heyflowMap = new Map<string, string[]>();
  
  contactLinks?.forEach(link => {
    if (!contactMap.has(link.organization_id)) {
      contactMap.set(link.organization_id, []);
    }
    contactMap.get(link.organization_id)!.push(link.contact_id);
  });
  
  heyflowLinks?.forEach(link => {
    if (!heyflowMap.has(link.organization_id)) {
      heyflowMap.set(link.organization_id, []);
    }
    heyflowMap.get(link.organization_id)!.push(link.heyflow_id);
  });

  // Apply relationships
  organizations.forEach(org => {
    org.contactPersonIds = contactMap.get(org.id) || [];
    org.heyflowIds = heyflowMap.get(org.id) || [];
  });

  return organizations;
}

/**
 * Saves contact persons to the database
 */
export async function saveContacts(contacts: ContactPerson[]): Promise<ContactPerson[]> {
  if (contacts.length === 0) return [];

  const dbContacts = contacts.map(contactToDb);

  const { data, error } = await supabase
    .from('contacts')
    .upsert(dbContacts, { onConflict: 'id' })
    .select();

  if (error) {
    console.error('Error saving contacts:', error);
    throw new Error(`Fehler beim Speichern der Kontakte: ${error.message}`);
  }

  return data.map(dbToContact);
}

/**
 * Loads contact persons from the database
 */
export async function loadContacts(): Promise<ContactPerson[]> {
  const { data, error } = await supabase
    .from('contacts')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error loading contacts:', error);
    throw new Error(`Fehler beim Laden der Kontakte: ${error.message}`);
  }

  return data ? data.map(dbToContact) : [];
}

/**
 * Saves heyflows to the database
 */
export async function saveHeyflows(heyflows: Heyflow[]): Promise<Heyflow[]> {
  console.log('[saveHeyflows] Called with', heyflows.length, 'heyflows');
  
  if (heyflows.length === 0) {
    console.log('[saveHeyflows] No heyflows to save, returning empty array');
    return [];
  }

  console.log('[saveHeyflows] Sample heyflow:', heyflows[0]);
  
  const dbHeyflows = heyflows.map(heyflowToDb);
  console.log('[saveHeyflows] Converted to DB format, sample:', dbHeyflows[0]);

  const { data, error } = await supabase
    .from('heyflows')
    .upsert(dbHeyflows, { onConflict: 'id' })
    .select();

  if (error) {
    console.error('[saveHeyflows] Error saving heyflows:', error);
    throw new Error(`Fehler beim Speichern der Heyflows: ${error.message}`);
  }

  console.log('[saveHeyflows] Successfully saved', data?.length || 0, 'heyflows');
  return data ? data.map(dbToHeyflow) : [];
}

/**
 * Loads heyflows from the database
 */
export async function loadHeyflows(): Promise<Heyflow[]> {
  const { data, error } = await supabase
    .from('heyflows')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error loading heyflows:', error);
    throw new Error(`Fehler beim Laden der Heyflows: ${error.message}`);
  }

  return data ? data.map(dbToHeyflow) : [];
}

/**
 * Links an organization with a contact person
 */
export async function linkOrganizationContact(
  organizationId: string,
  contactId: string
): Promise<void> {
  const { error } = await supabase
    .from('organization_contacts')
    .upsert(
      { organization_id: organizationId, contact_id: contactId },
      { onConflict: 'organization_id,contact_id' }
    );

  if (error) {
    console.error('Error linking organization and contact:', error);
    throw new Error(`Fehler beim Verknüpfen: ${error.message}`);
  }
}

/**
 * Links an organization with a heyflow
 */
export async function linkOrganizationHeyflow(
  organizationId: string,
  heyflowId: string
): Promise<void> {
  const { error } = await supabase
    .from('organization_heyflows')
    .upsert(
      { organization_id: organizationId, heyflow_id: heyflowId },
      { onConflict: 'organization_id,heyflow_id' }
    );

  if (error) {
    console.error('Error linking organization and heyflow:', error);
    throw new Error(`Fehler beim Verknüpfen: ${error.message}`);
  }
}

/**
 * Gets contact IDs for an organization
 */
async function getOrganizationContactIds(organizationId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('organization_contacts')
    .select('contact_id')
    .eq('organization_id', organizationId);

  if (error) {
    console.error('Error loading organization contacts:', error);
    return [];
  }

  return data ? data.map((row) => row.contact_id) : [];
}

/**
 * Gets heyflow IDs for an organization
 */
async function getOrganizationHeyflowIds(organizationId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('organization_heyflows')
    .select('heyflow_id')
    .eq('organization_id', organizationId);

  if (error) {
    console.error('Error loading organization heyflows:', error);
    return [];
  }

  return data ? data.map((row) => row.heyflow_id) : [];
}

/**
 * Creates all necessary links between organizations, contacts, and heyflows
 */
export async function createOrganizationLinks(
  organizations: Organization[],
  contacts: ContactPerson[],
  heyflows: Heyflow[]
): Promise<void> {
  const contactMap = new Map(contacts.map((c) => [c.id, c]));
  const heyflowMap = new Map(heyflows.map((h) => [h.id, h]));

  for (const org of organizations) {
    // Link contacts
    for (const contactId of org.contactPersonIds) {
      if (contactMap.has(contactId)) {
        await linkOrganizationContact(org.id, contactId);
      }
    }

    // Link heyflows
    for (const heyflowId of org.heyflowIds) {
      if (heyflowMap.has(heyflowId)) {
        await linkOrganizationHeyflow(org.id, heyflowId);
      }
    }
  }
}

/**
 * Saves the current wizard session state
 */
export async function saveWizardSession(state: WizardState, sessionName: string = 'default'): Promise<void> {
  const { error } = await supabase
    .from('wizard_sessions')
    .upsert(
      {
        session_name: sessionName,
        current_step: state.currentStep,
        state_data: {
          isDataLoaded: state.isDataLoaded,
          organizationCount: state.organizations.length,
          contactCount: state.contactPersons.length,
          heyflowCount: state.heyflows.length,
        },
        is_active: true,
      },
      { onConflict: 'session_name' }
    );

  if (error) {
    console.error('Error saving wizard session:', error);
    throw new Error(`Fehler beim Speichern der Sitzung: ${error.message}`);
  }
}

/**
 * Loads the wizard session state
 */
export async function loadWizardSession(sessionName: string = 'default'): Promise<WizardState | null> {
  try {
    console.log('[loadWizardSession] Starting to load session:', sessionName);
    
    const { data, error } = await supabase
      .from('wizard_sessions')
      .select('*')
      .eq('session_name', sessionName)
      .eq('is_active', true)
      .single();

    if (error) {
      console.log('[loadWizardSession] No session found or error:', error.message);
      // If no session exists yet, still try to load data
    }

    console.log('[loadWizardSession] Loading organizations...');
    const organizations = await loadOrganizations();
    console.log('[loadWizardSession] Loaded organizations:', organizations.length);
    
    console.log('[loadWizardSession] Loading contacts...');
    const contactPersons = await loadContacts();
    console.log('[loadWizardSession] Loaded contacts:', contactPersons.length);
    
    console.log('[loadWizardSession] Loading heyflows...');
    const heyflows = await loadHeyflows();
    console.log('[loadWizardSession] Loaded heyflows:', heyflows.length);

    return {
      currentStep: data?.current_step || 0,
      organizations,
      contactPersons,
      heyflows,
      isDataLoaded: organizations.length > 0,
    };
  } catch (error) {
    console.error('[loadWizardSession] Error:', error);
    throw error;
  }
}

/**
 * Updates a single organization in the database
 */
export async function updateOrganization(id: string, updates: Partial<Organization>): Promise<void> {
  const dbUpdates: any = {};
  
  if (updates.name !== undefined) dbUpdates.name = updates.name;
  if (updates.street !== undefined) dbUpdates.street = updates.street;
  if (updates.zipCode !== undefined) dbUpdates.zip_code = updates.zipCode;
  if (updates.city !== undefined) dbUpdates.city = updates.city;
  if (updates.type !== undefined) dbUpdates.type = updates.type;
  if (updates.isAmbulant !== undefined) dbUpdates.is_ambulant = updates.isAmbulant;
  if (updates.isStationaer !== undefined) dbUpdates.is_stationaer = updates.isStationaer;
  if (updates.isValidated !== undefined) dbUpdates.is_validated = updates.isValidated;
  if (updates.parentOrganizationId !== undefined) {
    // Handle special case: "no-traeger" should be converted to null
    const parentId = updates.parentOrganizationId;
    dbUpdates.parent_organization_id = (parentId === 'no-traeger' || !parentId) ? null : parentId;
  }
  if (updates.generalContactPerson !== undefined) dbUpdates.general_contact_person = updates.generalContactPerson || null;
  if (updates.phone !== undefined) dbUpdates.phone = updates.phone || null;
  if (updates.email !== undefined) dbUpdates.email = updates.email || null;
  if (updates.invoiceEmail !== undefined) dbUpdates.invoice_email = updates.invoiceEmail || null;
  if (updates.applicationEmail !== undefined) dbUpdates.application_email = updates.applicationEmail || null;
  
  dbUpdates.updated_at = new Date().toISOString();

  const { error } = await supabase
    .from('organizations')
    .update(dbUpdates)
    .eq('id', id);

  if (error) {
    console.error('Error updating organization:', error);
    throw new Error(`Fehler beim Aktualisieren: ${error.message}`);
  }

  // Update contact links if provided
  if (updates.contactPersonIds) {
    // Remove old links
    await supabase
      .from('organization_contacts')
      .delete()
      .eq('organization_id', id);

    // Add new links
    for (const contactId of updates.contactPersonIds) {
      await linkOrganizationContact(id, contactId);
    }
  }

  // Update heyflow links if provided
  if (updates.heyflowIds) {
    // Remove old links
    await supabase
      .from('organization_heyflows')
      .delete()
      .eq('organization_id', id);

    // Add new links
    for (const heyflowId of updates.heyflowIds) {
      await linkOrganizationHeyflow(id, heyflowId);
    }
  }
}

/**
 * Deletes an organization from the database
 */
export async function deleteOrganization(id: string): Promise<void> {
  // Delete relationships first (cascading delete should handle this, but being explicit)
  await supabase
    .from('organization_contacts')
    .delete()
    .eq('organization_id', id);

  await supabase
    .from('organization_heyflows')
    .delete()
    .eq('organization_id', id);

  // Delete the organization
  const { error } = await supabase
    .from('organizations')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting organization:', error);
    throw new Error(`Fehler beim Löschen der Organisation: ${error.message}`);
  }
}

/**
 * Deletes multiple organizations from the database
 */
export async function deleteOrganizations(ids: string[]): Promise<void> {
  if (ids.length === 0) return;

  // Delete relationships
  await supabase
    .from('organization_contacts')
    .delete()
    .in('organization_id', ids);

  await supabase
    .from('organization_heyflows')
    .delete()
    .in('organization_id', ids);

  // Delete organizations
  const { error } = await supabase
    .from('organizations')
    .delete()
    .in('id', ids);

  if (error) {
    console.error('Error deleting organizations:', error);
    throw new Error(`Fehler beim Löschen der Organisationen: ${error.message}`);
  }
}
