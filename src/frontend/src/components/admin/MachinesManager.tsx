import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import type React from "react";
import { useState } from "react";
import type { Machine } from "../../backend";
import {
  useAddMachine,
  useDeleteMachine,
  useGetAllMachines,
  useUpdateMachine,
} from "../../hooks/useQueries";
import LoadingPanel from "../LoadingPanel";
import MasterDataLoadError from "../MasterDataLoadError";

export default function MachinesManager() {
  const {
    data: machines = [],
    isLoading,
    isError,
    refetch,
  } = useGetAllMachines();
  const addMachine = useAddMachine();
  const updateMachine = useUpdateMachine();
  const deleteMachine = useDeleteMachine();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMachine, setEditingMachine] = useState<Machine | null>(null);
  const [name, setName] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<Machine | null>(null);

  const openAdd = () => {
    setEditingMachine(null);
    setName("");
    setDialogOpen(true);
  };

  const openEdit = (machine: Machine) => {
    setEditingMachine(machine);
    setName(machine.name);
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (editingMachine) {
      await updateMachine.mutateAsync({
        id: editingMachine.id,
        name: name.trim(),
      });
    } else {
      await addMachine.mutateAsync({ name: name.trim() });
    }
    setDialogOpen(false);
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    await deleteMachine.mutateAsync(deleteConfirm.id);
    setDeleteConfirm(null);
  };

  const isMutating = addMachine.isPending || updateMachine.isPending;

  if (isLoading) return <LoadingPanel message="Loading machines..." />;
  if (isError)
    return (
      <MasterDataLoadError
        message="Failed to load machines."
        onRetry={refetch}
      />
    );

  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between bg-primary/5 rounded-t-lg border-b border-border">
        <CardTitle className="text-primary">Machines</CardTitle>
        <Button
          onClick={openAdd}
          size="sm"
          className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          <Plus className="h-4 w-4" />
          Add Machine
        </Button>
      </CardHeader>
      <CardContent className="pt-4">
        {machines.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No machines yet. Add your first machine.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold">ID</TableHead>
                <TableHead className="font-semibold">Name</TableHead>
                <TableHead className="text-right font-semibold">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {machines.map((machine) => (
                <TableRow
                  key={String(machine.id)}
                  className="hover:bg-accent/30"
                >
                  <TableCell className="text-muted-foreground">
                    {String(machine.id)}
                  </TableCell>
                  <TableCell className="font-medium">{machine.name}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(machine)}
                        className="hover:bg-accent hover:text-accent-foreground"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteConfirm(machine)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
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
            <DialogTitle className="text-primary">
              {editingMachine ? "Edit Machine" : "Add Machine"}
            </DialogTitle>
            <DialogDescription>
              {editingMachine
                ? "Update machine name."
                : "Enter a name for the new machine."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isMutating || !name.trim()}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {isMutating && (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                )}
                {editingMachine ? "Update" : "Add"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!deleteConfirm}
        onOpenChange={(open) => !open && setDeleteConfirm(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Machine</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deleteConfirm?.name}"? This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteMachine.isPending}
            >
              {deleteMachine.isPending && (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              )}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
