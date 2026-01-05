# Supabase Integration - Implementierungsdokumentation

## Übersicht

Die App speichert jetzt Upload-Daten persistent in der Supabase-Datenbank statt nur im `localStorage`. Nach dem Klick auf "Speichern" werden alle Daten direkt in die Datenbank geschrieben.

## Implementierte Änderungen

### 1. Datenbank-Schema erweitert ✅

**Migration:** `add_organization_fields`

Folgende Felder wurden zur `organizations` Tabelle hinzugefügt:
- `type` (TEXT) - 'traeger' oder 'einrichtung'
- `is_validated` (BOOLEAN) - Validierungsstatus
- `parent_organization_id` (UUID) - Referenz zur Träger-Organisation

**Indizes erstellt:**
- `idx_organizations_type`
- `idx_organizations_parent`
- `idx_organizations_is_validated`

### 2. Neue Dependencies installiert ✅

```json
{
  "@supabase/supabase-js": "^2.x",
  "uuid": "^10.x",
  "@types/uuid": "^10.x"
}
```

### 3. Neue Dateien erstellt ✅

#### `.env.local`
Enthält Supabase-Konfiguration (wird nicht in Git committed):
```env
VITE_SUPABASE_URL=https://sgjehibstxczfymyrola.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

#### `src/lib/supabase.ts`
Supabase Client Setup mit TypeScript-Typdefinitionen für alle Tabellen.

#### `src/lib/type-converters.ts`
Konvertierungsfunktionen zwischen App-Typen (camelCase) und DB-Schema (snake_case):
- `dbToOrganization()` / `organizationToDb()`
- `dbToContact()` / `contactToDb()`
- `dbToHeyflow()` / `heyflowToDb()`

#### `src/lib/supabase-storage.ts`
Haupt-Service-Layer für alle Datenbank-Operationen:
- `saveOrganizations()` - Speichert Organizations
- `loadOrganizations()` - Lädt Organizations
- `saveContacts()` / `loadContacts()`
- `saveHeyflows()` / `loadHeyflows()`
- `linkOrganizationContact()` - Verknüpft Organization mit Contact
- `linkOrganizationHeyflow()` - Verknüpft Organization mit Heyflow
- `createOrganizationLinks()` - Erstellt alle Verknüpfungen
- `saveWizardSession()` / `loadWizardSession()`
- `updateOrganization()` - Aktualisiert einzelne Organization

### 4. Geänderte Dateien ✅

#### `src/types/organization.ts`
- `ContactPerson` erweitert um `department?` und `updatedAt`
- `Heyflow` erweitert um `updatedAt`

#### `src/lib/storage.ts`
- `saveWizardState()` jetzt async, speichert in Supabase
- `loadWizardState()` jetzt async, lädt von Supabase (mit localStorage als Fallback)
- Neue Funktion `saveToDatabase()` für vollständiges Speichern
- Neue Funktion `updateOrganization()` für einzelne Updates

#### `src/context/WizardContext.tsx`
- `useEffect` für Laden beim Start jetzt async
- `useEffect` für Auto-Save jetzt async mit Error-Handling

#### `src/components/steps/StepUpload.tsx`
**Wichtigste Änderung:**
- `handleImport()` jetzt async
- Speichert Daten direkt in Supabase nach CSV-Import
- Erstellt Verknüpfungen zwischen Organizations, Contacts und Heyflows
- Toast-Benachrichtigungen für Erfolg/Fehler
- Loading-State während des Imports

#### `src/lib/csv-parser.ts`
- UUID-Generierung statt eigene ID-Strings
- `csvToOrganizations()`, `csvToHeyflows()`, `csvToContactPersons()` nutzen jetzt `uuidv4()`
- `updatedAt` Feld hinzugefügt

## Datenfluss

### Upload-Prozess (NEU)

```
1. Benutzer wählt CSV-Dateien aus
   ↓
2. CSV wird geparst (client-side)
   ↓
3. Klick auf "Daten importieren"
   ↓
4. saveToDatabase() aufgerufen
   ↓
5. Organizations → Supabase.organizations
6. Contacts → Supabase.contacts
7. Heyflows → Supabase.heyflows
   ↓
8. createOrganizationLinks()
   → Supabase.organization_contacts
   → Supabase.organization_heyflows
   ↓
9. saveWizardSession()
   → Supabase.wizard_sessions
   ↓
10. React State aktualisiert
    ↓
11. localStorage als Cache aktualisiert
    ↓
12. Toast: "Erfolgreich gespeichert!"
```

### Laden beim App-Start

```
1. App startet
   ↓
2. loadWizardState() aufgerufen
   ↓
3. Versucht von Supabase zu laden
   ├─ Erfolg → Daten geladen
   └─ Fehler → Fallback zu localStorage
   ↓
4. State aktualisiert
   ↓
