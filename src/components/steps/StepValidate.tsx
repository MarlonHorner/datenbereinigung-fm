import React, { useState, useMemo } from 'react';
import { Search, Check, Edit2, X, Save } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
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

      {/* Tabelle */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">Geprüft</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Straße</TableHead>
                <TableHead>PLZ</TableHead>
                <TableHead>Stadt</TableHead>
                <TableHead className="text-right">Aktion</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrgs.map((org) => (
                <TableRow 
                  key={org.id}
                  className={cn(org.isValidated && 'bg-success/10')}
                >
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
                      <TableCell className="font-medium">{org.name}</TableCell>
                      <TableCell className="text-muted-foreground">{org.street}</TableCell>
                      <TableCell className="text-muted-foreground">{org.zipCode}</TableCell>
                      <TableCell>{org.city}</TableCell>
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
