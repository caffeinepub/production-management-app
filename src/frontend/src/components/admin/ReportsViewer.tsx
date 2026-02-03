import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { Download, Loader2, FileText, Share2, FileSpreadsheet, CheckCircle2, Save, FolderOpen, Trash2 } from 'lucide-react';
import {
  useGetAllMachines,
  useGetAllOperators,
  useGetAllProducts,
  useGetAllProductionEntries,
  useGetProductionEntriesByDateRange,
  useGetProductionEntriesByOperator,
  useGetProductionEntriesByProduct,
  useDeleteProductionEntry,
} from '../../hooks/useQueries';
import type { MachineId, OperatorId, ProductId, ProductionEntry, EntryId } from '../../backend';
import { toast } from 'sonner';
import { formatTimeIntervalFromBigInt, convertTimeIntervalToSeconds } from '../../utils/operatorHours';

type ReportType = 'all' | 'daily' | 'monthly' | 'dateRange' | 'machine' | 'operator' | 'product' | 'operatorDateRange' | 'operatorSummary' | 'productSummary';

interface DownloadConfirmation {
  isOpen: boolean;
  fileName: string;
  fileBlob: Blob | null;
  fileType: 'csv' | 'html';
  savedPath?: string;
  saveMethod?: 'file-system-api' | 'download' | 'share' | 'fallback';
}

