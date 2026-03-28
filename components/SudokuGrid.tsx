"use client";

import React, { useMemo } from "react";
import { clsx } from "clsx";
import {
  Grid as GridType,
  SolveStep,
  ConstraintSet,
  KillerCage,
} from "@/lib/solver/types";

interface GridProps {
  grid: GridType;
  solution: GridType | null;
  currentStep: SolveStep | null;
  constraints: ConstraintSet;
  onCellClick?: (r: number, c: number) => void;
  editMode?: boolean;
}

// Color mappings for constraint types
const CONSTRAINT_PALETTE: Record<string, string> = {
  classic: "rgba(99,102,241,0.25)",
  killer: "rgba(245,158,11,0.25)",
  thermo: "rgba(239,68,68,0.25)",
  arrow: "rgba(34,211,238,0.25)",
  kropki: "rgba(168,85,247,0.25)",
  evenOdd: "rgba(16,185,129,0.25)",
  diagonal: "rgba(249,115,22,0.25)",
};

const CONSTRAINT_BORDER: Record<string, string> = {
  classic: "#6366f1",
  killer: "#f59e0b",
  thermo: "#ef4444",
  arrow: "#22d3ee",
  kropki: "#a855f7",
  evenOdd: "#10b981",
  diagonal: "#f97316",
};

