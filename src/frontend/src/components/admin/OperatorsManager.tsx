import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Loader2, Users, ArrowUpDown, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  useGetAllOperators,
  useAddOperator,
  useUpdateOperator,
  useDeleteOperator,
  useIsAuthenticated,
} from '../../hooks/useQueries';
import { useActor } from '../../hooks/useActor';
import type { Operator, OperatorId } from '../../backend';
import { toast } from 'sonner';

type SortField = 'name' | 'id';

export default function OperatorsManager() {
  const { actor } = useActor();
  const isAuthenticated = useIsAuthenticated();
  const [sortBy, setSortBy] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const { data: operators = [], isLoading } = useGetAllOperators('name');
  const addOperator = useAddOperator();
  const updateOperator = useUpdateOperator();
  const deleteOperator = useDeleteOperator();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingOperator, setEditingOperator] = useState<Operator | null>(null);
  const [operatorName, setOperatorName] = useState('');

  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const sortedOperators = useMemo(() => {
    let sorted = [...operators];
    
    sorted.sort((a, b) => {
      let comparison = 0;
      
      if (sortBy === 'id') {
        comparison = Number(a.id) - Number(b.id);
      } else {
        comparison = a.name.localeCompare(b.name);
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    
    return sorted;
  }, [operators, sortBy, sortOrder]);

  const handleOpenDialog = (operator?: Operator) => {
    if (!actor) {
      toast.error('Please wait for the system to initialize');
      return;
    }
    
    if (!isAuthenticated) {
      toast.error('Please sign in to manage operators');
      return;
    }
    
    if (operator) {
      setEditingOperator(operator);
      setOperatorName(operator.name);
    } else {
      setEditingOperator(null);
      setOperatorName('');
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingOperator(null);
    setOperatorName('');
  };

  const handleSave = async () => {
    if (!actor) {
      toast.error('Please wait for the system to initialize');
      return;
    }

    if (!isAuthenticated) {
      toast.error('Please sign in to save changes');
      return;
    }

    const trimmedName = operatorName.trim();
    if (!trimmedName) {
      toast.error('Operator name is required');
      return;
    }

    try {
      if (editingOperator) {
        await updateOperator.mutateAsync({
          id: editingOperator.id,
          name: trimmedName,
        });
      } else {
        await addOperator.mutateAsync(trimmedName);
      }
      handleCloseDialog();
    } catch (error) {
      // Error is already handled by mutation hooks with normalized messages
      console.error('Save error:', error);
    }
  };

  const handleDelete = async (id: OperatorId) => {
    if (!actor) {
      toast.error('Please wait for the system to initialize');
      return;
    }

    if (!isAuthenticated) {
      toast.error('Please sign in to delete operators');
      return;
    }

    if (confirm('Are you sure you want to delete this operator?')) {
      try {
        await deleteOperator.mutateAsync(id);
      } catch (error) {
        console.error('Delete error:', error);
      }
    }
  };

  const isSaving = addOperator.isPending || updateOperator.isPending;
  const canWrite = actor && isAuthenticated;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Operators</CardTitle>
              <CardDescription>Manage production operators</CardDescription>
            </div>
            <Button onClick={() => handleOpenDialog()} className="gap-2" disabled={isSaving || !canWrite}>
              <Plus className="h-4 w-4" />
              Add Operator
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!isAuthenticated && (
            <Alert className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Please sign in to add, edit, or delete operators. You can view existing operators without signing in.
              </AlertDescription>
            </Alert>
          )}
          {isLoading ? (
            <div className="text-center py-12">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mb-3" />
              <p className="text-muted-foreground">Loading operators...</p>
            </div>
          ) : operators.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">No operators yet</p>
              <p className="text-sm">Add your first operator to get started.</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="-ml-3 h-8 data-[state=open]:bg-accent"
                        onClick={() => handleSort('name')}
                      >
                        Operator Name
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="-ml-3 h-8 data-[state=open]:bg-accent"
                        onClick={() => handleSort('id')}
                      >
                        ID
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    </TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedOperators.map((operator) => (
                    <TableRow key={operator.id.toString()}>
                      <TableCell className="font-medium">{operator.name}</TableCell>
                      <TableCell className="text-muted-foreground">{operator.id.toString()}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenDialog(operator)}
                            disabled={deleteOperator.isPending || !canWrite}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(operator.id)}
                            disabled={deleteOperator.isPending || !canWrite}
                          >
                            {deleteOperator.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin text-destructive" />
                            ) : (
                              <Trash2 className="h-4 w-4 text-destructive" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        if (!open) handleCloseDialog();
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingOperator ? 'Edit Operator' : 'Add Operator'}</DialogTitle>
            <DialogDescription>
              {editingOperator
                ? 'Update the operator name below.'
                : 'Enter the operator name below.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="operatorName">Operator Name</Label>
              <Input
                id="operatorName"
                value={operatorName}
                onChange={(e) => setOperatorName(e.target.value)}
                placeholder="Enter operator name"
                disabled={isSaving}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog} disabled={isSaving}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!operatorName.trim() || isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                'Save'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
