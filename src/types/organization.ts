// Typen für die Datenbereinigung

export interface Organization {
  id: string;
  name: string;
  street: string;
  zipCode: string;
  city: string;
  type: 'traeger' | 'einrichtung' | 'inaktiv' | null;
  isAmbulant: boolean;      // Bietet ambulante Versorgung (nur für Einrichtungen)
  isStationaer: boolean;    // Bietet stationäre Versorgung (nur für Einrichtungen)
  isValidated: boolean;
  parentOrganizationId?: string;
  mondayParentCompany?: string;  // Parent Company aus Monday.com Import
  contactPersonIds: string[];
  heyflowIds: string[];
  // Direkte Kontaktfelder für Einrichtungen
  generalContactPerson?: string;  // Ansprechperson Allgemein
  phone?: string;                 // Telefon
  email?: string;                 // E-Mail
  invoiceEmail?: string;          // Rechnung E-Mail
  applicationEmail?: string;      // Bewerbung E-Mail
  createdAt: string;
  updatedAt: string;
}

export interface ContactPerson {
  id: string;
  firstname: string;
  lastname: string;
  name?: string; // Deprecated: kept for backward compatibility
  email: string;
  note?: string;
  department?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Heyflow {
  id: string;
  heyflowId: string;
  url: string;
  designation: string;
  customer?: string;
  createdAt: string;
  updatedAt: string;
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