export default function SudokuGrid({
  grid,
  solution,
  currentStep,
  constraints,
  onCellClick,
  editMode = false,
}: GridProps) {
  // Build cell highlight map from current step
  const highlightMap = useMemo(() => {
    const map = new Map<string, { bg: string; border: string }>();
    if (!currentStep) return map;
    const color = currentStep.highlight.color;
    for (const [r, c] of currentStep.highlight.cells) {
      map.set(`${r},${c}`, {
        bg: `${color}33`,
        border: color,
      });
    }
    return map;
  }, [currentStep]);

  // Build killer cage map: cell → { cage, color }
  const killerMap = useMemo(() => {
    const map = new Map<string, { sum: number; isTopLeft: boolean; color: string }>();
    if (!constraints.killer) return map;
    const colors = ["#f59e0b", "#fb923c", "#facc15", "#a3e635", "#34d399"];
    constraints.killer.forEach((cage, idx) => {
      const color = colors[idx % colors.length];
      // Find top-left cell
      let minR = 9, minC = 9;
      for (const [r, c] of cage.cells) {
        if (r < minR || (r === minR && c < minC)) { minR = r; minC = c; }
      }
      for (const [r, c] of cage.cells) {
        map.set(`${r},${c}`, {
          sum: cage.sum,
          isTopLeft: r === minR && c === minC,
          color,
        });
      }
    });
    return map;
  }, [constraints.killer]);

  // Thermo cells set
  const thermoSet = useMemo(() => {
    const map = new Map<string, { order: number; total: number; thermoIdx: number }>();
    if (!constraints.thermo) return map;
    constraints.thermo.forEach((t, ti) => {
      t.cells.forEach(([r, c], i) => {
        map.set(`${r},${c}`, { order: i, total: t.cells.length, thermoIdx: ti });
      });
    });
    return map;
  }, [constraints.thermo]);

  // Even/Odd set
  const evenOddMap = useMemo(() => {
    const map = new Map<string, "even" | "odd">();
    if (!constraints.evenOdd) return map;
    for (const { cell: [r, c], parity } of constraints.evenOdd) {
      map.set(`${r},${c}`, parity);
    }
    return map;
  }, [constraints.evenOdd]);

  // Diagonal cells
  const diagSet = useMemo(() => {
    const s = new Set<string>();
    if (!constraints.diagonal) return s;
    for (const { direction } of constraints.diagonal) {
      for (let i = 0; i < 9; i++) {
        if (direction === "main") s.add(`${i},${i}`);
        else s.add(`${i},${8 - i}`);
      }
    }
    return s;
  }, [constraints.diagonal]);

  // Kropki dots map: key = "r1,c1-r2,c2"
  const kropkiMap = useMemo(() => {
    const map = new Map<string, "black" | "white">();
    if (!constraints.kropki) return map;
    for (const { cells: [[r1, c1], [r2, c2]], type } of constraints.kropki) {
      map.set(`${r1},${c1}-${r2},${c2}`, type);
      map.set(`${r2},${c2}-${r1},${c1}`, type);
    }
    return map;
  }, [constraints.kropki]);

  function getCellValue(r: number, c: number): number | null {
    if (grid[r][c] != null) return grid[r][c];
    if (solution) return solution[r][c];
    return null;
  }

  function isGiven(r: number, c: number): boolean {
    return grid[r][c] != null;
  }

  function isSolved(r: number, c: number): boolean {
    return grid[r][c] == null && solution != null && solution[r][c] != null;
  }

  return (
    <div className="relative select-none">
      {/* Diagonal overlay */}
      {diagSet.size > 0 && (
        <div className="absolute inset-0 pointer-events-none z-0">
          {/* Visual diagonal tint rendered via cells */}
        </div>
      )}

      <div
        className="grid gap-0 border-2 border-slate-300/60 rounded-xl overflow-hidden shadow-2xl"
        style={{ gridTemplateColumns: "repeat(9, 1fr)" }}
      >
        {Array.from({ length: 9 }, (_, r) =>
          Array.from({ length: 9 }, (_, c) => {
            const key = `${r},${c}`;
            const highlight = highlightMap.get(key);
            const killer = killerMap.get(key);
            const thermo = thermoSet.get(key);
            const evenOdd = evenOddMap.get(key);
            const isDiag = diagSet.has(key);
            const val = getCellValue(r, c);
            const given = isGiven(r, c);
            const solved = isSolved(r, c);

            // Borders: thick on box boundaries
            const borderRight = (c + 1) % 3 === 0 && c !== 8 ? "border-r-2 border-r-slate-400/80" : "border-r border-r-slate-600/30";
            const borderBottom = (r + 1) % 3 === 0 && r !== 8 ? "border-b-2 border-b-slate-400/80" : "border-b border-b-slate-600/30";

            return (
              <div
                key={key}
                className={clsx(
                  "relative flex items-center justify-center",
                  "w-12 h-12 md:w-14 md:h-14 text-lg font-bold",
                  "transition-all duration-200 cursor-pointer",
                  borderRight, borderBottom,
                  editMode && !given && "hover:bg-indigo-500/10",
                  isDiag && !highlight && "bg-orange-500/8",
                )}
                style={{
                  backgroundColor: highlight?.bg ?? (isDiag ? "rgba(249,115,22,0.06)" : undefined),
                  boxShadow: highlight ? `inset 0 0 0 2px ${highlight.border}` : undefined,
                  ...(killer && !highlight ? {
                    boxShadow: `inset 0 0 0 1.5px ${killer.color}88`,
                    backgroundColor: `${killer.color}11`,
                  } : {}),
                }}
                onClick={() => onCellClick?.(r, c)}
              >
                {/* Diagonal tint */}
                {isDiag && (
                  <div className="absolute inset-0 bg-orange-400/6 pointer-events-none" />
                )}

                {/* Even/Odd shape */}
                {evenOdd && !val && (
                  <div
                    className={clsx(
                      "absolute inset-1.5 opacity-20",
                      evenOdd === "even" ? "rounded-full bg-emerald-400" : "bg-emerald-400"
                    )}
                  />
                )}

                {/* Thermo bulb/stem */}
                {thermo && (
                  <div
                    className={clsx("absolute inset-0 pointer-events-none flex items-center justify-center")}
                  >
                    {thermo.order === 0 ? (
                      <div className="w-8 h-8 rounded-full border-2 border-red-400/60 bg-red-400/10" />
                    ) : (
                      <div className="w-2 h-2 rounded-full bg-red-400/40" />
                    )}
                  </div>
                )}

                {/* Killer sum label */}
                {killer?.isTopLeft && (
                  <span
                    className="absolute top-0.5 left-0.5 text-[9px] font-bold leading-none z-10"
                    style={{ color: killer.color }}
                  >
                    {killer.sum}
                  </span>
                )}

                {/* Cell value */}
                {val != null ? (
                  <span
                    className={clsx(
                      "z-10 transition-all duration-300",
                      given
                        ? "text-white font-black"
                        : solved
                        ? "text-indigo-400 font-semibold"
                        : "text-slate-400",
                      currentStep?.type === "value_fixed" &&
                        currentStep.cells.some(([cr, cc]) => cr === r && cc === c)
                        ? "scale-110 text-emerald-400"
                        : ""
                    )}
                  >
                    {val}
                  </span>
                ) : null}
              </div>
            );
          })
        )}
      </div>

      {/* Kropki dots overlay - SVG */}
      <KropkiOverlay kropkiMap={kropkiMap} />

      {/* Thermo lines overlay */}
      {constraints.thermo && constraints.thermo.length > 0 && (
        <ThermoOverlay thermos={constraints.thermo} />
      )}
    </div>
  );
}

