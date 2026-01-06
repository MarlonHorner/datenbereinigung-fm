# CSV-Import Anleitung - Kontaktfelder

## Übersicht

Diese Anleitung zeigt Ihnen, wie Sie CSV-Dateien mit den neuen Kontaktfeldern für den Import vorbereiten.

## Unterstützte Kontaktfelder

### Für alle Organisationen:
- **Ansprechperson Allgemein** - Name der Hauptansprechperson
- **Telefon** - Telefonnummer
- **E-Mail** - Allgemeine E-Mail-Adresse

### Für Trägerorganisationen:
- **Rechnung E-Mail** - E-Mail(s) für Rechnungen (mehrere möglich)

### Für Einrichtungen:
- **Bewerbung E-Mail** - E-Mail(s) für Bewerbungen (mehrere möglich)

## Mehrere E-Mail-Adressen in einer Zelle

### Trennzeichen
Sie können mehrere E-Mail-Adressen in einem Feld speichern. Verwenden Sie dazu:
- **Komma (,)** ODER
- **Semikolon (;)** ODER
- **Eine Kombination aus beiden**

### Formatierung

**Option 1: Mit Komma trennen**
```csv
Rechnung E-Mail
rechnung@firma.de, buchhaltung@firma.de, finance@firma.de
```

**Option 2: Mit Semikolon trennen**
```csv
Rechnung E-Mail
rechnung@firma.de; buchhaltung@firma.de; finance@firma.de
```

**Option 3: Gemischt (wird auch verstanden)**
```csv
Rechnung E-Mail
rechnung@firma.de, buchhaltung@firma.de; finance@firma.de
```

### Wichtige Regeln für CSV-Dateien

#### 1. Wenn die Zelle Kommas enthält, in Anführungszeichen setzen
Wenn Sie Komma als Trennzeichen verwenden UND Ihre CSV-Datei Semikolon (;) als Spalten-Trennzeichen nutzt:

**Korrekt:**
```csv
Name;Rechnung E-Mail;Stadt
Firma ABC;"rechnung@abc.de, finance@abc.de";Berlin
```

**Falsch (wird falsch interpretiert):**
```csv
Name;Rechnung E-Mail;Stadt
Firma ABC;rechnung@abc.de, finance@abc.de;Berlin
```

#### 2. Leerzeichen werden automatisch entfernt
Diese sind alle equivalent:
```csv
"email1@firma.de, email2@firma.de"
"email1@firma.de,email2@firma.de"
"email1@firma.de , email2@firma.de"
```

#### 3. Leere Felder sind erlaubt
Wenn eine Organisation keine Rechnung-E-Mail oder Bewerbungs-E-Mail hat, lassen Sie das Feld einfach leer:

```csv
Name;Rechnung E-Mail;Bewerbung E-Mail
Firma A;rechnung@a.de;
Firma B;;jobs@b.de
Firma C;;
```

## Vollständiges Beispiel

### CSV-Datei für Einrichtungen

```csv
Name;Straße;PLZ;Stadt;Ansprechperson Allgemein;Telefon;E-Mail;Rechnung E-Mail;Bewerbung E-Mail
Pflegeheim Sonnenschein;Hauptstraße 1;10115;Berlin;Max Mustermann;030 123456;info@sonnenschein.de;"rechnung@sonnenschein.de, buchhaltung@sonnenschein.de";"jobs@sonnenschein.de, hr@sonnenschein.de, bewerbungen@sonnenschein.de"
Seniorenresidenz Am Park;Parkweg 5;20095;Hamburg;Lisa Schmidt;040 987654;kontakt@ampark.de;"billing@ampark.de; finance@ampark.de";karriere@ampark.de
Pflegedienst Mobile Care;Bergstraße 12;80331;München;Thomas Weber;089 555777;info@mobilecare.de;rechnung@mobilecare.de;
Altenheim Waldblick;Waldweg 8;50667;Köln;Anna Klein;0221 334455;kontakt@waldblick.de;;jobs@waldblick.de
```

### Erklärung der Beispiele:

