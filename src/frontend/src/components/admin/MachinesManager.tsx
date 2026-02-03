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
import { Plus, Pencil, Trash2, Loader2, Cog, ArrowUpDown, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  useGetAllMachines,
  useAddMachine,
  useUpdateMachine,
  useDeleteMachine,
  useIsAuthenticated,
} from '../../hooks/useQueries';
import { useActor } from '../../hooks/useActor';
import type { Machine, MachineId } from '../../backend';
import { toast } from 'sonner';

type SortField = 'name' | 'id';

export default function MachinesManager() {
  const { actor } = useActor();
  const isAuthenticated = useIsAuthenticated();
  const [sortBy, setSortBy] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const { data: machines = [], isLoading } = useGetAllMachines('name');
  const addMachine = useAddMachine();
  const updateMachine = useUpdateMachine();
  const deleteMachine = useDeleteMachine();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMachine, setEditingMachine] = useState<Machine | null>(null);
  const [machineName, setMachineName] = useState('');

  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const sortedMachines = useMemo(() => {
    let sorted = [...machines];
    
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
  }, [machines, sortBy, sortOrder]);

  const handleOpenDialog = (machine?: Machine) => {
    if (!actor) {
      toast.error('Please wait for the system to initialize');
      return;
    }
    
    if (!isAuthenticated) {
      toast.error('Please sign in to manage machines');
      return;
    }
    
    if (machine) {
      setEditingMachine(machine);
      setMachineName(machine.name);
    } else {
      setEditingMachine(null);
      setMachineName('');
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingMachine(null);
    setMachineName('');
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

    const trimmedName = machineName.trim();
    if (!trimmedName) {
      toast.error('Machine name is required');
      return;
    }

    try {
      if (editingMachine) {
        await updateMachine.mutateAsync({
          id: editingMachine.id,
          name: trimmedName,
        });
      } else {
        await addMachine.mutateAsync(trimmedName);
      }
      handleCloseDialog();
    } catch (error) {
      // Error is already handled by mutation hooks with normalized messages
      console.error('Save error:', error);
    }
  };

  const handleDelete = async (id: MachineId) => {
    if (!actor) {
      toast.error('Please wait for the system to initialize');
      return;
    }

    if (!isAuthenticated) {
      toast.error('Please sign in to delete machines');
      return;
    }

    if (confirm('Are you sure you want to delete this machine?')) {
      try {
        await deleteMachine.mutateAsync(id);
      } catch (error) {
        console.error('Delete error:', error);
      }
    }
  };

  const isSaving = addMachine.isPending || updateMachine.isPending;
  const canWrite = actor && isAuthenticated;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Machines</CardTitle>
              <CardDescription>Manage production machines</CardDescription>
            </div>
            <Button onClick={() => handleOpenDialog()} className="gap-2" disabled={isSaving || !canWrite}>
              <Plus className="h-4 w-4" />
              Add Machine
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!isAuthenticated && (
            <Alert className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Please sign in to add, edit, or delete machines. You can view existing machines without signing in.
              </AlertDescription>
            </Alert>
          )}
          {isLoading ? (
            <div className="text-center py-12">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mb-3" />
              <p className="text-muted-foreground">Loading machines...</p>
            </div>
          ) : machines.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Cog className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">No machines yet</p>
              <p className="text-sm">Add your first machine to get started.</p>
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
                        Machine Name
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
                  {sortedMachines.map((machine) => (
                    <TableRow key={machine.id.toString()}>
                      <TableCell className="font-medium">{machine.name}</TableCell>
                      <TableCell className="text-muted-foreground">{machine.id.toString()}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenDialog(machine)}
                            disabled={deleteMachine.isPending || !canWrite}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(machine.id)}
                            disabled={deleteMachine.isPending || !canWrite}
                          >
                            {deleteMachine.isPending ? (
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
            <DialogTitle>{editingMachine ? 'Edit Machine' : 'Add Machine'}</DialogTitle>
            <DialogDescription>
              {editingMachine
                ? 'Update the machine name below.'
                : 'Enter the machine name below.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="machineName">Machine Name</Label>
              <Input
                id="machineName"
                value={machineName}
                onChange={(e) => setMachineName(e.target.value)}
                placeholder="Enter machine name"
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
              disabled={!machineName.trim() || isSaving}
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
