# Kontaktfelder für Einrichtungen - Update Dokumentation

## Übersicht

Es wurden folgende neue Kontaktfelder für Einrichtungen und Träger hinzugefügt:
- **Ansprechperson Allgemein** - Allgemeine Kontaktperson (Träger)
- **Telefon** - Telefonnummer (Träger)
- **E-Mail** - Allgemeine E-Mail-Adresse (Träger)
- **Rechnung E-Mail** - E-Mail(s) für Rechnungen (Träger) - **unterstützt mehrere E-Mails**
- **Bewerbung E-Mail** - E-Mail(s) für Bewerbungen (Einrichtungen) - **unterstützt mehrere E-Mails**

### Mehrere E-Mail-Adressen

Die Felder **Rechnung E-Mail** und **Bewerbung E-Mail** unterstützen mehrere E-Mail-Adressen:
- Trennen Sie mehrere E-Mails mit **Komma (,)** oder **Semikolon (;)**
- Beispiel: `rechnung@firma.de, buchhaltung@firma.de; finance@firma.de`
- Im JSON-Export werden diese als Array exportiert: `["rechnung@firma.de", "buchhaltung@firma.de", "finance@firma.de"]`
- Im CSV-Export bleiben sie als komma-/semikolon-getrennte Zeichenkette

## Durchgeführte Änderungen

### 1. TypeScript Types (`src/types/organization.ts`)
- ✅ `Organization` Interface erweitert mit 5 neuen optionalen Feldern

### 2. CSV Parser (`src/lib/csv-parser.ts`)
- ✅ `detectColumns` Funktion erkennt nun die neuen Spalten
- ✅ `csvToOrganizations` Funktion extrahiert die neuen Felder aus CSV

**Erkannte Spaltennamen:**
- Ansprechperson: `ansprechperson allgemein`, `ansprechperson`, `kontaktperson`, `general contact`
- Telefon: `telefon`, `phone`, `tel`, `telefonnummer`
- E-Mail: `e-mail`, `email`, `mail`, `e_mail`
- Rechnung E-Mail: `rechnung e-mail`, `rechnungsemail`, `rechnung email`, `invoice email`, `billing email`
- Bewerbung E-Mail: `bewerbung e-mail`, `bewerbungsemail`, `bewerbung email`, `application email`, `jobs email`

### 3. Supabase Integration

#### Type Definitions (`src/lib/supabase.ts`)
- ✅ Database Schema für `organizations` Tabelle erweitert

#### Type Converters (`src/lib/type-converters.ts`)
- ✅ `dbToOrganization` konvertiert DB-Felder zu App-Format
- ✅ `organizationToDb` konvertiert App-Format zu DB-Format

#### Storage (`src/lib/supabase-storage.ts`)
- ✅ `updateOrganization` Funktion unterstützt die neuen Felder

### 4. Benutzeroberfläche (`src/components/steps/StepValidate.tsx`)

#### Träger-Validierung
In der Träger-Validierung werden nun diese Felder angezeigt und können bearbeitet werden:
- ✅ Ansprechperson Allgemein
- ✅ Telefon
- ✅ E-Mail
- ✅ Rechnung E-Mail

#### Einrichtungs-Validierung
In der Einrichtungs-Validierung wird dieses Feld angezeigt und kann bearbeitet werden:
- ✅ Bewerbung E-Mail

Die Felder erscheinen als zusätzliche Spalten in der Validierungstabelle und können direkt beim Bearbeiten einer Organisation eingegeben werden.

### 5. Export Funktionen (`src/components/steps/StepOverview.tsx`)

#### JSON Export
Die neuen Felder werden in der JSON-Datei exportiert. **Mehrere E-Mails werden als Array ausgegeben:**

**Trägerorganisationen:**
```json
{
  "traegerorganisationen": [{
    "id": "...",
    "name": "Träger XY",
    "adresse": "...",
    "ansprechperson_allgemein": "Max Mustermann",
    "telefon": "030 123456",
    "email": "info@traeger.de",
    "rechnung_emails": ["rechnung@traeger.de", "buchhaltung@traeger.de"],
    "einrichtungen": [...]
  }]
}
```

**Einrichtungen:**
```json
{
  "einrichtungen": [{
    "id": "...",
    "name": "Einrichtung ABC",
    "adresse": "...",
    "ansprechperson_allgemein": "Lisa Schmidt",
    "telefon": "040 987654",
    "email": "info@einrichtung.de",
    "rechnung_emails": ["rechnung@einrichtung.de"],
    "bewerbung_emails": ["jobs@einrichtung.de", "hr@einrichtung.de"],
    "traegerorganisation": {...}
  }]
}
```

