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
import { useEffect, useState } from "react";
import type { Operator } from "../../backend";
import {
  useAddOperator,
  useDeleteOperator,
  useGetAllOperators,
  useUpdateOperator,
} from "../../hooks/useQueries";
import { getOperatorRate, saveOperatorRate } from "../../utils/operatorRates";
import LoadingPanel from "../LoadingPanel";
import MasterDataLoadError from "../MasterDataLoadError";

const PENDING_RATE_KEY = "prodmgr_pending_rate";

function getPendingRates(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(PENDING_RATE_KEY) || "{}") as Record<
      string,
      number
    >;
  } catch {
    return {};
  }
}

function clearPendingRate(name: string) {
  try {
    const pending = getPendingRates();
    delete pending[name];
    localStorage.setItem(PENDING_RATE_KEY, JSON.stringify(pending));
  } catch {
    /* ignore */
  }
}

export default function OperatorsManager() {
  const {
    data: operators = [],
    isLoading,
    isError,
    refetch,
  } = useGetAllOperators();
  const addOperator = useAddOperator();
  const updateOperator = useUpdateOperator();
  const deleteOperator = useDeleteOperator();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingOperator, setEditingOperator] = useState<Operator | null>(null);
  const [name, setName] = useState("");
  const [ratePerHour, setRatePerHour] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<Operator | null>(null);

  // When operator list updates, assign any pending rates by name
  useEffect(() => {
    const pending = getPendingRates();
    const keys = Object.keys(pending);
    if (keys.length === 0) return;
    for (const operator of operators) {
      if (pending[operator.name] !== undefined) {
        saveOperatorRate(String(operator.id), pending[operator.name]);
        clearPendingRate(operator.name);
      }
    }
  }, [operators]);

  const openAdd = () => {
    setEditingOperator(null);
    setName("");
    setRatePerHour("");
    setDialogOpen(true);
  };

  const openEdit = (operator: Operator) => {
    setEditingOperator(operator);
    setName(operator.name);
    const existing = getOperatorRate(String(operator.id));
    setRatePerHour(existing > 0 ? String(existing) : "");
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const rate = Number.parseFloat(ratePerHour) || 0;

    if (editingOperator) {
      await updateOperator.mutateAsync({
        id: editingOperator.id,
        name: name.trim(),
      });
      saveOperatorRate(String(editingOperator.id), rate);
    } else {
      // addOperator returns void, so we store a pending rate by name
      await addOperator.mutateAsync({ name: name.trim() });
      if (rate > 0) {
        try {
          const pending = getPendingRates();
          pending[name.trim()] = rate;
          localStorage.setItem(PENDING_RATE_KEY, JSON.stringify(pending));
        } catch {
          /* ignore */
        }
      }
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
  if (isError)
    return (
      <MasterDataLoadError
        message="Failed to load operators."
        onRetry={refetch}
      />
    );

  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between bg-primary/5 rounded-t-lg border-b border-border">
        <CardTitle className="text-primary">Operators</CardTitle>
        <Button
          onClick={openAdd}
          size="sm"
          className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground"
          data-ocid="operators.open_modal_button"
        >
          <Plus className="h-4 w-4" />
          Add Operator
        </Button>
      </CardHeader>
      <CardContent className="pt-4">
        {operators.length === 0 ? (
          <p
            className="text-center text-muted-foreground py-8"
            data-ocid="operators.empty_state"
          >
            No operators yet. Add your first operator.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold">ID</TableHead>
                <TableHead className="font-semibold">Name</TableHead>
                <TableHead className="font-semibold">Rate/Hour (₹)</TableHead>
                <TableHead className="text-right font-semibold">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {operators.map((operator, idx) => {
                const rate = getOperatorRate(String(operator.id));
                return (
                  <TableRow
                    key={String(operator.id)}
                    className="hover:bg-accent/30"
                    data-ocid={`operators.item.${idx + 1}`}
                  >
                    <TableCell className="text-muted-foreground">
                      {String(operator.id)}
                    </TableCell>
                    <TableCell className="font-medium">
                      {operator.name}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {rate > 0 ? `₹${rate.toLocaleString("en-IN")}` : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(operator)}
                          className="hover:bg-accent hover:text-accent-foreground"
                          data-ocid={`operators.edit_button.${idx + 1}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteConfirm(operator)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          data-ocid={`operators.delete_button.${idx + 1}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent data-ocid="operators.dialog">
          <DialogHeader>
            <DialogTitle className="text-primary">
              {editingOperator ? "Edit Operator" : "Add Operator"}
            </DialogTitle>
            <DialogDescription>
              {editingOperator
                ? "Update operator details."
                : "Enter details for the new operator."}
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
                data-ocid="operators.name.input"
              />
            </div>
            <div className="space-y-2">
              <Label>Rate per Hour (₹)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="e.g. 150"
                value={ratePerHour}
                onChange={(e) => setRatePerHour(e.target.value)}
                data-ocid="operators.rate.input"
              />
              <p className="text-xs text-muted-foreground">
                Used to calculate salary in operator-wise reports.
              </p>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                data-ocid="operators.cancel_button"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isMutating || !name.trim()}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
                data-ocid="operators.save_button"
              >
                {isMutating && (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                )}
                {editingOperator ? "Update" : "Add"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog
        open={!!deleteConfirm}
        onOpenChange={(open) => !open && setDeleteConfirm(null)}
      >
        <DialogContent data-ocid="operators.delete_dialog">
          <DialogHeader>
            <DialogTitle>Delete Operator</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{deleteConfirm?.name}&quot;?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirm(null)}
              data-ocid="operators.cancel_button"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteOperator.isPending}
              data-ocid="operators.confirm_button"
            >
              {deleteOperator.isPending && (
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