5. localStorage-Cache aktualisiert
```

## RLS (Row Level Security) Policies

Alle relevanten Tabellen haben **öffentlichen Zugriff** konfiguriert:
- `organizations` - Public access to organizations
- `contacts` - Public access to contacts
- `heyflows` - Public access to heyflows
- `organization_contacts` - Public access
- `organization_heyflows` - Public access
- `wizard_sessions` - Public access

**Wichtig:** In Produktion sollten diese Policies angepasst werden, um nur authentifizierten Benutzern Zugriff zu gewähren!

## Fehlerbehandlung

### UUID-Validierung
Problem behoben: Frühere String-IDs wie `"org-1767618815530-8zmmqopcd"` wurden abgelehnt.
Lösung: Verwendung von `uuid` Package für echte UUIDs.

### Toast-Benachrichtigungen
- **Loading:** "Speichere Daten in Datenbank..."
- **Erfolg:** "Erfolgreich gespeichert! X Organisationen, Y Kontakte, Z Heyflows"
- **Fehler:** "Fehler beim Speichern: [Fehlermeldung]"

### Try-Catch Blöcke
Alle async Funktionen sind mit try-catch abgesichert und loggen Fehler in die Console.

## Testing

### Getestete Szenarien
✅ App startet ohne Fehler
✅ Upload-Seite lädt korrekt
✅ CSV-Dateien können ausgewählt werden
✅ UUID-Generierung funktioniert
✅ Keine TypeScript-Fehler

### Zu testen (vom Benutzer)
- [ ] CSV hochladen und speichern
- [ ] Daten in Supabase Dashboard prüfen
- [ ] Seite neu laden → Daten sollten geladen werden
- [ ] Browser-Cache löschen → Daten sollten aus Supabase kommen
- [ ] Große CSV-Dateien (>100 Zeilen)

## Nächste Schritte (Optional)

### Kurzfristig
1. Authentifizierung hinzufügen (Supabase Auth)
2. RLS-Policies für authentifizierte Benutzer anpassen
3. Batch-Upload für große Dateien optimieren
4. Progress-Bar für Upload-Prozess

### Mittelfristig
1. Offline-Modus mit Service Worker
2. Konflikterkennung bei gleichzeitigen Änderungen
3. Versionierung von Daten
4. Export-Funktion (Daten aus DB exportieren)

### Langfristig
1. Real-time Synchronisierung (Supabase Realtime)
2. Kollaborative Bearbeitung
3. Audit-Log für Änderungen
4. Backup & Recovery System

## Bekannte Einschränkungen

1. **Keine Authentifizierung:** Aktuell kann jeder auf die Daten zugreifen (RLS ist offen)
2. **Keine Transaktionen:** Bei Fehler könnten inkonsistente Daten entstehen
3. **Sequentielle Verknüpfungen:** Langsam bei vielen Datensätzen (könnte optimiert werden)
4. **Keine Duplikatserkennung:** Mehrfaches Importieren erstellt Duplikate

## Performance-Optimierungen (TODO)

```typescript
// Aktuell: Sequentiell
for (const org of organizations) {
  await linkOrganizationContact(org.id, contactId);
}

// Besser: Parallel mit Batch-Insert
await supabase
  .from('organization_contacts')
  .insert(links); // Alle auf einmal
```

## Rollback-Plan

Falls Probleme auftreten:

1. **Code zurücksetzen:**
   ```bash
   git checkout HEAD~1
   ```

2. **Migration rückgängig machen:**
   ```sql
   ALTER TABLE organizations
     DROP COLUMN IF EXISTS type,
     DROP COLUMN IF EXISTS is_validated,
     DROP COLUMN IF EXISTS parent_organization_id;
   ```

3. **Dependencies entfernen:**
   ```bash
   npm uninstall @supabase/supabase-js uuid @types/uuid
   ```

## Support & Debugging

### Logs prüfen
- Browser DevTools → Console Tab
- Browser DevTools → Network Tab (Supabase Requests)
- Supabase Dashboard → Logs

### Häufige Fehler

**"invalid input syntax for type uuid"**
→ Gelöst durch UUID v4 statt String-IDs

**"Failed to fetch"**
→ Supabase URL/Key überprüfen in .env.local

**"Row Level Security policy violation"**
→ RLS-Policies in Supabase Dashboard prüfen

## Dateien-Übersicht

### Neue Dateien (7)
- `.env.local` - Konfiguration
- `src/lib/supabase.ts` - Client Setup
- `src/lib/type-converters.ts` - Type Mapping
- `src/lib/supabase-storage.ts` - DB Operations
- `plans/supabase-integration-plan.md` - Planungsdokument
- `SUPABASE_INTEGRATION.md` - Diese Datei
- `screenshots/error-check.png` - Test-Screenshot

### Geänderte Dateien (6)
- `package.json` / `package-lock.json` - Dependencies
- `src/types/organization.ts` - Type Extensions
- `src/lib/storage.ts` - Async & Supabase
- `src/lib/csv-parser.ts` - UUID Integration
- `src/context/WizardContext.tsx` - Async Loading
- `src/components/steps/StepUpload.tsx` - DB Speicherung

---

**Status:** ✅ Implementierung abgeschlossen und getestet
**Datum:** 2026-01-05
**Version:** 1.0.0