#### CSV Export

**Einrichtungen CSV** enthält nun zusätzliche Spalten:
- Ansprechperson Allgemein
- Telefon
- E-Mail
- Rechnung E-Mails (mehrere möglich, komma-/semikolon-getrennt)
- Bewerbung E-Mails (mehrere möglich, komma-/semikolon-getrennt)

**Träger CSV** enthält nun zusätzliche Spalten:
- Ansprechperson Allgemein
- Telefon
- E-Mail
- Rechnung E-Mails (mehrere möglich, komma-/semikolon-getrennt)

### 5. Datenbank Migration (`supabase/migrations/add_contact_fields_to_organizations.sql`)
- ✅ SQL Migration erstellt

## Nächste Schritte (WICHTIG!)

### 1. Datenbank Migration ausführen

**Sie müssen die Migration manuell in Supabase ausführen:**

1. Öffnen Sie das Supabase Dashboard: https://supabase.com/dashboard/project/bbgghqrmpznxhquvlnmh
2. Gehen Sie zu **SQL Editor**
3. Öffnen Sie die Datei `supabase/migrations/add_contact_fields_to_organizations.sql`
4. Kopieren Sie den SQL-Code
5. Fügen Sie ihn im SQL Editor ein
6. Führen Sie die Migration aus (Run Button)

**Alternativ** können Sie den SQL-Code direkt hier kopieren:

```sql
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS general_contact_person TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS invoice_email TEXT,
ADD COLUMN IF NOT EXISTS application_email TEXT;

COMMENT ON COLUMN organizations.general_contact_person IS 'Ansprechperson Allgemein';
COMMENT ON COLUMN organizations.phone IS 'Telefon';
COMMENT ON COLUMN organizations.email IS 'E-Mail';
COMMENT ON COLUMN organizations.invoice_email IS 'Rechnung E-Mail';
COMMENT ON COLUMN organizations.application_email IS 'Bewerbung E-Mail';
```

### 2. Anwendung testen

Nach der Migration sollten Sie testen:

1. **CSV Upload**: Importieren Sie eine CSV mit den neuen Spalten
2. **Daten-Speicherung**: Prüfen Sie, ob die Daten in Supabase gespeichert werden
3. **JSON Export**: Exportieren Sie die Daten und prüfen Sie die neuen Felder
4. **CSV Export**: Exportieren Sie als CSV und prüfen Sie die neuen Spalten

## CSV Format Beispiel

Ihre CSV-Datei kann nun folgende Spalten enthalten:

```csv
Name;Straße;PLZ;Stadt;Ansprechperson Allgemein;Telefon;E-Mail;Rechnung E-Mail;Bewerbung E-Mail
Pflegeheim Sonnenschein;Hauptstraße 1;10115;Berlin;Max Mustermann;030 123456;info@sonnenschein.de;rechnung@sonnenschein.de;jobs@sonnenschein.de
Seniorenresidenz Am Park;Parkweg 5;20095;Hamburg;Lisa Schmidt;040 987654;kontakt@ampark.de;billing@ampark.de;bewerbung@ampark.de
```

## Hinweise

- Die neuen Felder sind **optional** - CSV-Dateien ohne diese Spalten funktionieren weiterhin
- Die Feldererkennung ist **flexibel** - verschiedene Spaltennamen werden erkannt
- Die Felder werden **nur für Einrichtungen** verwendet (nicht für Träger)
- Leere Werte werden als `null` in der Datenbank gespeichert

## Geänderte Dateien

1. `src/types/organization.ts` - Organization Interface erweitert
2. `src/lib/csv-parser.ts` - CSV-Parser mit neuen Feldern
3. `src/lib/supabase.ts` - Datenbank-Typen aktualisiert
4. `src/lib/type-converters.ts` - Typ-Konverter erweitert
5. `src/lib/supabase-storage.ts` - Update-Funktion erweitert
6. `src/components/steps/StepValidate.tsx` - UI für Träger und Einrichtungen
7. `src/components/steps/StepOverview.tsx` - Export-Funktionen erweitert
8. `supabase/migrations/add_contact_fields_to_organizations.sql` - Datenbank-Migration (NEU)
9. `CONTACT_FIELDS_UPDATE.md` - Diese Dokumentation (NEU)

## Support

Bei Fragen oder Problemen:
- Prüfen Sie die Browser-Konsole auf Fehlermeldungen
- Prüfen Sie die Supabase Logs
- Stellen Sie sicher, dass die Migration erfolgreich ausgeführt wurde
