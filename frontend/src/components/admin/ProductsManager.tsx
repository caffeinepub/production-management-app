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
import { useGetAllProducts, useAddProduct, useUpdateProduct, useDeleteProduct } from '../../hooks/useQueries';
import type { Product } from '../../backend';
import LoadingPanel from '../LoadingPanel';
import MasterDataLoadError from '../MasterDataLoadError';

interface ProductForm {
  name: string;
  loadingTime: string;
  unloadingTime: string;
  piecesPerCycle: string;
  cycleTime: string;
}

const emptyForm: ProductForm = {
  name: '',
  loadingTime: '0',
  unloadingTime: '0',
  piecesPerCycle: '1',
  cycleTime: '0',
};

export default function ProductsManager() {
  const { data: products = [], isLoading, isError, refetch } = useGetAllProducts();
  const addProduct = useAddProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [deleteConfirm, setDeleteConfirm] = useState<Product | null>(null);

  const openAdd = () => {
    setEditingProduct(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (product: Product) => {
    setEditingProduct(product);
    setForm({
      name: product.name,
      loadingTime: String(product.loadingTime),
      unloadingTime: String(product.unloadingTime),
      piecesPerCycle: String(product.piecesPerCycle),
      cycleTime: String(product.cycleTime),
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      name: form.name.trim(),
      loadingTime: BigInt(parseInt(form.loadingTime) || 0),
      unloadingTime: BigInt(parseInt(form.unloadingTime) || 0),
      piecesPerCycle: BigInt(parseInt(form.piecesPerCycle) || 1),
      cycleTime: BigInt(parseInt(form.cycleTime) || 0),
    };

    if (editingProduct) {
      await updateProduct.mutateAsync({ id: editingProduct.id, data });
    } else {
      await addProduct.mutateAsync(data);
    }
    setDialogOpen(false);
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    await deleteProduct.mutateAsync(deleteConfirm.id);
    setDeleteConfirm(null);
  };

  const isMutating = addProduct.isPending || updateProduct.isPending;

  if (isLoading) return <LoadingPanel message="Loading products..." />;
  if (isError) return <MasterDataLoadError message="Failed to load products." onRetry={refetch} />;

  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between bg-primary/5 rounded-t-lg border-b border-border">
        <CardTitle className="text-primary">Products</CardTitle>
        <Button onClick={openAdd} size="sm" className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground">
          <Plus className="h-4 w-4" />
          Add Product
        </Button>
      </CardHeader>
      <CardContent className="pt-4">
        {products.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No products yet. Add your first product.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">Name</TableHead>
                  <TableHead className="font-semibold">Cycle Time (s)</TableHead>
                  <TableHead className="font-semibold">Loading (s)</TableHead>
                  <TableHead className="font-semibold">Unloading (s)</TableHead>
                  <TableHead className="font-semibold">Pcs/Cycle</TableHead>
                  <TableHead className="text-right font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => (
                  <TableRow key={String(product.id)} className="hover:bg-accent/30">
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell>{String(product.cycleTime)}</TableCell>
                    <TableCell>{String(product.loadingTime)}</TableCell>
                    <TableCell>{String(product.unloadingTime)}</TableCell>
                    <TableCell>{String(product.piecesPerCycle)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(product)} className="hover:bg-accent hover:text-accent-foreground">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteConfirm(product)} className="text-destructive hover:text-destructive hover:bg-destructive/10">
                          <Trash2 className="h-4 w-4" />
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

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-primary">{editingProduct ? 'Edit Product' : 'Add Product'}</DialogTitle>
            <DialogDescription>
              {editingProduct ? 'Update product details.' : 'Enter details for the new product.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Cycle Time (s)</Label>
                <Input type="number" min="0" value={form.cycleTime} onChange={(e) => setForm({ ...form, cycleTime: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Pieces/Cycle</Label>
                <Input type="number" min="1" value={form.piecesPerCycle} onChange={(e) => setForm({ ...form, piecesPerCycle: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Loading Time (s)</Label>
                <Input type="number" min="0" value={form.loadingTime} onChange={(e) => setForm({ ...form, loadingTime: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Unloading Time (s)</Label>
                <Input type="number" min="0" value={form.unloadingTime} onChange={(e) => setForm({ ...form, unloadingTime: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isMutating || !form.name.trim()} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                {isMutating && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {editingProduct ? 'Update' : 'Add'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Product</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deleteConfirm?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteProduct.isPending}>
              {deleteProduct.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
