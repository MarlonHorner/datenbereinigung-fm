import React, { useState, useMemo } from 'react';
import { Search, UserPlus, Mail, X, Users, Check, Sparkles, ChevronDown } from 'lucide-react';
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
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useWizard } from '@/context/WizardContext';
import { ContactPerson } from '@/types/organization';
import { generateContactMatches, ContactMatchResult } from '@/lib/contact-matching';
import { cn } from '@/lib/utils';

const StepContacts = () => {
  const { state, dispatch } = useWizard();
  const { organizations, contactPersons } = state;
  
  const [searchTerm, setSearchTerm] = useState('');
  const [openPopoverId, setOpenPopoverId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

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

  const assignContact = (orgId: string, contactId: string) => {
    const org = organizations.find(o => o.id === orgId);
    if (org && !org.contactPersonIds.includes(contactId)) {
      dispatch({
        type: 'UPDATE_ORGANIZATION',
        id: orgId,
        updates: { contactPersonIds: [...org.contactPersonIds, contactId] },
      });
    }
    setOpenPopoverId(null);
  };

  const removeContact = (orgId: string, contactId: string) => {
    const org = organizations.find(o => o.id === orgId);
    if (org) {
      dispatch({
        type: 'UPDATE_ORGANIZATION',
        id: orgId,
        updates: { 
          contactPersonIds: org.contactPersonIds.filter(id => id !== contactId) 
        },
      });
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 60) return 'text-success';
    if (confidence >= 40) return 'text-warning';
    return 'text-muted-foreground';
  };

  const assignedCount = einrichtungen.filter(e => e.contactPersonIds.length > 0).length;
  const totalCount = einrichtungen.length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Ansprechpersonen zuordnen</h2>
        <p className="text-muted-foreground mt-1">
          Ordnen Sie die importierten Ansprechpersonen den Einrichtungen zu. Das System analysiert E-Mail-Domains und schlägt passende Zuordnungen vor.
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
                                disabled={availableContacts.length === 0}
                              >
                                <UserPlus className="w-4 h-4" />
                                Zuordnen
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[350px] p-0" align="end">
                              <Command>
                                <CommandInput placeholder="Ansprechperson suchen..." />
                                <CommandList>
                                  <CommandEmpty>Keine Ansprechperson gefunden.</CommandEmpty>
                                  <CommandGroup>
                                    {availableContacts.map((contact) => (
                                      <CommandItem
                                        key={contact.id}
                                        value={`${contact.name} ${contact.email}`}
                                        onSelect={() => assignContact(einrichtung.id, contact.id)}
                                        className="flex items-center gap-2 cursor-pointer"
                                      >
                                        <div className="flex-1">
                                          <p className="font-medium">{contact.name}</p>
                                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                                            <Mail className="w-3 h-3" />
                                            {contact.email}
                                          </p>
                                        </div>
                                        <Check className="w-4 h-4 opacity-0 group-aria-selected:opacity-100" />
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
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
                                <span className="font-medium">{contact.name}</span>
                                <span className="text-muted-foreground flex items-center gap-1">
                                  <Mail className="w-3 h-3" />
                                  {contact.email}
                                </span>
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
                                  <TableHead>E-Mail</TableHead>
                                  <TableHead className="text-center">Übereinstimmung</TableHead>
                                  <TableHead></TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {matches.map((match) => (
                                  <TableRow key={match.contactId}>
                                    <TableCell className="font-medium">{match.contactName}</TableCell>
                                    <TableCell className="text-muted-foreground">
                                      <span className="flex items-center gap-1">
                                        <Mail className="w-3 h-3" />
                                        {match.contactEmail}
                                      </span>
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
    </div>
  );
};

export default StepContacts;
