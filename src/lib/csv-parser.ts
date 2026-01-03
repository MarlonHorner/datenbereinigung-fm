import { Organization, Heyflow } from '@/types/organization';

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
  };
};

// Generiere eindeutige ID
const generateId = (): string => {
  return `org-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// CSV zu Organisationen konvertieren
export const csvToOrganizations = (
  rows: ParsedCSVRow[],
  columnMapping: { name: string; street: string; zipCode: string; city: string }
): Organization[] => {
  return rows.map(row => ({
    id: generateId(),
    name: row[columnMapping.name] || '',
    street: row[columnMapping.street] || '',
    zipCode: row[columnMapping.zipCode] || '',
    city: row[columnMapping.city] || '',
    type: null,
    isValidated: false,
    contactPersonIds: [],
    heyflowIds: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));
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
    id: `hf-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    heyflowId: row[columnMapping.id] || '',
    url: row[columnMapping.url] || '',
    designation: row[columnMapping.designation] || '',
    createdAt: new Date().toISOString(),
  }));
};