// ─── Thermo line overlay ───────────────────────────────────────
function ThermoOverlay({
  thermos,
}: {
  thermos: Array<{ cells: [number, number][] }>;
}) {
  const CELL = 56; // px per cell (md size)
  const OFFSET = 28; // center of cell

  return (
    <svg
      className="absolute inset-0 pointer-events-none z-20"
      style={{ width: "100%", height: "100%" }}
      viewBox={`0 0 ${9 * CELL} ${9 * CELL}`}
    >
      <defs>
        <linearGradient id="thermo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ef4444" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#f97316" stopOpacity="0.7" />
        </linearGradient>
      </defs>
      {thermos.map((t, ti) => (
        <g key={ti}>
          {/* Bulb */}
          <circle
            cx={t.cells[0][1] * CELL + OFFSET}
            cy={t.cells[0][0] * CELL + OFFSET}
            r={16}
            fill="none"
            stroke="url(#thermo-grad)"
            strokeWidth={3}
            opacity={0.6}
          />
          {/* Line */}
          {t.cells.slice(0, -1).map((cell, i) => (
            <line
              key={i}
              x1={cell[1] * CELL + OFFSET}
              y1={cell[0] * CELL + OFFSET}
              x2={t.cells[i + 1][1] * CELL + OFFSET}
              y2={t.cells[i + 1][0] * CELL + OFFSET}
              stroke="url(#thermo-grad)"
              strokeWidth={6}
              strokeLinecap="round"
              opacity={0.5}
            />
          ))}
        </g>
      ))}
    </svg>
  );
}

// ─── Kropki dot overlay ────────────────────────────────────────
function KropkiOverlay({
  kropkiMap,
}: {
  kropkiMap: Map<string, "black" | "white">;
}) {
  const CELL = 56;
  const OFFSET = 28;
  const rendered = new Set<string>();
  const dots: React.ReactNode[] = [];

  for (const [key, type] of kropkiMap.entries()) {
    const [a, b] = key.split("-");
    const canonical = [a, b].sort().join("-");
    if (rendered.has(canonical)) continue;
    rendered.add(canonical);

    const [r1, c1] = a.split(",").map(Number);
    const [r2, c2] = b.split(",").map(Number);
    const x = ((c1 + c2) / 2) * CELL + OFFSET;
    const y = ((r1 + r2) / 2) * CELL + OFFSET;

    dots.push(
      <circle
        key={canonical}
        cx={x}
        cy={y}
        r={6}
        fill={type === "black" ? "#1e1b4b" : "white"}
        stroke={type === "black" ? "#a855f7" : "#a855f7"}
        strokeWidth={2}
      />
    );
  }

  if (dots.length === 0) return null;

  return (
    <svg
      className="absolute inset-0 pointer-events-none z-30"
      style={{ width: "100%", height: "100%" }}
      viewBox={`0 0 ${9 * CELL} ${9 * CELL}`}
    >
      {dots}
    </svg>
  );
}
