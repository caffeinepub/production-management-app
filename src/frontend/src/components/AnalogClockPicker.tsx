import { Button } from "@/components/ui/button";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";

interface AnalogClockPickerProps {
  value: string; // "HH:MM" 24-hour format, or empty string
  onChange: (timeString: string) => void;
  placeholder?: string;
}

type ClockMode = "hour" | "minute";

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

function getAngleFromCenter(
  cx: number,
  cy: number,
  px: number,
  py: number,
): number {
  const dx = px - cx;
  const dy = py - cy;
  let angle = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
  if (angle < 0) angle += 360;
  return angle;
}

const TICK_INDICES = Array.from({ length: 60 }, (_, i) => i);

// Outer ring: 1-12 (standard clock positions, arranged at 30° each)
const OUTER_HOUR_NUMBERS = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
// Inner ring: 13-23 and 0 (24-hour extension)
const INNER_HOUR_NUMBERS = [0, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23];

const MINUTE_TICKS = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

export default function AnalogClockPicker({
  value,
  onChange,
  placeholder = "Select time",
}: AnalogClockPickerProps) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<ClockMode>("hour");

  const [dispHour, setDispHour] = useState(0);
  const [dispMinute, setDispMinute] = useState(0);

  // Initialise from value prop — parse as 24-hour directly
  useEffect(() => {
    if (value) {
      const [hStr, mStr] = value.split(":");
      const h = Number.parseInt(hStr, 10);
      const m = Number.parseInt(mStr, 10);
      setDispHour(h);
      setDispMinute(m);
    }
  }, [value]);

  const clockRef = useRef<SVGSVGElement>(null);
  const isDragging = useRef(false);

  const CX = 115;
  const CY = 115;
  const R_OUTER = 96;
  const R_HAND_OUTER = 80;
  const R_HAND_INNER = 55;
  const R_OUTER_LABEL = 80;
  const R_INNER_LABEL = 55;
  const R_MINUTE_LABEL = 76;
  const R_KNOB = 8;

  // For hand rendering: outer hours 1-12 use outer radius, inner hours 13-23,0 use inner radius
  const isInnerHour = dispHour === 0 || dispHour >= 13;
  const currentHandRadius =
    mode === "hour"
      ? isInnerHour
        ? R_HAND_INNER
        : R_HAND_OUTER
      : R_HAND_OUTER;

  // Angle for hour: map to 0-11 position on clock face
  const hourAngleIndex =
    dispHour === 0 ? 0 : dispHour > 12 ? dispHour - 12 : dispHour;
  const hourAngle = (hourAngleIndex / 12) * 360;
  const minuteAngle = (dispMinute / 60) * 360;

  const hourHandEnd = polarToCartesian(CX, CY, currentHandRadius, hourAngle);
  const minuteHandEnd = polarToCartesian(CX, CY, R_HAND_OUTER, minuteAngle);

  const getSvgPoint = useCallback((clientX: number, clientY: number) => {
    const svg = clockRef.current;
    if (!svg) return { x: CX, y: CY };
    const rect = svg.getBoundingClientRect();
    const scaleX = 230 / rect.width;
    const scaleY = 230 / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  }, []);

  const handleClockInteraction = useCallback(
    (clientX: number, clientY: number) => {
      const { x, y } = getSvgPoint(clientX, clientY);
      const angle = getAngleFromCenter(CX, CY, x, y);

      if (mode === "hour") {
        // Determine distance from center to decide inner vs outer ring
        const dist = Math.sqrt((x - CX) ** 2 + (y - CY) ** 2);
        const rawHour = Math.round(angle / 30) % 12;

        if (dist < (R_HAND_INNER + R_HAND_OUTER) / 2) {
          // Inner ring: hours 13-23 and 0
          // Map rawHour: 0 position → 0 (midnight), 1 position → 13, 2 → 14, ...
          const innerHour = rawHour === 0 ? 0 : rawHour + 12;
          setDispHour(innerHour);
        } else {
          // Outer ring: hours 1-12
          const outerHour = rawHour === 0 ? 12 : rawHour;
          setDispHour(outerHour);
        }
      } else {
        const rawMin = Math.round(angle / 6) % 60;
        setDispMinute(rawMin < 0 ? 0 : rawMin);
      }
    },
    [mode, getSvgPoint],
  );

  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    isDragging.current = true;
    handleClockInteraction(e.clientX, e.clientY);
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!isDragging.current) return;
    handleClockInteraction(e.clientX, e.clientY);
  };

  const handleMouseUp = (e: React.MouseEvent<SVGSVGElement>) => {
    isDragging.current = false;
    handleClockInteraction(e.clientX, e.clientY);
    if (mode === "hour") {
      setMode("minute");
    }
  };

  const handleTouchStart = (e: React.TouchEvent<SVGSVGElement>) => {
    isDragging.current = true;
    const t = e.touches[0];
    handleClockInteraction(t.clientX, t.clientY);
  };

  const handleTouchMove = (e: React.TouchEvent<SVGSVGElement>) => {
    if (!isDragging.current) return;
    const t = e.touches[0];
    handleClockInteraction(t.clientX, t.clientY);
  };

  const handleTouchEnd = (e: React.TouchEvent<SVGSVGElement>) => {
    isDragging.current = false;
    if (e.changedTouches.length > 0) {
      const t = e.changedTouches[0];
      handleClockInteraction(t.clientX, t.clientY);
    }
    if (mode === "hour") {
      setMode("minute");
    }
  };

  // Confirm: output dispHour directly as 24-hour value
  const confirm = () => {
    const hStr = dispHour.toString().padStart(2, "0");
    const mStr = dispMinute.toString().padStart(2, "0");
    onChange(`${hStr}:${mStr}`);
    setOpen(false);
    setMode("hour");
  };

  const setNow = () => {
    const now = new Date();
    setDispHour(now.getHours());
    setDispMinute(now.getMinutes());
  };

  // Format display in HH:MM 24-hour format
  const formatDisplay = () => {
    if (!value) return placeholder;
    const [hStr, mStr] = value.split(":");
    const h = Number.parseInt(hStr, 10);
    const m = Number.parseInt(mStr, 10);
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
  };

  const selectedHandEnd = mode === "hour" ? hourHandEnd : minuteHandEnd;
  const selectedAngle = mode === "hour" ? hourAngle : minuteAngle;
  const handKnob = polarToCartesian(
    CX,
    CY,
    mode === "hour" ? currentHandRadius : R_HAND_OUTER,
    selectedAngle,
  );

  const closePopup = () => {
    setOpen(false);
    setMode("hour");
  };

  return (
    <div className="relative">
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 w-full h-10 px-3 py-2 rounded-md border border-input bg-background text-sm text-foreground hover:bg-accent hover:text-accent-foreground transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <svg
          role="img"
          aria-label="Clock icon"
          className="h-4 w-4 text-muted-foreground shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <title>Clock icon</title>
          <circle cx="12" cy="12" r="10" strokeWidth="2" />
          <path d="M12 6v6l4 2" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <span className={value ? "text-foreground" : "text-muted-foreground"}>
          {formatDisplay()}
        </span>
      </button>

      {/* Clock picker popup */}
      {open && (
        <div className="absolute z-50 top-12 left-0 bg-card border border-border rounded-xl shadow-xl p-4 w-72 select-none">
          {/* Header: hour:minute display — 24h, no AM/PM */}
          <div className="flex items-center justify-center gap-1 mb-3">
            <button
              type="button"
              onClick={() => setMode("hour")}
              className={`text-2xl font-bold px-2 py-1 rounded-lg transition-colors ${
                mode === "hour"
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground hover:bg-accent"
              }`}
            >
              {dispHour.toString().padStart(2, "0")}
            </button>
            <span className="text-2xl font-bold text-muted-foreground">:</span>
            <button
              type="button"
              onClick={() => setMode("minute")}
              className={`text-2xl font-bold px-2 py-1 rounded-lg transition-colors ${
                mode === "minute"
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground hover:bg-accent"
              }`}
            >
              {dispMinute.toString().padStart(2, "0")}
            </button>
            <span className="ml-2 text-xs text-muted-foreground font-medium">
              24h
            </span>
          </div>

          {/* Mode label */}
          <p className="text-center text-xs text-muted-foreground mb-2">
            {mode === "hour"
              ? "Select hour (outer: 1–12, inner: 13–23 / 0)"
              : "Select minute"}
          </p>

          {/* Clock face SVG */}
          <svg
            ref={clockRef}
            role="img"
            aria-label="Analog clock picker"
            viewBox="0 0 230 230"
            className="w-full cursor-pointer touch-none"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={() => {
              isDragging.current = false;
            }}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <title>Analog clock picker</title>
            {/* Clock background */}
            <circle
              cx={CX}
              cy={CY}
              r={R_OUTER + 6}
              fill="var(--muted)"
              opacity="0.4"
            />
            <circle cx={CX} cy={CY} r={R_OUTER} fill="var(--card)" />

            {/* Inner ring separator circle */}
            <circle
              cx={CX}
              cy={CY}
              r={(R_HAND_INNER + R_HAND_OUTER) / 2}
              fill="none"
              stroke="var(--border)"
              strokeWidth="0.8"
              strokeDasharray="3 3"
              opacity="0.5"
            />

            {/* Tick marks */}
            {TICK_INDICES.map((i) => {
              const angle = (i / 60) * 360;
              const isMajor = i % 5 === 0;
              const r1 = R_OUTER - (isMajor ? 8 : 4);
              const r2 = R_OUTER - 1;
              const start = polarToCartesian(CX, CY, r1, angle);
              const end = polarToCartesian(CX, CY, r2, angle);
              return (
                <line
                  key={`tick-${i}`}
                  x1={start.x}
                  y1={start.y}
                  x2={end.x}
                  y2={end.y}
                  stroke="var(--border)"
                  strokeWidth={isMajor ? 2 : 1}
                />
              );
            })}

            {/* Outer ring: hours 1–12 */}
            {mode === "hour" &&
              OUTER_HOUR_NUMBERS.map((num, i) => {
                const angle = (i / 12) * 360;
                const pos = polarToCartesian(CX, CY, R_OUTER_LABEL, angle);
                const isSelected = dispHour === num;
                return (
                  <g key={`outer-hour-${num}`}>
                    {isSelected && (
                      <circle
                        cx={pos.x}
                        cy={pos.y}
                        r={13}
                        fill="var(--primary)"
                      />
                    )}
                    <text
                      x={pos.x}
                      y={pos.y}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontSize="13"
                      fontWeight={isSelected ? "bold" : "600"}
                      fill={isSelected ? "white" : "#334155"}
                    >
                      {num}
                    </text>
                  </g>
                );
              })}

            {/* Inner ring: hours 13–23 and 0 */}
            {mode === "hour" &&
              INNER_HOUR_NUMBERS.map((num, i) => {
                const angle = (i / 12) * 360;
                const pos = polarToCartesian(CX, CY, R_INNER_LABEL, angle);
                const isSelected = dispHour === num;
                return (
                  <g key={`inner-hour-${num}`}>
                    {isSelected && (
                      <circle
                        cx={pos.x}
                        cy={pos.y}
                        r={11}
                        fill="var(--primary)"
                      />
                    )}
                    <text
                      x={pos.x}
                      y={pos.y}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontSize="11"
                      fontWeight={isSelected ? "bold" : "500"}
                      fill={isSelected ? "white" : "#475569"}
                    >
                      {num}
                    </text>
                  </g>
                );
              })}

            {/* Minute labels (0, 5, 10, ...) */}
            {mode === "minute" &&
              MINUTE_TICKS.map((min, i) => {
                const angle = (i / 12) * 360;
                const pos = polarToCartesian(CX, CY, R_MINUTE_LABEL, angle);
                const exactSelected = min === dispMinute;
                return (
                  <g key={`min-${min}`}>
                    {exactSelected && (
                      <circle
                        cx={pos.x}
                        cy={pos.y}
                        r={12}
                        fill="var(--primary)"
                      />
                    )}
                    <text
                      x={pos.x}
                      y={pos.y}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontSize="12"
                      fontWeight={exactSelected ? "bold" : "600"}
                      fill={exactSelected ? "white" : "#334155"}
                    >
                      {min.toString().padStart(2, "0")}
                    </text>
                  </g>
                );
              })}

            {/* Clock hand */}
            <line
              x1={CX}
              y1={CY}
              x2={selectedHandEnd.x}
              y2={selectedHandEnd.y}
              stroke="var(--primary)"
              strokeWidth="2.5"
              strokeLinecap="round"
            />

            {/* Hand knob */}
            <circle
              cx={handKnob.x}
              cy={handKnob.y}
              r={R_KNOB}
              fill="var(--primary)"
            />

            {/* Center dot */}
            <circle cx={CX} cy={CY} r={4} fill="var(--primary)" />
          </svg>

          {/* Action buttons */}
          <div className="flex gap-2 mt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="flex-1 text-xs border-border"
              onClick={setNow}
            >
              Now
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="flex-1 text-xs border-border"
              onClick={closePopup}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              className="flex-1 text-xs bg-primary hover:bg-primary/90 text-primary-foreground"
              onClick={confirm}
            >
              OK
            </Button>
          </div>
        </div>
      )}

      {/* Backdrop to close */}
      {open && (
        // biome-ignore lint/a11y/useKeyWithClickEvents: backdrop click-to-close is standard UX, keyboard trap is handled within the popup
        <div className="fixed inset-0 z-40" onClick={closePopup} />
      )}
    </div>
  );
}
