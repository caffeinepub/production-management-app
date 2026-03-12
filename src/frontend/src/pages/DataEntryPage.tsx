import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  Moon,
  RotateCcw,
  Send,
} from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import AnalogClockPicker from "../components/AnalogClockPicker";
import LoadingPanel from "../components/LoadingPanel";
import MasterDataLoadError from "../components/MasterDataLoadError";
import {
  useAddProductionEntry,
  useGetAllMachines,
  useGetAllOperators,
  useGetAllProducts,
} from "../hooks/useQueries";
import {
  calculateDutyTime,
  calculateOperatorHours,
  calculateTenHourTarget,
  calculateTwelveHourTarget,
} from "../utils/operatorHours";
import { saveRejection } from "../utils/rejectionStore";
import { formatHMS } from "../utils/timeFormat";

interface FormState {
  machineId: string;
  operatorId: string;
  productId: string;
  cycleTimeMinutes: string;
  cycleTimeSeconds: string;
  quantityProduced: string;
  rejectionCount: string;
  downtimeReason: string;
  downtimeMinutes: string;
  downtimeSeconds: string;
  punchDate: string;
  punchInTime: string;
  punchOutTime: string;
}

const DRAFT_KEY = "prodmanager_draft";

function todayDateString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = (now.getMonth() + 1).toString().padStart(2, "0");
  const d = now.getDate().toString().padStart(2, "0");
  return `${y}-${m}-${d}`;
}

const emptyForm: FormState = {
  machineId: "",
  operatorId: "",
  productId: "",
  cycleTimeMinutes: "0",
  cycleTimeSeconds: "0",
  quantityProduced: "0",
  rejectionCount: "0",
  downtimeReason: "",
  downtimeMinutes: "0",
  downtimeSeconds: "0",
  punchDate: todayDateString(),
  punchInTime: "",
  punchOutTime: "",
};

function loadDraft(): FormState {
  try {
    const saved = localStorage.getItem(DRAFT_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as Partial<FormState>;
      // Always refresh punchDate to today if not explicitly set
      return {
        ...emptyForm,
        ...parsed,
        // If no date saved, use today
        punchDate: parsed.punchDate || todayDateString(),
      };
    }
  } catch {}
  return emptyForm;
}

function saveDraft(form: FormState) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(form));
  } catch {}
}

function clearDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {}
}

/** Combine a date string (YYYY-MM-DD) and time string (HH:MM) into a timestamp in ms */
function combineDateAndTime(dateStr: string, timeStr: string): number {
  if (!dateStr || !timeStr) return 0;
  const dt = new Date(`${dateStr}T${timeStr}:00`);
  return dt.getTime();
}

