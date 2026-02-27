import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { useGetAllOperators, useAddOperator, useUpdateOperator, useDeleteOperator } from '../../hooks/useQueries';
import type { Operator } from '../../backend';
import LoadingPanel from '../LoadingPanel';
import MasterDataLoadError from '../MasterDataLoadError';

export default function OperatorsManager() {
  const { data: operators = [], isLoading, isError, refetch } = useGetAllOperators();
  const addOperator = useAddOperator();
  const updateOperator = useUpdateOperator();
  const deleteOperator = useDeleteOperator();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingOperator, setEditingOperator] = useState<Operator | null>(null);
  const [name, setName] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<Operator | null>(null);

  const openAdd = () => {
    setEditingOperator(null);
    setName('');
    setDialogOpen(true);
  };

  const openEdit = (operator: Operator) => {
    setEditingOperator(operator);
    setName(operator.name);
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (editingOperator) {
      await updateOperator.mutateAsync({ id: editingOperator.id, name: name.trim() });
    } else {
      await addOperator.mutateAsync({ name: name.trim() });
    }
    setDialogOpen(false);
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    await deleteOperator.mutateAsync(deleteConfirm.id);
    setDeleteConfirm(null);
  };

  const isMutating = addOperator.isPending || updateOperator.isPending;

  if (isLoading) return <LoadingPanel message="Loading operators..." />;
  if (isError) return <MasterDataLoadError message="Failed to load operators." onRetry={refetch} />;

  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between bg-primary/5 rounded-t-lg border-b border-border">
        <CardTitle className="text-primary">Operators</CardTitle>
        <Button onClick={openAdd} size="sm" className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground">
          <Plus className="h-4 w-4" />
          Add Operator
        </Button>
      </CardHeader>
      <CardContent className="pt-4">
        {operators.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No operators yet. Add your first operator.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold">ID</TableHead>
                <TableHead className="font-semibold">Name</TableHead>
                <TableHead className="text-right font-semibold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {operators.map((operator) => (
                <TableRow key={String(operator.id)} className="hover:bg-accent/30">
                  <TableCell className="text-muted-foreground">{String(operator.id)}</TableCell>
                  <TableCell className="font-medium">{operator.name}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(operator)} className="hover:bg-accent hover:text-accent-foreground">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteConfirm(operator)} className="text-destructive hover:text-destructive hover:bg-destructive/10">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-primary">{editingOperator ? 'Edit Operator' : 'Add Operator'}</DialogTitle>
            <DialogDescription>
              {editingOperator ? 'Update operator name.' : 'Enter a name for the new operator.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isMutating || !name.trim()} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                {isMutating && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {editingOperator ? 'Update' : 'Add'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Operator</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deleteConfirm?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteOperator.isPending}>
              {deleteOperator.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
