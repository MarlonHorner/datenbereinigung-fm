import React, { useState, useMemo } from 'react';
import { Search, Link2, AlertCircle, Check, ChevronDown, Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useWizard } from '@/context/WizardContext';
import { getAssignmentStats } from '@/lib/storage';
import { findBestMatches, MatchResult } from '@/lib/fuzzy-matching';
import { cn } from '@/lib/utils';

const StepAssign = () => {
  const { state, dispatch } = useWizard();
  const { organizations } = state;
  
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [suggestionSearchTerms, setSuggestionSearchTerms] = useState<Record<string, string>>({});

  const einrichtungen = useMemo(() =>
    organizations.filter(o => o.type === 'einrichtung'),
    [organizations]
  );
  
  const traeger = useMemo(() =>
    organizations.filter(o => o.type === 'traeger'),
    [organizations]
  );

  const stats = useMemo(() => getAssignmentStats(organizations), [organizations]);
  const progressPercent = stats.total > 0 ? Math.round((stats.assigned / stats.total) * 100) : 0;

  const handleAssign = (einrichtungId: string, traegerId: string) => {
    dispatch({ 
      type: 'UPDATE_ORGANIZATION', 
      id: einrichtungId, 
      updates: { parentOrganizationId: traegerId === 'no-traeger' ? 'no-traeger' : traegerId } 
    });
  };

  const getTraegerName = (id?: string) => {
    if (!id) return null;
    if (id === 'no-traeger') return 'Kein Träger';
    return traeger.find(t => t.id === id)?.name;
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 70) return 'text-success';
    if (confidence >= 40) return 'text-warning';
    return 'text-destructive';
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Zuordnung</h2>
        <p className="text-muted-foreground mt-1">
          Ordnen Sie jede Einrichtung einer Trägerorganisation zu. Das System schlägt passende Träger vor.
        </p>
      </div>

      {/* Fortschrittsanzeige */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Fortschritt</span>
            <span className="text-sm text-muted-foreground">
              {stats.assigned} / {stats.total} zugeordnet
            </span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </CardContent>
      </Card>

      {/* Liste der Einrichtungen */}
      <div className="space-y-3">
        {einrichtungen.map((einrichtung) => {
          // Dynamische Vorschläge: Bereits zugeordnete Träger ausschließen
          const availableTraeger = traeger.filter(t =>
            einrichtung.parentOrganizationId !== t.id
          );
          const matches = findBestMatches(einrichtung, availableTraeger, 5);
          
          // Suchfilter für Vorschläge
          const suggestionSearch = suggestionSearchTerms[einrichtung.id] || '';
          const filteredMatches = matches.filter(match =>
            suggestionSearch === '' ||
            match.traegerName.toLowerCase().includes(suggestionSearch.toLowerCase())
          );
          
          const assignedTraeger = getTraegerName(einrichtung.parentOrganizationId);
          const isExpanded = expandedId === einrichtung.id;
          
          // Funktion zum Akzeptieren aller Vorschläge
          const acceptAllSuggestions = () => {
            if (filteredMatches.length > 0) {
              // Nur den besten Vorschlag übernehmen (da eine Einrichtung nur einen Träger haben kann)
              handleAssign(einrichtung.id, filteredMatches[0].traegerId);
            }
          };
          
          // Suchbegriff für diese Einrichtung setzen
          const setSuggestionSearch = (value: string) => {
            setSuggestionSearchTerms(prev => ({
              ...prev,
              [einrichtung.id]: value
            }));
          };

          return (
            <Card 
              key={einrichtung.id}
              className={cn(
                'transition-all',
                !einrichtung.parentOrganizationId && 'border-warning/50'
              )}
            >
              <Collapsible open={isExpanded} onOpenChange={() => setExpandedId(isExpanded ? null : einrichtung.id)}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium truncate">{einrichtung.name}</h3>
                        {!einrichtung.parentOrganizationId && (
                          <AlertCircle className="w-4 h-4 text-warning shrink-0" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {einrichtung.street}, {einrichtung.zipCode} {einrichtung.city}
                      </p>
                      
                      {assignedTraeger && (
                        <div className="flex items-center gap-2 mt-2">
                          <Link2 className="w-4 h-4 text-primary" />
                          <Badge 
                            variant={einrichtung.parentOrganizationId === 'no-traeger' ? 'secondary' : 'default'} 
                            className="gap-1"
                          >
                            <Check className="w-3 h-3" />
                            {assignedTraeger}
                          </Badge>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Select
                        value={einrichtung.parentOrganizationId || '_unassigned_'}
                        onValueChange={(v) => handleAssign(einrichtung.id, v === '_unassigned_' ? '' : v)}
                      >
                        <SelectTrigger className="w-[200px]">
                          <SelectValue placeholder="Träger wählen..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="no-traeger" className="text-muted-foreground italic">
                            Kein Träger
                          </SelectItem>
                          {traeger.map((t) => (
                            <SelectItem key={t.id} value={t.id}>
                              {t.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <ChevronDown className={cn(
                            'w-4 h-4 transition-transform',
                            isExpanded && 'rotate-180'
                          )} />
                        </Button>
                      </CollapsibleTrigger>
                    </div>
                  </div>

                  <CollapsibleContent className="mt-4">
                    <div className="bg-muted/50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-medium flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-primary" />
                          Vorgeschlagene Trägerorganisationen
                        </h4>
                        {filteredMatches.length > 0 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={acceptAllSuggestions}
                            className="gap-1"
                          >
                            <Check className="w-3 h-3" />
                            Beste Übereinstimmung übernehmen
                          </Button>
                        )}
                      </div>
                      
                      {matches.length > 0 && (
                        <div className="relative mb-3">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            placeholder="Träger in Vorschlägen suchen..."
                            value={suggestionSearch}
                            onChange={(e) => setSuggestionSearch(e.target.value)}
                            className="pl-10 bg-background"
                          />
                        </div>
                      )}
                      
                      {filteredMatches.length > 0 ? (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Trägerorganisation</TableHead>
                              <TableHead className="text-center">Name</TableHead>
                              <TableHead className="text-center">PLZ</TableHead>
                              <TableHead className="text-center">Stadt</TableHead>
                              <TableHead className="text-center">Gesamt</TableHead>
                              <TableHead></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredMatches.map((match) => (
                              <TableRow key={match.traegerId}>
                                <TableCell className="font-medium">{match.traegerName}</TableCell>
                                <TableCell className="text-center">{match.nameScore}%</TableCell>
                                <TableCell className="text-center">{match.zipScore}%</TableCell>
                                <TableCell className="text-center">{match.cityScore}%</TableCell>
                                <TableCell className={cn('text-center font-bold', getConfidenceColor(match.confidence))}>
                                  {match.confidence}%
                                </TableCell>
                                <TableCell>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleAssign(einrichtung.id, match.traegerId)}
                                  >
                                    Übernehmen
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      ) : matches.length > 0 && suggestionSearch ? (
                        <p className="text-sm text-muted-foreground">
                          Keine Träger gefunden, die "{suggestionSearch}" entsprechen.
                        </p>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          {einrichtung.parentOrganizationId && einrichtung.parentOrganizationId !== 'no-traeger'
                            ? 'Bereits zugeordnet - keine weiteren Vorschläge verfügbar.'
                            : 'Keine Vorschläge verfügbar.'}
                        </p>
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
    </div>
  );
};

export default StepAssign;
