"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckIcon, CloseIcon } from "@/components/ui/icons";
import {
  calculateBackspacingInches,
  calculateTireDiameterInches,
  tireDiameterDeltaPercent,
  boltPatternsMatch,
} from "@/lib/fitment/calculator";

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="glass-raised elev-1 rounded-[22px] p-5">
      <h2 className="mb-4 text-[1.1875rem] font-bold tracking-[-0.015em]">{title}</h2>
      {children}
    </section>
  );
}

/** The answer well under each calculator — a recessed panel where the
 * result reads like an instrument readout. */
function Result({ children }: { children: React.ReactNode }) {
  return (
    <div className="glass-inset mt-4 rounded-[16px] px-4 py-3.5 text-[0.9375rem]" aria-live="polite">
      {children}
    </div>
  );
}

function Readout({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-[0.875rem] text-muted">{label}</span>
      <span className="numeral text-[1.375rem] leading-tight">{value}</span>
    </div>
  );
}

function BackspacingCalculator() {
  const [width, setWidth] = useState("");
  const [offset, setOffset] = useState("");

  const w = Number(width);
  const o = Number(offset);
  const valid = width.trim() !== "" && offset.trim() !== "" && !Number.isNaN(w) && !Number.isNaN(o);
  const result = valid ? calculateBackspacingInches(w, o) : null;

  return (
    <Card title="Backspacing">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="bs-width">Wheel width (in)</Label>
          <Input
            id="bs-width"
            inputMode="decimal"
            placeholder="9.5"
            value={width}
            onChange={(e) => setWidth(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="bs-offset">Offset (mm)</Label>
          <Input
            id="bs-offset"
            inputMode="decimal"
            placeholder="35"
            value={offset}
            onChange={(e) => setOffset(e.target.value)}
          />
        </div>
      </div>
      <Result>
        {result !== null ? (
          <Readout label="Backspacing" value={`${result.toFixed(2)}″`} />
        ) : (
          <span className="text-muted">
            Enter wheel width and offset to calculate.
          </span>
        )}
      </Result>
    </Card>
  );
}

function TireDiameterCalculator() {
  const [currentSize, setCurrentSize] = useState({ width: "245", ar: "40", rim: "18" });
  const [proposedSize, setProposedSize] = useState({ width: "", ar: "", rim: "" });

  function parse(size: typeof currentSize) {
    const widthMm = Number(size.width);
    const aspectRatio = Number(size.ar);
    const rimDiameterInches = Number(size.rim);
    if (
      size.width.trim() === "" ||
      size.ar.trim() === "" ||
      size.rim.trim() === "" ||
      Number.isNaN(widthMm) ||
      Number.isNaN(aspectRatio) ||
      Number.isNaN(rimDiameterInches)
    ) {
      return null;
    }
    return { widthMm, aspectRatio, rimDiameterInches };
  }

  const current = parse(currentSize);
  const proposed = parse(proposedSize);

  return (
    <Card title="Tire diameter comparison">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="mb-2 px-1 text-[0.8125rem] font-medium text-muted">Current</p>
          <div className="flex flex-col gap-2">
            <Input
              placeholder="Width (mm)"
              inputMode="decimal"
              value={currentSize.width}
              onChange={(e) => setCurrentSize({ ...currentSize, width: e.target.value })}
            />
            <Input
              placeholder="Aspect ratio"
              inputMode="decimal"
              value={currentSize.ar}
              onChange={(e) => setCurrentSize({ ...currentSize, ar: e.target.value })}
            />
            <Input
              placeholder="Rim (in)"
              inputMode="decimal"
              value={currentSize.rim}
              onChange={(e) => setCurrentSize({ ...currentSize, rim: e.target.value })}
            />
          </div>
        </div>
        <div>
          <p className="mb-2 px-1 text-[0.8125rem] font-medium text-muted">Proposed</p>
          <div className="flex flex-col gap-2">
            <Input
              placeholder="Width (mm)"
              inputMode="decimal"
              value={proposedSize.width}
              onChange={(e) => setProposedSize({ ...proposedSize, width: e.target.value })}
            />
            <Input
              placeholder="Aspect ratio"
              inputMode="decimal"
              value={proposedSize.ar}
              onChange={(e) => setProposedSize({ ...proposedSize, ar: e.target.value })}
            />
            <Input
              placeholder="Rim (in)"
              inputMode="decimal"
              value={proposedSize.rim}
              onChange={(e) => setProposedSize({ ...proposedSize, rim: e.target.value })}
            />
          </div>
        </div>
      </div>
      <Result>
        {current && proposed ? (
          <div className="flex flex-col gap-1.5">
            <Readout label="Current" value={`${calculateTireDiameterInches(current).toFixed(2)}″`} />
            <Readout label="Proposed" value={`${calculateTireDiameterInches(proposed).toFixed(2)}″`} />
            <div className="my-0.5 h-px bg-border" />
            <Readout
              label="Difference"
              value={`${tireDiameterDeltaPercent(current, proposed) > 0 ? "+" : ""}${tireDiameterDeltaPercent(current, proposed).toFixed(2)}%`}
            />
          </div>
        ) : (
          <span className="text-muted">
            Enter both tire sizes to compare.
          </span>
        )}
      </Result>
    </Card>
  );
}

function BoltPatternCalculator() {
  const [a, setA] = useState("");
  const [b, setB] = useState("");

  const match = a.trim() && b.trim() ? boltPatternsMatch(a, b) : undefined;

  return (
    <Card title="Bolt pattern match">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="bp-a">Vehicle pattern</Label>
          <Input
            id="bp-a"
            placeholder="5x114.3"
            value={a}
            onChange={(e) => setA(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="bp-b">Wheel pattern</Label>
          <Input
            id="bp-b"
            placeholder="5x114.3"
            value={b}
            onChange={(e) => setB(e.target.value)}
          />
        </div>
      </div>
      <Result>
        {match === undefined ? (
          <span className="text-muted">Enter both bolt patterns to check.</span>
        ) : match === null ? (
          <span className="text-muted">
            Insufficient data — use the format 5x114.3.
          </span>
        ) : match ? (
          <span className="flex items-center gap-2 font-semibold text-success">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-success text-white">
              <CheckIcon className="h-3.5 w-3.5" />
            </span>
            Bolt patterns match
          </span>
        ) : (
          <span className="flex items-center gap-2 font-semibold text-danger">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-danger text-white">
              <CloseIcon className="h-3.5 w-3.5" />
            </span>
            Bolt patterns don&apos;t match
          </span>
        )}
      </Result>
    </Card>
  );
}

export function FitmentCalculator() {
  return (
    <div className="flex flex-col gap-5">
      <BackspacingCalculator />
      <TireDiameterCalculator />
      <BoltPatternCalculator />
    </div>
  );
}
