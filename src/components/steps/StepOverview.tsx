import React, { useState, useMemo } from 'react';
import { Download, Building2, Home, Users, Mail, Link2, Search, FileSpreadsheet, FileJson } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useWizard } from '@/context/WizardContext';
import { cn } from '@/lib/utils';

const StepOverview = () => {
  const { state } = useWizard();
  const { organizations, contactPersons, heyflows } = state;
  
  const [searchTerm, setSearchTerm] = useState('');

  const traeger = useMemo(() =>
    organizations.filter(o => o.type === 'traeger'),
    [organizations]
  );
  
  const einrichtungen = useMemo(() =>
    organizations.filter(o => o.type === 'einrichtung'),
    [organizations]
  );

  const filteredEinrichtungen = useMemo(() => 
    einrichtungen.filter(e =>
      searchTerm === '' ||
      e.name.toLowerCase().includes(searchTerm.toLowerCase())
    ),
    [einrichtungen, searchTerm]
  );

  const filteredTraeger = useMemo(() => 
    traeger.filter(t =>
      searchTerm === '' ||
      t.name.toLowerCase().includes(searchTerm.toLowerCase())
    ),
    [traeger, searchTerm]
  );

  const getTraegerName = (id?: string) => {
    if (!id) return '-';
    return traeger.find(t => t.id === id)?.name || '-';
  };

  const getContacts = (contactIds: string[]) => {
    return contactPersons.filter(c => contactIds.includes(c.id));
  };

  const getHeyflows = (heyflowIds: string[]) => {
    return heyflows.filter(h => heyflowIds.includes(h.id));
  };

  const getEinrichtungenForTraeger = (traegerId: string) => {
    return einrichtungen.filter(e => e.parentOrganizationId === traegerId);
  };

  // Hilfsfunktion zum Aufteilen von E-Mails
  const splitEmails = (emailString?: string): string[] => {
    if (!emailString) return [];
    return emailString
      .split(/[,;]/)
      .map(email => email.trim())
      .filter(email => email.length > 0);
  };

  // Export-Funktionen
  const exportToJSON = () => {
    const data = {
      traegerorganisationen: traeger.map(t => {
        const tEinrichtungen = getEinrichtungenForTraeger(t.id);
        return {
          id: t.id,
          name: t.name,
          adresse: `${t.street}, ${t.zipCode} ${t.city}`,
          // Direkte Kontaktfelder für Träger
          ansprechperson_allgemein: t.generalContactPerson || null,
          telefon: t.phone || null,
          email: t.email || null,
          rechnung_emails: splitEmails(t.invoiceEmail),
          einrichtungen: tEinrichtungen.map(e => ({
            id: e.id,
            name: e.name,
          })),
          einrichtungen_ids: tEinrichtungen.map(e => e.id),
        };
      }),
      einrichtungen: einrichtungen.map(e => {
        const contacts = getContacts(e.contactPersonIds);
        const hfs = getHeyflows(e.heyflowIds);
        return {
          id: e.id,
          name: e.name,
          adresse: `${e.street}, ${e.zipCode} ${e.city}`,
          traegerorganisation: {
            id: e.parentOrganizationId || null,
            name: getTraegerName(e.parentOrganizationId),
          },
          // Direkte Kontaktfelder
          ansprechperson_allgemein: e.generalContactPerson || null,
          telefon: e.phone || null,
          email: e.email || null,
          rechnung_emails: splitEmails(e.invoiceEmail),
          bewerbung_emails: splitEmails(e.applicationEmail),
          // Ansprechpersonen-Liste
          ansprechpersonen: contacts.map(c => ({
            id: c.id,
            vorname: c.firstname,
            nachname: c.lastname,
            email: c.email,
            note: c.note,
          })),
          ansprechpersonen_ids: e.contactPersonIds,
          heyflows: hfs.map(h => ({
            id: h.id,
            heyflow_id: h.heyflowId,
            bezeichnung: h.designation,
            url: h.url,
          })),
          heyflows_ids: e.heyflowIds,
        };
      }),
      exportDatum: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gesundheitsorganisationen-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportToCSV = () => {
    // Einrichtungen CSV
    const einrichtungenHeader = ['ID', 'Name', 'Straße', 'PLZ', 'Stadt', 'Trägerorganisation', 'Ansprechperson Allgemein', 'Telefon', 'E-Mail', 'Rechnung E-Mails', 'Bewerbung E-Mails', 'Ansprechpersonen Vorname', 'Ansprechpersonen Nachname', 'Ansprechpersonen E-Mails', 'Heyflows'];
    const einrichtungenRows = einrichtungen.map(e => {
      const contacts = getContacts(e.contactPersonIds);
      const hfs = getHeyflows(e.heyflowIds);
      return [
        e.id,
        `"${e.name}"`,
        `"${e.street}"`,
        e.zipCode,
        `"${e.city}"`,
        `"${getTraegerName(e.parentOrganizationId)}"`,
        `"${e.generalContactPerson || ''}"`,
        `"${e.phone || ''}"`,
        `"${e.email || ''}"`,
        `"${e.invoiceEmail || ''}"`,
        `"${e.applicationEmail || ''}"`,
        `"${contacts.map(c => c.firstname).join(', ')}"`,
        `"${contacts.map(c => c.lastname).join(', ')}"`,
        `"${contacts.map(c => c.email).join(', ')}"`,
        `"${hfs.map(h => h.designation).join(', ')}"`,
      ].join(';');
    });
    
    const einrichtungenCSV = [einrichtungenHeader.join(';'), ...einrichtungenRows].join('\n');
    
    // Träger CSV
    const traegerHeader = ['Name', 'Straße', 'PLZ', 'Stadt', 'Ansprechperson Allgemein', 'Telefon', 'E-Mail', 'Rechnung E-Mails', 'Anzahl Einrichtungen'];
    const traegerRows = traeger.map(t => [
      `"${t.name}"`,
      `"${t.street}"`,
      t.zipCode,
      `"${t.city}"`,
      `"${t.generalContactPerson || ''}"`,
      `"${t.phone || ''}"`,
      `"${t.email || ''}"`,
      `"${t.invoiceEmail || ''}"`,
      getEinrichtungenForTraeger(t.id).length,
    ].join(';'));
    
    const traegerCSV = [traegerHeader.join(';'), ...traegerRows].join('\n');
    
    // Beide als separate Downloads
    const downloadCSV = (content: string, filename: string) => {
      const blob = new Blob(['\ufeff' + content], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    };

    downloadCSV(einrichtungenCSV, `einrichtungen-${new Date().toISOString().split('T')[0]}.csv`);
    setTimeout(() => {
      downloadCSV(traegerCSV, `traegerorganisationen-${new Date().toISOString().split('T')[0]}.csv`);
    }, 500);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Übersicht</h2>
          <p className="text-muted-foreground mt-1">
            Finale Übersicht aller bereinigten Daten.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportToCSV} className="gap-2">
            <FileSpreadsheet className="w-4 h-4" />
            CSV exportieren
          </Button>
          <Button onClick={exportToJSON} className="gap-2">
            <FileJson className="w-4 h-4" />
            JSON exportieren
          </Button>
        </div>
      </div>

      {/* Statistik */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary" />
              <div>
                <div className="text-2xl font-bold">{traeger.length}</div>
                <p className="text-sm text-muted-foreground">Trägerorganisationen</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Home className="w-5 h-5 text-secondary" />
              <div>
                <div className="text-2xl font-bold">{einrichtungen.length}</div>
                <p className="text-sm text-muted-foreground">Einrichtungen</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-accent-foreground" />
              <div>
                <div className="text-2xl font-bold">{contactPersons.length}</div>
                <p className="text-sm text-muted-foreground">Ansprechpersonen</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Link2 className="w-5 h-5 text-warning" />
              <div>
                <div className="text-2xl font-bold">{heyflows.length}</div>
                <p className="text-sm text-muted-foreground">Heyflows</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Suche */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Suchen..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="einrichtungen">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="einrichtungen" className="gap-2">
            <Home className="w-4 h-4" />
            Einrichtungen
          </TabsTrigger>
          <TabsTrigger value="traeger" className="gap-2">
            <Building2 className="w-4 h-4" />
            Trägerorganisationen
          </TabsTrigger>
        </TabsList>

        <TabsContent value="einrichtungen" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="hidden md:table-cell">Adresse</TableHead>
                    <TableHead>Trägerorganisation</TableHead>
                    <TableHead className="hidden lg:table-cell">Ansprechpersonen</TableHead>
                    <TableHead className="hidden lg:table-cell">E-Mail</TableHead>
                    <TableHead className="hidden lg:table-cell">Heyflows</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEinrichtungen.map((e) => {
                    const contacts = getContacts(e.contactPersonIds);
                    const hfs = getHeyflows(e.heyflowIds);
                    
                    return (
                      <TableRow key={e.id}>
                        <TableCell className="text-muted-foreground">{e.id}</TableCell>
                        <TableCell className="font-medium">{e.name}</TableCell>
                        <TableCell className="hidden md:table-cell text-muted-foreground">
                          {e.street}, {e.zipCode} {e.city}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{getTraegerName(e.parentOrganizationId)}</Badge>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <div className="flex flex-wrap gap-1">
                            {contacts.map(c => (
                              <Badge key={c.id} variant="secondary" className="text-xs">
                                {c.firstname} {c.lastname}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <div className="flex flex-col gap-0.5 text-sm text-muted-foreground">
                            {contacts.map(c => (
                              <span key={c.id}>{c.email}</span>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <div className="flex flex-col gap-0.5 text-sm">
                            {hfs.map(h => (
                              <a 
                                key={h.id} 
                                href={h.url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-primary hover:underline truncate max-w-[200px]"
                              >
                                {h.url}
                              </a>
                            ))}
                            {hfs.length === 0 && <span className="text-muted-foreground">-</span>}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="traeger" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead className="hidden md:table-cell">Adresse</TableHead>
                    <TableHead>Einrichtungen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTraeger.map((t) => {
                    const tEinrichtungen = getEinrichtungenForTraeger(t.id);
                    
                    return (
                      <TableRow key={t.id}>
                        <TableCell className="font-medium">{t.name}</TableCell>
                        <TableCell className="hidden md:table-cell text-muted-foreground">
                          {t.street}, {t.zipCode} {t.city}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {tEinrichtungen.length > 0 ? (
                              tEinrichtungen.map(e => (
                                <Badge key={e.id} variant="secondary" className="text-xs">
                                  {e.name}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default StepOverview;
