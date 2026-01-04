import { Organization, Heyflow } from '@/types/organization';

// Levenshtein-Distanz für Fuzzy-Matching
const levenshteinDistance = (str1: string, str2: string): number => {
  const m = str1.length;
  const n = str2.length;
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }

  return dp[m][n];
};

// Ähnlichkeit als Prozent (0-100)
const similarity = (str1: string, str2: string): number => {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  
  if (s1 === s2) return 100;
  if (s1.length === 0 || s2.length === 0) return 0;
  
  const maxLen = Math.max(s1.length, s2.length);
  const distance = levenshteinDistance(s1, s2);
  return Math.round((1 - distance / maxLen) * 100);
};

export interface MatchResult {
  traegerId: string;
  traegerName: string;
  confidence: number;
  nameScore: number;
  zipScore: number;
  cityScore: number;
}

// Gewichtung: Name 50%, PLZ 30%, Stadt 20%
const NAME_WEIGHT = 0.5;
const ZIP_WEIGHT = 0.3;
const CITY_WEIGHT = 0.2;

export const findBestMatches = (
  einrichtung: Organization,
  traegerOrganizations: Organization[],
  topN: number = 3
): MatchResult[] => {
  const results: MatchResult[] = traegerOrganizations.map(traeger => {
    const nameScore = similarity(einrichtung.name, traeger.name);
    const zipScore = einrichtung.zipCode === traeger.zipCode ? 100 : similarity(einrichtung.zipCode, traeger.zipCode);
    const cityScore = similarity(einrichtung.city, traeger.city);
    
    const confidence = Math.round(
      nameScore * NAME_WEIGHT + 
      zipScore * ZIP_WEIGHT + 
      cityScore * CITY_WEIGHT
    );

    return {
      traegerId: traeger.id,
      traegerName: traeger.name,
      confidence,
      nameScore,
      zipScore,
      cityScore,
    };
  });

  return results
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, topN);
};

// Alle Einrichtungen mit Vorschlägen
export const generateAllMatches = (
  organizations: Organization[]
): Map<string, MatchResult[]> => {
  const traeger = organizations.filter(o => o.type === 'traeger');
  const einrichtungen = organizations.filter(o => o.type === 'einrichtung');
  
  const matchMap = new Map<string, MatchResult[]>();
  
  einrichtungen.forEach(einrichtung => {
    const matches = findBestMatches(einrichtung, traeger);
    matchMap.set(einrichtung.id, matches);
  });
  
  return matchMap;
};

// Heyflow-Match-Ergebnis
export interface HeyflowMatchResult {
  organizationId: string;
  organizationName: string;
  confidence: number;
  nameScore: number;
}

// Heyflow-Name mit Einrichtungs-Namen vergleichen
export const findBestHeyflowMatches = (
  heyflow: Heyflow,
  einrichtungen: Organization[],
  topN: number = 3
): HeyflowMatchResult[] => {
  const results: HeyflowMatchResult[] = einrichtungen.map(org => {
    const nameScore = similarity(heyflow.designation, org.name);
    
    return {
      organizationId: org.id,
      organizationName: org.name,
      confidence: nameScore,
      nameScore,
    };
  });

  return results
    .filter(r => r.confidence > 30) // Nur Matches mit mindestens 30% Ähnlichkeit
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, topN);
};

// Alle Heyflows mit Vorschlägen für Einrichtungen
export const generateHeyflowMatches = (
  heyflows: Heyflow[],
  organizations: Organization[]
): Map<string, HeyflowMatchResult[]> => {
  const einrichtungen = organizations.filter(o => o.type === 'einrichtung');
  
  const matchMap = new Map<string, HeyflowMatchResult[]>();
  
  heyflows.forEach(heyflow => {
    const matches = findBestHeyflowMatches(heyflow, einrichtungen);
    matchMap.set(heyflow.id, matches);
  });
  
  return matchMap;
};

// Einrichtung-zu-Heyflows Mapping (umgekehrt)
export const generateOrganizationHeyflowSuggestions = (
  organization: Organization,
  heyflows: Heyflow[],
  topN: number = 3
): Array<{ heyflowId: string; heyflowName: string; confidence: number }> => {
  const results = heyflows.map(heyflow => {
    const nameScore = similarity(organization.name, heyflow.designation);
    
    return {
      heyflowId: heyflow.id,
      heyflowName: heyflow.designation,
      confidence: nameScore,
    };
  });

  return results
    .filter(r => r.confidence > 30)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, topN);
};
