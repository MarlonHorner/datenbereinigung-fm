import React, { useState, useMemo } from 'react';
import { Building2, Home, Search, Filter, CheckCircle2, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useWizard } from '@/context/WizardContext';
import { getClassificationStats, deleteOrganization, deleteOrganizations } from '@/lib/storage';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type FilterType = 'all' | 'classified' | 'unclassified';

const StepClassify = () => {
  const { state, dispatch } = useWizard();
  const { organizations } = state;
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const stats = useMemo(() => getClassificationStats(organizations), [organizations]);

  const filteredOrganizations = useMemo(() => {
    return organizations.filter(org => {
      // Suchfilter
      const matchesSearch = searchTerm === '' || 
        org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        org.city.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Statusfilter
      const matchesFilter = 
        filter === 'all' ||
        (filter === 'classified' && org.type !== null) ||
        (filter === 'unclassified' && org.type === null);
      
      return matchesSearch && matchesFilter;
    });
  }, [organizations, searchTerm, filter]);

  const handleClassify = (id: string, type: 'traeger' | 'einrichtung') => {
    dispatch({ type: 'UPDATE_ORGANIZATION', id, updates: { type } });
  };

  const handleBulkClassify = (type: 'traeger' | 'einrichtung') => {
    selectedIds.forEach(id => {
      dispatch({ type: 'UPDATE_ORGANIZATION', id, updates: { type } });
    });
    setSelectedIds(new Set());
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Möchten Sie "${name}" wirklich ausschließen/löschen?`)) {
      try {
        // Delete from database
        await deleteOrganization(id);
        // Delete from state
        dispatch({ type: 'DELETE_ORGANIZATION', id });
        toast.success('Eintrag wurde gelöscht');
      } catch (error) {
        console.error('Fehler beim Löschen:', error);
        toast.error('Fehler beim Löschen des Eintrags');
      }
    }
  };

  const handleBulkDelete = async () => {
    const count = selectedIds.size;
    if (confirm(`Möchten Sie ${count} Einträge wirklich ausschließen/löschen?`)) {
      try {
        // Delete from database
        await deleteOrganizations(Array.from(selectedIds));
        // Delete from state
        selectedIds.forEach(id => {
          dispatch({ type: 'DELETE_ORGANIZATION', id });
        });
        setSelectedIds(new Set());
        toast.success(`${count} Einträge wurden gelöscht`);
      } catch (error) {
        console.error('Fehler beim Löschen:', error);
        toast.error('Fehler beim Löschen der Einträge');
      }
    }
  };

  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredOrganizations.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredOrganizations.map(o => o.id)));
    }
  };

  const progressPercent = stats.total > 0 
    ? Math.round(((stats.traeger + stats.einrichtungen) / stats.total) * 100) 
    : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Klassifizierung</h2>
        <p className="text-muted-foreground mt-1">
          Ordnen Sie jeden Eintrag als Trägerorganisation oder Einrichtung ein.
        </p>
      </div>

      {/* Statistik-Karten */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-foreground">{stats.total}</div>
            <p className="text-sm text-muted-foreground">Gesamt</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-primary">{stats.traeger}</div>
            <p className="text-sm text-muted-foreground">Trägerorganisationen</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-secondary">{stats.einrichtungen}</div>
            <p className="text-sm text-muted-foreground">Einrichtungen</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-warning">{stats.unclassified}</div>
            <p className="text-sm text-muted-foreground">Nicht klassifiziert</p>
          </CardContent>
        </Card>
      </div>

      {/* Fortschrittsanzeige */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Fortschritt</span>
            <span className="text-sm text-muted-foreground">
              {stats.traeger + stats.einrichtungen} / {stats.total} klassifiziert
            </span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </CardContent>
      </Card>

      {/* Filter und Suche */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Nach Name oder Stadt suchen..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filter} onValueChange={(v) => setFilter(v as FilterType)}>
          <SelectTrigger className="w-full sm:w-48">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle anzeigen</SelectItem>
            <SelectItem value="classified">Klassifiziert</SelectItem>
            <SelectItem value="unclassified">Nicht klassifiziert</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Massenaktionen */}
      {selectedIds.size > 0 && (
        <Card className="bg-accent/50">
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {selectedIds.size} Eintrag/Einträge ausgewählt
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkClassify('traeger')}
                  className="gap-1"
                >
                  <Building2 className="w-4 h-4" />
                  Als Träger
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkClassify('einrichtung')}
                  className="gap-1"
                >
                  <Home className="w-4 h-4" />
                  Als Einrichtung
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleBulkDelete}
                  className="gap-1"
                >
                  <Trash2 className="w-4 h-4" />
                  Löschen
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabelle */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedIds.size === filteredOrganizations.length && filteredOrganizations.length > 0}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="hidden md:table-cell">Adresse</TableHead>
                <TableHead className="hidden sm:table-cell">Stadt</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aktion</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrganizations.map((org) => (
                <TableRow 
                  key={org.id}
                  className={cn(
                    org.type && 'bg-accent/30'
                  )}
                >
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.has(org.id)}
                      onCheckedChange={() => toggleSelection(org.id)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    {org.name}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">
                    {org.street}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <span className="text-muted-foreground">{org.zipCode}</span> {org.city}
                  </TableCell>
                  <TableCell>
                    {org.type ? (
                      <Badge 
                        variant={org.type === 'traeger' ? 'default' : 'secondary'}
                        className="gap-1"
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        {org.type === 'traeger' ? 'Träger' : 'Einrichtung'}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">
                        Offen
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant={org.type === 'traeger' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleClassify(org.id, 'traeger')}
                        className="gap-1"
                      >
                        <Building2 className="w-3 h-3" />
                        <span className="hidden lg:inline">Träger</span>
                      </Button>
                      <Button
                        variant={org.type === 'einrichtung' ? 'secondary' : 'outline'}
                        size="sm"
                        onClick={() => handleClassify(org.id, 'einrichtung')}
                        className="gap-1"
                      >
                        <Home className="w-3 h-3" />
                        <span className="hidden lg:inline">Einrichtung</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(org.id, org.name)}
                        className="gap-1 text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {filteredOrganizations.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p>Keine Einträge gefunden.</p>
        </div>
      )}
    </div>
  );
};

export default StepClassify;
