# CSV-Import Anleitung: Ambulant/Stationär

## ✅ So passen Sie Ihre CSV an (Empfohlen!)

**Fügen Sie einfach eine Spalte "Versorgungsart" hinzu:**

```csv
Name,Straße,PLZ,Stadt,Versorgungsart
Pflegeheim Sonnenschein,Hauptstraße 1,12345,Berlin,Stationär
Ambulanter Pflegedienst Nord,Nordstraße 5,12345,Berlin,Ambulant
Klinik am See,Seeweg 10,54321,Hamburg,Ambulant & Stationär
Seniorenheim Bergblick,Bergweg 3,67890,München,
```

**Was passiert beim Import?**
- Die App erkennt die Spalte "Versorgungsart" automatisch
- Beim Import können Sie die Spalte zuordnen (optional!)
- Werte werden automatisch korrekt gesetzt
- Sie müssen nur noch prüfen, nicht alles neu eingeben!

**Workflow**:
1. CSV importieren (mit Versorgungsart-Spalte)
2. **NEU**: Spalte "Versorgungsart" zuordnen (im Bereich "Optionale Felder")
3. Träger/Einrichtung klassifizieren
4. Im Schritt "Einrichtungen prüfen" die Werte prüfen und ggf. anpassen
5. Weiter mit der Validierung

---

## 📋 Erlaubte Werte in der Spalte "Versorgungsart"

**Die App versteht folgende Werte** (Groß-/Kleinschreibung egal):
- `Ambulant` → wird importiert als `isAmbulant=true`, `isStationaer=false`
- `Stationär` → wird importiert als `isAmbulant=false`, `isStationaer=true`
- `Ambulant & Stationär` → beides
- `A & S` → beides
- `ambulant und stationär` → beides
- *(leer)* → offen (noch nicht festgelegt)

**Wichtig**: Die App sucht nach den Wörtern "ambulant" und "stationär" im Text, daher funktionieren auch Variationen!

## 🎯 Beispiele für gültige CSV-Einträge

| Versorgungsart | Resultat | Badge in App |
|----------------|----------|--------------|
| `Ambulant` | Nur ambulant | 🔵 Ambulant |
| `Stationär` | Nur stationär | 🟢 Stationär |
| `Ambulant & Stationär` | Beides | 🟣 A & S |
| `Stationär und Ambulant` | Beides | 🟣 A & S |
| `A & S` | Beides | 🟣 A & S |
| *(leer)* | Offen | ⚪ Offen |
| `Tagespflege` | Offen (wird nicht erkannt) | ⚪ Offen |

## 🔧 Import-Prozess in der App

1. **CSV hochladen** wie gewohnt
2. **Spalten zuordnen**:
   - Name, Straße, PLZ, Stadt (Pflichtfelder)
   - **NEU**: Versorgungsart (optionales Feld) - Dropdown zeigt "Keine Zuordnung" als Default
3. **"Daten importieren"** klicken
4. Fertig! Die Versorgungsart wurde automatisch gesetzt

## 📌 Hinweis: Spalte ist optional!

**Sie müssen die Versorgungsart-Spalte NICHT zuordnen!**
- Wenn Sie sie nicht zuordnen → alle Einrichtungen sind "Offen"
- Wenn Sie sie zuordnen → Werte werden automatisch übernommen
- Fehlende Werte in der Spalte → diese Zeilen sind "Offen"

---

## 🎯 Empfehlung

**Fügen Sie die Spalte "Versorgungsart" zu Ihrer CSV hinzu!**

**Vorteile**:
- ✅ Import ist deutlich schneller
- ✅ Weniger manuelle Arbeit in der App
- ✅ Werte müssen nur noch geprüft werden, nicht eingegeben
- ✅ Bulk-Edit steht trotzdem zur Verfügung für Korrekturen

**Workflow-Vergleich**:

**Ohne Versorgungsart-Spalte**:
1. Import → alles "Offen"
2. 100 Einrichtungen manuell klassifizieren (Bulk-Edit)
3. Einzeln prüfen

**Mit Versorgungsart-Spalte**:
1. Import → 95% sind bereits korrekt
2. Nur 5% mit Bulk-Edit korrigieren
3. Einzeln prüfen

---

## 💡 Bulk-Edit in der App

Selbst wenn Sie die Werte nicht in der CSV haben, können Sie sie sehr schnell in der App setzen:

1. **Navigate zu "Einrichtungen prüfen"**
2. **Filter nutzen** (z.B. nach Stadt sortieren)
3. **Mehrere Einrichtungen auswählen** (Checkboxen)
4. **"Toggle Ambulant"** oder **"Toggle Stationär"** klicken
5. **Fertig!** Alle ausgewählten Einrichtungen wurden aktualisiert

**Beispiel-Workflow**:
- Suche nach "Pflegedienst" → alle auswählen → "Toggle Ambulant"
- Suche nach "Pflegeheim" → alle auswählen → "Toggle Stationär"
- Suche nach "Klinik" → alle auswählen → "Toggle Ambulant" + "Toggle Stationär"

Dies ist oft **schneller** als CSV-Anpassungen!

---

## ❓ Zusammenfassung

| Frage | Antwort |
|-------|---------|
| Muss ich meine CSV ändern? | **Nein**, aber es ist empfohlen |
| Was passiert ohne Versorgungsart-Spalte? | Alle Einrichtungen sind "Offen" |
| Kann ich Werte in der App setzen? | **Ja**, mit Bulk-Edit und Einzelbearbeitung |
| Muss ich die Spalte zuordnen? | **Nein**, sie ist optional |
| Was ist die beste Methode? | **Spalte hinzufügen** + in App prüfen |
| Welcher Spaltenname? | Egal - Sie ordnen ihn beim Import zu |

---

## 🚀 Nächste Schritte

1. **CSV vorbereiten** (empfohlen):
   ```csv
   Name,Straße,PLZ,Stadt,Versorgungsart
   Ihre Einrichtung,Straße 1,12345,Stadt,Ambulant
   ```

2. **In der App importieren**:
   - Datei hochladen
   - Pflichtfelder zuordnen
   - "Versorgungsart" zuordnen (optional, aber empfohlen!)
   - "Daten importieren" klicken

3. **Klassifizieren**: Träger/Einrichtungen festlegen

4. **Im Schritt "Einrichtungen prüfen"**:
   - Werte überprüfen
   - Bei Bedarf mit Bulk-Edit korrigieren
   - Einzelne Einrichtungen bearbeiten

**Die Implementierung ist fertig - Sie können sofort loslegen!** 🎉
