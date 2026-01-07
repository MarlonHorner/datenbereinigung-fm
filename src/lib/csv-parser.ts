import { Organization, Heyflow, ContactPerson } from '@/types/organization';
import { v4 as uuidv4 } from 'uuid';

export interface ParsedCSVRow {
  [key: string]: string;
}

export const parseCSV = (text: string): ParsedCSVRow[] => {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  
  // Header-Zeile parsen
  const headers = parseCSVLine(lines[0]);
  
  // Datenzeilen parsen
  return lines.slice(1).map(line => {
    const values = parseCSVLine(line);
    const row: ParsedCSVRow = {};
    headers.forEach((header, index) => {
      row[header.trim()] = values[index]?.trim() || '';
    });
    return row;
  });
};

// CSV-Zeile mit Anführungszeichen-Unterstützung parsen
const parseCSVLine = (line: string): string[] => {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if ((char === ',' || char === ';') && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  
  return result;
};

// Spalten erkennen
export const detectColumns = (headers: string[]): {
  name?: string;
  street?: string;
  zipCode?: string;
  city?: string;
  careType?: string;
  mondayParentCompany?: string;
  generalContactPerson?: string;
  phone?: string;
  email?: string;
  invoiceEmail?: string;
  applicationEmail?: string;
} => {
  const normalized = headers.map(h => h.toLowerCase());
  
  const findColumn = (keywords: string[]): string | undefined => {
    const index = normalized.findIndex(h =>
      keywords.some(kw => h.includes(kw))
    );
    return index >= 0 ? headers[index] : undefined;
  };
  
  return {
    name: findColumn(['name', 'bezeichnung', 'organisation', 'firma']),
    street: findColumn(['straße', 'strasse', 'street', 'adresse']),
    zipCode: findColumn(['plz', 'postleitzahl', 'zip']),
    city: findColumn(['stadt', 'ort', 'city', 'gemeinde']),
    careType: findColumn(['versorgungsart', 'versorgung', 'care', 'typ', 'art']),
    mondayParentCompany: findColumn(['monday parent company', 'parent company', 'monday_parent_company', 'parentcompany', 'träger', 'muttergesellschaft']),
    generalContactPerson: findColumn(['ansprechperson allgemein', 'ansprechperson', 'kontaktperson', 'general contact']),
    phone: findColumn(['telefon', 'phone', 'tel', 'telefonnummer']),
    email: findColumn(['e-mail', 'email', 'mail', 'e_mail']),
    invoiceEmail: findColumn(['rechnung e-mail', 'rechnungsemail', 'rechnung email', 'invoice email', 'billing email']),
    applicationEmail: findColumn(['bewerbung e-mail', 'bewerbungsemail', 'bewerbung email', 'application email', 'jobs email']),
  };
};

// CSV zu Organisationen konvertieren
export const csvToOrganizations = (
  rows: ParsedCSVRow[],
  columnMapping: {
    name: string;
    street: string;
    zipCode: string;
    city: string;
    careType?: string;
    mondayParentCompany?: string;
    generalContactPerson?: string;
    phone?: string;
    email?: string;
    invoiceEmail?: string;
    applicationEmail?: string;
  }
): Organization[] => {
  return rows.map(row => {
    // Versorgungsart aus CSV parsen (falls vorhanden)
    let isAmbulant = false;
    let isStationaer = false;
    
    if (columnMapping.careType && row[columnMapping.careType]) {
      const careTypeValue = row[columnMapping.careType].toLowerCase().trim();
      isAmbulant = careTypeValue.includes('ambulant');
      isStationaer = careTypeValue.includes('stationär') ||
                     careTypeValue.includes('stationaer');
    }
    
    return {
      id: uuidv4(),
      name: row[columnMapping.name] || '',
      street: row[columnMapping.street] || '',
      zipCode: row[columnMapping.zipCode] || '',
      city: row[columnMapping.city] || '',
      type: null,
      isAmbulant,
      isStationaer,
      isValidated: false,
      contactPersonIds: [],
      heyflowIds: [],
      // Monday Parent Company aus CSV extrahieren
      mondayParentCompany: columnMapping.mondayParentCompany ? row[columnMapping.mondayParentCompany]?.trim() || undefined : undefined,
      // Neue Kontaktfelder aus CSV extrahieren
      generalContactPerson: columnMapping.generalContactPerson ? row[columnMapping.generalContactPerson]?.trim() || undefined : undefined,
      phone: columnMapping.phone ? row[columnMapping.phone]?.trim() || undefined : undefined,
      email: columnMapping.email ? row[columnMapping.email]?.trim() || undefined : undefined,
      invoiceEmail: columnMapping.invoiceEmail ? row[columnMapping.invoiceEmail]?.trim() || undefined : undefined,
      applicationEmail: columnMapping.applicationEmail ? row[columnMapping.applicationEmail]?.trim() || undefined : undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  });
};

// Heyflow-Spalten erkennen
export const detectHeyflowColumns = (headers: string[]): {
  id?: string;
  url?: string;
  designation?: string;
} => {
  const normalized = headers.map(h => h.toLowerCase());
  
  const findColumn = (keywords: string[]): string | undefined => {
    const index = normalized.findIndex(h => 
      keywords.some(kw => h.includes(kw))
    );
    return index >= 0 ? headers[index] : undefined;
  };
  
  return {
    id: findColumn(['id', 'heyflow_id', 'flow_id']),
    url: findColumn(['url', 'link', 'adresse']),
    designation: findColumn(['bezeichnung', 'name', 'titel', 'description']),
  };
};

// CSV zu Heyflows konvertieren
export const csvToHeyflows = (
  rows: ParsedCSVRow[],
  columnMapping: { id: string; url: string; designation: string }
): Heyflow[] => {
  return rows.map(row => ({
    id: uuidv4(),
    heyflowId: row[columnMapping.id] || '',
    url: row[columnMapping.url] || '',
    designation: row[columnMapping.designation] || '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));
};

// Ansprechpersonen-Spalten erkennen
export const detectContactColumns = (headers: string[]): {
  firstname?: string;
  lastname?: string;
  name?: string; // Fallback wenn Vorname/Nachname nicht getrennt sind
  email?: string;
  note?: string;
} => {
  const normalized = headers.map(h => h.toLowerCase());
  
  const findColumn = (keywords: string[]): string | undefined => {
    const index = normalized.findIndex(h =>
      keywords.some(kw => h.includes(kw))
    );
    return index >= 0 ? headers[index] : undefined;
  };
  
  return {
    firstname: findColumn(['vorname', 'first name', 'firstname']),
    lastname: findColumn(['nachname', 'last name', 'lastname', 'familienname']),
    name: findColumn(['name', 'ansprechpartner', 'kontakt', 'person']),
    email: findColumn(['email', 'e-mail', 'mail', 'e_mail']),
    note: findColumn(['notiz', 'note', 'bemerkung', 'einrichtung', 'firma', 'organisation']),
  };
};

// CSV zu Ansprechpersonen konvertieren
export const csvToContactPersons = (
  rows: ParsedCSVRow[],
  columnMapping: { firstname?: string; lastname?: string; name?: string; email: string; note?: string }
): ContactPerson[] => {
  return rows.map(row => {
    let firstname = '';
    let lastname = '';
    
    // Wenn Vorname und Nachname separat vorhanden sind
    if (columnMapping.firstname && columnMapping.lastname) {
      firstname = row[columnMapping.firstname] || '';
      lastname = row[columnMapping.lastname] || '';
    }
    // Wenn nur ein "Name"-Feld vorhanden ist, beim ersten Leerzeichen splitten
    else if (columnMapping.name) {
      const fullName = row[columnMapping.name] || '';
      const parts = fullName.trim().split(/\s+/);
      if (parts.length > 1) {
        firstname = parts[0];
        lastname = parts.slice(1).join(' ');
      } else {
        firstname = fullName;
        lastname = '';
      }
    }
    
    return {
      id: uuidv4(),
      firstname,
      lastname,
      email: row[columnMapping.email] || '',
      note: columnMapping.note ? row[columnMapping.note] || undefined : undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  });
};
