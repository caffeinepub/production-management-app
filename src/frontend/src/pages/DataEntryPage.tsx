import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar, Clock, Save, Package, Loader2, AlertCircle, UserCheck } from 'lucide-react';
import {
  useGetAllMachines,
  useGetAllOperators,
  useGetAllProducts,
  useAddProductionEntry,
} from '../hooks/useQueries';
import type { MachineId, OperatorId, ProductId } from '../backend';
import { 
  calculateTotalOperatorHours, 
  formatTimeInterval, 
  calculateAdjustedDutyTimeSeconds,
  convertSecondsToTimeInterval 
} from '../utils/operatorHours';
import { formatSecondsAsMinutesSeconds } from '../utils/timeFormat';
import MasterDataLoadError from '../components/MasterDataLoadError';
import { normalizeBackendError } from '../utils/backendError';
import { useActor } from '../hooks/useActor';
import { toast } from 'sonner';

export default function DataEntryPage() {
  const { actor, isFetching: actorFetching } = useActor();
  const { data: machines = [], isLoading: machinesLoading, isFetched: machinesFetched, error: machinesError, refetch: refetchMachines } = useGetAllMachines('id');
  const { data: operators = [], isLoading: operatorsLoading, isFetched: operatorsFetched, error: operatorsError, refetch: refetchOperators } = useGetAllOperators('id');
  const { data: products = [], isLoading: productsLoading, isFetched: productsFetched, error: productsError, refetch: refetchProducts } = useGetAllProducts('id');
  const addEntry = useAddProductionEntry();

  const [entryDateTime, setEntryDateTime] = useState<string>('');
  const [selectedMachine, setSelectedMachine] = useState<string>('');
  const [selectedOperator, setSelectedOperator] = useState<string>('');
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [minutes, setMinutes] = useState<string>('0');
  const [seconds, setSeconds] = useState<string>('0');
  const [quantityProduced, setQuantityProduced] = useState<string>('1');
  const [downtimeReason, setDowntimeReason] = useState<string>('');
  const [downtimeMinutes, setDowntimeMinutes] = useState<string>('0');
  const [downtimeSeconds, setDowntimeSeconds] = useState<string>('0');
  const [punchInTime, setPunchInTime] = useState<string>('');
  const [punchOutTime, setPunchOutTime] = useState<string>('');

  // Auto-fill with current date/time on component mount
  useEffect(() => {
    const now = new Date();
    // Format as datetime-local input value (YYYY-MM-DDTHH:mm)
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const mins = String(now.getMinutes()).padStart(2, '0');
    setEntryDateTime(`${year}-${month}-${day}T${hours}:${mins}`);
  }, []);

  const selectedProductData = products.find((p) => p.id.toString() === selectedProduct);

  // Calculate number of parts produced in real-time
  const numberOfPartsProduced = selectedProductData 
    ? Number(selectedProductData.piecesPerCycle) * (parseInt(quantityProduced) || 0)
    : 0;

  // Calculate form cycle time in seconds
  const formCycleTimeSeconds = (parseInt(minutes) || 0) * 60 + (parseInt(seconds) || 0);

  // Calculate 10 Hour Target using formula: 34200 / (cycle time + loading + unloading) × 0.95
  const tenHourTarget = selectedProductData && formCycleTimeSeconds > 0
    ? Math.round((34200 / (formCycleTimeSeconds + Number(selectedProductData.loadingTime) + Number(selectedProductData.unloadingTime))) * 0.95)
    : 0;

  // Calculate 12 Hour Target using formula: 39600 / (cycle time + loading + unloading) × 0.95
  const twelveHourTarget = selectedProductData && formCycleTimeSeconds > 0
    ? Math.round((39600 / (formCycleTimeSeconds + Number(selectedProductData.loadingTime) + Number(selectedProductData.unloadingTime))) * 0.95)
    : 0;

  // Calculate cycle time for 10-hour target using formula: (10 ÷ 10 Hour Target) × 60
  // Result is in minutes, then converted to seconds for display
  const cycleTimeForTenHourTarget = tenHourTarget > 0
    ? ((10 / tenHourTarget) * 60) * 60  // hours to minutes (* 60), then minutes to seconds (* 60)
    : 0;

  // Calculate cycle time for 12-hour target using formula: (12 ÷ 12 Hour Target) × 60
  // Result is in minutes, then converted to seconds for display
  const cycleTimeForTwelveHourTarget = twelveHourTarget > 0
    ? ((12 / twelveHourTarget) * 60) * 60  // hours to minutes (* 60), then minutes to seconds (* 60)
    : 0;

  // Calculate adjusted duty time (with 30-minute deduction when raw duration < 12 hours)
  const adjustedDutyTimeSeconds = calculateAdjustedDutyTimeSeconds(punchInTime, punchOutTime);
  const dutyTime = convertSecondsToTimeInterval(adjustedDutyTimeSeconds);

  const calculateTotalRunTime = () => {
    if (!selectedProductData) return { hours: 0, minutes: 0, seconds: 0 };
    const cycleTimeSeconds = formCycleTimeSeconds;
    const downtimeTimeSeconds = (parseInt(downtimeMinutes) || 0) * 60 + (parseInt(downtimeSeconds) || 0);
    const quantity = parseInt(quantityProduced) || 1;
    const loadingTime = Number(selectedProductData.loadingTime);
    const unloadingTime = Number(selectedProductData.unloadingTime);
    
    // Formula: (loadingTime + unloadingTime) * quantity + (cycleTime * quantity) + downtimeTime
    const totalSeconds = (loadingTime + unloadingTime) * quantity + (cycleTimeSeconds * quantity) + downtimeTimeSeconds;
    
    const hours = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    
    return { hours, minutes: mins, seconds: secs };
  };

  const totalRunTime = calculateTotalRunTime();

  // Calculate total operator hours using new formula based on adjusted duty time
  const quantity = parseInt(quantityProduced) || 0;
  const totalOperatorHours = calculateTotalOperatorHours({
    dutyTimeInSeconds: adjustedDutyTimeSeconds,
    quantityProduced: quantity,
    tenHourTarget,
    twelveHourTarget,
  });

  const formatTimeHoursMinutesSeconds = (hours: number, minutes: number, seconds: number) => {
    const parts: string[] = [];
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (seconds > 0) parts.push(`${seconds}s`);
    return parts.length > 0 ? parts.join(' ') : '0s';
  };

  const formatTimeHoursMinutes = (hours: number, minutes: number) => {
    if (hours === 0) {
      return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
    }
    if (minutes === 0) {
      return `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
    }
    return `${hours} ${hours === 1 ? 'hour' : 'hours'} ${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
  };

  const handleSave = async () => {
    // Validate actor is available
    if (!actor) {
      toast.error('System is still initializing. Please wait a moment and try again.');
      return;
    }

    // Validate required fields
    if (!selectedMachine) {
      toast.error('Please select a machine');
      return;
    }
    if (!selectedOperator) {
      toast.error('Please select an operator');
      return;
    }
    if (!selectedProduct) {
      toast.error('Please select a product');
      return;
    }
    if (!entryDateTime) {
      toast.error('Please enter a date and time');
      return;
    }
    if (!punchInTime) {
      toast.error('Please enter punch in time');
      return;
    }
    if (!punchOutTime) {
      toast.error('Please enter punch out time');
      return;
    }

    const quantity = parseInt(quantityProduced) || 1;
    if (quantity < 1) {
      toast.error('Quantity must be at least 1');
      return;
    }

    // Validate punch times
    if (punchOutTime <= punchInTime) {
      toast.error('Punch out time must be after punch in time');
      return;
    }

    try {
      // Convert datetime-local input to nanosecond timestamp
      const dateObj = new Date(entryDateTime);
      const timestampMs = dateObj.getTime();
      const timestampNs = BigInt(timestampMs) * BigInt(1_000_000); // Convert ms to ns

      // Convert punch in/out times to nanosecond timestamps
      const today = new Date().toISOString().split('T')[0];
      const punchInDate = new Date(`${today}T${punchInTime}`);
      const punchOutDate = new Date(`${today}T${punchOutTime}`);
      const punchInNs = BigInt(punchInDate.getTime()) * BigInt(1_000_000);
      const punchOutNs = BigInt(punchOutDate.getTime()) * BigInt(1_000_000);

      await addEntry.mutateAsync({
        machineId: BigInt(selectedMachine) as MachineId,
        operatorId: BigInt(selectedOperator) as OperatorId,
        productId: BigInt(selectedProduct) as ProductId,
        cycleTime: {
          minutes: BigInt(parseInt(minutes) || 0),
          seconds: BigInt(parseInt(seconds) || 0),
        },
        quantityProduced: BigInt(quantity),
        downtimeReason: downtimeReason,
        downtimeTime: {
          minutes: BigInt(parseInt(downtimeMinutes) || 0),
          seconds: BigInt(parseInt(downtimeSeconds) || 0),
        },
        punchIn: punchInNs,
        punchOut: punchOutNs,
        timestamp: timestampNs,
      });

      // Reset form with new current date/time
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const mins = String(now.getMinutes()).padStart(2, '0');
      setEntryDateTime(`${year}-${month}-${day}T${hours}:${mins}`);
      setSelectedMachine('');
      setSelectedOperator('');
      setSelectedProduct('');
      setMinutes('0');
      setSeconds('0');
      setQuantityProduced('1');
      setDowntimeReason('');
      setDowntimeMinutes('0');
      setDowntimeSeconds('0');
      setPunchInTime('');
      setPunchOutTime('');
    } catch (error) {
      // Error is already handled by the mutation's onError callback
      console.error('Failed to save entry:', error);
    }
  };

  const isFormValid = selectedMachine && selectedOperator && selectedProduct && entryDateTime && 
                      punchInTime && punchOutTime && parseInt(quantityProduced) >= 1;
  
  // Show loading only on initial load when no cached data exists
  const isInitialLoading = (machinesLoading && !machinesFetched) || 
                           (operatorsLoading && !operatorsFetched) || 
                           (productsLoading && !productsFetched) ||
                           actorFetching;

  if (isInitialLoading) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card className="shadow-lg">
          <CardContent className="pt-6 flex items-center justify-center py-12">
            <div className="text-center space-y-3">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
              <p className="text-muted-foreground">Loading form data...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Determine explanation text for Total Operator Hours
  const useTenHourFormula = adjustedDutyTimeSeconds <= (10 * 3600);
  let operatorHoursExplanation = '';
  
  if (useTenHourFormula) {
    operatorHoursExplanation = `Adjusted Duty Time ≤ 10h: Formula = (${quantity} ÷ ${tenHourTarget}) × 10`;
  } else {
    operatorHoursExplanation = `Adjusted Duty Time > 10h: Formula = (${quantity} ÷ ${twelveHourTarget}) × 12`;
  }

  // Determine duty time display value
  const getDutyTimeDisplay = () => {
    if (!punchInTime || !punchOutTime) {
      return 'Enter punch times';
    }
    if (punchOutTime <= punchInTime) {
      return 'Invalid time range';
    }
    return formatTimeHoursMinutes(dutyTime.hours, dutyTime.minutes);
  };

  const isDutyTimeInvalid = (punchInTime && punchOutTime && punchOutTime <= punchInTime);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card className="shadow-lg">
        <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Production Data Entry
          </CardTitle>
          <CardDescription>Record production cycle information</CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          {/* Error states for master data */}
          {machinesError && machinesFetched && (
            <MasterDataLoadError 
              title="Failed to load machines"
              message={normalizeBackendError(machinesError)}
              onRetry={() => refetchMachines()}
            />
          )}
          {operatorsError && operatorsFetched && (
            <MasterDataLoadError 
              title="Failed to load operators"
              message={normalizeBackendError(operatorsError)}
              onRetry={() => refetchOperators()}
            />
          )}
          {productsError && productsFetched && (
            <MasterDataLoadError 
              title="Failed to load products"
              message={normalizeBackendError(productsError)}
              onRetry={() => refetchProducts()}
            />
          )}

          {/* Date/Time Field */}
          <div className="space-y-2">
            <Label htmlFor="entryDateTime" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Entry Date & Time
            </Label>
            <Input
              id="entryDateTime"
              type="datetime-local"
              value={entryDateTime}
              onChange={(e) => setEntryDateTime(e.target.value)}
              className="text-lg font-semibold"
            />
            <p className="text-xs text-muted-foreground">
              Auto-filled with current time. Edit to enter a different date/time.
            </p>
          </div>

          {/* Machine Selection */}
          <div className="space-y-2">
            <Label htmlFor="machine">Machine</Label>
            <Select value={selectedMachine} onValueChange={setSelectedMachine}>
              <SelectTrigger id="machine">
                <SelectValue placeholder="Select a machine" />
              </SelectTrigger>
              <SelectContent>
                {machines.length === 0 ? (
                  <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                    No machines available. Add machines in Admin tab.
                  </div>
                ) : (
                  machines.map((machine) => (
                    <SelectItem key={machine.id.toString()} value={machine.id.toString()}>
                      {machine.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Operator Selection */}
          <div className="space-y-2">
            <Label htmlFor="operator">Operator</Label>
            <Select value={selectedOperator} onValueChange={setSelectedOperator}>
              <SelectTrigger id="operator">
                <SelectValue placeholder="Select an operator" />
              </SelectTrigger>
              <SelectContent>
                {operators.length === 0 ? (
                  <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                    No operators available. Add operators in Admin tab.
                  </div>
                ) : (
                  operators.map((operator) => (
                    <SelectItem key={operator.id.toString()} value={operator.id.toString()}>
                      {operator.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Product Selection */}
          <div className="space-y-2">
            <Label htmlFor="product">Product</Label>
            <Select value={selectedProduct} onValueChange={setSelectedProduct}>
              <SelectTrigger id="product">
                <SelectValue placeholder="Select a product" />
              </SelectTrigger>
              <SelectContent>
                {products.length === 0 ? (
                  <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                    No products available. Add products in Admin tab.
                  </div>
                ) : (
                  products.map((product) => (
                    <SelectItem key={product.id.toString()} value={product.id.toString()}>
                      {product.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {selectedProductData && (
              <div className="text-xs text-muted-foreground space-y-1 bg-muted/50 p-3 rounded-md">
                <p>Loading Time: {formatSecondsAsMinutesSeconds(Number(selectedProductData.loadingTime))}</p>
                <p>Unloading Time: {formatSecondsAsMinutesSeconds(Number(selectedProductData.unloadingTime))}</p>
                <p>Pieces per Cycle: {Number(selectedProductData.piecesPerCycle)}</p>
              </div>
            )}
          </div>

          {/* Cycle Time */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Cycle Time
            </Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="minutes" className="text-xs text-muted-foreground">
                  Minutes
                </Label>
                <Input
                  id="minutes"
                  type="number"
                  min="0"
                  value={minutes}
                  onChange={(e) => setMinutes(e.target.value)}
                  className="text-lg font-semibold"
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="seconds" className="text-xs text-muted-foreground">
                  Seconds
                </Label>
                <Input
                  id="seconds"
                  type="number"
                  min="0"
                  max="59"
                  value={seconds}
                  onChange={(e) => setSeconds(e.target.value)}
                  className="text-lg font-semibold"
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          {/* Quantity Produced */}
          <div className="space-y-2">
            <Label htmlFor="quantity" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Quantity Produced
            </Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              value={quantityProduced}
              onChange={(e) => {
                const value = e.target.value;
                if (value === '' || parseInt(value) >= 1) {
                  setQuantityProduced(value);
                }
              }}
              className="text-lg font-semibold"
              placeholder="Enter quantity"
            />
            {quantityProduced && parseInt(quantityProduced) < 1 && (
              <p className="text-xs text-destructive">Quantity must be at least 1</p>
            )}
          </div>

          {/* Number of Parts Produced - Read-only, Auto-calculated */}
          <div className="space-y-2">
            <Label htmlFor="numberOfParts" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Number of Parts Produced
            </Label>
            <Input
              id="numberOfParts"
              type="text"
              value={numberOfPartsProduced}
              readOnly
              className="text-lg font-semibold bg-muted cursor-not-allowed"
              placeholder="Auto-calculated"
            />
            <p className="text-xs text-muted-foreground">
              Automatically calculated: Pieces per Cycle × Quantity Produced
            </p>
          </div>

          {/* 10 Hour Target - Read-only, Auto-calculated */}
          <div className="space-y-2">
            <Label htmlFor="tenHourTarget" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              10 Hour Target
            </Label>
            <Input
              id="tenHourTarget"
              type="text"
              value={tenHourTarget}
              readOnly
              className="text-lg font-semibold bg-muted cursor-not-allowed"
              placeholder="Auto-calculated"
            />
            <p className="text-xs text-muted-foreground">
              Target for 10-hour shift: 34200 ÷ (cycle time + loading + unloading) × 0.95
            </p>
          </div>

          {/* Cycle Time for 10 Hour Target - Read-only, Auto-calculated */}
          <div className="space-y-2">
            <Label htmlFor="cycleTimeForTenHourTarget" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Cycle Time for 10 Hour Target
            </Label>
            <Input
              id="cycleTimeForTenHourTarget"
              type="text"
              value={formatSecondsAsMinutesSeconds(cycleTimeForTenHourTarget)}
              readOnly
              className="text-lg font-semibold bg-muted cursor-not-allowed"
              placeholder="Auto-calculated"
            />
            <p className="text-xs text-muted-foreground">
              Formula: (10 ÷ 10 Hour Target) × 60, displayed in minutes and seconds
            </p>
          </div>

          {/* 12 Hour Target - Read-only, Auto-calculated */}
          <div className="space-y-2">
            <Label htmlFor="twelveHourTarget" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              12 Hour Target
            </Label>
            <Input
              id="twelveHourTarget"
              type="text"
              value={twelveHourTarget}
              readOnly
              className="text-lg font-semibold bg-muted cursor-not-allowed"
              placeholder="Auto-calculated"
            />
            <p className="text-xs text-muted-foreground">
              Target for 12-hour shift: 39600 ÷ (cycle time + loading + unloading) × 0.95
            </p>
          </div>

          {/* Cycle Time for 12 Hour Target - Read-only, Auto-calculated */}
          <div className="space-y-2">
            <Label htmlFor="cycleTimeForTwelveHourTarget" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Cycle Time for 12 Hour Target
            </Label>
            <Input
              id="cycleTimeForTwelveHourTarget"
              type="text"
              value={formatSecondsAsMinutesSeconds(cycleTimeForTwelveHourTarget)}
              readOnly
              className="text-lg font-semibold bg-muted cursor-not-allowed"
              placeholder="Auto-calculated"
            />
            <p className="text-xs text-muted-foreground">
              Formula: (12 ÷ 12 Hour Target) × 60, displayed in minutes and seconds
            </p>
          </div>

          {/* Punch In Time */}
          <div className="space-y-2">
            <Label htmlFor="punchIn" className="flex items-center gap-2">
              <UserCheck className="h-4 w-4" />
              Punch In Time
            </Label>
            <Input
              id="punchIn"
              type="time"
              value={punchInTime}
              onChange={(e) => setPunchInTime(e.target.value)}
              className="text-lg font-semibold"
            />
            <p className="text-xs text-muted-foreground">
              Operator start time
            </p>
          </div>

          {/* Punch Out Time */}
          <div className="space-y-2">
            <Label htmlFor="punchOut" className="flex items-center gap-2">
              <UserCheck className="h-4 w-4" />
              Punch Out Time
            </Label>
            <Input
              id="punchOut"
              type="time"
              value={punchOutTime}
              onChange={(e) => setPunchOutTime(e.target.value)}
              className="text-lg font-semibold"
            />
            <p className="text-xs text-muted-foreground">
              Operator end time
            </p>
          </div>

          {/* Duty Time - Always visible, Read-only, Auto-calculated */}
          <div className="space-y-2">
            <Label htmlFor="dutyTime" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Duty Time (Adjusted)
            </Label>
            <Input
              id="dutyTime"
              type="text"
              value={getDutyTimeDisplay()}
              readOnly
              className={`text-lg font-semibold bg-muted cursor-not-allowed ${isDutyTimeInvalid ? 'text-destructive' : ''}`}
              placeholder="Enter punch times"
            />
            <p className="text-xs text-muted-foreground">
              Duration between Punch In and Punch Out, with 30-minute deduction when duration is less than 12 hours
            </p>
            {isDutyTimeInvalid && (
              <p className="text-xs text-destructive">
                Punch out time must be after punch in time
              </p>
            )}
          </div>

          {/* Downtime Reason */}
          <div className="space-y-2">
            <Label htmlFor="downtimeReason" className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Downtime Reason
            </Label>
            <Input
              id="downtimeReason"
              type="text"
              value={downtimeReason}
              onChange={(e) => setDowntimeReason(e.target.value)}
              className="text-lg"
              placeholder="Enter reason for downtime (optional)"
            />
            <p className="text-xs text-muted-foreground">
              Describe any machine downtime during production
            </p>
          </div>

          {/* Downtime Time */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Downtime Duration
            </Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="downtimeMinutes" className="text-xs text-muted-foreground">
                  Minutes
                </Label>
                <Input
                  id="downtimeMinutes"
                  type="number"
                  min="0"
                  value={downtimeMinutes}
                  onChange={(e) => setDowntimeMinutes(e.target.value)}
                  className="text-lg font-semibold"
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="downtimeSeconds" className="text-xs text-muted-foreground">
                  Seconds
                </Label>
                <Input
                  id="downtimeSeconds"
                  type="number"
                  min="0"
                  max="59"
                  value={downtimeSeconds}
                  onChange={(e) => setDowntimeSeconds(e.target.value)}
                  className="text-lg font-semibold"
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          {/* Total Run Time Display */}
          {selectedProductData && (
            <div className="bg-primary/10 p-4 rounded-lg border border-primary/20">
              <p className="text-sm font-medium text-muted-foreground mb-1">
                Total Machine Run Time
              </p>
              <p className="text-2xl font-bold text-primary">
                {formatTimeHoursMinutes(totalRunTime.hours, totalRunTime.minutes)}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Calculated: (Loading + Unloading) × Quantity + Cycle Time × Quantity + Downtime
              </p>
            </div>
          )}

          {/* Total Operator Hours Display */}
          {selectedProductData && (
            <div className="bg-secondary/10 p-4 rounded-lg border border-secondary/20">
              <p className="text-sm font-medium text-muted-foreground mb-1">
                Total Operator Hours
              </p>
              <p className="text-2xl font-bold text-secondary-foreground">
                {formatTimeInterval(totalOperatorHours)}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                {operatorHoursExplanation}
              </p>
            </div>
          )}

          {/* Save Button */}
          <Button
            onClick={handleSave}
            disabled={!isFormValid || addEntry.isPending || !actor}
            className="w-full h-12 text-lg gap-2"
            size="lg"
          >
            {addEntry.isPending ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-5 w-5" />
                Save Entry
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
