import { Organization, ContactPerson, Heyflow, WizardState } from '@/types/organization';
import {
  saveOrganizations as saveOrganizationsToDb,
  saveContacts as saveContactsToDb,
  saveHeyflows as saveHeyflowsToDb,
  saveWizardSession,
  loadWizardSession,
  updateOrganization as updateOrganizationInDb,
  deleteOrganization as deleteOrganizationFromDb,
  deleteOrganizations as deleteOrganizationsFromDb,
} from './supabase-storage';

const STORAGE_KEY = 'health-org-wizard';

/**
 * Saves wizard state to both localStorage (cache) and Supabase (persistent)
 */
export const saveWizardState = async (state: WizardState): Promise<void> => {
  try {
    // Save to localStorage for quick access
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    
    // Save to Supabase for persistence
    if (state.isDataLoaded) {
      // Save organizations (upsert will update existing or create new)
      await saveOrganizationsToDb(state.organizations);
      
      // Save session metadata
      await saveWizardSession(state);
    }
  } catch (error) {
    console.error('Fehler beim Speichern:', error);
  }
};

/**
 * Loads wizard state, preferring Supabase over localStorage
 */
export const loadWizardState = async (): Promise<WizardState | null> => {
  try {
    // Try to load from Supabase first
    const supabaseState = await loadWizardSession();
    if (supabaseState) {
      // Update localStorage cache
      localStorage.setItem(STORAGE_KEY, JSON.stringify(supabaseState));
      return supabaseState;
    }
    
    // Fallback to localStorage
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Fehler beim Laden:', error);
  }
  return null;
};

export const clearWizardState = (): void => {
  localStorage.removeItem(STORAGE_KEY);
};

/**
 * Saves complete wizard data to Supabase database
 */
export const saveToDatabase = async (state: WizardState): Promise<WizardState> => {
  try {
    console.log('[saveToDatabase] Starting save...');
    console.log('[saveToDatabase] Organizations:', state.organizations.length);
    console.log('[saveToDatabase] Contacts:', state.contactPersons.length);
    console.log('[saveToDatabase] Heyflows:', state.heyflows.length);
    
    // Save organizations
    const savedOrgs = await saveOrganizationsToDb(state.organizations);
    console.log('[saveToDatabase] Saved organizations:', savedOrgs.length);
    
    // Save contacts
    const savedContacts = await saveContactsToDb(state.contactPersons);
    console.log('[saveToDatabase] Saved contacts:', savedContacts.length);
    
    // Save heyflows
    console.log('[saveToDatabase] Saving heyflows...');
    const savedHeyflows = await saveHeyflowsToDb(state.heyflows);
    console.log('[saveToDatabase] Saved heyflows:', savedHeyflows.length);
    
    // Save wizard session
    await saveWizardSession({
      ...state,
      organizations: savedOrgs,
      contactPersons: savedContacts,
      heyflows: savedHeyflows,
    });
    
    return {
      ...state,
      organizations: savedOrgs,
      contactPersons: savedContacts,
      heyflows: savedHeyflows,
    };
  } catch (error) {
    console.error('Fehler beim Speichern in Datenbank:', error);
    throw error;
  }
};

/**
 * Updates a single organization in the database
 */
export const updateOrganization = async (id: string, updates: Partial<Organization>): Promise<void> => {
  await updateOrganizationInDb(id, updates);
};

/**
 * Deletes a single organization from the database
 */
export const deleteOrganization = async (id: string): Promise<void> => {
  await deleteOrganizationFromDb(id);
};

/**
 * Deletes multiple organizations from the database
 */
export const deleteOrganizations = async (ids: string[]): Promise<void> => {
  await deleteOrganizationsFromDb(ids);
};

export const getInitialState = (): WizardState => ({
  currentStep: 0,
  organizations: [],
  contactPersons: [],
  heyflows: [],
  isDataLoaded: false,
});

// Hilfsfunktionen für Statistiken
export const getClassificationStats = (organizations: Organization[]) => {
  const traeger = organizations.filter(o => o.type === 'traeger').length;
  const einrichtungen = organizations.filter(o => o.type === 'einrichtung').length;
  const unclassified = organizations.filter(o => o.type === null).length;
  return { traeger, einrichtungen, unclassified, total: organizations.length };
};

export const getValidationStats = (organizations: Organization[], type: 'traeger' | 'einrichtung') => {
  const filtered = organizations.filter(o => o.type === type);
  const validated = filtered.filter(o => o.isValidated).length;
  return { validated, total: filtered.length };
};

export const getAssignmentStats = (organizations: Organization[]) => {
  const einrichtungen = organizations.filter(o => o.type === 'einrichtung');
  const assigned = einrichtungen.filter(o => o.parentOrganizationId).length;
  return { assigned, total: einrichtungen.length };
};
