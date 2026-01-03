import React, { useState, useMemo } from 'react';
import { Search, UserPlus, Mail, X, Plus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useWizard } from '@/context/WizardContext';
import { ContactPerson } from '@/types/organization';

const StepContacts = () => {
  const { state, dispatch } = useWizard();
  const { organizations, contactPersons } = state;
  
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [newContact, setNewContact] = useState({ name: '', email: '' });

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

  const openAddContact = (orgId: string) => {
    setSelectedOrgId(orgId);
    setNewContact({ name: '', email: '' });
    setDialogOpen(true);
  };

  const handleAddContact = () => {
    if (!selectedOrgId || !newContact.name || !newContact.email) return;

    // Prüfen ob Kontakt bereits existiert
    let contactId = contactPersons.find(
      c => c.email.toLowerCase() === newContact.email.toLowerCase()
    )?.id;

    if (!contactId) {
      // Neuen Kontakt erstellen
      const contact: ContactPerson = {
        id: `contact-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: newContact.name,
        email: newContact.email,
        createdAt: new Date().toISOString(),
      };
      dispatch({ type: 'ADD_CONTACT', contact });
      contactId = contact.id;
    }

    // Kontakt zur Organisation hinzufügen
    const org = organizations.find(o => o.id === selectedOrgId);
    if (org && contactId && !org.contactPersonIds.includes(contactId)) {
      dispatch({
        type: 'UPDATE_ORGANIZATION',
        id: selectedOrgId,
        updates: { contactPersonIds: [...org.contactPersonIds, contactId] },
      });
    }

    setDialogOpen(false);
    setNewContact({ name: '', email: '' });
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

  // Autocomplete-Vorschläge
  const emailSuggestions = useMemo(() => {
    if (!newContact.email || newContact.email.length < 2) return [];
    return contactPersons.filter(c => 
      c.email.toLowerCase().includes(newContact.email.toLowerCase())
    ).slice(0, 5);
  }, [newContact.email, contactPersons]);

  const selectSuggestion = (contact: ContactPerson) => {
    setNewContact({ name: contact.name, email: contact.email });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Ansprechpersonen</h2>
        <p className="text-muted-foreground mt-1">
          Fügen Sie Ansprechpersonen zu jeder Einrichtung hinzu.
        </p>
      </div>

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

          return (
            <Card key={einrichtung.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="font-medium">{einrichtung.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {einrichtung.zipCode} {einrichtung.city}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openAddContact(einrichtung.id)}
                    className="gap-1"
                  >
                    <UserPlus className="w-4 h-4" />
                    Hinzufügen
                  </Button>
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
              </CardContent>
            </Card>
          );
        })}
      </div>

      {einrichtungen.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p>Keine Einrichtungen gefunden.</p>
        </div>
      )}

      {/* Dialog für neue Ansprechperson */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ansprechperson hinzufügen</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="contact-name">Name</Label>
              <Input
                id="contact-name"
                value={newContact.name}
                onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                placeholder="Max Mustermann"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="contact-email">E-Mail</Label>
              <div className="relative">
                <Input
                  id="contact-email"
                  type="email"
                  value={newContact.email}
                  onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                  placeholder="max@beispiel.de"
                />
                {emailSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-lg z-50">
                    {emailSuggestions.map((suggestion) => (
                      <button
                        key={suggestion.id}
                        onClick={() => selectSuggestion(suggestion)}
                        className="w-full px-3 py-2 text-left hover:bg-accent text-sm"
                      >
                        <span className="font-medium">{suggestion.name}</span>
                        <span className="text-muted-foreground ml-2">{suggestion.email}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button 
              onClick={handleAddContact}
              disabled={!newContact.name || !newContact.email}
            >
              <Plus className="w-4 h-4 mr-2" />
              Hinzufügen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StepContacts;
