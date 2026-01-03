// Typen für die Datenbereinigung

export interface Organization {
  id: string;
  name: string;
  street: string;
  zipCode: string;
  city: string;
  type: 'traeger' | 'einrichtung' | null;
  isValidated: boolean;
  parentOrganizationId?: string;
  contactPersonIds: string[];
  heyflowIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ContactPerson {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export interface Heyflow {
  id: string;
  heyflowId: string;
  url: string;
  designation: string;
  createdAt: string;
}

export interface FuzzyMatch {
  organizationId: string;
  matchedOrganizationId: string;
  confidence: number;
  nameScore: number;
  zipScore: number;
  cityScore: number;
}

export interface WizardState {
  currentStep: number;
  organizations: Organization[];
  contactPersons: ContactPerson[];
  heyflows: Heyflow[];
  isDataLoaded: boolean;
}

export type WizardStep = 
  | 'upload'
  | 'classify'
  | 'validate-traeger'
  | 'validate-einrichtung'
  | 'assign'
  | 'contacts'
  | 'heyflows'
  | 'overview';

export const WIZARD_STEPS: { key: WizardStep; label: string; number: number }[] = [
  { key: 'upload', label: 'Datenimport', number: 0 },
  { key: 'classify', label: 'Klassifizierung', number: 1 },
  { key: 'validate-traeger', label: 'Träger prüfen', number: 2 },
  { key: 'validate-einrichtung', label: 'Einrichtungen prüfen', number: 3 },
  { key: 'assign', label: 'Zuordnung', number: 4 },
  { key: 'contacts', label: 'Ansprechpersonen', number: 5 },
  { key: 'heyflows', label: 'Heyflows', number: 6 },
  { key: 'overview', label: 'Übersicht', number: 7 },
];
