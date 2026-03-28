"use client";

import React, { useMemo, useEffect, useRef } from "react";
import { Grid as GridType, SolveStep, ConstraintSet } from "@/lib/solver/types";

const C: Record<string, string> = {
  classic:  "var(--c-classic)",
  killer:   "var(--c-killer)",
  thermo:   "var(--c-thermo)",
  arrow:    "var(--c-arrow)",
  kropki:   "var(--c-kropki)",
  evenOdd:  "var(--c-evenodd)",
  diagonal: "var(--c-diagonal)",
};

interface SudokuGridProps {
  grid: GridType;
  solution?: GridType | null;
  currentStep?: SolveStep | null;
  constraints?: ConstraintSet;
  selectedCells?: Set<string>;
  highlightedCells?: Set<string>;
  onCellClick?: (r: number, c: number) => void;
  onCellMouseEnter?: (r: number, c: number) => void;
  cellSize?: number;
}

const CELL = 52;

export default function SudokuGrid({
  grid,
  solution = null,
  currentStep = null,
  constraints = {},
  selectedCells = new Set(),
  highlightedCells = new Set(),
  onCellClick,
  onCellMouseEnter,
  cellSize = CELL,
}: SudokuGridProps) {
  const prevStepRef = useRef<SolveStep | null>(null);

  // Build highlight map from step
  const stepHighlight = useMemo(() => {
    if (!currentStep?.highlight.cells.length) return new Set<string>();
    return new Set(currentStep.highlight.cells.map(([r, c]) => `${r},${c}`));
  }, [currentStep]);

  // Build removed-candidate set from current step
  const removedMap = useMemo(() => {
    const m = new Map<string, Set<number>>();
    if (!currentStep?.candidate_changes.length) return m;
    for (const ch of currentStep.candidate_changes) {
      const key = `${ch.cell[0]},${ch.cell[1]}`;
      m.set(key, new Set(ch.removed));
    }
    return m;
  }, [currentStep]);

  // Build candidates map from current step's solver_state
  const candidatesMap = useMemo(() => {
    if (!currentStep) return new Map<string, number[]>();
    const m = new Map<string, number[]>();
    // From remaining_candidates
    for (const [key, vals] of Object.entries(currentStep.solver_state.remaining_candidates)) {
      m.set(key, vals);
    }
    // From assigned (single candidate)
    for (const [r, c, val] of currentStep.solver_state.assigned) {
      m.set(`${r},${c}`, [val]);
    }
    return m;
  }, [currentStep]);

  // Killer cage map
  const killerMap = useMemo(() => {
    const m = new Map<string, { sum: number; isTopLeft: boolean }>();
    if (!constraints.killer) return m;
    for (const cage of constraints.killer) {
      let minR = 9, minC = 9;
      for (const [r, c] of cage.cells) {
        if (r < minR || (r === minR && c < minC)) { minR = r; minC = c; }
      }
      for (const [r, c] of cage.cells) {
        m.set(`${r},${c}`, { sum: cage.sum, isTopLeft: r === minR && c === minC });
      }
    }
    return m;
  }, [constraints.killer]);

  const cageEdgeMap = useMemo(() => {
    if (!constraints.killer) return new Map<string, { top: boolean; right: boolean; bottom: boolean; left: boolean }>();
    const cageId = new Map<string, number>();
    constraints.killer.forEach((cage, idx) => {
      for (const [r, c] of cage.cells) cageId.set(`${r},${c}`, idx);
    });
    const edgeMap = new Map<string, { top: boolean; right: boolean; bottom: boolean; left: boolean }>();
    for (const [key, idx] of cageId) {
      const [r, c] = key.split(",").map(Number);
      edgeMap.set(key, {
        top:    cageId.get(`${r - 1},${c}`) !== idx,
        right:  cageId.get(`${r},${c + 1}`) !== idx,
        bottom: cageId.get(`${r + 1},${c}`) !== idx,
        left:   cageId.get(`${r},${c - 1}`) !== idx,
      });
    }
    return edgeMap;
  }, [constraints.killer]);

  const evenOddMap = useMemo(() => {
    const m = new Map<string, "even" | "odd">();
    if (!constraints.evenOdd) return m;
    for (const { cell: [r, c], parity } of constraints.evenOdd) m.set(`${r},${c}`, parity);
    return m;
  }, [constraints.evenOdd]);

  const diagSet = useMemo(() => {
    const s = new Set<string>();
    if (!constraints.diagonal) return s;
    for (const { direction } of constraints.diagonal) {
      for (let i = 0; i < 9; i++) s.add(direction === "main" ? `${i},${i}` : `${i},${8 - i}`);
    }
    return s;
  }, [constraints.diagonal]);

  const thermoSet = useMemo(() => {
    const m = new Map<string, { order: number; total: number }>();
    if (!constraints.thermo) return m;
    for (const t of constraints.thermo) {
      t.cells.forEach(([r, c], i) => m.set(`${r},${c}`, { order: i, total: t.cells.length }));
    }
    return m;
  }, [constraints.thermo]);

  const kropkiMap = useMemo(() => {
    const m = new Map<string, "black" | "white">();
    if (!constraints.kropki) return m;
    for (const { cells: [[r1, c1], [r2, c2]], type } of constraints.kropki) {
      m.set(`${r1},${c1}-${r2},${c2}`, type);
      m.set(`${r2},${c2}-${r1},${c1}`, type);
    }
    return m;
  }, [constraints.kropki]);

  function getCellValue(r: number, c: number): number | null {
    if (grid[r]?.[c] != null) return grid[r][c];
    // From current step state
    if (currentStep) {
      const key = `${r},${c}`;
      const vals = candidatesMap.get(key);
      if (vals?.length === 1) return vals[0];
      return null;
    }
    if (solution?.[r]?.[c] != null) return solution[r][c];
    return null;
  }

  const cells = Array.from({ length: 81 }, (_, idx) => {
    const r = Math.floor(idx / 9);
    const c = idx % 9;
    const key = `${r},${c}`;
    const val = getCellValue(r, c);
    const isGiven = grid[r]?.[c] != null;
    const isSolved = !isGiven && val != null;
    const isSelected = selectedCells.has(key);
    const isHighlighted = highlightedCells.has(key);
    const isStepHighlight = stepHighlight.has(key);
    const isDiag = diagSet.has(key);
    const killer = killerMap.get(key);
    const killerEdge = cageEdgeMap.get(key);
    const thermo = thermoSet.get(key);
    const eo = evenOddMap.get(key);

    // Candidates to display
    const stepCands = candidatesMap.get(key) ?? [];
    const removedVals = removedMap.get(key) ?? new Set<number>();
    const showCands = currentStep && val == null && (stepCands.length > 1 || removedVals.size > 0);

    const bordR = (c + 1) % 3 === 0 && c !== 8 ? "2px solid var(--border-box)" : "1px solid var(--border-grid)";
    const bordB = (r + 1) % 3 === 0 && r !== 8 ? "2px solid var(--border-box)" : "1px solid var(--border-grid)";

    let bg = "var(--bg)";
    if (isDiag) bg = "rgba(251,191,36,0.06)";
    if (isHighlighted) bg = "#fef9c3";
    if (isStepHighlight) bg = `color-mix(in srgb, ${currentStep?.highlight.color ?? "#6366f1"} 15%, var(--bg))`;
    if (isSelected) bg = "#e0e7ff";

    const cageShadows: string[] = [];
    if (killerEdge) {
      if (killerEdge.top)    cageShadows.push("inset 0  2px 0 0 " + C.killer);
      if (killerEdge.right)  cageShadows.push("inset -2px 0 0 0 " + C.killer);
      if (killerEdge.bottom) cageShadows.push("inset 0 -2px 0 0 " + C.killer);
      if (killerEdge.left)   cageShadows.push("inset 2px 0 0 0 " + C.killer);
    }

    return (
      <div
        key={key}
        data-cell={key}
        onClick={() => onCellClick?.(r, c)}
        onMouseEnter={() => onCellMouseEnter?.(r, c)}
        style={{
          width: cellSize, height: cellSize,
          display: "flex", alignItems: "center", justifyContent: "center",
          position: "relative",
          borderRight: c === 8 ? "none" : bordR,
          borderBottom: r === 8 ? "none" : bordB,
          borderLeft: c === 0 ? "none" : undefined,
          borderTop: r === 0 ? "none" : undefined,
          background: bg,
          cursor: onCellClick ? "pointer" : "default",
          boxShadow: cageShadows.length ? cageShadows.join(", ") : undefined,
          transition: "background 0.2s",
          zIndex: isSelected || isStepHighlight ? 2 : 1,
          overflow: "hidden",
        }}
      >
        {/* Diagonal tint */}
        {isDiag && <div style={{ position: "absolute", inset: 0, background: "rgba(251,191,36,0.07)", pointerEvents: "none" }} />}

        {/* Even/odd indicator */}
        {eo && (
          <div style={{
            position: "absolute", bottom: 2, right: 2,
            width: 6, height: 6,
            borderRadius: eo === "even" ? "50%" : 0,
            background: C.evenOdd, opacity: 0.6,
          }} />
        )}

        {/* Killer sum label */}
        {killer?.isTopLeft && (
          <span style={{ position: "absolute", top: 1, left: 2, fontSize: 8, fontWeight: 700, lineHeight: 1, color: C.killer, zIndex: 5 }}>
            {killer.sum}
          </span>
        )}

        {/* Thermo bulb */}
        {thermo?.order === 0 && (
          <div style={{ position: "absolute", inset: 6, borderRadius: "50%", border: `2px solid ${C.thermo}`, opacity: 0.5, pointerEvents: "none" }} />
        )}

        {/* Cell value or candidates */}
        {val != null ? (
          <span style={{
            fontSize: cellSize >= 52 ? "1.125rem" : "0.875rem",
            fontWeight: isGiven ? 700 : 500,
            color: isGiven ? "var(--text)" : isSolved ? "#1d4ed8" : "var(--text-muted)",
            zIndex: 3, position: "relative",
            transition: "color 0.2s",
          }}>
            {val}
          </span>
        ) : showCands ? (
          // 3×3 candidate grid
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(3,1fr)",
            gridTemplateRows: "repeat(3,1fr)",
            width: "100%", height: "100%",
            padding: 1,
            pointerEvents: "none", zIndex: 3,
          }}>
            {[1,2,3,4,5,6,7,8,9].map(num => {
              const isRemaining = stepCands.includes(num);
              const isRemoved = removedVals.has(num);
              if (!isRemaining && !isRemoved) return <div key={num} />;
              return (
                <div key={num} style={{
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: cellSize >= 52 ? "0.6rem" : "0.45rem",
                  fontWeight: isRemoved ? 700 : 400,
                  color: isRemoved ? "#ef4444" : "var(--text-muted)",
                  opacity: isRemoved ? 1 : 0.55,
                  textDecoration: isRemoved ? "line-through" : "none",
                  transition: "all 0.25s ease",
                  lineHeight: 1,
                }}>
                  {num}
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    );
  });

  return (
    <div style={{ position: "relative", width: "fit-content" }}>
      <div style={{
        display: "grid",
        gridTemplateColumns: `repeat(9,${cellSize}px)`,
        border: "2px solid var(--border-box)",
        width: "fit-content",
        background: "var(--bg)",
      }}>
        {cells}
      </div>
      <SvgOverlay constraints={constraints} cellSize={cellSize} stepHighlight={stepHighlight} currentStep={currentStep} />
    </div>
  );
}

function SvgOverlay({ constraints, cellSize, stepHighlight, currentStep }: {
  constraints: ConstraintSet; cellSize: number; stepHighlight: Set<string>; currentStep?: SolveStep | null;
}) {
  const W = 9 * cellSize;
  const half = cellSize / 2;
  const cx = (col: number) => col * cellSize + half;
  const cy = (row: number) => row * cellSize + half;

  const thermos = constraints.thermo ?? [];
  const arrows = constraints.arrow ?? [];
  const kropki = constraints.kropki ?? [];

  if (!thermos.length && !arrows.length && !kropki.length) return null;

  const renderedDots = new Set<string>();
  const dotElements: React.ReactNode[] = [];
  for (const { cells: [[r1, c1], [r2, c2]], type } of kropki) {
    const k = [[r1, c1], [r2, c2]].map(([a, b]) => `${a},${b}`).sort().join("|");
    if (renderedDots.has(k)) continue;
    renderedDots.add(k);
    const x = (cx(c1) + cx(c2)) / 2;
    const y = (cy(r1) + cy(r2)) / 2;
    dotElements.push(
      <g key={k}>
        <circle cx={x} cy={y} r={5} fill={type === "black" ? "var(--text)" : "white"} stroke="var(--text)" strokeWidth={1.5} />
      </g>
    );
  }

  return (
    <svg style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none", zIndex: 20 }} width={W} height={W} viewBox={`0 0 ${W} ${W}`}>
      {thermos.map((t, ti) => (
        <g key={`thermo-${ti}`}>
          <circle cx={cx(t.cells[0][1])} cy={cy(t.cells[0][0])} r={cellSize * 0.28}
            fill="none" stroke={C.thermo} strokeWidth={2} opacity={0.65} />
          {t.cells.slice(0, -1).map(([r, c], i) => (
            <line key={i} x1={cx(c)} y1={cy(r)} x2={cx(t.cells[i+1][1])} y2={cy(t.cells[i+1][0])}
              stroke={C.thermo} strokeWidth={4} strokeLinecap="round" opacity={0.35} />
          ))}
        </g>
      ))}
      {arrows.map((a, ai) => {
        const [cr, cc] = a.circle;
        const path = a.arrow;
        return (
          <g key={`arrow-${ai}`}>
            <circle cx={cx(cc)} cy={cy(cr)} r={cellSize * 0.35} fill="none" stroke={C.arrow} strokeWidth={1.5} opacity={0.7} />
            {path.slice(0, -1).map(([r, c], i) => (
              <line key={i} x1={cx(c)} y1={cy(r)} x2={cx(path[i+1][1])} y2={cy(path[i+1][0])}
                stroke={C.arrow} strokeWidth={1.5} strokeLinecap="round" opacity={0.6} />
            ))}
            {path.length >= 1 && (() => {
              const [lr, lc] = path[path.length - 1];
              const [pr, pc] = path.length > 1 ? path[path.length - 2] : [cr, cc];
              const angle = Math.atan2(cy(lr) - cy(pr), cx(lc) - cx(pc));
              const ax = cx(lc) - Math.cos(angle) * 4;
              const ay = cy(lr) - Math.sin(angle) * 4;
              return (
                <polygon
                  points={`${cx(lc)},${cy(lr)} ${ax - Math.sin(angle)*4},${ay + Math.cos(angle)*4} ${ax + Math.sin(angle)*4},${ay - Math.cos(angle)*4}`}
                  fill={C.arrow} opacity={0.7} />
              );
            })()}
          </g>
        );
      })}
      {dotElements}
    </svg>
  );
}
