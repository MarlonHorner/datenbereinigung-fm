import React, { useState, useMemo } from 'react';
import { Search, UserPlus, Mail, X, Users, Check, Sparkles, ChevronDown, Plus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useWizard } from '@/context/WizardContext';
import { ContactPerson } from '@/types/organization';
import { generateContactMatches, ContactMatchResult } from '@/lib/contact-matching';
import { updateOrganization as updateOrganizationInDb } from '@/lib/storage';
import { saveContacts as saveContactsToDb } from '@/lib/supabase-storage';
import { cn } from '@/lib/utils';

const StepContacts = () => {
  const { state, dispatch } = useWizard();
  const { organizations, contactPersons } = state;
  
  const [searchTerm, setSearchTerm] = useState('');
  const [openPopoverId, setOpenPopoverId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentOrgId, setCurrentOrgId] = useState<string | null>(null);
  const [newContactFirstname, setNewContactFirstname] = useState('');
  const [newContactLastname, setNewContactLastname] = useState('');
  const [newContactEmail, setNewContactEmail] = useState('');
  const [newContactNote, setNewContactNote] = useState('');
  const [formErrors, setFormErrors] = useState<{ firstname?: string; lastname?: string; email?: string }>({});

  const einrichtungen = useMemo(() => 
    organizations
      .filter(o => o.type === 'einrichtung')
      .filter(org =>
        searchTerm === '' ||
        org.name.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    [organizations, searchTerm]
  );

  const getContactsForOrg = (contactIds: string[]) => {
    return contactPersons.filter(c => contactIds.includes(c.id));
  };

  const getAvailableContacts = (orgId: string) => {
    const org = organizations.find(o => o.id === orgId);
    if (!org) return contactPersons;
    return contactPersons.filter(c => !org.contactPersonIds.includes(c.id));
  };

  // Berechne alle Matches für jede Einrichtung
  const matchesMap = useMemo(() => {
    const map = new Map<string, ContactMatchResult[]>();
    einrichtungen.forEach(org => {
      const matches = generateContactMatches(org, contactPersons, org.contactPersonIds);
      map.set(org.id, matches);
    });
    return map;
  }, [einrichtungen, contactPersons]);

  const assignContact = async (orgId: string, contactId: string) => {
    const org = organizations.find(o => o.id === orgId);
    if (org && !org.contactPersonIds.includes(contactId)) {
      const updatedContactIds = [...org.contactPersonIds, contactId];
      
      // Update lokaler State
      dispatch({
        type: 'UPDATE_ORGANIZATION',
        id: orgId,
        updates: { contactPersonIds: updatedContactIds },
      });
      
      // Update Datenbank
      try {
        await updateOrganizationInDb(orgId, { contactPersonIds: updatedContactIds });
      } catch (error) {
        console.error('Fehler beim Speichern der Kontakt-Zuordnung:', error);
      }
    }
    setOpenPopoverId(null);
  };

  const removeContact = async (orgId: string, contactId: string) => {
    const org = organizations.find(o => o.id === orgId);
    if (org) {
      const updatedContactIds = org.contactPersonIds.filter(id => id !== contactId);
      
      // Update lokaler State
      dispatch({
        type: 'UPDATE_ORGANIZATION',
        id: orgId,
        updates: { contactPersonIds: updatedContactIds },
      });
      
      // Update Datenbank
      try {
        await updateOrganizationInDb(orgId, { contactPersonIds: updatedContactIds });
      } catch (error) {
        console.error('Fehler beim Entfernen der Kontakt-Zuordnung:', error);
      }
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 60) return 'text-success';
    if (confidence >= 40) return 'text-warning';
    return 'text-muted-foreground';
  };

  const openCreateDialog = (orgId: string) => {
    setCurrentOrgId(orgId);
    setIsDialogOpen(true);
    setOpenPopoverId(null);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setCurrentOrgId(null);
    setNewContactFirstname('');
    setNewContactLastname('');
    setNewContactEmail('');
    setNewContactNote('');
    setFormErrors({});
  };

  const validateForm = (): boolean => {
    const errors: { firstname?: string; lastname?: string; email?: string } = {};
    
    if (!newContactFirstname.trim()) {
      errors.firstname = 'Vorname ist erforderlich';
    }
    
    if (!newContactLastname.trim()) {
      errors.lastname = 'Nachname ist erforderlich';
    }
    
    if (!newContactEmail.trim()) {
      errors.email = 'E-Mail ist erforderlich';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newContactEmail)) {
      errors.email = 'Ungültige E-Mail-Adresse';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const createAndAssignContact = async () => {
    if (!validateForm() || !currentOrgId) return;
    
    const newContact: ContactPerson = {
      id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      firstname: newContactFirstname.trim(),
      lastname: newContactLastname.trim(),
      email: newContactEmail.trim().toLowerCase(),
      note: newContactNote.trim() || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    // Add the contact to the global list
    dispatch({ type: 'ADD_CONTACT', contact: newContact });
    
    // Save contact to database
    try {
      await saveContactsToDb([newContact]);
    } catch (error) {
      console.error('Fehler beim Speichern des neuen Kontakts:', error);
    }
    
    // Assign it to the organization
    await assignContact(currentOrgId, newContact.id);
    
    closeDialog();
  };

  const assignedCount = einrichtungen.filter(e => e.contactPersonIds.length > 0).length;
  const totalCount = einrichtungen.length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Ansprechpersonen zuordnen</h2>
        <p className="text-muted-foreground mt-1">
          Ordnen Sie die importierten Ansprechpersonen den Einrichtungen zu. Das System priorisiert Notiz-basierte Zuordnungen (Einrichtungs-/Firmenname) und analysiert zusätzlich E-Mail-Domains für passende Vorschläge.
        </p>
      </div>

      {/* Statistik */}
      <div className="flex items-center gap-4 p-4 bg-accent/30 rounded-lg">
        <Users className="w-5 h-5 text-chart-3" />
        <div className="flex-1">
          <p className="text-sm font-medium">
            {contactPersons.length} Ansprechpersonen verfügbar
          </p>
          <p className="text-xs text-muted-foreground">
            {assignedCount} von {totalCount} Einrichtungen haben zugeordnete Ansprechpersonen
          </p>
        </div>
      </div>

      {contactPersons.length === 0 && (
        <div className="text-center py-12 bg-muted/30 rounded-lg">
          <Users className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">
            Keine Ansprechpersonen importiert.
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Laden Sie im ersten Schritt eine CSV-Datei mit Ansprechpersonen hoch.
          </p>
        </div>
      )}

      {contactPersons.length > 0 && (
        <>
          {/* Suche */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Nach Einrichtung suchen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Liste der Einrichtungen */}
          <div className="space-y-3">
            {einrichtungen.map((einrichtung) => {
              const contacts = getContactsForOrg(einrichtung.contactPersonIds);
              const availableContacts = getAvailableContacts(einrichtung.id);
              const matches = matchesMap.get(einrichtung.id) || [];
              const isExpanded = expandedId === einrichtung.id;

              return (
                <Card key={einrichtung.id}>
                  <Collapsible open={isExpanded} onOpenChange={() => setExpandedId(isExpanded ? null : einrichtung.id)}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium">{einrichtung.name}</h3>
                            {matches.length > 0 && contacts.length === 0 && (
                              <Badge variant="outline" className="gap-1 text-xs">
                                <Sparkles className="w-3 h-3" />
                                {matches.length} Vorschläge
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {einrichtung.zipCode} {einrichtung.city}
                          </p>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Popover
                            open={openPopoverId === einrichtung.id}
                            onOpenChange={(open) => setOpenPopoverId(open ? einrichtung.id : null)}
                          >
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="gap-1"
                              >
                                <UserPlus className="w-4 h-4" />
                                Zuordnen
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[350px] p-0" align="end">
                              <Command>
                                <CommandInput placeholder="Ansprechperson suchen..." />
                                <CommandList>
                                  <CommandEmpty>
                                    <div className="py-6 text-center text-sm">
                                      <p className="text-muted-foreground mb-3">Keine Ansprechperson gefunden.</p>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => openCreateDialog(einrichtung.id)}
                                        className="gap-2"
                                      >
                                        <Plus className="w-4 h-4" />
                                        Neue Ansprechperson erstellen
                                      </Button>
                                    </div>
                                  </CommandEmpty>
                                  {availableContacts.length > 0 && (
                                    <>
                                      <CommandGroup heading="Vorhandene Ansprechpersonen">
                                        {availableContacts.map((contact) => (
                                          <CommandItem
                                            key={contact.id}
                                            value={`${contact.firstname} ${contact.lastname} ${contact.email} ${contact.note || ''}`}
                                            onSelect={() => assignContact(einrichtung.id, contact.id)}
                                            className="flex items-center gap-2 cursor-pointer"
                                          >
                                            <div className="flex-1">
                                              <p className="font-medium">{contact.firstname} {contact.lastname}</p>
                                              <p className="text-sm text-muted-foreground flex items-center gap-1">
                                                <Mail className="w-3 h-3" />
                                                {contact.email}
                                              </p>
                                              {contact.note && (
                                                <p className="text-xs text-muted-foreground">
                                                  Notiz: {contact.note}
                                                </p>
                                              )}
                                            </div>
                                            <Check className="w-4 h-4 opacity-0 group-aria-selected:opacity-100" />
                                          </CommandItem>
                                        ))}
                                      </CommandGroup>
                                      <CommandSeparator />
                                      <CommandGroup>
                                        <CommandItem
                                          onSelect={() => openCreateDialog(einrichtung.id)}
                                          className="flex items-center gap-2 cursor-pointer justify-center text-primary"
                                        >
                                          <Plus className="w-4 h-4" />
                                          <span className="font-medium">Neue Ansprechperson erstellen</span>
                                        </CommandItem>
                                      </CommandGroup>
                                    </>
                                  )}
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>

                          {matches.length > 0 && (
                            <CollapsibleTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <ChevronDown className={cn(
                                  'w-4 h-4 transition-transform',
                                  isExpanded && 'rotate-180'
                                )} />
                              </Button>
                            </CollapsibleTrigger>
                          )}
                        </div>
                      </div>

                      {contacts.length > 0 && (
                        <div className="mt-4 flex flex-wrap gap-2">
                          {contacts.map((contact) => (
                            <Badge key={contact.id} variant="secondary" className="gap-2 py-1.5 px-3">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{contact.firstname} {contact.lastname}</span>
                                <span className="text-muted-foreground flex items-center gap-1">
                                  <Mail className="w-3 h-3" />
                                  {contact.email}
                                </span>
                                {contact.note && (
                                  <span className="text-muted-foreground text-xs">
                                    ({contact.note})
                                  </span>
                                )}
                                <button
                                  onClick={() => removeContact(einrichtung.id, contact.id)}
                                  className="hover:text-destructive transition-colors"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            </Badge>
                          ))}
                        </div>
                      )}

                      {/* Vorschläge */}
                      <CollapsibleContent className="mt-4">
                        <div className="bg-muted/50 rounded-lg p-4">
                          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-primary" />
                            Vorgeschlagene Ansprechpersonen (basierend auf E-Mail-Domain)
                          </h4>
                          {matches.length > 0 ? (
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Name</TableHead>
                                  <TableHead>E-Mail / Notiz</TableHead>
                                  <TableHead className="text-center">Übereinstimmung</TableHead>
                                  <TableHead></TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {matches.map((match) => (
                                  <TableRow key={match.contactId}>
                                    <TableCell className="font-medium">
                                      {contactPersons.find(c => c.id === match.contactId)?.firstname} {contactPersons.find(c => c.id === match.contactId)?.lastname}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">
                                      <div className="space-y-1">
                                        <span className="flex items-center gap-1">
                                          <Mail className="w-3 h-3" />
                                          {match.contactEmail}
                                        </span>
                                        {match.contactNote && (
                                          <div className="text-xs">
                                            Notiz: {match.contactNote}
                                            {match.noteMatch > 0 && (
                                              <span className={cn('ml-2 font-semibold', getConfidenceColor(match.noteMatch))}>
                                                ({match.noteMatch}% Match)
                                              </span>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    </TableCell>
                                    <TableCell className={cn('text-center font-bold', getConfidenceColor(match.confidence))}>
                                      {match.confidence}%
                                    </TableCell>
                                    <TableCell>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => assignContact(einrichtung.id, match.contactId)}
                                      >
                                        Übernehmen
                                      </Button>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          ) : (
                            <p className="text-sm text-muted-foreground">Keine passenden Vorschläge gefunden.</p>
                          )}
                        </div>
                      </CollapsibleContent>
                    </CardContent>
                  </Collapsible>
                </Card>
              );
            })}
          </div>

          {einrichtungen.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <p>Keine Einrichtungen gefunden.</p>
            </div>
          )}
        </>
      )}

      {/* Dialog zum Erstellen einer neuen Ansprechperson */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Neue Ansprechperson erstellen</DialogTitle>
            <DialogDescription>
              Erstellen Sie eine neue Ansprechperson und ordnen Sie diese direkt der Einrichtung zu.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="firstname">
                Vorname <span className="text-destructive">*</span>
              </Label>
              <Input
                id="firstname"
                placeholder="z.B. Max"
                value={newContactFirstname}
                onChange={(e) => {
                  setNewContactFirstname(e.target.value);
                  if (formErrors.firstname) setFormErrors({ ...formErrors, firstname: undefined });
                }}
                className={cn(formErrors.firstname && 'border-destructive')}
              />
              {formErrors.firstname && (
                <p className="text-sm text-destructive">{formErrors.firstname}</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="lastname">
                Nachname <span className="text-destructive">*</span>
              </Label>
              <Input
                id="lastname"
                placeholder="z.B. Mustermann"
                value={newContactLastname}
                onChange={(e) => {
                  setNewContactLastname(e.target.value);
                  if (formErrors.lastname) setFormErrors({ ...formErrors, lastname: undefined });
                }}
                className={cn(formErrors.lastname && 'border-destructive')}
              />
              {formErrors.lastname && (
                <p className="text-sm text-destructive">{formErrors.lastname}</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">
                E-Mail <span className="text-destructive">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="z.B. max.mustermann@beispiel.de"
                value={newContactEmail}
                onChange={(e) => {
                  setNewContactEmail(e.target.value);
                  if (formErrors.email) setFormErrors({ ...formErrors, email: undefined });
                }}
                className={cn(formErrors.email && 'border-destructive')}
              />
              {formErrors.email && (
                <p className="text-sm text-destructive">{formErrors.email}</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="note">
                Notiz (Optional)
              </Label>
              <Input
                id="note"
                placeholder="z.B. Einrichtungsname oder Firma"
                value={newContactNote}
                onChange={(e) => setNewContactNote(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Wird für besseres Matching verwendet
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Abbrechen
            </Button>
            <Button onClick={createAndAssignContact}>
              Erstellen & Zuordnen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StepContacts;
