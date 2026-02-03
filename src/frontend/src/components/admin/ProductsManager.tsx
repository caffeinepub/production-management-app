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
import { Plus, Pencil, Trash2, Loader2, Package, ArrowUpDown } from 'lucide-react';
import {
  useGetAllProducts,
  useAddProduct,
  useUpdateProduct,
  useDeleteProduct,
} from '../../hooks/useQueries';
import { useActor } from '../../hooks/useActor';
import type { Product, ProductId } from '../../backend';
import { toast } from 'sonner';
import { formatSecondsAsMinutesSeconds } from '../../utils/timeFormat';
import MasterDataLoadError from '../MasterDataLoadError';
import { normalizeBackendError } from '../../utils/backendError';

type SortField = 'name' | 'id' | 'loadingTime' | 'unloadingTime' | 'piecesPerCycle';

export default function ProductsManager() {
  const { actor } = useActor();
  const [sortBy, setSortBy] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  
  const { data: products = [], isLoading, isFetched, error, refetch } = useGetAllProducts('name');
  
  const addProduct = useAddProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    loadingTime: '',
    unloadingTime: '',
    piecesPerCycle: '',
    cycleTime: '',
  });

  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const sortedProducts = useMemo(() => {
    let sorted = [...products];
    
    // Client-side sorting for all fields
    sorted.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'id':
          comparison = Number(a.id) - Number(b.id);
          break;
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'loadingTime':
          comparison = Number(a.loadingTime) - Number(b.loadingTime);
          break;
        case 'unloadingTime':
          comparison = Number(a.unloadingTime) - Number(b.unloadingTime);
          break;
        case 'piecesPerCycle':
          comparison = Number(a.piecesPerCycle) - Number(b.piecesPerCycle);
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    
    return sorted;
  }, [products, sortBy, sortOrder]);

  const handleOpenDialog = (product?: Product) => {
    if (!actor) {
      toast.error('Please wait for the system to initialize');
      return;
    }
    
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name,
        loadingTime: Number(product.loadingTime).toString(),
        unloadingTime: Number(product.unloadingTime).toString(),
        piecesPerCycle: Number(product.piecesPerCycle).toString(),
        cycleTime: Number(product.cycleTime).toString(),
      });
    } else {
      setEditingProduct(null);
      setFormData({ name: '', loadingTime: '0', unloadingTime: '0', piecesPerCycle: '1', cycleTime: '0' });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingProduct(null);
    setFormData({ name: '', loadingTime: '0', unloadingTime: '0', piecesPerCycle: '1', cycleTime: '0' });
  };

  const handleSave = async () => {
    if (!actor) {
      toast.error('Please wait for the system to initialize');
      return;
    }

    const trimmedName = formData.name.trim();
    if (!trimmedName) {
      toast.error('Product name is required');
      return;
    }

    const loadingTime = parseInt(formData.loadingTime) || 0;
    const unloadingTime = parseInt(formData.unloadingTime) || 0;
    const piecesPerCycle = parseInt(formData.piecesPerCycle) || 1;
    const cycleTime = parseInt(formData.cycleTime) || 0;

    if (piecesPerCycle < 1) {
      toast.error('Pieces per cycle must be at least 1');
      return;
    }

    try {
      if (editingProduct) {
        await updateProduct.mutateAsync({
          id: editingProduct.id,
          name: trimmedName,
          loadingTime,
          unloadingTime,
          piecesPerCycle,
          cycleTime,
        });
      } else {
        await addProduct.mutateAsync({
          name: trimmedName,
          loadingTime,
          unloadingTime,
          piecesPerCycle,
          cycleTime,
        });
      }
      handleCloseDialog();
    } catch (error) {
      // Error is already handled by mutation hooks with normalized messages
      console.error('Save error:', error);
    }
  };

  const handleDelete = async (id: ProductId) => {
    if (!actor) {
      toast.error('Please wait for the system to initialize');
      return;
    }

    if (confirm('Are you sure you want to delete this product?')) {
      try {
        await deleteProduct.mutateAsync(id);
      } catch (error) {
        console.error('Delete error:', error);
      }
    }
  };

  const isSaving = addProduct.isPending || updateProduct.isPending;
  const showInitialLoading = isLoading && !isFetched;
  const hasError = error && isFetched;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Products</CardTitle>
              <CardDescription>Manage products with loading and unloading times</CardDescription>
            </div>
            <Button onClick={() => handleOpenDialog()} className="gap-2" disabled={isSaving || !actor}>
              <Plus className="h-4 w-4" />
              Add Product
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {showInitialLoading ? (
            <div className="text-center py-12">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mb-3" />
              <p className="text-muted-foreground">Loading products...</p>
            </div>
          ) : hasError ? (
            <MasterDataLoadError 
              title="Failed to load products"
              message={normalizeBackendError(error)}
              onRetry={() => refetch()}
            />
          ) : products.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">No products yet</p>
              <p className="text-sm">Add your first product to get started.</p>
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
                        Name
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
                    <TableHead>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="-ml-3 h-8 data-[state=open]:bg-accent"
                        onClick={() => handleSort('loadingTime')}
                      >
                        Loading Time
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="-ml-3 h-8 data-[state=open]:bg-accent"
                        onClick={() => handleSort('unloadingTime')}
                      >
                        Unloading Time
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="-ml-3 h-8 data-[state=open]:bg-accent"
                        onClick={() => handleSort('piecesPerCycle')}
                      >
                        Pieces per Cycle
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    </TableHead>
                    <TableHead>Cycle Time</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedProducts.map((product) => (
                    <TableRow key={product.id.toString()}>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell className="text-muted-foreground">{product.id.toString()}</TableCell>
                      <TableCell>{formatSecondsAsMinutesSeconds(Number(product.loadingTime))}</TableCell>
                      <TableCell>{formatSecondsAsMinutesSeconds(Number(product.unloadingTime))}</TableCell>
                      <TableCell>{Number(product.piecesPerCycle)}</TableCell>
                      <TableCell>{formatSecondsAsMinutesSeconds(Number(product.cycleTime))}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenDialog(product)}
                            disabled={deleteProduct.isPending || !actor}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(product.id)}
                            disabled={deleteProduct.isPending || !actor}
                          >
                            {deleteProduct.isPending ? (
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
            <DialogTitle>{editingProduct ? 'Edit Product' : 'Add Product'}</DialogTitle>
            <DialogDescription>
              {editingProduct
                ? 'Update the product details below.'
                : 'Enter the product details below.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Product Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter product name"
                disabled={isSaving}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cycleTime">Cycle Time (seconds)</Label>
              <Input
                id="cycleTime"
                type="number"
                min="0"
                value={formData.cycleTime}
                onChange={(e) => setFormData({ ...formData, cycleTime: e.target.value })}
                placeholder="0"
                disabled={isSaving}
              />
              <p className="text-xs text-muted-foreground">
                Standard cycle time in seconds (e.g., 90 for 1m 30s)
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="loadingTime">Loading Time (seconds)</Label>
              <Input
                id="loadingTime"
                type="number"
                min="0"
                value={formData.loadingTime}
                onChange={(e) => setFormData({ ...formData, loadingTime: e.target.value })}
                placeholder="0"
                disabled={isSaving}
              />
              <p className="text-xs text-muted-foreground">
                Enter time in seconds (e.g., 90 for 1m 30s)
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="unloadingTime">Unloading Time (seconds)</Label>
              <Input
                id="unloadingTime"
                type="number"
                min="0"
                value={formData.unloadingTime}
                onChange={(e) => setFormData({ ...formData, unloadingTime: e.target.value })}
                placeholder="0"
                disabled={isSaving}
              />
              <p className="text-xs text-muted-foreground">
                Enter time in seconds (e.g., 90 for 1m 30s)
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="piecesPerCycle">Pieces per Cycle</Label>
              <Input
                id="piecesPerCycle"
                type="number"
                min="1"
                value={formData.piecesPerCycle}
                onChange={(e) => setFormData({ ...formData, piecesPerCycle: e.target.value })}
                placeholder="1"
                disabled={isSaving}
              />
              <p className="text-xs text-muted-foreground">
                Number of pieces produced in each machine cycle
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog} disabled={isSaving}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!formData.name.trim() || isSaving}
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
