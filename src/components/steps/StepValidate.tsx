import React, { useState, useMemo } from 'react';
import { Search, Check, Edit2, X, Save, Stethoscope, Bed, Info } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { useWizard } from '@/context/WizardContext';
import { getValidationStats } from '@/lib/storage';
import { cn } from '@/lib/utils';
import { Organization } from '@/types/organization';

interface StepValidateProps {
  type: 'traeger' | 'einrichtung';
}

const StepValidate: React.FC<StepValidateProps> = ({ type }) => {
  const { state, dispatch } = useWizard();
  const { organizations } = state;
  
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Organization>>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const filteredOrgs = useMemo(() => {
    return organizations
      .filter(org => org.type === type)
      .filter(org => 
        searchTerm === '' ||
        org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        org.city.toLowerCase().includes(searchTerm.toLowerCase())
      );
  }, [organizations, type, searchTerm]);

  const stats = useMemo(() => getValidationStats(organizations, type), [organizations, type]);
  const progressPercent = stats.total > 0 ? Math.round((stats.validated / stats.total) * 100) : 0;

  const title = type === 'traeger' ? 'Trägerorganisationen prüfen' : 'Einrichtungen prüfen';
  const description = type === 'traeger' 
    ? 'Überprüfen und korrigieren Sie die Daten der Trägerorganisationen.'
    : 'Überprüfen und korrigieren Sie die Daten der Einrichtungen.';

  const startEditing = (org: Organization) => {
    setEditingId(org.id);
    setEditForm({
      name: org.name,
      street: org.street,
      zipCode: org.zipCode,
      city: org.city,
      isAmbulant: org.isAmbulant,
      isStationaer: org.isStationaer,
      mondayParentCompany: org.mondayParentCompany,
      // Kontaktfelder
      generalContactPerson: org.generalContactPerson,
      phone: org.phone,
      email: org.email,
      invoiceEmail: org.invoiceEmail,
      applicationEmail: org.applicationEmail,
    });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditForm({});
  };

  const saveEditing = () => {
    if (editingId && editForm) {
      dispatch({ type: 'UPDATE_ORGANIZATION', id: editingId, updates: editForm });
      cancelEditing();
    }
  };

  const toggleValidated = (id: string, currentState: boolean) => {
    dispatch({ type: 'UPDATE_ORGANIZATION', id, updates: { isValidated: !currentState } });
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
    if (selectedIds.size === filteredOrgs.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredOrgs.map(o => o.id)));
    }
  };

  const handleBulkToggleAmbulant = () => {
    selectedIds.forEach(id => {
      const org = organizations.find(o => o.id === id);
      if (org) {
        dispatch({ type: 'UPDATE_ORGANIZATION', id, updates: { isAmbulant: !org.isAmbulant } });
      }
    });
  };

  const handleBulkToggleStationaer = () => {
    selectedIds.forEach(id => {
      const org = organizations.find(o => o.id === id);
      if (org) {
        dispatch({ type: 'UPDATE_ORGANIZATION', id, updates: { isStationaer: !org.isStationaer } });
      }
    });
  };

  const handleBulkReset = () => {
    selectedIds.forEach(id => {
      dispatch({ type: 'UPDATE_ORGANIZATION', id, updates: { isAmbulant: false, isStationaer: false } });
    });
  };

  const getCareTypeBadge = (org: Organization) => {
    if (org.isAmbulant && org.isStationaer) {
      return <Badge variant="default" className="gap-1 bg-purple-600"><Stethoscope className="w-3 h-3" /><Bed className="w-3 h-3" />A & S</Badge>;
    } else if (org.isAmbulant) {
      return <Badge variant="default" className="gap-1 bg-blue-600"><Stethoscope className="w-3 h-3" />Ambulant</Badge>;
    } else if (org.isStationaer) {
      return <Badge variant="default" className="gap-1 bg-green-600"><Bed className="w-3 h-3" />Stationär</Badge>;
    } else {
      return <Badge variant="outline">Offen</Badge>;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold text-foreground">{title}</h2>
        <p className="text-muted-foreground mt-1">{description}</p>
      </div>

      {/* Fortschrittsanzeige */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Fortschritt</span>
            <span className="text-sm text-muted-foreground">
              {stats.validated} / {stats.total} geprüft
            </span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </CardContent>
      </Card>

      {/* Suche */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Nach Name oder Stadt suchen..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Massenaktionen - nur für Einrichtungen */}
      {type === 'einrichtung' && selectedIds.size > 0 && (
        <Card className="bg-accent/50">
          <CardContent className="py-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-sm font-medium">
                {selectedIds.size} Einrichtung{selectedIds.size > 1 ? 'en' : ''} ausgewählt
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBulkToggleAmbulant}
                  className="gap-1"
                >
                  <Stethoscope className="w-4 h-4" />
                  Toggle Ambulant
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBulkToggleStationaer}
                  className="gap-1"
                >
                  <Bed className="w-4 h-4" />
                  Toggle Stationär
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleBulkReset}
                >
                  Zurücksetzen
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
                {type === 'einrichtung' && (
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedIds.size === filteredOrgs.length && filteredOrgs.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                )}
                <TableHead className="w-12">Geprüft</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Straße</TableHead>
                <TableHead>PLZ</TableHead>
                <TableHead>Stadt</TableHead>
                {type === 'einrichtung' && (
                  <>
                    <TableHead>Versorgung</TableHead>
                    <TableHead>Monday Parent</TableHead>
                  </>
                )}
                {type === 'traeger' && (
                  <>
                    <TableHead>Ansprechperson</TableHead>
                    <TableHead>Telefon</TableHead>
                    <TableHead>E-Mail</TableHead>
                    <TableHead>Rechnung E-Mail</TableHead>
                  </>
                )}
                {type === 'einrichtung' && <TableHead>Bewerbung E-Mail</TableHead>}
                <TableHead className="text-right">Aktion</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrgs.map((org) => (
                <TableRow
                  key={org.id}
                  className={cn(org.isValidated && 'bg-success/10')}
                >
                  {type === 'einrichtung' && (
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(org.id)}
                        onCheckedChange={() => toggleSelection(org.id)}
                      />
                    </TableCell>
                  )}
                  <TableCell>
                    <Checkbox
                      checked={org.isValidated}
                      onCheckedChange={() => toggleValidated(org.id, org.isValidated)}
                    />
                  </TableCell>
                  {editingId === org.id ? (
                    <>
                      <TableCell>
                        <Input
                          value={editForm.name || ''}
                          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                          className="h-8"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={editForm.street || ''}
                          onChange={(e) => setEditForm({ ...editForm, street: e.target.value })}
                          className="h-8"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={editForm.zipCode || ''}
                          onChange={(e) => setEditForm({ ...editForm, zipCode: e.target.value })}
                          className="h-8 w-20"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={editForm.city || ''}
                          onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                          className="h-8"
                        />
                      </TableCell>
                      {type === 'einrichtung' && (
                        <>
                          <TableCell>
                            <div className="flex gap-2 items-center">
                              <div className="flex items-center gap-1">
                                <Checkbox
                                  checked={editForm.isAmbulant ?? false}
                                  onCheckedChange={(checked) =>
                                    setEditForm({ ...editForm, isAmbulant: !!checked })
                                  }
                                />
                                <Label className="text-xs cursor-pointer">Ambulant</Label>
                              </div>
                              <div className="flex items-center gap-1">
                                <Checkbox
                                  checked={editForm.isStationaer ?? false}
                                  onCheckedChange={(checked) =>
                                    setEditForm({ ...editForm, isStationaer: !!checked })
                                  }
                                />
                                <Label className="text-xs cursor-pointer">Stationär</Label>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Input
                              value={editForm.mondayParentCompany || ''}
                              onChange={(e) => setEditForm({ ...editForm, mondayParentCompany: e.target.value })}
                              placeholder="Monday Parent Company"
                              className="h-8"
                            />
                          </TableCell>
                        </>
                      )}
                      {type === 'traeger' && (
                        <>
                          <TableCell>
                            <Input
                              value={editForm.generalContactPerson || ''}
                              onChange={(e) => setEditForm({ ...editForm, generalContactPerson: e.target.value })}
                              placeholder="Ansprechperson"
                              className="h-8"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={editForm.phone || ''}
                              onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                              placeholder="Telefon"
                              className="h-8"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={editForm.email || ''}
                              onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                              placeholder="E-Mail"
                              className="h-8"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={editForm.invoiceEmail || ''}
                              onChange={(e) => setEditForm({ ...editForm, invoiceEmail: e.target.value })}
                              placeholder="Rechnung E-Mail (mehrere mit ; oder , trennen)"
                              className="h-8"
                            />
                          </TableCell>
                        </>
                      )}
                      {type === 'einrichtung' && (
                        <TableCell>
                          <Input
                            value={editForm.applicationEmail || ''}
                            onChange={(e) => setEditForm({ ...editForm, applicationEmail: e.target.value })}
                            placeholder="Bewerbung E-Mail (mehrere mit ; oder , trennen)"
                            className="h-8"
                          />
                        </TableCell>
                      )}
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={cancelEditing}>
                            <X className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={saveEditing}>
                            <Save className="w-4 h-4 text-success" />
                          </Button>
                        </div>
                      </TableCell>
                    </>
                  ) : (
                    <>
                      <TableCell className="font-medium">
                        <div className="flex flex-col gap-1">
                          <span>{org.name}</span>
                          {type === 'einrichtung' && org.mondayParentCompany && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Info className="w-3 h-3" />
                              <span>Monday Parent: {org.mondayParentCompany}</span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{org.street}</TableCell>
                      <TableCell className="text-muted-foreground">{org.zipCode}</TableCell>
                      <TableCell>{org.city}</TableCell>
                      {type === 'einrichtung' && (
                        <>
                          <TableCell>{getCareTypeBadge(org)}</TableCell>
                          <TableCell className="text-muted-foreground text-xs">
                            {org.mondayParentCompany || '-'}
                          </TableCell>
                        </>
                      )}
                      {type === 'traeger' && (
                        <>
                          <TableCell className="text-muted-foreground">
                            {org.generalContactPerson || '-'}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {org.phone || '-'}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {org.email || '-'}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {org.invoiceEmail || '-'}
                          </TableCell>
                        </>
                      )}
                      {type === 'einrichtung' && (
                        <TableCell className="text-muted-foreground">
                          {org.applicationEmail || '-'}
                        </TableCell>
                      )}
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => startEditing(org)}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          {org.isValidated && (
                            <Badge variant="outline" className="text-success gap-1">
                              <Check className="w-3 h-3" />
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                    </>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {filteredOrgs.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p>Keine {type === 'traeger' ? 'Trägerorganisationen' : 'Einrichtungen'} gefunden.</p>
        </div>
      )}
    </div>
  );
};

export default StepValidate;
