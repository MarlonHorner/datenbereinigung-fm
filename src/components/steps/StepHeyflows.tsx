import React, { useState, useMemo } from 'react';
import { Search, Link2, X, Check, Sparkles, Zap } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useWizard } from '@/context/WizardContext';
import { generateOrganizationHeyflowSuggestions } from '@/lib/fuzzy-matching';
import { cn } from '@/lib/utils';

const StepHeyflows = () => {
  const { state, dispatch } = useWizard();
  const { organizations, heyflows } = state;
  
  const [searchTerm, setSearchTerm] = useState('');
  const [heyflowSearch, setHeyflowSearch] = useState('');
  const [orgSearchInDialog, setOrgSearchInDialog] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [selectedHeyflows, setSelectedHeyflows] = useState<Set<string>>(new Set());

  const einrichtungen = useMemo(() => 
    organizations
      .filter(o => o.type === 'einrichtung')
      .filter(org =>
        searchTerm === '' ||
        org.name.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    [organizations, searchTerm]
  );

  const filteredHeyflows = useMemo(() => 
    heyflows.filter(h =>
      heyflowSearch === '' ||
      h.designation.toLowerCase().includes(heyflowSearch.toLowerCase()) ||
      h.heyflowId.toLowerCase().includes(heyflowSearch.toLowerCase())
    ),
    [heyflows, heyflowSearch]
  );

  const getHeyflowsForOrg = (heyflowIds: string[]) => {
    return heyflows.filter(h => heyflowIds.includes(h.id));
  };

  const openHeyflowDialog = (orgId: string) => {
    const org = organizations.find(o => o.id === orgId);
    setSelectedOrgId(orgId);
    setSelectedHeyflows(new Set(org?.heyflowIds || []));
    setHeyflowSearch('');
    setOrgSearchInDialog('');
    setDialogOpen(true);
  };

  // Gefilterte Organisationen im Dialog basierend auf Suche
  const filteredOrgsInDialog = useMemo(() =>
    organizations
      .filter(o => o.type === 'einrichtung')
      .filter(org =>
        orgSearchInDialog === '' ||
        org.name.toLowerCase().includes(orgSearchInDialog.toLowerCase()) ||
        org.city.toLowerCase().includes(orgSearchInDialog.toLowerCase())
      ),
    [organizations, orgSearchInDialog]
  );

  // Wechsel zur einer anderen Organisation im Dialog
  const switchOrgInDialog = (orgId: string) => {
    const org = organizations.find(o => o.id === orgId);
    setSelectedOrgId(orgId);
    setSelectedHeyflows(new Set(org?.heyflowIds || []));
    setOrgSearchInDialog('');
  };

  // Fuzzy-Match-Vorschläge für die ausgewählte Organisation
  const getSuggestionsForOrg = (orgId: string) => {
    const org = organizations.find(o => o.id === orgId);
    if (!org) return [];
    
    // Bereits zugeordnete UND aktuell ausgewählte Heyflows ausschließen
    // So dass die Vorschläge verschwinden, wenn sie ausgewählt werden
    const availableHeyflows = heyflows.filter(hf => !selectedHeyflows.has(hf.id));
    return generateOrganizationHeyflowSuggestions(org, availableHeyflows, 5);
  };

  // Automatisch beste Matches zuordnen
  const autoAssignBestMatches = (minConfidence: number = 70) => {
    const einrichtungen = organizations.filter(o => o.type === 'einrichtung');
    
    einrichtungen.forEach(org => {
      const suggestions = generateOrganizationHeyflowSuggestions(org, heyflows, 1);
      const bestMatch = suggestions[0];
      
      if (bestMatch && bestMatch.confidence >= minConfidence && !org.heyflowIds.includes(bestMatch.heyflowId)) {
        dispatch({
          type: 'UPDATE_ORGANIZATION',
          id: org.id,
          updates: { heyflowIds: [...org.heyflowIds, bestMatch.heyflowId] },
        });
      }
    });
  };

  // Vorschlag akzeptieren
  const acceptSuggestion = (heyflowId: string) => {
    const newSet = new Set(selectedHeyflows);
    newSet.add(heyflowId);
    setSelectedHeyflows(newSet);
  };

  const toggleHeyflow = (heyflowId: string) => {
    const newSet = new Set(selectedHeyflows);
    if (newSet.has(heyflowId)) {
      newSet.delete(heyflowId);
    } else {
      newSet.add(heyflowId);
    }
    setSelectedHeyflows(newSet);
  };

  const saveHeyflows = () => {
    if (!selectedOrgId) return;
    
    dispatch({
      type: 'UPDATE_ORGANIZATION',
      id: selectedOrgId,
      updates: { heyflowIds: Array.from(selectedHeyflows) },
    });
    
    setDialogOpen(false);
  };

  const removeHeyflow = (orgId: string, heyflowId: string) => {
    const org = organizations.find(o => o.id === orgId);
    if (org) {
      dispatch({
        type: 'UPDATE_ORGANIZATION',
        id: orgId,
        updates: { 
          heyflowIds: org.heyflowIds.filter(id => id !== heyflowId) 
        },
      });
    }
  };

  if (heyflows.length === 0) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Heyflows</h2>
          <p className="text-muted-foreground mt-1">
            Ordnen Sie Heyflow-Formulare den Einrichtungen zu.
          </p>
        </div>
        
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              Keine Heyflow-Daten importiert. Sie können diesen Schritt überspringen oder 
              im ersten Schritt eine Heyflow-CSV-Datei hochladen.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Heyflows</h2>
        <p className="text-muted-foreground mt-1">
          Ordnen Sie Heyflow-Formulare den Einrichtungen zu.
        </p>
      </div>

      {/* Statistik und Auto-Zuordnung */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium">{heyflows.length} Heyflows verfügbar</span>
              <span className="text-sm text-muted-foreground">
                {organizations.filter(o => o.type === 'einrichtung' && o.heyflowIds.length > 0).length} Einrichtungen zugeordnet
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => autoAssignBestMatches(70)}
              className="gap-2"
            >
              <Zap className="w-4 h-4" />
              Automatisch zuordnen (≥70%)
            </Button>
          </div>
        </CardContent>
      </Card>

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
          const orgHeyflows = getHeyflowsForOrg(einrichtung.heyflowIds);

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
                    onClick={() => openHeyflowDialog(einrichtung.id)}
                    className="gap-1"
                  >
                    <Link2 className="w-4 h-4" />
                    Heyflows zuordnen
                  </Button>
                </div>

                {orgHeyflows.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {orgHeyflows.map((hf) => (
                      <Badge key={hf.id} variant="secondary" className="gap-2 py-1.5 px-3">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{hf.designation}</span>
                          <span className="text-muted-foreground text-xs">
                            ({hf.heyflowId})
                          </span>
                          <button
                            onClick={() => removeHeyflow(einrichtung.id, hf.id)}
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

      {/* Dialog für Heyflow-Zuordnung */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Heyflows zuordnen</DialogTitle>
            {selectedOrgId && (
              <p className="text-sm text-muted-foreground mt-1">
                Aktuell: {organizations.find(o => o.id === selectedOrgId)?.name}
              </p>
            )}
          </DialogHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-4">
            {/* Linke Spalte: Einrichtungen-Suche */}
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium mb-2 block">Einrichtung wechseln</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Einrichtung suchen..."
                    value={orgSearchInDialog}
                    onChange={(e) => setOrgSearchInDialog(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <ScrollArea className="h-[400px] border rounded-md">
                <div className="p-2 space-y-1">
                  {filteredOrgsInDialog.map((org) => (
                    <div
                      key={org.id}
                      className={cn(
                        "p-2 rounded-md cursor-pointer transition-colors",
                        org.id === selectedOrgId
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-accent"
                      )}
                      onClick={() => switchOrgInDialog(org.id)}
                    >
                      <p className="font-medium text-sm truncate">{org.name}</p>
                      <p className={cn(
                        "text-xs truncate",
                        org.id === selectedOrgId ? "text-primary-foreground/80" : "text-muted-foreground"
                      )}>
                        {org.zipCode} {org.city}
                      </p>
                      {org.heyflowIds.length > 0 && (
                        <p className={cn(
                          "text-xs mt-1",
                          org.id === selectedOrgId ? "text-primary-foreground/80" : "text-muted-foreground"
                        )}>
                          {org.heyflowIds.length} Heyflow(s) zugeordnet
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Rechte Spalte: Heyflow-Zuordnung */}
            <div className="space-y-4">
              {/* Fuzzy-Match Vorschläge */}
              {selectedOrgId && getSuggestionsForOrg(selectedOrgId).length > 0 && (
                <div className="p-3 bg-accent/50 rounded-lg border border-accent">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">Vorschläge basierend auf Namensähnlichkeit</span>
                  </div>
                  <div className="space-y-2">
                    {getSuggestionsForOrg(selectedOrgId).map((suggestion) => (
                      <div
                        key={suggestion.heyflowId}
                        className="flex items-center justify-between gap-3 p-2 bg-background rounded-md"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            {heyflows.find(h => h.id === suggestion.heyflowId)?.designation}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Übereinstimmung: {suggestion.confidence}%
                          </p>
                        </div>
                        <Badge
                          variant={suggestion.confidence >= 70 ? 'default' : 'secondary'}
                          className="shrink-0"
                        >
                          {suggestion.confidence}%
                        </Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => acceptSuggestion(suggestion.heyflowId)}
                          className="shrink-0"
                        >
                          <Check className="w-3 h-3 mr-1" />
                          Akzeptieren
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="text-sm font-medium mb-2 block">Heyflows durchsuchen</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Heyflow suchen..."
                    value={heyflowSearch}
                    onChange={(e) => setHeyflowSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <ScrollArea className="h-[300px] border rounded-md">
                <div className="p-2 space-y-1">
                  {filteredHeyflows.map((hf) => (
                    <div
                      key={hf.id}
                      className="flex items-center gap-3 p-2 rounded-md hover:bg-accent cursor-pointer"
                      onClick={() => toggleHeyflow(hf.id)}
                    >
                      <Checkbox checked={selectedHeyflows.has(hf.id)} />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{hf.designation}</p>
                        <p className="text-xs text-muted-foreground">
                          ID: {hf.heyflowId}
                        </p>
                      </div>
                      {selectedHeyflows.has(hf.id) && (
                        <Check className="w-4 h-4 text-success" />
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
              
              <p className="text-sm text-muted-foreground">
                {selectedHeyflows.size} Heyflow(s) ausgewählt
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button onClick={saveHeyflows}>
              <Check className="w-4 h-4 mr-2" />
              Speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StepHeyflows;