export default function ReportsViewer() {
  const [reportType, setReportType] = useState<ReportType>('all');
  const [selectedMachine, setSelectedMachine] = useState<string>('');
  const [selectedOperator, setSelectedOperator] = useState<string>('');
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [isExporting, setIsExporting] = useState(false);
  const [deleteEntryId, setDeleteEntryId] = useState<EntryId | null>(null);
  const [downloadConfirmation, setDownloadConfirmation] = useState<DownloadConfirmation>({
    isOpen: false,
    fileName: '',
    fileBlob: null,
    fileType: 'csv',
  });

  const { data: machines = [] } = useGetAllMachines('id');
  const { data: operators = [] } = useGetAllOperators('id');
  const { data: products = [] } = useGetAllProducts('id');
  
  const deleteEntry = useDeleteProductionEntry();

  // Determine which query to enable based on report type
  const startDateObj = startDate ? new Date(startDate) : null;
  const endDateObj = endDate ? new Date(endDate + 'T23:59:59') : null;
  
  // Compute enablement flags for each query type
  const enableAllEntries = reportType === 'all' || reportType === 'daily' || reportType === 'monthly' || (reportType === 'machine' && !!selectedMachine);
  const enableDateRange = (reportType === 'dateRange' || reportType === 'operatorDateRange' || reportType === 'operatorSummary' || reportType === 'productSummary') && !!startDateObj && !!endDateObj;
  const enableOperator = reportType === 'operator' && !!selectedOperator;
  const enableProduct = reportType === 'product' && !!selectedProduct;
  
  const { data: allEntries = [], isLoading: allLoading } = useGetAllProductionEntries({ enabled: enableAllEntries });
  const { data: dateRangeEntries = [], isLoading: dateRangeLoading } = useGetProductionEntriesByDateRange(
    startDateObj,
    endDateObj,
    { enabled: enableDateRange }
  );
  const { data: operatorEntries = [], isLoading: operatorLoading } = useGetProductionEntriesByOperator(
    selectedOperator ? (BigInt(selectedOperator) as OperatorId) : null,
    { enabled: enableOperator }
  );
  const { data: productEntries = [], isLoading: productLoading } = useGetProductionEntriesByProduct(
    selectedProduct ? (BigInt(selectedProduct) as ProductId) : null,
    { enabled: enableProduct }
  );

  const getMachineName = (id: MachineId) => {
    return machines.find((m) => m.id.toString() === id.toString())?.name || 'Unknown';
  };

  const getOperatorName = (id: OperatorId) => {
    return operators.find((o) => o.id.toString() === id.toString())?.name || 'Unknown';
  };

  const getProductName = (id: bigint) => {
    return products.find((p) => p.id.toString() === id.toString())?.name || 'Unknown';
  };

  const formatTimestamp = (timestamp: bigint) => {
    const ms = Number(timestamp) / 1_000_000;
    return new Date(ms).toLocaleString();
  };

  const formatTimeOnly = (timestamp: bigint) => {
    const ms = Number(timestamp) / 1_000_000;
    return new Date(ms).toLocaleTimeString();
  };

  // Filter and process entries based on report type
  const filteredEntries = useMemo(() => {
    let entries: ProductionEntry[] = [];

    switch (reportType) {
      case 'all':
        entries = allEntries;
        break;
      case 'daily':
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        entries = allEntries.filter(e => {
          const entryDate = new Date(Number(e.timestamp) / 1_000_000);
          return entryDate >= today && entryDate < tomorrow;
        });
        break;
      case 'monthly':
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        entries = allEntries.filter(e => {
          const entryDate = new Date(Number(e.timestamp) / 1_000_000);
          return entryDate >= firstDay && entryDate <= lastDay;
        });
        break;
      case 'dateRange':
        entries = dateRangeEntries;
        break;
      case 'machine':
        if (selectedMachine) {
          entries = allEntries.filter(e => e.machineId.toString() === selectedMachine);
        }
        break;
      case 'operator':
        entries = operatorEntries;
        break;
      case 'product':
        entries = productEntries;
        break;
      case 'operatorDateRange':
        if (selectedOperator && startDateObj && endDateObj) {
          entries = dateRangeEntries.filter(e => e.operatorId.toString() === selectedOperator);
        }
        break;
      case 'operatorSummary':
      case 'productSummary':
        entries = dateRangeEntries;
        break;
    }

    return entries.sort((a, b) => Number(b.timestamp - a.timestamp));
  }, [reportType, allEntries, dateRangeEntries, operatorEntries, productEntries, selectedMachine, selectedOperator, startDateObj, endDateObj]);

  // Calculate summary statistics using stored totalOperatorHours from backend
  const summary = useMemo(() => {
    const totalQuantity = filteredEntries.reduce((sum, e) => sum + Number(e.quantityProduced), 0);
    const totalParts = filteredEntries.reduce((sum, e) => sum + Number(e.numberOfPartsProduced), 0);
    const totalTenHourTarget = filteredEntries.reduce((sum, e) => sum + Number(e.tenHourTarget), 0);
    const totalTwelveHourTarget = filteredEntries.reduce((sum, e) => sum + Number(e.twelveHourTarget), 0);
    
    const totalRunTimeSeconds = filteredEntries.reduce((sum, e) => {
      return sum + convertTimeIntervalToSeconds(e.totalRunTime);
    }, 0);
    
    // Use stored totalOperatorHours from backend (single source of truth)
    const totalOperatorHoursSeconds = filteredEntries.reduce((sum, e) => {
      return sum + convertTimeIntervalToSeconds(e.totalOperatorHours);
    }, 0);
    
    return {
      totalEntries: filteredEntries.length,
      totalQuantity,
      totalParts,
      totalTenHourTarget,
      totalTwelveHourTarget,
      totalRunTimeSeconds,
      totalOperatorHoursSeconds,
    };
  }, [filteredEntries]);

  // Operator summary using stored totalOperatorHours
  const operatorSummary = useMemo(() => {
    if (reportType !== 'operatorSummary') return [];
    
    const summaryMap = new Map<string, { 
      operatorId: OperatorId; 
      operatorName: string; 
      totalOperatorHours: number; 
      totalDutyTime: number;
      entries: number;
    }>();
    
    filteredEntries.forEach(entry => {
      const opId = entry.operatorId.toString();
      const existing = summaryMap.get(opId);
      
      // Use stored totalOperatorHours from backend
      const operatorHoursSeconds = convertTimeIntervalToSeconds(entry.totalOperatorHours);
      const dutyTimeSeconds = convertTimeIntervalToSeconds(entry.dutyTime);
      
      if (existing) {
        existing.totalOperatorHours += operatorHoursSeconds;
        existing.totalDutyTime += dutyTimeSeconds;
        existing.entries += 1;
      } else {
        summaryMap.set(opId, {
          operatorId: entry.operatorId,
          operatorName: getOperatorName(entry.operatorId),
          totalOperatorHours: operatorHoursSeconds,
          totalDutyTime: dutyTimeSeconds,
          entries: 1,
        });
      }
    });
    
    return Array.from(summaryMap.values());
  }, [reportType, filteredEntries]);

  // Product summary
  const productSummary = useMemo(() => {
    if (reportType !== 'productSummary') return [];
    
    const summaryMap = new Map<string, { 
      productId: ProductId; 
      productName: string; 
      totalQuantity: number; 
      totalParts: number;
      entries: number;
    }>();
    
    filteredEntries.forEach(entry => {
      const prodId = entry.productId.toString();
      const existing = summaryMap.get(prodId);
      
      if (existing) {
        existing.totalQuantity += Number(entry.quantityProduced);
        existing.totalParts += Number(entry.numberOfPartsProduced);
        existing.entries += 1;
      } else {
        summaryMap.set(prodId, {
          productId: entry.productId,
          productName: getProductName(entry.productId),
          totalQuantity: Number(entry.quantityProduced),
          totalParts: Number(entry.numberOfPartsProduced),
          entries: 1,
        });
      }
    });
    
    return Array.from(summaryMap.values());
  }, [reportType, filteredEntries]);

  const formatSecondsToTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    const parts: string[] = [];
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (seconds > 0) parts.push(`${seconds}s`);
    return parts.length > 0 ? parts.join(' ') : '0s';
  };

  const generateCSVContent = () => {
    const csvRows: string[][] = [];
    
    // Header
    csvRows.push(['Production Report']);
    csvRows.push(['Report Type', getReportTypeLabel()]);
    csvRows.push(['Generated', new Date().toLocaleString()]);
    csvRows.push([]);
    
    if (reportType === 'operatorSummary') {
      csvRows.push(['Operator Summary']);
      csvRows.push(['Operator', 'Total Operator Hours', 'Total Duty Time', 'Entries']);
      operatorSummary.forEach(op => {
        csvRows.push([
          op.operatorName,
          formatSecondsToTime(op.totalOperatorHours),
          formatSecondsToTime(op.totalDutyTime),
          op.entries.toString(),
        ]);
      });
    } else if (reportType === 'productSummary') {
      csvRows.push(['Product Summary']);
      csvRows.push(['Product', 'Total Quantity', 'Total Parts', 'Entries']);
      productSummary.forEach(prod => {
        csvRows.push([
          prod.productName,
          prod.totalQuantity.toString(),
          prod.totalParts.toString(),
          prod.entries.toString(),
        ]);
      });
    } else {
      csvRows.push(['Date/Time', 'Machine', 'Operator', 'Product', 'Cycle Time', 'Quantity', 'Parts', '10h Target', '12h Target', 'Punch In', 'Punch Out', 'Duty Time', 'Downtime Reason', 'Downtime', 'Total Run Time', 'Total Operator Hours']);
      
      filteredEntries.forEach(entry => {
        csvRows.push([
          formatTimestamp(entry.timestamp),
          getMachineName(entry.machineId),
          getOperatorName(entry.operatorId),
          getProductName(entry.productId),
          `${entry.cycleTime.minutes}m ${entry.cycleTime.seconds}s`,
          entry.quantityProduced.toString(),
          entry.numberOfPartsProduced.toString(),
          entry.tenHourTarget.toString(),
          entry.twelveHourTarget.toString(),
          formatTimeOnly(entry.punchIn),
          formatTimeOnly(entry.punchOut),
          formatTimeIntervalFromBigInt(entry.dutyTime.hours, entry.dutyTime.minutes, entry.dutyTime.seconds),
          entry.downtimeReason || 'None',
          `${entry.downtimeTime.minutes}m ${entry.downtimeTime.seconds}s`,
          formatTimeIntervalFromBigInt(entry.totalRunTime.hours, entry.totalRunTime.minutes, entry.totalRunTime.seconds),
          formatTimeIntervalFromBigInt(entry.totalOperatorHours.hours, entry.totalOperatorHours.minutes, entry.totalOperatorHours.seconds),
        ]);
      });
    }
    
    csvRows.push([]);
    csvRows.push(['Summary Statistics']);
    csvRows.push(['Total Entries', summary.totalEntries.toString()]);
    csvRows.push(['Total Quantity Produced', summary.totalQuantity.toString()]);
    csvRows.push(['Total Parts Produced', summary.totalParts.toString()]);
    csvRows.push(['Total 10-Hour Target', summary.totalTenHourTarget.toString()]);
    csvRows.push(['Total 12-Hour Target', summary.totalTwelveHourTarget.toString()]);
    csvRows.push(['Total Run Time', formatSecondsToTime(summary.totalRunTimeSeconds)]);
    csvRows.push(['Total Operator Hours', formatSecondsToTime(summary.totalOperatorHoursSeconds)]);

    return csvRows.map((row) => row.map(cell => {
      const cellStr = String(cell);
      if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
        return `"${cellStr.replace(/"/g, '""')}"`;
      }
      return cellStr;
    }).join(',')).join('\n');
  };

  const getReportTypeLabel = () => {
    switch (reportType) {
      case 'all': return 'All Entries';
      case 'daily': return 'Daily Report';
      case 'monthly': return 'Monthly Report';
      case 'dateRange': return `Date Range: ${startDate} to ${endDate}`;
      case 'machine': return `Machine: ${getMachineName(BigInt(selectedMachine) as MachineId)}`;
      case 'operator': return `Operator: ${getOperatorName(BigInt(selectedOperator) as OperatorId)}`;
      case 'product': return `Product: ${getProductName(BigInt(selectedProduct))}`;
      case 'operatorDateRange': return `Operator & Date Range: ${getOperatorName(BigInt(selectedOperator) as OperatorId)} (${startDate} to ${endDate})`;
      case 'operatorSummary': return 'Operator Summary by Date Range';
      case 'productSummary': return 'Product Summary by Date Range';
      default: return 'Report';
    }
  };

  const generateHTMLReport = () => {
    const reportInfo = getReportTypeLabel();

    let tableContent = '';
    
    if (reportType === 'operatorSummary') {
      tableContent = `
        <h2>Operator Summary</h2>
        <table>
          <thead>
            <tr>
              <th>Operator</th>
              <th>Total Operator Hours</th>
              <th>Total Duty Time</th>
              <th>Entries</th>
            </tr>
          </thead>
          <tbody>
            ${operatorSummary.map(op => `
              <tr>
                <td>${op.operatorName}</td>
                <td>${formatSecondsToTime(op.totalOperatorHours)}</td>
                <td>${formatSecondsToTime(op.totalDutyTime)}</td>
                <td>${op.entries}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    } else if (reportType === 'productSummary') {
      tableContent = `
        <h2>Product Summary</h2>
        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th>Total Quantity</th>
              <th>Total Parts</th>
              <th>Entries</th>
            </tr>
          </thead>
          <tbody>
            ${productSummary.map(prod => `
              <tr>
                <td>${prod.productName}</td>
                <td>${prod.totalQuantity}</td>
                <td>${prod.totalParts}</td>
                <td>${prod.entries}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    } else {
      tableContent = `
        <table>
          <thead>
            <tr>
              <th>Date/Time</th>
              <th>Machine</th>
              <th>Operator</th>
              <th>Product</th>
              <th>Cycle</th>
              <th>Qty</th>
              <th>Parts</th>
              <th>10h Target</th>
              <th>12h Target</th>
              <th>Punch In</th>
              <th>Punch Out</th>
              <th>Duty Time</th>
              <th>Downtime</th>
              <th>Runtime</th>
              <th>Operator Hrs</th>
            </tr>
          </thead>
          <tbody>
            ${filteredEntries.length === 0 ? `
              <tr>
                <td colspan="15" style="text-align: center; padding: 20px;">No production entries found</td>
              </tr>
            ` : filteredEntries.map(entry => `
              <tr>
                <td>${formatTimestamp(entry.timestamp)}</td>
                <td>${getMachineName(entry.machineId)}</td>
                <td>${getOperatorName(entry.operatorId)}</td>
                <td>${getProductName(entry.productId)}</td>
                <td>${entry.cycleTime.minutes}m ${entry.cycleTime.seconds}s</td>
                <td>${entry.quantityProduced}</td>
                <td>${entry.numberOfPartsProduced}</td>
                <td>${entry.tenHourTarget}</td>
                <td>${entry.twelveHourTarget}</td>
                <td>${formatTimeOnly(entry.punchIn)}</td>
                <td>${formatTimeOnly(entry.punchOut)}</td>
                <td>${formatTimeIntervalFromBigInt(entry.dutyTime.hours, entry.dutyTime.minutes, entry.dutyTime.seconds)}</td>
                <td>${entry.downtimeReason || 'None'} (${entry.downtimeTime.minutes}m ${entry.downtimeTime.seconds}s)</td>
                <td>${formatTimeIntervalFromBigInt(entry.totalRunTime.hours, entry.totalRunTime.minutes, entry.totalRunTime.seconds)}</td>
                <td>${formatTimeIntervalFromBigInt(entry.totalOperatorHours.hours, entry.totalOperatorHours.minutes, entry.totalOperatorHours.seconds)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    }

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Production Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    h1 { color: #9333ea; }
    h2 { color: #9333ea; margin-top: 30px; }
    .info { margin-bottom: 20px; color: #666; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 11px; }
    th { background-color: #9333ea; color: white; }
    tr:nth-child(even) { background-color: #f9f9f9; }
    .summary { margin-top: 30px; }
    .summary h2 { color: #9333ea; }
    .summary-item { margin: 10px 0; }
    @media print {
      body { margin: 10px; }
      table { font-size: 9px; }
    }
  </style>
</head>
<body>
  <h1>Production Report</h1>
  <div class="info">
    <p><strong>Report Type:</strong> ${reportInfo}</p>
    <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
  </div>
  
  ${tableContent}
  
  <div class="summary">
    <h2>Summary Statistics</h2>
    <div class="summary-item"><strong>Total Entries:</strong> ${summary.totalEntries}</div>
    <div class="summary-item"><strong>Total Quantity Produced:</strong> ${summary.totalQuantity}</div>
    <div class="summary-item"><strong>Total Parts Produced:</strong> ${summary.totalParts}</div>
    <div class="summary-item"><strong>Total 10-Hour Target:</strong> ${summary.totalTenHourTarget}</div>
    <div class="summary-item"><strong>Total 12-Hour Target:</strong> ${summary.totalTwelveHourTarget}</div>
    <div class="summary-item"><strong>Total Run Time:</strong> ${formatSecondsToTime(summary.totalRunTimeSeconds)}</div>
    <div class="summary-item"><strong>Total Operator Hours:</strong> ${formatSecondsToTime(summary.totalOperatorHoursSeconds)}</div>
  </div>
</body>
</html>
    `;
    return html;
  };

  const handleSaveFile = async () => {
    if (!downloadConfirmation.fileBlob) return;

    try {
      const blob = downloadConfirmation.fileBlob;
      const fileName = downloadConfirmation.fileName;
      const mimeType = downloadConfirmation.fileType === 'csv' ? 'text/csv' : 'text/html';
      let savedPath = '';
      let saveMethod: DownloadConfirmation['saveMethod'] = 'fallback';

      if ('showSaveFilePicker' in window) {
        try {
          const fileExtension = fileName.split('.').pop() || '';
          
          const handle = await (window as any).showSaveFilePicker({
            suggestedName: fileName,
            types: [
              {
                description: fileExtension === 'csv' ? 'CSV Files' : 'HTML Files',
                accept: {
                  [mimeType]: [`.${fileExtension}`],
                },
              },
            ],
          });
          
          const writable = await handle.createWritable();
          await writable.write(blob);
          await writable.close();
          
          savedPath = handle.name || fileName;
          saveMethod = 'file-system-api';
          
          setDownloadConfirmation(prev => ({
            ...prev,
            savedPath,
            saveMethod,
          }));
          
          toast.success('File saved successfully to your chosen location!');
          return;
        } catch (error: any) {
          if (error.name === 'AbortError') {
            return;
          }
          console.log('File System Access API failed, trying fallback:', error);
        }
      }

      try {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        
        setTimeout(() => {
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }, 100);

        savedPath = `Downloads/${fileName}`;
        saveMethod = 'download';
        
        setDownloadConfirmation(prev => ({
          ...prev,
          savedPath,
          saveMethod,
        }));

        toast.success('File downloaded to your device!');
        return;
      } catch (error) {
        console.error('Download method failed, trying share fallback:', error);
      }

      if (navigator.share && navigator.canShare) {
        try {
          const file = new File([blob], fileName, { type: mimeType });
          const shareData = { 
            files: [file], 
            title: 'Production Report',
            text: downloadConfirmation.fileType === 'csv' 
              ? 'CSV Production Report' 
              : 'HTML Production Report (Print to PDF)'
          };
          
          if (navigator.canShare(shareData)) {
            await navigator.share(shareData);
            
            savedPath = 'Shared via system';
            saveMethod = 'share';
            
            setDownloadConfirmation(prev => ({
              ...prev,
              savedPath,
              saveMethod,
            }));
            
            toast.success('Report shared successfully!');
            return;
          }
        } catch (error: any) {
          if (error.name !== 'AbortError') {
            console.error('Share fallback failed:', error);
          }
        }
      }

      toast.error('Unable to save file automatically. Please use the Share button instead.');
      
    } catch (error) {
      console.error('Error saving file:', error);
      toast.error('Failed to save file. Please try the Share button.');
    }
  };

  const handleShareFile = async () => {
    if (!downloadConfirmation.fileBlob) return;

    try {
      const blob = downloadConfirmation.fileBlob;
      const fileName = downloadConfirmation.fileName;
      const mimeType = downloadConfirmation.fileType === 'csv' ? 'text/csv' : 'text/html';

      if (navigator.share && navigator.canShare) {
        const file = new File([blob], fileName, { type: mimeType });
        const shareData = { 
          files: [file], 
          title: 'Production Report',
          text: downloadConfirmation.fileType === 'csv' 
            ? 'CSV Production Report' 
            : 'HTML Production Report (Print to PDF)'
        };
        
        if (navigator.canShare(shareData)) {
          await navigator.share(shareData);
          toast.success('Report shared successfully!');
          return;
        }
      }

      toast.info('Share not supported on this device. Downloading file instead...');
      await handleSaveFile();
    } catch (error: any) {
      if (error.name === 'AbortError') {
        return;
      }
      console.error('Error sharing file:', error);
      toast.error('Failed to share file. Try saving instead.');
    }
  };

  const handleViewFile = () => {
    if (!downloadConfirmation.fileBlob) return;

    try {
      const blob = downloadConfirmation.fileBlob;
      const url = URL.createObjectURL(blob);
      
      const newWindow = window.open(url, '_blank');
      
      if (newWindow) {
        toast.success('File opened in new tab');
        setTimeout(() => {
          URL.revokeObjectURL(url);
        }, 60000);
      } else {
        toast.error('Please allow pop-ups to view the file');
      }
    } catch (error) {
      console.error('Error viewing file:', error);
      toast.error('Failed to open file');
    }
  };

  const handleCloseConfirmation = () => {
    setDownloadConfirmation({
      isOpen: false,
      fileName: '',
      fileBlob: null,
      fileType: 'csv',
    });
  };

  const handleExportCSV = async () => {
    try {
      setIsExporting(true);
      const csvContent = generateCSVContent();
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const fileName = `production-report-${new Date().toISOString().split('T')[0]}.csv`;

      setDownloadConfirmation({
        isOpen: true,
        fileName,
        fileBlob: blob,
        fileType: 'csv',
      });
      
      toast.success('CSV report ready!');
    } catch (error: any) {
      console.error('Export error:', error);
      toast.error('Failed to export CSV report');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPDF = async () => {
    try {
      setIsExporting(true);
      const htmlContent = generateHTMLReport();
      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
      const fileName = `production-report-${new Date().toISOString().split('T')[0]}.html`;

      setDownloadConfirmation({
        isOpen: true,
        fileName,
        fileBlob: blob,
        fileType: 'html',
      });
      
      toast.success('HTML report ready! Open it and use Print to PDF.');
    } catch (error: any) {
      console.error('Export error:', error);
      toast.error('Failed to export report');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteEntry = async () => {
    if (!deleteEntryId) return;
    
    try {
      await deleteEntry.mutateAsync(deleteEntryId);
      setDeleteEntryId(null);
    } catch (error) {
      console.error('Delete error:', error);
    }
  };

  const isShareSupported = typeof navigator !== 'undefined' && 'share' in navigator;
  
  // Aggregate loading state based on which queries are enabled
  const isLoading = (enableAllEntries && allLoading) || 
                    (enableDateRange && dateRangeLoading) || 
                    (enableOperator && operatorLoading) || 
                    (enableProduct && productLoading);

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Production Reports</CardTitle>
              <CardDescription>View and export production data</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={handleExportCSV} 
                disabled={isExporting || filteredEntries.length === 0} 
                variant="outline"
                className="gap-2"
              >
                {isExporting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileSpreadsheet className="h-4 w-4" />
                )}
                Export CSV
              </Button>
              <Button 
                onClick={handleExportPDF} 
                disabled={isExporting || filteredEntries.length === 0}
                className="gap-2"
              >
                {isExporting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                Export HTML
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Report Type Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="reportType">Report Type</Label>
              <Select value={reportType} onValueChange={(value) => setReportType(value as ReportType)}>
                <SelectTrigger id="reportType">
                  <SelectValue placeholder="Select report type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Entries</SelectItem>
                  <SelectItem value="daily">Daily Report</SelectItem>
                  <SelectItem value="monthly">Monthly Report</SelectItem>
                  <SelectItem value="dateRange">Report by Date Range</SelectItem>
                  <SelectItem value="machine">Report by Machine</SelectItem>
                  <SelectItem value="operator">Report by Operator</SelectItem>
                  <SelectItem value="product">Report by Product</SelectItem>
                  <SelectItem value="operatorDateRange">Report by Operator & Date Range</SelectItem>
                  <SelectItem value="operatorSummary">Operator Summary by Date Range</SelectItem>
                  <SelectItem value="productSummary">Product Summary by Date Range</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Conditional filters based on report type */}
            {(reportType === 'dateRange' || reportType === 'operatorDateRange' || reportType === 'operatorSummary' || reportType === 'productSummary') && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">End Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </>
            )}

            {reportType === 'machine' && (
              <div className="space-y-2">
                <Label htmlFor="machine">Machine</Label>
                <Select value={selectedMachine} onValueChange={setSelectedMachine}>
                  <SelectTrigger id="machine">
                    <SelectValue placeholder="Select a machine" />
                  </SelectTrigger>
                  <SelectContent>
                    {machines.map((machine) => (
                      <SelectItem key={machine.id.toString()} value={machine.id.toString()}>
                        {machine.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {(reportType === 'operator' || reportType === 'operatorDateRange') && (
              <div className="space-y-2">
                <Label htmlFor="operator">Operator</Label>
                <Select value={selectedOperator} onValueChange={setSelectedOperator}>
                  <SelectTrigger id="operator">
                    <SelectValue placeholder="Select an operator" />
                  </SelectTrigger>
                  <SelectContent>
                    {operators.map((operator) => (
                      <SelectItem key={operator.id.toString()} value={operator.id.toString()}>
                        {operator.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {reportType === 'product' && (
              <div className="space-y-2">
                <Label htmlFor="product">Product</Label>
                <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                  <SelectTrigger id="product">
                    <SelectValue placeholder="Select a product" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((product) => (
                      <SelectItem key={product.id.toString()} value={product.id.toString()}>
                        {product.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Summary Statistics */}
          {filteredEntries.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">Total Entries</p>
                <p className="text-2xl font-bold">{summary.totalEntries}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Quantity</p>
                <p className="text-2xl font-bold">{summary.totalQuantity}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Parts</p>
                <p className="text-2xl font-bold">{summary.totalParts}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Operator Hours</p>
                <p className="text-2xl font-bold">{formatSecondsToTime(Math.floor(summary.totalOperatorHoursSeconds))}</p>
              </div>
            </div>
          )}

          {/* Report Content */}
          {isLoading ? (
            <div className="text-center py-12">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mb-3" />
              <p className="text-muted-foreground">Loading report data...</p>
            </div>
          ) : reportType === 'operatorSummary' ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Operator</TableHead>
                    <TableHead>Total Operator Hours</TableHead>
                    <TableHead>Total Duty Time</TableHead>
                    <TableHead>Entries</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {operatorSummary.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                        No data available for the selected date range
                      </TableCell>
                    </TableRow>
                  ) : (
                    operatorSummary.map((op) => (
                      <TableRow key={op.operatorId.toString()}>
                        <TableCell className="font-medium">{op.operatorName}</TableCell>
                        <TableCell>{formatSecondsToTime(op.totalOperatorHours)}</TableCell>
                        <TableCell>{formatSecondsToTime(op.totalDutyTime)}</TableCell>
                        <TableCell>{op.entries}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          ) : reportType === 'productSummary' ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Total Quantity</TableHead>
                    <TableHead>Total Parts</TableHead>
                    <TableHead>Entries</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {productSummary.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                        No data available for the selected date range
                      </TableCell>
                    </TableRow>
                  ) : (
                    productSummary.map((prod) => (
                      <TableRow key={prod.productId.toString()}>
                        <TableCell className="font-medium">{prod.productName}</TableCell>
                        <TableCell>{prod.totalQuantity}</TableCell>
                        <TableCell>{prod.totalParts}</TableCell>
                        <TableCell>{prod.entries}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">No production entries found</p>
              <p className="text-sm">
                {reportType === 'all' 
                  ? 'Start by adding entries in the Data Entry tab.'
                  : 'Try adjusting your filter criteria.'}
              </p>
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date/Time</TableHead>
                    <TableHead>Machine</TableHead>
                    <TableHead>Operator</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Parts</TableHead>
                    <TableHead>10h Target</TableHead>
                    <TableHead>12h Target</TableHead>
                    <TableHead>Duty Time</TableHead>
                    <TableHead>Runtime</TableHead>
                    <TableHead>Op Hours</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEntries.map((entry) => (
                    <TableRow key={entry.id.toString()}>
                      <TableCell className="whitespace-nowrap">{formatTimestamp(entry.timestamp)}</TableCell>
                      <TableCell>{getMachineName(entry.machineId)}</TableCell>
                      <TableCell>{getOperatorName(entry.operatorId)}</TableCell>
                      <TableCell>{getProductName(entry.productId)}</TableCell>
                      <TableCell>{entry.quantityProduced.toString()}</TableCell>
                      <TableCell>{entry.numberOfPartsProduced.toString()}</TableCell>
                      <TableCell>{entry.tenHourTarget.toString()}</TableCell>
                      <TableCell>{entry.twelveHourTarget.toString()}</TableCell>
                      <TableCell>{formatTimeIntervalFromBigInt(entry.dutyTime.hours, entry.dutyTime.minutes, entry.dutyTime.seconds)}</TableCell>
                      <TableCell>{formatTimeIntervalFromBigInt(entry.totalRunTime.hours, entry.totalRunTime.minutes, entry.totalRunTime.seconds)}</TableCell>
                      <TableCell>{formatTimeIntervalFromBigInt(entry.totalOperatorHours.hours, entry.totalOperatorHours.minutes, entry.totalOperatorHours.seconds)}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteEntryId(entry.id)}
                          disabled={deleteEntry.isPending}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteEntryId} onOpenChange={(open) => !open && setDeleteEntryId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Production Entry</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this production entry? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteEntry.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteEntry}
              disabled={deleteEntry.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteEntry.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Download Confirmation Dialog */}
      <Dialog open={downloadConfirmation.isOpen} onOpenChange={(open) => {
        if (!open) handleCloseConfirmation();
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <DialogTitle>Report ready</DialogTitle>
                <DialogDescription className="mt-1">
                  Choose to save, share, or view your production report
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="rounded-lg bg-muted p-4">
              <div className="flex items-start gap-3">
                {downloadConfirmation.fileType === 'csv' ? (
                  <FileSpreadsheet className="h-5 w-5 text-muted-foreground mt-0.5" />
                ) : (
                  <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium break-all">
                    {downloadConfirmation.fileName}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {downloadConfirmation.fileType === 'csv' ? 'CSV Report' : 'HTML Report (Print to PDF)'}
                  </p>
                  {downloadConfirmation.savedPath && (
                    <p className="text-xs text-green-600 dark:text-green-400 mt-2 font-medium">
                      ✓ Saved to: {downloadConfirmation.savedPath}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="text-xs text-muted-foreground bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg space-y-1">
              <p>💾 <strong>Save:</strong> Download the file to your device storage (Downloads folder)</p>
              {isShareSupported && (
                <p>📤 <strong>Share:</strong> Send via WhatsApp, Gmail, Drive, or other apps</p>
              )}
              <p>👁️ <strong>View File:</strong> Open the report in a new tab to preview or print</p>
              {downloadConfirmation.fileType === 'html' && (
                <p>🖨️ <strong>Tip:</strong> Use your browser's Print to PDF feature to create a PDF</p>
              )}
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={handleCloseConfirmation}
              className="w-full sm:w-auto"
            >
              Close
            </Button>
            <Button
              variant="outline"
              onClick={handleViewFile}
              className="w-full sm:w-auto gap-2"
            >
              <FolderOpen className="h-4 w-4" />
              View File
            </Button>
            <Button
              variant="outline"
              onClick={handleSaveFile}
              className="w-full sm:w-auto gap-2"
            >
              <Save className="h-4 w-4" />
              Save
            </Button>
            {isShareSupported && (
              <Button
                onClick={handleShareFile}
                className="w-full sm:w-auto gap-2"
              >
                <Share2 className="h-4 w-4" />
                Share
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
