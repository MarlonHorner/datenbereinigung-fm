import { Organization, ContactPerson } from '@/types/organization';

export interface ContactMatchResult {
  contactId: string;
  contactName: string;
  contactEmail: string;
  contactNote?: string;
  confidence: number;
  domainMatch: number;
  noteMatch: number;
}

/**
 * Extrahiert die Domain aus einer E-Mail-Adresse (ohne TLD)
 */
const extractDomainName = (email: string): string => {
  const match = email.match(/@([^.]+)/);
  return match ? match[1].toLowerCase() : '';
};

/**
 * Normalisiert einen String für den Vergleich
 */
const normalize = (str: string): string => {
  return str
    .toLowerCase()
    .replace(/[äÄ]/g, 'a')
    .replace(/[öÖ]/g, 'o')
    .replace(/[üÜ]/g, 'u')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]/g, '');
};

/**
 * Berechnet die Ähnlichkeit zwischen zwei Strings (0-100)
 */
const calculateSimilarity = (str1: string, str2: string): number => {
  const s1 = normalize(str1);
  const s2 = normalize(str2);
  
  if (s1.length === 0 || s2.length === 0) return 0;
  
  // Prüfe ob einer im anderen enthalten ist
  if (s1.includes(s2) || s2.includes(s1)) {
    const shorter = s1.length < s2.length ? s1 : s2;
    const longer = s1.length >= s2.length ? s1 : s2;
    return Math.round((shorter.length / longer.length) * 100);
  }
  
  // Levenshtein-basierte Ähnlichkeit
  const matrix: number[][] = [];
  
  for (let i = 0; i <= s1.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= s2.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= s1.length; i++) {
    for (let j = 1; j <= s2.length; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  
  const maxLength = Math.max(s1.length, s2.length);
  const distance = matrix[s1.length][s2.length];
  return Math.round(((maxLength - distance) / maxLength) * 100);
};

/**
 * Generiert Matching-Vorschläge für Ansprechpersonen zu einer Einrichtung
 * Priorität 1: Notiz-Match (Name der Einrichtung/Firma)
 * Priorität 2: E-Mail Domain Match
 */
export const generateContactMatches = (
  organization: Organization,
  contacts: ContactPerson[],
  assignedContactIds: string[]
): ContactMatchResult[] => {
  const availableContacts = contacts.filter(c => !assignedContactIds.includes(c.id));
  const orgNameNormalized = normalize(organization.name);
  
  const matches: ContactMatchResult[] = availableContacts.map(contact => {
    // Prio 1: Match über Notiz-Feld (Einrichtung/Firma Name)
    let noteMatch = 0;
    if (contact.note && contact.note.trim().length > 0) {
      noteMatch = calculateSimilarity(contact.note, organization.name);
    }
    
    // Prio 2: Match über E-Mail Domain
    const domain = extractDomainName(contact.email);
    const domainMatch = calculateSimilarity(domain, orgNameNormalized);
    
    // Zusätzlich: Prüfe ob Stadt im Domain enthalten
    const cityMatch = calculateSimilarity(domain, organization.city);
    
    // Gewichtete Konfidenz: Notiz-Match hat höchste Priorität
    // Wenn Notiz vorhanden und gut matched (>60%), dominiert dieser
    let confidence: number;
    if (noteMatch > 60) {
      // Sehr guter Notiz-Match: 90% Notiz, 10% Domain
      confidence = Math.round(noteMatch * 0.9 + domainMatch * 0.1);
    } else if (noteMatch > 0) {
      // Mittlerer Notiz-Match: 70% Notiz, 30% Domain
      confidence = Math.round(noteMatch * 0.7 + domainMatch * 0.3);
    } else {
      // Kein Notiz-Match: Nur Domain und Stadt verwenden
      confidence = Math.round(domainMatch * 0.8 + cityMatch * 0.2);
    }
    
    return {
      contactId: contact.id,
      contactName: `${contact.firstname} ${contact.lastname}`.trim(),
      contactEmail: contact.email,
      contactNote: contact.note,
      confidence,
      domainMatch,
      noteMatch,
    };
  });
  
  // Sortiere nach Konfidenz und filtere nur relevante Matches (> 20%)
  return matches
    .filter(m => m.confidence > 20)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 5);
};