**Zeile 1 (Pflegeheim Sonnenschein):**
- Rechnung E-Mail: 2 E-Mails (mit Komma getrennt, in Anführungszeichen)
- Bewerbung E-Mail: 3 E-Mails (mit Komma getrennt, in Anführungszeichen)

**Zeile 2 (Seniorenresidenz Am Park):**
- Rechnung E-Mail: 2 E-Mails (mit Semikolon getrennt, in Anführungszeichen)
- Bewerbung E-Mail: 1 E-Mail (keine Anführungszeichen nötig)

**Zeile 3 (Pflegedienst Mobile Care):**
- Rechnung E-Mail: 1 E-Mail
- Bewerbung E-Mail: Leer (keine Bewerbungs-E-Mail)

**Zeile 4 (Altenheim Waldblick):**
- Rechnung E-Mail: Leer (keine Rechnungs-E-Mail)
- Bewerbung E-Mail: 1 E-Mail

## Flexible Spaltennamen

Die Spalten werden automatisch erkannt. Diese Namen funktionieren alle:

### Ansprechperson Allgemein:
- `Ansprechperson Allgemein`
- `Ansprechperson`
- `Kontaktperson`
- `General Contact`

### Telefon:
- `Telefon`
- `Phone`
- `Tel`
- `Telefonnummer`

### E-Mail:
- `E-Mail`
- `Email`
- `Mail`
- `E_Mail`

### Rechnung E-Mail:
- `Rechnung E-Mail`
- `Rechnungsemail`
- `Rechnung Email`
- `Invoice Email`
- `Billing Email`

### Bewerbung E-Mail:
- `Bewerbung E-Mail`
- `Bewerbungsemail`
- `Bewerbung Email`
- `Application Email`
- `Jobs Email`

## Tipps für Excel/LibreOffice

### In Excel:
1. Erstellen Sie Ihre Tabelle mit den Kontaktfeldern
2. Für mehrere E-Mails: Schreiben Sie sie mit Komma oder Semikolon getrennt in eine Zelle
3. Speichern unter → CSV (durch Trennzeichen getrennt) → Trennzeichen: Semikolon

### In LibreOffice Calc:
1. Erstellen Sie Ihre Tabelle
2. Für mehrere E-Mails: In einer Zelle mit Komma/Semikolon trennen
3. Speichern unter → Text CSV (.csv) → Feldtrenner: ; (Semikolon) → Texttrenner: " (Anführungszeichen)

## Beispieldatei

Eine Beispiel-CSV-Datei finden Sie hier: [`CSV-IMPORT-BEISPIEL-KONTAKTFELDER.csv`](CSV-IMPORT-BEISPIEL-KONTAKTFELDER.csv)

## Nach dem Import

Nach dem Import werden mehrere E-Mail-Adressen:
- Als ein Textfeld gespeichert (z.B. `"email1@firma.de, email2@firma.de"`)
- In der UI im Bearbeitungsmodus als Text angezeigt
- Beim JSON-Export als Array aufgeteilt: `["email1@firma.de", "email2@firma.de"]`
- Beim CSV-Export wieder als komma-/semikolon-getrennte Zeichenkette exportiert

## Häufige Fehler vermeiden

❌ **Falsch:**
```csv
Name;Rechnung E-Mail
Firma;email1@firma.de, email2@firma.de
```
Wenn das Spalten-Trennzeichen ein Semikolon ist, wird das Komma in der E-Mail als neue Spalte interpretiert!

✅ **Richtig:**
```csv
Name;Rechnung E-Mail
Firma;"email1@firma.de, email2@firma.de"
```
Oder:
```csv
Name;Rechnung E-Mail
Firma;email1@firma.de; email2@firma.de
```

## Zusammenfassung

- ✅ Mehrere E-Mails mit `,` oder `;` trennen
- ✅ Zellen mit Kommas in Anführungszeichen setzen (wenn CSV Semikolon als Trenner nutzt)
- ✅ Leere Felder sind erlaubt
- ✅ Leerzeichen werden automatisch entfernt
- ✅ Spaltennamen werden flexibel erkannt
