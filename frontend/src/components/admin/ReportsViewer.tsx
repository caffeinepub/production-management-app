import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Download, RefreshCw, Filter, Trash2, Eye, Loader2 } from 'lucide-react';
import {
  useGetSortedProductionEntries,
  useGetAllProducts,
  useGetAllMachines,
  useGetAllOperators,
  useDeleteProductionEntry,
} from '../../hooks/useQueries';
import { formatHMS } from '../../utils/timeFormat';
import LoadingPanel from '../LoadingPanel';
import type { ProductionEntry } from '../../backend';

export default function ReportsViewer() {
  const [filterMachine, setFilterMachine] = useState('all');
  const [filterOperator, setFilterOperator] = useState('all');
  const [filterProduct, setFilterProduct] = useState('all');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  const [deleteTargetId, setDeleteTargetId] = useState<bigint | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<ProductionEntry | null>(null);
  const [deleteFromDetail, setDeleteFromDetail] = useState(false);

  const { data: entries = [], isLoading: entriesLoading, refetch } = useGetSortedProductionEntries('timestamp');
  const { data: products = [] } = useGetAllProducts();
  const { data: machines = [] } = useGetAllMachines();
  const { data: operators = [] } = useGetAllOperators();
  const deleteEntry = useDeleteProductionEntry();

  const productMap = useMemo(() => new Map(products.map((p) => [String(p.id), p.name])), [products]);
  const machineMap = useMemo(() => new Map(machines.map((m) => [String(m.id), m.name])), [machines]);
  const operatorMap = useMemo(() => new Map(operators.map((o) => [String(o.id), o.name])), [operators]);

  const filtered = useMemo(() => {
    return entries.filter((entry) => {
      if (filterMachine !== 'all' && String(entry.machineId) !== filterMachine) return false;
      if (filterOperator !== 'all' && String(entry.operatorId) !== filterOperator) return false;
      if (filterProduct !== 'all' && String(entry.productId) !== filterProduct) return false;
      if (filterDateFrom) {
        const entryDate = new Date(Number(entry.timestamp) / 1_000_000);
        if (entryDate < new Date(filterDateFrom)) return false;
      }
      if (filterDateTo) {
        const entryDate = new Date(Number(entry.timestamp) / 1_000_000);
        const toDate = new Date(filterDateTo);
        toDate.setHours(23, 59, 59, 999);
        if (entryDate > toDate) return false;
      }
      return true;
    });
  }, [entries, filterMachine, filterOperator, filterProduct, filterDateFrom, filterDateTo]);

  const totalDutySeconds = useMemo(() => {
    return filtered.reduce((sum, e) => {
      return sum + Number(e.dutyTime.hours) * 3600 + Number(e.dutyTime.minutes) * 60 + Number(e.dutyTime.seconds);
    }, 0);
  }, [filtered]);

  const totalOperatorSeconds = useMemo(() => {
    return filtered.reduce((sum, e) => {
      return sum + Number(e.totalOperatorHours.hours) * 3600 + Number(e.totalOperatorHours.minutes) * 60 + Number(e.totalOperatorHours.seconds);
    }, 0);
  }, [filtered]);

  const totalParts = useMemo(() => {
    return filtered.reduce((sum, e) => sum + Number(e.numberOfPartsProduced), 0);
  }, [filtered]);

  const exportCSV = () => {
    const headers = [
      'Date', 'Machine', 'Operator', 'Product',
      'Cycle Time', 'Qty', 'Parts', 'Downtime', 'Downtime Reason',
      'Punch In', 'Punch Out', 'Duty Time', '10h Target', '12h Target', 'Total Operator Hours'
    ];

    const rows = filtered.map((e) => {
      const date = new Date(Number(e.timestamp) / 1_000_000).toLocaleString();
      const punchIn = new Date(Number(e.punchIn) / 1_000_000).toLocaleString();
      const punchOut = new Date(Number(e.punchOut) / 1_000_000).toLocaleString();
      return [
        date,
        machineMap.get(String(e.machineId)) || String(e.machineId),
        operatorMap.get(String(e.operatorId)) || String(e.operatorId),
        productMap.get(String(e.productId)) || String(e.productId),
        `${e.cycleTime.minutes}m ${e.cycleTime.seconds}s`,
        String(e.quantityProduced),
        String(e.numberOfPartsProduced),
        `${e.downtimeTime.minutes}m ${e.downtimeTime.seconds}s`,
        e.downtimeReason,
        punchIn,
        punchOut,
        formatHMS(Number(e.dutyTime.hours), Number(e.dutyTime.minutes), Number(e.dutyTime.seconds)),
        String(e.tenHourTarget),
        String(e.twelveHourTarget),
        formatHMS(Number(e.totalOperatorHours.hours), Number(e.totalOperatorHours.minutes), Number(e.totalOperatorHours.seconds)),
      ];
    });

    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `production-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDeleteClick = (entryId: bigint, fromDetail = false) => {
    setDeleteTargetId(entryId);
    setDeleteFromDetail(fromDetail);
  };

  const handleConfirmDelete = () => {
    if (deleteTargetId === null) return;
    deleteEntry.mutate(deleteTargetId, {
      onSuccess: () => {
        setDeleteTargetId(null);
        if (deleteFromDetail) {
          setSelectedEntry(null);
        }
      },
      onError: () => {
        setDeleteTargetId(null);
      },
    });
  };

  if (entriesLoading) return <LoadingPanel message="Loading reports..." />;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card className="border-border shadow-sm">
        <CardHeader className="pb-3 bg-primary/5 rounded-t-lg border-b border-border">
          <CardTitle className="text-base text-primary flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-4">
          <div className="space-y-1">
            <Label className="text-xs font-medium">Machine</Label>
            <Select value={filterMachine} onValueChange={setFilterMachine}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Machines</SelectItem>
                {machines.map((m) => (
                  <SelectItem key={String(m.id)} value={String(m.id)}>{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-medium">Operator</Label>
            <Select value={filterOperator} onValueChange={setFilterOperator}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Operators</SelectItem>
                {operators.map((o) => (
                  <SelectItem key={String(o.id)} value={String(o.id)}>{o.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-medium">Product</Label>
            <Select value={filterProduct} onValueChange={setFilterProduct}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Products</SelectItem>
                {products.map((p) => (
                  <SelectItem key={String(p.id)} value={String(p.id)}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-medium">From Date</Label>
            <Input type="date" className="h-8 text-xs" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-medium">To Date</Label>
            <Input type="date" className="h-8 text-xs" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-3 border-border shadow-sm bg-primary/5">
          <p className="text-xs text-muted-foreground">Total Entries</p>
          <p className="text-2xl font-bold text-primary">{filtered.length}</p>
        </Card>
        <Card className="p-3 border-border shadow-sm bg-secondary/50">
          <p className="text-xs text-muted-foreground">Total Parts</p>
          <p className="text-2xl font-bold text-secondary-foreground">{totalParts.toLocaleString()}</p>
        </Card>
        <Card className="p-3 border-border shadow-sm">
          <p className="text-xs text-muted-foreground">Total Duty Time</p>
          <p className="text-lg font-bold text-foreground">{formatHMS(Math.floor(totalDutySeconds / 3600), Math.floor((totalDutySeconds % 3600) / 60), totalDutySeconds % 60)}</p>
        </Card>
        <Card className="p-3 border-border shadow-sm bg-accent/40">
          <p className="text-xs text-muted-foreground">Total Operator Hours</p>
          <p className="text-lg font-bold text-primary">{formatHMS(Math.floor(totalOperatorSeconds / 3600), Math.floor((totalOperatorSeconds % 3600) / 60), totalOperatorSeconds % 60)}</p>
        </Card>
      </div>

      {/* Table */}
      <Card className="border-border shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between bg-primary/5 rounded-t-lg border-b border-border">
          <CardTitle className="text-base text-primary">
            Production Entries
            <Badge variant="secondary" className="ml-2 bg-secondary text-secondary-foreground">{filtered.length}</Badge>
          </CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1 border-border hover:bg-accent hover:text-accent-foreground">
              <RefreshCw className="h-3 w-3" />
              Refresh
            </Button>
            <Button
              size="sm"
              onClick={exportCSV}
              disabled={filtered.length === 0}
              className="gap-1 bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <Download className="h-3 w-3" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          {filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No entries found for the selected filters.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold">Date</TableHead>
                    <TableHead className="font-semibold">Machine</TableHead>
                    <TableHead className="font-semibold">Operator</TableHead>
                    <TableHead className="font-semibold">Product</TableHead>
                    <TableHead className="font-semibold">Qty</TableHead>
                    <TableHead className="font-semibold">Parts</TableHead>
                    <TableHead className="font-semibold">Cycle Time</TableHead>
                    <TableHead className="font-semibold">Duty Time</TableHead>
                    <TableHead className="font-semibold">Downtime</TableHead>
                    <TableHead className="font-semibold">10h Target</TableHead>
                    <TableHead className="font-semibold">12h Target</TableHead>
                    <TableHead className="font-semibold">Operator Hours</TableHead>
                    <TableHead className="font-semibold text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...filtered].reverse().map((entry) => (
                    <TableRow key={String(entry.id)} className="hover:bg-accent/20">
                      <TableCell className="text-xs whitespace-nowrap">
                        {new Date(Number(entry.timestamp) / 1_000_000).toLocaleDateString()}
                      </TableCell>
                      <TableCell>{machineMap.get(String(entry.machineId)) || '—'}</TableCell>
                      <TableCell>{operatorMap.get(String(entry.operatorId)) || '—'}</TableCell>
                      <TableCell>{productMap.get(String(entry.productId)) || '—'}</TableCell>
                      <TableCell>{String(entry.quantityProduced)}</TableCell>
                      <TableCell>{String(entry.numberOfPartsProduced)}</TableCell>
                      <TableCell className="whitespace-nowrap">{String(entry.cycleTime.minutes)}m {String(entry.cycleTime.seconds)}s</TableCell>
                      <TableCell className="whitespace-nowrap">
                        {formatHMS(Number(entry.dutyTime.hours), Number(entry.dutyTime.minutes), Number(entry.dutyTime.seconds))}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {Number(entry.downtimeTime.minutes) > 0 || Number(entry.downtimeTime.seconds) > 0
                          ? `${entry.downtimeTime.minutes}m ${entry.downtimeTime.seconds}s`
                          : '—'}
                      </TableCell>
                      <TableCell className="font-medium text-primary">{String(entry.tenHourTarget)}</TableCell>
                      <TableCell className="font-medium text-secondary-foreground">{String(entry.twelveHourTarget)}</TableCell>
                      <TableCell className="whitespace-nowrap font-bold text-primary">
                        {formatHMS(Number(entry.totalOperatorHours.hours), Number(entry.totalOperatorHours.minutes), Number(entry.totalOperatorHours.seconds))}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-primary"
                            onClick={() => setSelectedEntry(entry)}
                            title="View details"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={() => handleDeleteClick(entry.id)}
                            disabled={deleteEntry.isPending && deleteTargetId === entry.id}
                            title="Delete report"
                          >
                            {deleteEntry.isPending && deleteTargetId === entry.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
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

      {/* Detail View Dialog */}
      <Dialog open={!!selectedEntry} onOpenChange={(open) => { if (!open) setSelectedEntry(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-primary">Report Details</DialogTitle>
          </DialogHeader>
          {selectedEntry && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-muted/40 rounded-lg p-2">
                  <p className="text-xs text-muted-foreground">Date</p>
                  <p className="font-medium">{new Date(Number(selectedEntry.timestamp) / 1_000_000).toLocaleString()}</p>
                </div>
                <div className="bg-muted/40 rounded-lg p-2">
                  <p className="text-xs text-muted-foreground">Machine</p>
                  <p className="font-medium">{machineMap.get(String(selectedEntry.machineId)) || '—'}</p>
                </div>
                <div className="bg-muted/40 rounded-lg p-2">
                  <p className="text-xs text-muted-foreground">Operator</p>
                  <p className="font-medium">{operatorMap.get(String(selectedEntry.operatorId)) || '—'}</p>
                </div>
                <div className="bg-muted/40 rounded-lg p-2">
                  <p className="text-xs text-muted-foreground">Product</p>
                  <p className="font-medium">{productMap.get(String(selectedEntry.productId)) || '—'}</p>
                </div>
                <div className="bg-muted/40 rounded-lg p-2">
                  <p className="text-xs text-muted-foreground">Quantity Produced</p>
                  <p className="font-medium">{String(selectedEntry.quantityProduced)}</p>
                </div>
                <div className="bg-muted/40 rounded-lg p-2">
                  <p className="text-xs text-muted-foreground">Parts Produced</p>
                  <p className="font-medium">{String(selectedEntry.numberOfPartsProduced)}</p>
                </div>
                <div className="bg-muted/40 rounded-lg p-2">
                  <p className="text-xs text-muted-foreground">Cycle Time</p>
                  <p className="font-medium">{String(selectedEntry.cycleTime.minutes)}m {String(selectedEntry.cycleTime.seconds)}s</p>
                </div>
                <div className="bg-muted/40 rounded-lg p-2">
                  <p className="text-xs text-muted-foreground">Duty Time</p>
                  <p className="font-medium">{formatHMS(Number(selectedEntry.dutyTime.hours), Number(selectedEntry.dutyTime.minutes), Number(selectedEntry.dutyTime.seconds))}</p>
                </div>
                <div className="bg-muted/40 rounded-lg p-2">
                  <p className="text-xs text-muted-foreground">Downtime</p>
                  <p className="font-medium">
                    {Number(selectedEntry.downtimeTime.minutes) > 0 || Number(selectedEntry.downtimeTime.seconds) > 0
                      ? `${selectedEntry.downtimeTime.minutes}m ${selectedEntry.downtimeTime.seconds}s`
                      : '—'}
                  </p>
                </div>
                <div className="bg-muted/40 rounded-lg p-2">
                  <p className="text-xs text-muted-foreground">Downtime Reason</p>
                  <p className="font-medium">{selectedEntry.downtimeReason || '—'}</p>
                </div>
                <div className="bg-primary/10 rounded-lg p-2">
                  <p className="text-xs text-muted-foreground">10h Target</p>
                  <p className="font-bold text-primary">{String(selectedEntry.tenHourTarget)}</p>
                </div>
                <div className="bg-primary/10 rounded-lg p-2">
                  <p className="text-xs text-muted-foreground">12h Target</p>
                  <p className="font-bold text-primary">{String(selectedEntry.twelveHourTarget)}</p>
                </div>
              </div>
              <div className="bg-primary/10 rounded-lg p-3">
                <p className="text-xs text-muted-foreground">Total Operator Hours</p>
                <p className="text-xl font-bold text-primary">
                  {formatHMS(Number(selectedEntry.totalOperatorHours.hours), Number(selectedEntry.totalOperatorHours.minutes), Number(selectedEntry.totalOperatorHours.seconds))}
                </p>
              </div>
            </div>
          )}
          <DialogFooter className="flex gap-2 sm:justify-between">
            <Button
              variant="destructive"
              size="sm"
              className="gap-1"
              onClick={() => selectedEntry && handleDeleteClick(selectedEntry.id, true)}
              disabled={deleteEntry.isPending}
            >
              {deleteEntry.isPending && deleteFromDetail ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
              Delete Report
            </Button>
            <DialogClose asChild>
              <Button variant="outline" size="sm">Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteTargetId !== null} onOpenChange={(open) => { if (!open) setDeleteTargetId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Report</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this report? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteEntry.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={deleteEntry.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteEntry.isPending ? (
                <span className="flex items-center gap-1">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Deleting...
                </span>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
