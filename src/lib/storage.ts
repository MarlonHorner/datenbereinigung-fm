import { Organization, ContactPerson, Heyflow, WizardState } from '@/types/organization';

const STORAGE_KEY = 'health-org-wizard';

export const saveWizardState = (state: WizardState): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error('Fehler beim Speichern:', error);
  }
};

export const loadWizardState = (): WizardState | null => {
  try {
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
