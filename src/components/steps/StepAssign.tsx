import React, { useState, useMemo, useEffect } from 'react';
import { Search, Link2, AlertCircle, Check, ChevronDown } from 'lucide-react';
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
import { generateAllMatches, MatchResult } from '@/lib/fuzzy-matching';
import { cn } from '@/lib/utils';

const StepAssign = () => {
  const { state, dispatch } = useWizard();
  const { organizations } = state;
  
  const [searchTerm, setSearchTerm] = useState('');
  const [matchMap, setMatchMap] = useState<Map<string, MatchResult[]>>(new Map());
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const einrichtungen = useMemo(() => 
    organizations.filter(o => o.type === 'einrichtung'), 
    [organizations]
  );
  
  const traeger = useMemo(() => 
    organizations.filter(o => o.type === 'traeger'), 
    [organizations]
  );

  // Fuzzy-Matching berechnen
  useEffect(() => {
    if (organizations.length > 0) {
      const matches = generateAllMatches(organizations);
      setMatchMap(matches);
    }
  }, [organizations]);

  const filteredEinrichtungen = useMemo(() => {
    return einrichtungen.filter(org =>
      searchTerm === '' ||
      org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      org.city.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [einrichtungen, searchTerm]);

  const stats = useMemo(() => getAssignmentStats(organizations), [organizations]);
  const progressPercent = stats.total > 0 ? Math.round((stats.assigned / stats.total) * 100) : 0;

  const handleAssign = (einrichtungId: string, traegerId: string) => {
    dispatch({ 
      type: 'UPDATE_ORGANIZATION', 
      id: einrichtungId, 
      updates: { parentOrganizationId: traegerId } 
    });
  };

  const getTraegerName = (id?: string) => {
    if (!id) return null;
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
        {filteredEinrichtungen.map((einrichtung) => {
          const matches = matchMap.get(einrichtung.id) || [];
          const assignedTraeger = getTraegerName(einrichtung.parentOrganizationId);
          const isExpanded = expandedId === einrichtung.id;

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
                          <Badge variant="default" className="gap-1">
                            <Check className="w-3 h-3" />
                            {assignedTraeger}
                          </Badge>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Select
                        value={einrichtung.parentOrganizationId || ''}
                        onValueChange={(v) => handleAssign(einrichtung.id, v)}
                      >
                        <SelectTrigger className="w-[200px]">
                          <SelectValue placeholder="Träger wählen..." />
                        </SelectTrigger>
                        <SelectContent>
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
                      <h4 className="text-sm font-medium mb-3">Vorgeschlagene Trägerorganisationen</h4>
                      {matches.length > 0 ? (
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
                            {matches.map((match) => (
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
                      ) : (
                        <p className="text-sm text-muted-foreground">Keine Vorschläge verfügbar.</p>
                      )}
                    </div>
                  </CollapsibleContent>
                </CardContent>
              </Collapsible>
            </Card>
          );
        })}
      </div>

      {filteredEinrichtungen.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p>Keine Einrichtungen gefunden.</p>
        </div>
      )}
    </div>
  );
};

export default StepAssign;
