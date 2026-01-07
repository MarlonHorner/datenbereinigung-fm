import React, { useState, useMemo } from 'react';
import { Building2, Home, Search, Filter, CheckCircle2, Trash2, XCircle, AlertTriangle, Info, Edit2, Check, X } from 'lucide-react';
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

type FilterType = 'all' | 'classified' | 'unclassified' | 'duplicates';

const StepClassify = () => {
  const { state, dispatch } = useWizard();
  const { organizations } = state;
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedName, setEditedName] = useState('');

  const stats = useMemo(() => getClassificationStats(organizations), [organizations]);

  // Doppelte Firmennamen erkennen
  const duplicateNames = useMemo(() => {
    const nameCount = new Map<string, number>();
    organizations.forEach(org => {
      const normalizedName = org.name.toLowerCase().trim();
      nameCount.set(normalizedName, (nameCount.get(normalizedName) || 0) + 1);
    });
    return new Set(
      Array.from(nameCount.entries())
        .filter(([_, count]) => count > 1)
        .map(([name, _]) => name)
    );
  }, [organizations]);

  const duplicateCount = useMemo(() => {
    return organizations.filter(org =>
      duplicateNames.has(org.name.toLowerCase().trim())
    ).length;
  }, [organizations, duplicateNames]);

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
        (filter === 'unclassified' && org.type === null) ||
        (filter === 'duplicates' && duplicateNames.has(org.name.toLowerCase().trim()));
      
      return matchesSearch && matchesFilter;
    });
  }, [organizations, searchTerm, filter, duplicateNames]);

  const handleClassify = (id: string, type: 'traeger' | 'einrichtung' | 'inaktiv') => {
    const org = organizations.find(o => o.id === id);
    // Toggle: Wenn bereits dieser Typ gesetzt ist, auf null setzen
    const newType = org?.type === type ? null : type;
    dispatch({ type: 'UPDATE_ORGANIZATION', id, updates: { type: newType } });
  };

  const handleBulkClassify = (type: 'traeger' | 'einrichtung' | 'inaktiv') => {
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

  const startEditing = (id: string, currentName: string) => {
    setEditingId(id);
    setEditedName(currentName);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditedName('');
  };

  const saveEditing = (id: string) => {
    if (editedName.trim()) {
      dispatch({ type: 'UPDATE_ORGANIZATION', id, updates: { name: editedName.trim() } });
      toast.success('Name wurde aktualisiert');
    }
    cancelEditing();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, id: string) => {
    if (e.key === 'Enter') {
      saveEditing(id);
    } else if (e.key === 'Escape') {
      cancelEditing();
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
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
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
            <div className="text-2xl font-bold text-muted-foreground">{organizations.filter(o => o.type === 'inaktiv').length}</div>
            <p className="text-sm text-muted-foreground">Inaktiv</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-warning">{stats.unclassified}</div>
            <p className="text-sm text-muted-foreground">Nicht klassifiziert</p>
          </CardContent>
        </Card>
        <Card className={cn(duplicateCount > 0 && "border-orange-500")}>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-orange-600">{duplicateCount}</div>
            <p className="text-sm text-muted-foreground">Duplikate</p>
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
            <SelectItem value="duplicates">
              <span className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-orange-600" />
                Duplikate ({duplicateCount})
              </span>
            </SelectItem>
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
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkClassify('inaktiv')}
                  className="gap-1"
                >
                  <XCircle className="w-4 h-4" />
                  Als Inaktiv
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
              {filteredOrganizations.map((org) => {
                const isDuplicate = duplicateNames.has(org.name.toLowerCase().trim());
                return (
                  <TableRow
                    key={org.id}
                    className={cn(
                      org.type && 'bg-accent/30',
                      isDuplicate && 'border-l-4 border-l-orange-500'
                    )}
                  >
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(org.id)}
                        onCheckedChange={() => toggleSelection(org.id)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="flex flex-col gap-1">
                        {editingId === org.id ? (
                          <div className="flex items-center gap-1">
                            <Input
                              value={editedName}
                              onChange={(e) => setEditedName(e.target.value)}
                              onKeyDown={(e) => handleKeyDown(e, org.id)}
                              onBlur={() => saveEditing(org.id)}
                              className="h-8"
                              autoFocus
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => saveEditing(org.id)}
                            >
                              <Check className="w-4 h-4 text-success" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={cancelEditing}
                            >
                              <X className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 group">
                            {isDuplicate && (
                              <AlertTriangle className="w-4 h-4 text-orange-600 flex-shrink-0" />
                            )}
                            <span>{org.name}</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => startEditing(org.id, org.name)}
                            >
                              <Edit2 className="w-3 h-3" />
                            </Button>
                          </div>
                        )}
                        {org.mondayParentCompany && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Info className="w-3 h-3" />
                            <span>Monday Parent: {org.mondayParentCompany}</span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">
                    {org.street}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <span className="text-muted-foreground">{org.zipCode}</span> {org.city}
                  </TableCell>
                  <TableCell>
                    {org.type === 'traeger' ? (
                      <Badge
                        variant="default"
                        className="gap-1"
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        Träger
                      </Badge>
                    ) : org.type === 'einrichtung' ? (
                      <Badge
                        variant="secondary"
                        className="gap-1"
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        Einrichtung
                      </Badge>
                    ) : org.type === 'inaktiv' ? (
                      <Badge
                        variant="destructive"
                        className="gap-1"
                      >
                        <XCircle className="w-3 h-3" />
                        Inaktiv
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
                        className="gap-1 min-w-[90px]"
                        disabled={org.type === 'inaktiv'}
                      >
                        <Building2 className="w-3 h-3" />
                        <span className="hidden xl:inline">Träger</span>
                      </Button>
                      <Button
                        variant={org.type === 'einrichtung' ? 'secondary' : 'outline'}
                        size="sm"
                        onClick={() => handleClassify(org.id, 'einrichtung')}
                        className="gap-1 min-w-[90px]"
                        disabled={org.type === 'inaktiv'}
                      >
                        <Home className="w-3 h-3" />
                        <span className="hidden xl:inline">Einrichtung</span>
                      </Button>
                      <Button
                        variant={org.type === 'inaktiv' ? 'destructive' : 'outline'}
                        size="sm"
                        onClick={() => handleClassify(org.id, 'inaktiv')}
                        className="gap-1 min-w-[90px]"
                      >
                        <XCircle className="w-3 h-3" />
                        <span className="hidden xl:inline">Inaktiv</span>
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
                );
              })}
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
