"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
    <div className="glass rounded-2xl p-5">
      <h2 className="mb-4 text-base font-semibold">{title}</h2>
      {children}
    </div>
  );
}

function Result({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-4 rounded-lg bg-background px-3.5 py-3 text-sm">
      {children}
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
          <>
            Backspacing: <strong>{result.toFixed(2)}&Prime;</strong>
          </>
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
          <p className="mb-2 text-xs font-medium text-muted">Current</p>
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
          <p className="mb-2 text-xs font-medium text-muted">Proposed</p>
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
          <div className="flex flex-col gap-1">
            <span>
              Current diameter:{" "}
              <strong>{calculateTireDiameterInches(current).toFixed(2)}&Prime;</strong>
            </span>
            <span>
              Proposed diameter:{" "}
              <strong>{calculateTireDiameterInches(proposed).toFixed(2)}&Prime;</strong>
            </span>
            <span>
              Difference:{" "}
              <strong>
                {tireDiameterDeltaPercent(current, proposed) > 0 ? "+" : ""}
                {tireDiameterDeltaPercent(current, proposed).toFixed(2)}%
              </strong>
            </span>
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
          <span className="text-success">Bolt patterns match.</span>
        ) : (
          <span className="text-danger">Bolt patterns do not match.</span>
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