export default function DataEntryPage() {
  const [form, setForm] = useState<FormState>(loadDraft);
  const [draftSaved, setDraftSaved] = useState(false);
  const draftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    data: products = [],
    isLoading: productsLoading,
    isError: productsError,
    isFetching: productsFetching,
    refetch: refetchProducts,
  } = useGetAllProducts();
  const {
    data: machines = [],
    isLoading: machinesLoading,
    isError: machinesError,
    isFetching: machinesFetching,
    refetch: refetchMachines,
  } = useGetAllMachines();
  const {
    data: operators = [],
    isLoading: operatorsLoading,
    isError: operatorsError,
    isFetching: operatorsFetching,
    refetch: refetchOperators,
  } = useGetAllOperators();
  const addEntry = useAddProductionEntry();

  // Auto-save draft to localStorage with debounce
  const triggerDraftSave = useCallback((newForm: FormState) => {
    if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    draftTimerRef.current = setTimeout(() => {
      saveDraft(newForm);
      setDraftSaved(true);
      setTimeout(() => setDraftSaved(false), 2000);
    }, 800);
  }, []);

  const updateField = (field: keyof FormState, value: string) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      triggerDraftSave(next);
      return next;
    });
  };

  useEffect(() => {
    return () => {
      if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    };
  }, []);

  // Derived calculations
  const selectedProduct = products.find((p) => String(p.id) === form.productId);
  const cycleTimeSec =
    (Number.parseInt(form.cycleTimeMinutes) || 0) * 60 +
    (Number.parseInt(form.cycleTimeSeconds) || 0);
  const downtimeSec =
    (Number.parseInt(form.downtimeMinutes) || 0) * 60 +
    (Number.parseInt(form.downtimeSeconds) || 0);
  const qty = Number.parseInt(form.quantityProduced) || 0;
  const rejCount = Number.parseInt(form.rejectionCount) || 0;

  const tenHourTarget = selectedProduct
    ? calculateTenHourTarget(
        cycleTimeSec,
        Number(selectedProduct.loadingTime),
        Number(selectedProduct.unloadingTime),
      )
    : 0;
  const twelveHourTarget = selectedProduct
    ? calculateTwelveHourTarget(
        cycleTimeSec,
        Number(selectedProduct.loadingTime),
        Number(selectedProduct.unloadingTime),
      )
    : 0;

  const punchInMs = combineDateAndTime(form.punchDate, form.punchInTime);
  let punchOutMs = combineDateAndTime(form.punchDate, form.punchOutTime);
  // Night shift: if punch-out time is earlier than punch-in time, it's next day
  const isNightShift =
    form.punchInTime &&
    form.punchOutTime &&
    form.punchOutTime < form.punchInTime;
  if (isNightShift) {
    punchOutMs += 86400000; // add 24 hours
  }

  const dutyTimeSec =
    punchInMs && punchOutMs ? calculateDutyTime(punchInMs, punchOutMs) : 0;

  const operatorHours = calculateOperatorHours(
    dutyTimeSec,
    qty,
    tenHourTarget,
    twelveHourTarget,
    downtimeSec,
  );

  const dutyHours = Math.floor(dutyTimeSec / 3600);
  const dutyMinutes = Math.floor((dutyTimeSec % 3600) / 60);
  const dutySeconds = dutyTimeSec % 60;

  const handleReset = () => {
    setForm({ ...emptyForm, punchDate: todayDateString() });
    clearDraft();
    toast.info("Form cleared");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.machineId) {
      toast.error("Please select a machine");
      return;
    }
    if (!form.operatorId) {
      toast.error("Please select an operator");
      return;
    }
    if (!form.productId) {
      toast.error("Please select a product");
      return;
    }
    if (!form.punchDate) {
      toast.error("Please select a date");
      return;
    }
    if (!form.punchInTime) {
      toast.error("Please enter punch-in time");
      return;
    }
    if (!form.punchOutTime) {
      toast.error("Please enter punch-out time");
      return;
    }
    // No validation blocking night shift — punchOutMs already adjusted above

    const punchInNs = BigInt(Math.floor(punchInMs * 1_000_000));
    const punchOutNs = BigInt(Math.floor(punchOutMs * 1_000_000));

    await addEntry.mutateAsync({
      machineId: BigInt(form.machineId),
      operatorId: BigInt(form.operatorId),
      productId: BigInt(form.productId),
      cycleTime: {
        minutes: BigInt(Number.parseInt(form.cycleTimeMinutes) || 0),
        seconds: BigInt(Number.parseInt(form.cycleTimeSeconds) || 0),
      },
      quantityProduced: BigInt(qty),
      downtimeReason: form.downtimeReason,
      downtimeTime: {
        minutes: BigInt(Number.parseInt(form.downtimeMinutes) || 0),
        seconds: BigInt(Number.parseInt(form.downtimeSeconds) || 0),
      },
      punchIn: punchInNs,
      punchOut: punchOutNs,
      timestamp: punchInNs,
    });

    // Save rejection count separately in localStorage keyed by timestamp
    if (rejCount > 0) {
      saveRejection(String(punchInNs), rejCount);
    }

    setForm({ ...emptyForm, punchDate: todayDateString() });
    clearDraft();
  };

  const isLoading =
    productsLoading ||
    machinesLoading ||
    operatorsLoading ||
    productsFetching ||
    machinesFetching ||
    operatorsFetching;
  const hasError = productsError || machinesError || operatorsError;

  // Show loading spinner while data is being fetched (including retries)
  if (isLoading && !hasError) {
    return <LoadingPanel message="Loading master data..." />;
  }

  // Only show error after all retries have been exhausted
  if (hasError && !isLoading) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-3xl">
        <MasterDataLoadError
          message="Failed to load master data. Please check your connection and try again."
          onRetry={() => {
            refetchProducts();
            refetchMachines();
            refetchOperators();
          }}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Production Data Entry
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Record production run details
          </p>
        </div>
        <div className="flex items-center gap-2">
          {draftSaved && (
            <Badge
              variant="secondary"
              className="gap-1 bg-secondary text-secondary-foreground"
            >
              <CheckCircle2 className="h-3 w-3" />
              Draft saved
            </Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            className="gap-1 border-border"
            data-ocid="form.secondary_button"
          >
            <RotateCcw className="h-3 w-3" />
            Clear
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Machine / Operator / Product */}
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-3 bg-primary/5 rounded-t-lg border-b border-border">
            <CardTitle className="text-base text-primary">
              Production Setup
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
            <div className="space-y-2">
              <Label className="text-foreground font-medium">Machine *</Label>
              <Select
                value={form.machineId}
                onValueChange={(v) => updateField("machineId", v)}
              >
                <SelectTrigger
                  className="border-input"
                  data-ocid="form.machine.select"
                >
                  <SelectValue placeholder="Select machine" />
                </SelectTrigger>
                <SelectContent>
                  {machines.map((m) => (
                    <SelectItem key={String(m.id)} value={String(m.id)}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-foreground font-medium">Operator *</Label>
              <Select
                value={form.operatorId}
                onValueChange={(v) => updateField("operatorId", v)}
              >
                <SelectTrigger
                  className="border-input"
                  data-ocid="form.operator.select"
                >
                  <SelectValue placeholder="Select operator" />
                </SelectTrigger>
                <SelectContent>
                  {operators.map((o) => (
                    <SelectItem key={String(o.id)} value={String(o.id)}>
                      {o.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-foreground font-medium">Product *</Label>
              <Select
                value={form.productId}
                onValueChange={(v) => updateField("productId", v)}
              >
                <SelectTrigger
                  className="border-input"
                  data-ocid="form.product.select"
                >
                  <SelectValue placeholder="Select product" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={String(p.id)} value={String(p.id)}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Punch Times */}
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-3 bg-primary/5 rounded-t-lg border-b border-border">
            <CardTitle className="text-base text-primary flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Attendance & Punch Times
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            {/* Date field */}
            <div className="space-y-2">
              <Label className="text-foreground font-medium">Date *</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  value={form.punchDate}
                  onChange={(e) => updateField("punchDate", e.target.value)}
                  className="border-input flex-1"
                  data-ocid="form.date.input"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0 text-xs border-border"
                  onClick={() => updateField("punchDate", todayDateString())}
                >
                  Today
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-foreground font-medium">
                  Punch In *
                </Label>
                <AnalogClockPicker
                  value={form.punchInTime}
                  onChange={(t) => updateField("punchInTime", t)}
                  placeholder="Select punch-in time"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground font-medium">
                  Punch Out *
                </Label>
                <AnalogClockPicker
                  value={form.punchOutTime}
                  onChange={(t) => updateField("punchOutTime", t)}
                  placeholder="Select punch-out time"
                />
              </div>
            </div>

            {dutyTimeSec > 0 && (
              <div className="bg-accent/40 rounded-md px-3 py-2 flex items-center gap-3 flex-wrap">
                <p className="text-sm text-accent-foreground">
                  Duty Time:{" "}
                  <span className="font-semibold">
                    {formatHMS(dutyHours, dutyMinutes, dutySeconds)}
                  </span>
                  <span className="ml-2 text-xs opacity-70">
                    (break deducted if shift &lt; 12h and ≥ 30 min)
                  </span>
                </p>
                {isNightShift && (
                  <Badge className="gap-1 bg-indigo-600 text-white border-0 shrink-0">
                    <Moon className="h-3 w-3" />
                    Night Shift
                  </Badge>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Cycle Time & Quantity */}
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-3 bg-primary/5 rounded-t-lg border-b border-border">
            <CardTitle className="text-base text-primary">
              Cycle Time & Quantity
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
            <div className="space-y-2">
              <Label className="text-foreground font-medium">
                Cycle Time (min)
              </Label>
              <Input
                type="number"
                min="0"
                value={form.cycleTimeMinutes}
                onChange={(e) =>
                  updateField("cycleTimeMinutes", e.target.value)
                }
                className="border-input"
                data-ocid="form.cycletime.input"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-foreground font-medium">
                Cycle Time (sec)
              </Label>
              <Input
                type="number"
                min="0"
                max="59"
                value={form.cycleTimeSeconds}
                onChange={(e) =>
                  updateField("cycleTimeSeconds", e.target.value)
                }
                className="border-input"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-foreground font-medium">
                Quantity Produced
              </Label>
              <Input
                type="number"
                min="0"
                value={form.quantityProduced}
                onChange={(e) =>
                  updateField("quantityProduced", e.target.value)
                }
                className="border-input"
                data-ocid="form.quantity.input"
              />
            </div>

            {/* Rejection Count */}
            <div className="space-y-2">
              <Label className="text-foreground font-medium flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                Rejection Count
              </Label>
              <Input
                type="number"
                min="0"
                value={form.rejectionCount}
                onChange={(e) => updateField("rejectionCount", e.target.value)}
                className="border-input"
                data-ocid="form.rejection.input"
              />
            </div>

            {selectedProduct && cycleTimeSec > 0 && (
              <div className="sm:col-span-3 grid grid-cols-2 gap-3 text-sm">
                <div className="bg-primary/10 border border-primary/20 rounded-md p-3">
                  <p className="text-xs text-muted-foreground mb-1">
                    10h Target
                  </p>
                  <span className="text-xl font-bold text-primary">
                    {tenHourTarget}
                  </span>
                </div>
                <div className="bg-secondary border border-secondary-foreground/10 rounded-md p-3">
                  <p className="text-xs text-muted-foreground mb-1">
                    12h Target
                  </p>
                  <span className="text-xl font-bold text-secondary-foreground">
                    {twelveHourTarget}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Downtime */}
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-3 bg-primary/5 rounded-t-lg border-b border-border">
            <CardTitle className="text-base text-primary">Downtime</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
            <div className="space-y-2">
              <Label className="text-foreground font-medium">
                Downtime (min)
              </Label>
              <Input
                type="number"
                min="0"
                value={form.downtimeMinutes}
                onChange={(e) => updateField("downtimeMinutes", e.target.value)}
                className="border-input"
                data-ocid="form.downtime.input"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-foreground font-medium">
                Downtime (sec)
              </Label>
              <Input
                type="number"
                min="0"
                max="59"
                value={form.downtimeSeconds}
                onChange={(e) => updateField("downtimeSeconds", e.target.value)}
                className="border-input"
              />
            </div>
            <div className="space-y-2 sm:col-span-3">
              <Label className="text-foreground font-medium">
                Downtime Reason
              </Label>
              <Textarea
                placeholder="Describe the reason for downtime..."
                value={form.downtimeReason}
                onChange={(e) => updateField("downtimeReason", e.target.value)}
                rows={2}
                className="border-input"
                data-ocid="form.downtime.textarea"
              />
            </div>
          </CardContent>
        </Card>

        {/* Summary */}
        {qty > 0 && dutyTimeSec > 0 && (
          <Card className="border-primary/40 shadow-sm bg-primary text-primary-foreground">
            <CardHeader className="pb-3 border-b border-primary-foreground/20">
              <CardTitle className="text-base text-primary-foreground flex items-center gap-2">
                Calculated Summary
                {isNightShift && (
                  <Badge className="gap-1 bg-indigo-500 text-white border-0 text-xs">
                    <Moon className="h-3 w-3" />
                    Night Shift
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm pt-4">
              {selectedProduct && (
                <div className="bg-white/10 rounded-md p-3">
                  <p className="text-primary-foreground/70 text-xs">
                    Parts Produced
                  </p>
                  <p className="font-bold text-primary-foreground text-lg">
                    {(selectedProduct
                      ? Number(selectedProduct.piecesPerCycle) * qty
                      : 0
                    ).toLocaleString()}
                  </p>
                </div>
              )}
              {rejCount > 0 && (
                <div className="bg-white/10 rounded-md p-3">
                  <p className="text-primary-foreground/70 text-xs flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Rejections
                  </p>
                  <p className="font-bold text-primary-foreground text-lg">
                    {rejCount}
                  </p>
                </div>
              )}
              <div className="bg-white/10 rounded-md p-3">
                <p className="text-primary-foreground/70 text-xs">10h Target</p>
                <p className="font-bold text-primary-foreground text-lg">
                  {tenHourTarget}
                </p>
              </div>
              <div className="bg-white/10 rounded-md p-3">
                <p className="text-primary-foreground/70 text-xs">12h Target</p>
                <p className="font-bold text-primary-foreground text-lg">
                  {twelveHourTarget}
                </p>
              </div>
              <div className="bg-white/10 rounded-md p-3">
                <p className="text-primary-foreground/70 text-xs">Duty Time</p>
                <p className="font-bold text-primary-foreground">
                  {formatHMS(dutyHours, dutyMinutes, dutySeconds)}
                </p>
              </div>
              <div className="bg-white/10 rounded-md p-3 sm:col-span-2">
                <p className="text-primary-foreground/70 text-xs">
                  Total Operator Hours
                </p>
                <p className="font-bold text-primary-foreground text-lg">
                  {formatHMS(
                    operatorHours.hours,
                    operatorHours.minutes,
                    operatorHours.seconds,
                  )}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Submit */}
        <div className="flex gap-3 pb-6">
          <Button
            type="submit"
            disabled={addEntry.isPending}
            className="flex-1 gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 text-base shadow-md"
            data-ocid="form.submit_button"
          >
            {addEntry.isPending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
            {addEntry.isPending ? "Submitting..." : "Submit Entry"}
          </Button>
        </div>
      </form>
    </div>
  );
}
