import React, { useCallback, useState } from 'react';
import { Upload, FileSpreadsheet, AlertCircle, X, Users } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useWizard } from '@/context/WizardContext';
import {
  parseCSV,
  detectColumns,
  csvToOrganizations,
  detectHeyflowColumns,
  csvToHeyflows,
  detectContactColumns,
  csvToContactPersons,
  ParsedCSVRow
} from '@/lib/csv-parser';
import { cn } from '@/lib/utils';
import { saveToDatabase } from '@/lib/storage';
import { createOrganizationLinks } from '@/lib/supabase-storage';
import { toast } from 'sonner';

interface FileUploadState {
  file: File | null;
  rows: ParsedCSVRow[];
  headers: string[];
  columnMapping: Record<string, string>;
  error: string | null;
}

const StepUpload = () => {
  const { dispatch, state } = useWizard();
  const [isImporting, setIsImporting] = useState(false);
  
  const [mainFile, setMainFile] = useState<FileUploadState>({
    file: null,
    rows: [],
    headers: [],
    columnMapping: {},
    error: null,
  });
  
  const [heyflowFile, setHeyflowFile] = useState<FileUploadState>({
    file: null,
    rows: [],
    headers: [],
    columnMapping: {},
    error: null,
  });

  const [contactFile, setContactFile] = useState<FileUploadState>({
    file: null,
    rows: [],
    headers: [],
    columnMapping: {},
    error: null,
  });

  const handleFileDrop = useCallback((
    e: React.DragEvent<HTMLDivElement>,
    setter: React.Dispatch<React.SetStateAction<FileUploadState>>,
    type: 'main' | 'heyflow' | 'contact'
  ) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) processFile(file, setter, type);
  }, []);

  const handleFileSelect = useCallback((
    e: React.ChangeEvent<HTMLInputElement>,
    setter: React.Dispatch<React.SetStateAction<FileUploadState>>,
    type: 'main' | 'heyflow' | 'contact'
  ) => {
    const file = e.target.files?.[0];
    if (file) processFile(file, setter, type);
  }, []);

  const processFile = async (
    file: File,
    setter: React.Dispatch<React.SetStateAction<FileUploadState>>,
    type: 'main' | 'heyflow' | 'contact'
  ) => {
    if (!file.name.endsWith('.csv')) {
      setter(prev => ({ ...prev, error: 'Bitte wählen Sie eine CSV-Datei aus.' }));
      return;
    }

    try {
      const text = await file.text();
      const rows = parseCSV(text);
      
      if (rows.length === 0) {
        setter(prev => ({ ...prev, error: 'Die CSV-Datei ist leer oder ungültig.' }));
        return;
      }

      const headers = Object.keys(rows[0]);
      let detected: Record<string, string>;
      
      if (type === 'main') {
        detected = detectColumns(headers) as Record<string, string>;
      } else if (type === 'heyflow') {
        detected = detectHeyflowColumns(headers) as Record<string, string>;
      } else {
        detected = detectContactColumns(headers) as Record<string, string>;
      }

      setter({
        file,
        rows,
        headers,
        columnMapping: detected,
        error: null,
      });
    } catch (error) {
      setter(prev => ({ ...prev, error: 'Fehler beim Lesen der Datei.' }));
    }
  };

  const removeFile = (setter: React.Dispatch<React.SetStateAction<FileUploadState>>) => {
    setter({
      file: null,
      rows: [],
      headers: [],
      columnMapping: {},
      error: null,
    });
  };

  const updateColumnMapping = (
    setter: React.Dispatch<React.SetStateAction<FileUploadState>>,
    key: string,
    value: string
  ) => {
    setter(prev => ({
      ...prev,
      columnMapping: { ...prev.columnMapping, [key]: value },
    }));
  };

  const handleImport = async () => {
    setIsImporting(true);
    
    try {
      // Hauptdatei verarbeiten
      let organizations = state.organizations;
      if (mainFile.rows.length > 0) {
        const mapping = mainFile.columnMapping as {
          name: string;
          street: string;
          zipCode: string;
          city: string;
          careType?: string;
          generalContactPerson?: string;
          phone?: string;
          email?: string;
          invoiceEmail?: string;
          applicationEmail?: string;
        };
        
        if (!mapping.name || !mapping.street || !mapping.zipCode || !mapping.city) {
          setMainFile(prev => ({ ...prev, error: 'Bitte ordnen Sie alle Pflichtfelder zu.' }));
          setIsImporting(false);
          return;
        }

        organizations = csvToOrganizations(mainFile.rows, mapping);
      }

      // Heyflow-Datei verarbeiten
      let heyflows = state.heyflows;
      if (heyflowFile.rows.length > 0) {
        const mapping = heyflowFile.columnMapping as { id: string; url: string; designation: string };
        
        if (mapping.id && mapping.url && mapping.designation) {
          heyflows = csvToHeyflows(heyflowFile.rows, mapping);
        }
      }

      // Ansprechpersonen-Datei verarbeiten
      let contacts = state.contactPersons;
      if (contactFile.rows.length > 0) {
        const mapping = contactFile.columnMapping as {
          firstname?: string;
          lastname?: string;
          name?: string;
          email: string;
          note?: string
        };
        
        // Validiere: entweder firstname+lastname+email ODER name+email
        const hasValidMapping = (
          (mapping.firstname && mapping.lastname && mapping.email) ||
          (mapping.name && mapping.email)
        );
        
        if (hasValidMapping) {
          contacts = csvToContactPersons(contactFile.rows, mapping);
        }
      }

      // In Supabase speichern
      toast.loading('Speichere Daten in Datenbank...', { id: 'import' });
      
      const newState = {
        ...state,
        organizations,
        contactPersons: contacts,
        heyflows,
        isDataLoaded: true,
      };
      
      const savedState = await saveToDatabase(newState);
      
      // Verknüpfungen erstellen
      await createOrganizationLinks(
        savedState.organizations,
        savedState.contactPersons,
        savedState.heyflows
      );
      
      // State aktualisieren
      dispatch({ type: 'SET_ORGANIZATIONS', organizations: savedState.organizations });
      dispatch({ type: 'SET_CONTACT_PERSONS', contactPersons: savedState.contactPersons });
      dispatch({ type: 'SET_HEYFLOWS', heyflows: savedState.heyflows });
      
      toast.success(
        `Erfolgreich gespeichert! ${savedState.organizations.length} Organisationen, ${savedState.contactPersons.length} Kontakte, ${savedState.heyflows.length} Heyflows`,
        { id: 'import', duration: 5000 }
      );
    } catch (error) {
      console.error('Import error:', error);
      toast.error(
        `Fehler beim Speichern: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`,
        { id: 'import', duration: 7000 }
      );
    } finally {
      setIsImporting(false);
    }
  };

  const isMainFileReady = mainFile.file && 
    mainFile.columnMapping.name && 
    mainFile.columnMapping.street && 
    mainFile.columnMapping.zipCode && 
    mainFile.columnMapping.city;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Datenimport</h2>
        <p className="text-muted-foreground mt-1">
          Laden Sie Ihre CSV-Dateien hoch, um mit der Datenbereinigung zu beginnen.
        </p>
      </div>

      {/* Hauptdatei Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-primary" />
            Hauptdatei (Pflicht)
          </CardTitle>
          <CardDescription>
            CSV mit Organisationen/Einrichtungen (Name, Straße, PLZ, Stadt)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!mainFile.file ? (
            <div
              onDrop={(e) => handleFileDrop(e, setMainFile, 'main')}
              onDragOver={(e) => e.preventDefault()}
              className={cn(
                'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer',
                'hover:border-primary hover:bg-accent/50 transition-colors',
                'border-muted-foreground/25'
              )}
            >
              <input
                type="file"
                accept=".csv"
                onChange={(e) => handleFileSelect(e, setMainFile, 'main')}
                className="hidden"
                id="main-file"
              />
              <label htmlFor="main-file" className="cursor-pointer">
                <Upload className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm font-medium">CSV-Datei hierher ziehen</p>
                <p className="text-xs text-muted-foreground mt-1">oder klicken zum Auswählen</p>
              </label>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-accent/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-primary" />
                  <span className="text-sm font-medium truncate max-w-[180px]">
                    {mainFile.file.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    ({mainFile.rows.length} Zeilen)
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeFile(setMainFile)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* Spalten-Zuordnung */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Spaltenzuordnung (Pflichtfelder)</Label>
                {['name', 'street', 'zipCode', 'city'].map((field) => (
                  <div key={field} className="flex items-center gap-3">
                    <span className="text-sm w-32 capitalize">
                      {field === 'zipCode' ? 'PLZ' :
                       field === 'street' ? 'Straße' :
                       field === 'city' ? 'Stadt' : 'Name'}:
                    </span>
                    <Select
                      value={mainFile.columnMapping[field] || ''}
                      onValueChange={(v) => updateColumnMapping(setMainFile, field, v)}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Spalte wählen..." />
                      </SelectTrigger>
                      <SelectContent>
                        {mainFile.headers.map((h) => (
                          <SelectItem key={h} value={h}>{h}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
                
                <div className="pt-3 border-t">
                  <Label className="text-sm font-medium text-muted-foreground">Optionale Felder</Label>
                </div>
                
                {[
                  { key: 'careType', label: 'Versorgungsart' },
                  { key: 'generalContactPerson', label: 'Ansprechperson Allgemein' },
                  { key: 'phone', label: 'Telefon' },
                  { key: 'email', label: 'E-Mail' },
                  { key: 'invoiceEmail', label: 'Rechnung E-Mail' },
                  { key: 'applicationEmail', label: 'Bewerbung E-Mail' },
                ].map(({ key, label }) => (
                  <div key={key} className="flex items-center gap-3">
                    <span className="text-sm w-48">
                      {label}:
                    </span>
                    <Select
                      value={mainFile.columnMapping[key] || '_none_'}
                      onValueChange={(v) => updateColumnMapping(setMainFile, key, v === '_none_' ? '' : v)}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="(Optional) Spalte wählen..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none_">Keine Zuordnung</SelectItem>
                        {mainFile.headers.map((h) => (
                          <SelectItem key={h} value={h}>{h}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>
          )}

          {mainFile.error && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="w-4 h-4" />
              <AlertDescription>{mainFile.error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Ansprechpersonen Upload */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="w-5 h-5 text-chart-3" />
              Ansprechpersonen (Optional)
            </CardTitle>
            <CardDescription>
              CSV mit Ansprechpersonen (Vorname, Nachname, E-Mail, Notiz)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!contactFile.file ? (
              <div
                onDrop={(e) => handleFileDrop(e, setContactFile, 'contact')}
                onDragOver={(e) => e.preventDefault()}
                className={cn(
                  'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer',
                  'hover:border-chart-3 hover:bg-accent/50 transition-colors',
                  'border-muted-foreground/25'
                )}
              >
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => handleFileSelect(e, setContactFile, 'contact')}
                  className="hidden"
                  id="contact-file"
                />
                <label htmlFor="contact-file" className="cursor-pointer">
                  <Upload className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                  <p className="text-sm font-medium">CSV-Datei hierher ziehen</p>
                  <p className="text-xs text-muted-foreground mt-1">oder klicken zum Auswählen</p>
                </label>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-accent/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-chart-3" />
                    <span className="text-sm font-medium truncate max-w-[180px]">
                      {contactFile.file.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      ({contactFile.rows.length} Zeilen)
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeFile(setContactFile)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                {/* Spalten-Zuordnung */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Spaltenzuordnung</Label>
                  <p className="text-xs text-muted-foreground">
                    Entweder Vorname + Nachname ODER Name (wird automatisch gesplittet)
                  </p>
                  
                  {[
                    { key: 'firstname', label: 'Vorname' },
                    { key: 'lastname', label: 'Nachname' },
                    { key: 'name', label: 'Name (Fallback)' },
                    { key: 'email', label: 'E-Mail (Pflicht)' },
                  ].map(({ key, label }) => (
                    <div key={key} className="flex items-center gap-3">
                      <span className="text-sm w-32">
                        {label}:
                      </span>
                      <Select
                        value={contactFile.columnMapping[key] || '_none_'}
                        onValueChange={(v) => updateColumnMapping(setContactFile, key, v === '_none_' ? '' : v)}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Spalte wählen..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="_none_">Keine Zuordnung</SelectItem>
                          {contactFile.headers.map((h) => (
                            <SelectItem key={h} value={h}>{h}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                  
                  <div className="pt-3 border-t">
                    <Label className="text-sm font-medium text-muted-foreground">Optionale Felder</Label>
                  </div>
                  
                  {['note'].map((field) => (
                    <div key={field} className="flex items-center gap-3">
                      <span className="text-sm w-20">
                        Notiz:
                      </span>
                      <Select
                        value={contactFile.columnMapping[field] || '_none_'}
                        onValueChange={(v) => updateColumnMapping(setContactFile, field, v === '_none_' ? '' : v)}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="(Optional) Spalte wählen..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="_none_">Keine Zuordnung</SelectItem>
                          {contactFile.headers.map((h) => (
                            <SelectItem key={h} value={h}>{h}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {contactFile.error && (
              <Alert variant="destructive" className="mt-4">
                <AlertCircle className="w-4 h-4" />
                <AlertDescription>{contactFile.error}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Heyflow-Datei Upload */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-secondary" />
              Heyflow-Datei (Optional)
            </CardTitle>
            <CardDescription>
              CSV mit Heyflow-Daten (ID, URL, Bezeichnung)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!heyflowFile.file ? (
              <div
                onDrop={(e) => handleFileDrop(e, setHeyflowFile, 'heyflow')}
                onDragOver={(e) => e.preventDefault()}
                className={cn(
                  'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer',
                  'hover:border-secondary hover:bg-accent/50 transition-colors',
                  'border-muted-foreground/25'
                )}
              >
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => handleFileSelect(e, setHeyflowFile, 'heyflow')}
                  className="hidden"
                  id="heyflow-file"
                />
                <label htmlFor="heyflow-file" className="cursor-pointer">
                  <Upload className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                  <p className="text-sm font-medium">CSV-Datei hierher ziehen</p>
                  <p className="text-xs text-muted-foreground mt-1">oder klicken zum Auswählen</p>
                </label>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-accent/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="w-5 h-5 text-secondary" />
                    <span className="text-sm font-medium truncate max-w-[180px]">
                      {heyflowFile.file.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      ({heyflowFile.rows.length} Zeilen)
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeFile(setHeyflowFile)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                {/* Spalten-Zuordnung */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Spaltenzuordnung</Label>
                  {['id', 'url', 'designation'].map((field) => (
                    <div key={field} className="flex items-center gap-3">
                      <span className="text-sm w-24">
                        {field === 'designation' ? 'Bezeichnung' : field.toUpperCase()}:
                      </span>
                      <Select
                        value={heyflowFile.columnMapping[field] || ''}
                        onValueChange={(v) => updateColumnMapping(setHeyflowFile, field, v)}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Spalte wählen..." />
                        </SelectTrigger>
                        <SelectContent>
                          {heyflowFile.headers.map((h) => (
                            <SelectItem key={h} value={h}>{h}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {heyflowFile.error && (
              <Alert variant="destructive" className="mt-4">
                <AlertCircle className="w-4 h-4" />
                <AlertDescription>{heyflowFile.error}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Import Button */}
      {isMainFileReady && (
        <div className="flex justify-end">
          <Button
            onClick={handleImport}
            size="lg"
            className="gap-2"
            disabled={isImporting}
          >
            <FileSpreadsheet className="w-5 h-5" />
            {isImporting ? 'Speichere...' : `Daten importieren (${mainFile.rows.length} Einträge)`}
          </Button>
        </div>
      )}
    </div>
  );
};

export default StepUpload;
