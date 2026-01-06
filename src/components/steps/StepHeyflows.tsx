import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Search, Link2, X, Check, Sparkles, Zap, ExternalLink } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useWizard } from '@/context/WizardContext';
import { generateOrganizationHeyflowSuggestions } from '@/lib/fuzzy-matching';
import { updateOrganization as updateOrganizationInDb } from '@/lib/storage';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

const StepHeyflows = () => {
  const { state, dispatch } = useWizard();
  const { organizations, heyflows } = state;
  const { toast } = useToast();
  
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

  // Zählt, wie oft ein Heyflow bereits zugeordnet wurde
  const getHeyflowAssignmentCount = (heyflowId: string) => {
    return organizations.filter(org =>
      org.type === 'einrichtung' && org.heyflowIds.includes(heyflowId)
    ).length;
  };

  // Prüft, ob ein Heyflow bereits einer anderen Einrichtung zugeordnet ist
  const isHeyflowAssignedToOther = (heyflowId: string, currentOrgId: string) => {
    return organizations.some(org =>
      org.type === 'einrichtung' &&
      org.id !== currentOrgId &&
      org.heyflowIds.includes(heyflowId)
    );
  };

  // Gibt die Einrichtung zurück, der ein Heyflow zugeordnet ist
  const getHeyflowAssignedOrganization = (heyflowId: string, excludeOrgId?: string) => {
    return organizations.find(org =>
      org.type === 'einrichtung' &&
      org.id !== excludeOrgId &&
      org.heyflowIds.includes(heyflowId)
    );
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
  const switchOrgInDialog = async (orgId: string) => {
    // Speichere die aktuelle Auswahl vor dem Wechsel
    if (selectedOrgId) {
      await saveHeyflows();
    }
    
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
    // UND Heyflows die bereits anderen Einrichtungen zugeordnet sind
    const availableHeyflows = heyflows.filter(hf =>
      !selectedHeyflows.has(hf.id) && !isHeyflowAssignedToOther(hf.id, orgId)
    );
    return generateOrganizationHeyflowSuggestions(org, availableHeyflows, 5);
  };

  // Automatisch beste Matches zuordnen
  const autoAssignBestMatches = async (minConfidence: number = 70) => {
    const einrichtungen = organizations.filter(o => o.type === 'einrichtung');
    let successCount = 0;
    let skipCount = 0;
    
    for (const org of einrichtungen) {
      // Nur Heyflows berücksichtigen, die noch nicht zugeordnet sind
      const availableHeyflows = heyflows.filter(hf =>
        !isHeyflowAssignedToOther(hf.id, org.id) && !org.heyflowIds.includes(hf.id)
      );
      
      const suggestions = generateOrganizationHeyflowSuggestions(org, availableHeyflows, 1);
      const bestMatch = suggestions[0];
      
      if (bestMatch && bestMatch.confidence >= minConfidence) {
        const updatedHeyflowIds = [...org.heyflowIds, bestMatch.heyflowId];
        
        // Update lokaler State
        dispatch({
          type: 'UPDATE_ORGANIZATION',
          id: org.id,
          updates: { heyflowIds: updatedHeyflowIds },
        });
        
        // Update Datenbank
        try {
          await updateOrganizationInDb(org.id, { heyflowIds: updatedHeyflowIds });
          successCount++;
        } catch (error) {
          console.error('Fehler beim automatischen Zuordnen:', error);
          skipCount++;
        }
      }
    }
    
    toast({
      title: "Automatische Zuordnung abgeschlossen",
      description: `${successCount} Heyflow(s) erfolgreich zugeordnet${skipCount > 0 ? `, ${skipCount} übersprungen` : ''}.`,
    });
  };

  // Vorschlag akzeptieren
  const acceptSuggestion = (heyflowId: string) => {
    // Nochmal prüfen (sollte nicht nötig sein, da Vorschläge gefiltert sind)
    if (selectedOrgId && isHeyflowAssignedToOther(heyflowId, selectedOrgId)) {
      const assignedOrg = getHeyflowAssignedOrganization(heyflowId, selectedOrgId);
      toast({
        title: "Heyflow bereits zugeordnet",
        description: `Dieser Heyflow ist bereits der Einrichtung "${assignedOrg?.name}" zugeordnet.`,
        variant: "destructive",
      });
      return;
    }
    
    const newSet = new Set(selectedHeyflows);
    newSet.add(heyflowId);
    setSelectedHeyflows(newSet);
  };

  const toggleHeyflow = (heyflowId: string) => {
    const newSet = new Set(selectedHeyflows);
    if (newSet.has(heyflowId)) {
      // Abwählen ist immer erlaubt
      newSet.delete(heyflowId);
    } else {
      // Prüfen, ob Heyflow bereits einer anderen Einrichtung zugeordnet ist
      if (selectedOrgId && isHeyflowAssignedToOther(heyflowId, selectedOrgId)) {
        const assignedOrg = getHeyflowAssignedOrganization(heyflowId, selectedOrgId);
        toast({
          title: "Heyflow bereits zugeordnet",
          description: `Dieser Heyflow ist bereits der Einrichtung "${assignedOrg?.name}" zugeordnet. Ein Heyflow kann nur einer Einrichtung zugewiesen werden.`,
          variant: "destructive",
        });
        return; // Verhindere die Auswahl
      }
      newSet.add(heyflowId);
    }
    setSelectedHeyflows(newSet);
  };

  const saveHeyflows = async () => {
    if (!selectedOrgId) return;
    
    const heyflowIds = Array.from(selectedHeyflows);
    
    // Update lokaler State
    dispatch({
      type: 'UPDATE_ORGANIZATION',
      id: selectedOrgId,
      updates: { heyflowIds },
    });
    
    // Update Datenbank
    try {
      await updateOrganizationInDb(selectedOrgId, { heyflowIds });
    } catch (error: any) {
      console.error('Fehler beim Speichern der Heyflow-Zuordnungen:', error);
      
      // Spezielle Behandlung für UNIQUE constraint Verletzung
      if (error.message?.includes('organization_heyflows_heyflow_id_unique')) {
        toast({
          title: "Heyflow bereits zugeordnet",
          description: "Einer oder mehrere Heyflows sind bereits einer anderen Einrichtung zugeordnet. Ein Heyflow kann nur einer Einrichtung zugewiesen werden.",
          variant: "destructive",
        });
        
        // Lade aktuelle Daten neu
        window.location.reload();
      } else {
        toast({
          title: "Fehler beim Speichern",
          description: error.message || "Die Heyflow-Zuordnungen konnten nicht gespeichert werden.",
          variant: "destructive",
        });
      }
    }
  };

  const closeDialog = async () => {
    // Speichere aktuelle Auswahl beim Schließen
    if (selectedOrgId) {
      await saveHeyflows();
    }
    setDialogOpen(false);
  };

  const saveAndCloseDialog = async () => {
    await saveHeyflows();
    setDialogOpen(false);
  };

  // Auto-Save alle 60 Sekunden
  const lastSaveTime = useRef<number>(Date.now());
  const hasUnsavedChanges = useRef<boolean>(false);

  useEffect(() => {
    if (!dialogOpen || !selectedOrgId) return;

    // Markiere als geändert wenn Selection sich ändert
    const org = organizations.find(o => o.id === selectedOrgId);
    const currentHeyflows = new Set(org?.heyflowIds || []);
    const selectedArray = Array.from(selectedHeyflows).sort();
    const currentArray = Array.from(currentHeyflows).sort();
    
    hasUnsavedChanges.current = JSON.stringify(selectedArray) !== JSON.stringify(currentArray);

    const interval = setInterval(async () => {
      const now = Date.now();
      const timeSinceLastSave = now - lastSaveTime.current;
      
      // Auto-Save wenn es Änderungen gibt und mindestens 60 Sekunden vergangen sind
      if (hasUnsavedChanges.current && timeSinceLastSave >= 60000) {
        await saveHeyflows();
        lastSaveTime.current = now;
        hasUnsavedChanges.current = false;
      }
    }, 1000); // Prüfe jede Sekunde

    return () => clearInterval(interval);
  }, [dialogOpen, selectedOrgId, selectedHeyflows, organizations]);

  const removeHeyflow = async (orgId: string, heyflowId: string) => {
    const org = organizations.find(o => o.id === orgId);
    if (org) {
      const updatedHeyflowIds = org.heyflowIds.filter(id => id !== heyflowId);
      
      // Update lokaler State
      dispatch({
        type: 'UPDATE_ORGANIZATION',
        id: orgId,
        updates: { heyflowIds: updatedHeyflowIds },
      });
      
      // Update Datenbank
      try {
        await updateOrganizationInDb(orgId, { heyflowIds: updatedHeyflowIds });
      } catch (error) {
        console.error('Fehler beim Entfernen der Heyflow-Zuordnung:', error);
      }
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
                  <div className="mt-4 space-y-2">
                    {orgHeyflows.map((hf) => (
                      <div
                        key={hf.id}
                        className="flex items-center justify-between gap-3 p-3 bg-secondary/50 rounded-lg border border-secondary"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start gap-2 mb-1 flex-wrap">
                            <span className="font-medium break-words flex-1 min-w-0">{hf.designation}</span>
                            <Badge variant="outline" className="text-xs shrink-0">
                              {getHeyflowAssignmentCount(hf.id)}x zugeordnet
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                            <span className="text-xs break-all">ID: {hf.heyflowId}</span>
                            {hf.url && (
                              <>
                                <span className="text-xs">•</span>
                                <a
                                  href={hf.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="flex items-center gap-1 text-xs text-primary hover:underline"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                  Link öffnen
                                </a>
                              </>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeHeyflow(einrichtung.id, hf.id);
                          }}
                          className="shrink-0 hover:text-destructive hover:bg-destructive/10"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Dialog für Heyflow-Zuordnung */}
      <Dialog open={dialogOpen} onOpenChange={(open) => {
        if (!open) {
          closeDialog();
        } else {
          setDialogOpen(true);
        }
      }}>
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
                  <ScrollArea className="h-[280px]">
                    <div className="space-y-2 pr-4">
                      {getSuggestionsForOrg(selectedOrgId).map((suggestion) => {
                        const heyflow = heyflows.find(h => h.id === suggestion.heyflowId);
                        const assignmentCount = getHeyflowAssignmentCount(suggestion.heyflowId);
                        return (
                          <div
                            key={suggestion.heyflowId}
                            className="flex items-start gap-3 p-3 bg-background rounded-md border border-border"
                          >
                            <div className="flex-1 min-w-0 space-y-1">
                              <div className="flex items-start gap-2">
                                <p className="font-medium text-sm break-words flex-1">
                                  {heyflow?.designation}
                                </p>
                                <Badge
                                  variant={suggestion.confidence >= 70 ? 'default' : 'secondary'}
                                  className="shrink-0 text-xs"
                                >
                                  {suggestion.confidence}%
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-xs text-muted-foreground">
                                  ID: {heyflow?.heyflowId}
                                </p>
                                {assignmentCount > 0 && (
                                  <>
                                    <span className="text-xs text-muted-foreground">•</span>
                                    <span className="text-xs text-muted-foreground">
                                      {assignmentCount}x zugeordnet
                                    </span>
                                  </>
                                )}
                              </div>
                              {heyflow?.url && (
                                <a
                                  href={heyflow.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="flex items-center gap-1 text-xs text-primary hover:underline w-fit"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                  Heyflow öffnen
                                </a>
                              )}
                            </div>
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
                        );
                      })}
                    </div>
                  </ScrollArea>
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
                <div className="p-2 space-y-2">
                  {filteredHeyflows.map((hf) => {
                    const assignmentCount = getHeyflowAssignmentCount(hf.id);
                    const isAssignedToOther = selectedOrgId ? isHeyflowAssignedToOther(hf.id, selectedOrgId) : false;
                    const assignedOrg = selectedOrgId ? getHeyflowAssignedOrganization(hf.id, selectedOrgId) : null;
                    const isSelected = selectedHeyflows.has(hf.id);
                    
                    return (
                      <div
                        key={hf.id}
                        className={cn(
                          "flex items-start gap-3 p-3 rounded-md border transition-colors",
                          isAssignedToOther && !isSelected
                            ? "bg-muted/50 border-muted cursor-not-allowed opacity-60"
                            : isSelected
                            ? "bg-primary/10 border-primary/50 hover:bg-primary/15 cursor-pointer"
                            : "bg-background border-border hover:bg-accent cursor-pointer"
                        )}
                        onClick={() => !isAssignedToOther && toggleHeyflow(hf.id)}
                      >
                        <Checkbox
                          checked={isSelected}
                          disabled={isAssignedToOther && !isSelected}
                          className="mt-1 shrink-0"
                        />
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-start gap-2">
                            <p className={cn(
                              "font-medium break-words flex-1",
                              isAssignedToOther && !isSelected && "text-muted-foreground"
                            )}>
                              {hf.designation}
                            </p>
                            {isSelected && (
                              <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs text-muted-foreground break-all">
                              ID: {hf.heyflowId}
                            </span>
                            {assignmentCount > 0 && (
                              <>
                                <span className="text-xs text-muted-foreground">•</span>
                                <Badge
                                  variant={isAssignedToOther ? "destructive" : "secondary"}
                                  className="text-xs h-5"
                                >
                                  {assignmentCount}x zugeordnet
                                </Badge>
                              </>
                            )}
                          </div>
                          {isAssignedToOther && assignedOrg && (
                            <div className="flex items-center gap-1 text-xs text-destructive bg-destructive/10 px-2 py-1 rounded-md">
                              <X className="w-3 h-3" />
                              <span>Bereits zugeordnet: {assignedOrg.name}</span>
                            </div>
                          )}
                          {hf.url && (
                            <a
                              href={hf.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="flex items-center gap-1 text-xs text-primary hover:underline w-fit"
                            >
                              <ExternalLink className="w-3 h-3" />
                              Heyflow öffnen
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
              
              <p className="text-sm text-muted-foreground">
                {selectedHeyflows.size} Heyflow(s) ausgewählt
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Abbrechen
            </Button>
            <Button onClick={saveAndCloseDialog}>
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
