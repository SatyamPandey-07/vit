"use client";

import React, { useMemo } from "react";
import {
  Grid as GridType,
  SolveStep,
  ConstraintSet,
} from "@/lib/solver/types";

// ── Constraint colour tokens (CSS vars) ─────────────────
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
  highlightedCells?: Set<string>;      // creator: multi-select
  onCellClick?: (r: number, c: number) => void;
  onCellMouseEnter?: (r: number, c: number) => void;
  cellSize?: number; // px, default 52
}

const CELL = 52; // keep in sync with SVG calcs below

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
  // ── Build highlight map from step ──────────────────────
  const stepHighlight = useMemo(() => {
    if (!currentStep?.highlight.cells.length) return new Set<string>();
    return new Set(currentStep.highlight.cells.map(([r, c]) => `${r},${c}`));
  }, [currentStep]);

  // ── Killer cage map ────────────────────────────────────
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

  // ── Even/odd map ───────────────────────────────────────
  const evenOddMap = useMemo(() => {
    const m = new Map<string, "even" | "odd">();
    if (!constraints.evenOdd) return m;
    for (const { cell: [r, c], parity } of constraints.evenOdd) m.set(`${r},${c}`, parity);
    return m;
  }, [constraints.evenOdd]);

  // ── Diagonal set ───────────────────────────────────────
  const diagSet = useMemo(() => {
    const s = new Set<string>();
    if (!constraints.diagonal) return s;
    for (const { direction } of constraints.diagonal) {
      for (let i = 0; i < 9; i++)
        s.add(direction === "main" ? `${i},${i}` : `${i},${8 - i}`);
    }
    return s;
  }, [constraints.diagonal]);

  // ── Thermo set ────────────────────────────────────────
  const thermoSet = useMemo(() => {
    const m = new Map<string, { order: number; total: number }>();
    if (!constraints.thermo) return m;
    for (const t of constraints.thermo) {
      t.cells.forEach(([r, c], i) =>
        m.set(`${r},${c}`, { order: i, total: t.cells.length })
      );
    }
    return m;
  }, [constraints.thermo]);

  // ── Kropki map (for dots between cells) ───────────────
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
    if (solution?.[r]?.[c] != null) return solution[r][c];
    return null;
  }

  // ── Killer cage border computation ────────────────────
  // We draw dashed outlines on cage edges (cells that border outside-cage cells)
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

  const cells = Array.from({ length: 81 }, (_, idx) => {
    const r = Math.floor(idx / 9);
    const c = idx % 9;
    const key = `${r},${c}`;
    const val = getCellValue(r, c);
    const isGiven = grid[r]?.[c] != null;
    const isSolved = !isGiven && solution?.[r]?.[c] != null;
    const isSelected = selectedCells.has(key);
    const isHighlighted = highlightedCells.has(key);
    const isStepHighlight = stepHighlight.has(key);
    const isDiag = diagSet.has(key);
    const killer = killerMap.get(key);
    const killerEdge = cageEdgeMap.get(key);
    const thermo = thermoSet.get(key);
    const eo = evenOddMap.get(key);

    // Border: thick on box boundaries
    const borderRight = (c + 1) % 3 === 0 && c !== 8
      ? "2px solid var(--border-box)" : "1px solid var(--border-grid)";
    const borderBottom = (r + 1) % 3 === 0 && r !== 8
      ? "2px solid var(--border-box)" : "1px solid var(--border-grid)";
    const borderLeft  = c === 0 ? "none" : undefined;
    const borderTop   = r === 0 ? "none" : undefined;

    // Background
    let bg = "var(--bg)";
    if (isDiag) bg = "#fafafa";
    if (isHighlighted) bg = "#fef9c3";
    if (isStepHighlight) bg = "#dbeafe";
    if (isSelected) bg = "#e0e7ff";

    // Cage dashed edge shadows (inset box-shadow trick)
    const cageShadows: string[] = [];
    if (killerEdge) {
      const dash = "inset 0 0 0 0 transparent"; // placeholder
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
          width: cellSize,
          height: cellSize,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          borderRight: c === 8 ? "none" : borderRight,
          borderBottom: r === 8 ? "none" : borderBottom,
          borderLeft,
          borderTop,
          background: bg,
          cursor: onCellClick ? "pointer" : "default",
          boxShadow: cageShadows.length ? cageShadows.join(", ") : undefined,
          transition: "background 0.1s",
          zIndex: isSelected || isStepHighlight ? 2 : 1,
        }}
      >
        {/* Diagonal tint */}
        {isDiag && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(0,0,0,0.025)",
              pointerEvents: "none",
            }}
          />
        )}

        {/* Even/odd indicator (small corner shape) */}
        {eo && (
          <div
            style={{
              position: "absolute",
              bottom: 3,
              right: 3,
              width: 7,
              height: 7,
              borderRadius: eo === "even" ? "50%" : 0,
              background: C.evenOdd,
              opacity: 0.5,
            }}
          />
        )}

        {/* Killer sum label */}
        {killer?.isTopLeft && (
          <span
            style={{
              position: "absolute",
              top: 2,
              left: 3,
              fontSize: 9,
              fontWeight: 700,
              lineHeight: 1,
              color: C.killer,
              zIndex: 5,
            }}
          >
            {killer.sum}
          </span>
        )}

        {/* Thermo bulb at position 0 */}
        {thermo?.order === 0 && (
          <div
            style={{
              position: "absolute",
              inset: 6,
              borderRadius: "50%",
              border: `2px solid ${C.thermo}`,
              opacity: 0.5,
              pointerEvents: "none",
            }}
          />
        )}

        {/* Cell value */}
        {val != null && (
          <span
            style={{
              fontSize: cellSize >= 52 ? "1.125rem" : "0.875rem",
              fontWeight: isGiven ? 700 : 500,
              color: isGiven
                ? "var(--text)"
                : isSolved
                ? "#1d4ed8"
                : "var(--text-muted)",
              zIndex: 3,
              position: "relative",
            }}
          >
            {val}
          </span>
        )}
      </div>
    );
  });

  return (
    <div style={{ position: "relative", width: "fit-content" }}>
      {/* Main grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(9, ${cellSize}px)`,
          border: "2px solid var(--border-box)",
          width: "fit-content",
          background: "var(--bg)",
        }}
      >
        {cells}
      </div>

      {/* SVG overlay for thermo lines, arrows, kropki dots */}
      <SvgOverlay
        constraints={constraints}
        cellSize={cellSize}
        stepHighlight={stepHighlight}
        currentStep={currentStep}
      />
    </div>
  );
}

// ── SVG Overlay ───────────────────────────────────────────
function SvgOverlay({
  constraints,
  cellSize,
  stepHighlight,
  currentStep,
}: {
  constraints: ConstraintSet;
  cellSize: number;
  stepHighlight: Set<string>;
  currentStep?: SolveStep | null;
}) {
  const W = 9 * cellSize;
  const half = cellSize / 2;

  const cx = (c: number) => c * cellSize + half;
  const cy = (r: number) => r * cellSize + half;

  const thermos = constraints.thermo ?? [];
  const arrows = constraints.arrow ?? [];
  const kropki = constraints.kropki ?? [];

  if (!thermos.length && !arrows.length && !kropki.length) return null;

  // Deduplicate kropki dots
  const renderedDots = new Set<string>();
  const dotElements: React.ReactNode[] = [];
  for (const { cells: [[r1, c1], [r2, c2]], type } of kropki) {
    const key = [[r1, c1], [r2, c2]].map(([a, b]) => `${a},${b}`).sort().join("|");
    if (renderedDots.has(key)) continue;
    renderedDots.add(key);
    const x = (cx(c1) + cx(c2)) / 2;
    const y = (cy(r1) + cy(r2)) / 2;
    dotElements.push(
      <g key={key}>
        <circle cx={x} cy={y} r={5} fill={type === "black" ? "var(--text)" : "white"} stroke="var(--text)" strokeWidth={1.5} />
      </g>
    );
  }

  return (
    <svg
      style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none", zIndex: 20 }}
      width={W}
      height={W}
      viewBox={`0 0 ${W} ${W}`}
    >
      {/* Thermo lines */}
      {thermos.map((t, ti) => (
        <g key={`thermo-${ti}`}>
          {/* Bulb circle */}
          <circle
            cx={cx(t.cells[0][1])}
            cy={cy(t.cells[0][0])}
            r={cellSize * 0.28}
            fill="none"
            stroke={C.thermo}
            strokeWidth={2}
            opacity={0.6}
          />
          {/* Stem line */}
          {t.cells.slice(0, -1).map(([r, c], i) => (
            <line
              key={i}
              x1={cx(c)} y1={cy(r)}
              x2={cx(t.cells[i + 1][1])} y2={cy(t.cells[i + 1][0])}
              stroke={C.thermo}
              strokeWidth={4}
              strokeLinecap="round"
              opacity={0.35}
            />
          ))}
        </g>
      ))}

      {/* Arrow constraints */}
      {arrows.map((a, ai) => {
        const [cr, cc] = a.circle;
        const path = a.arrow;
        return (
          <g key={`arrow-${ai}`}>
            {/* Circle indicator */}
            <circle
              cx={cx(cc)} cy={cy(cr)}
              r={cellSize * 0.35}
              fill="none"
              stroke={C.arrow}
              strokeWidth={1.5}
              opacity={0.7}
            />
            {/* Arrow line */}
            {path.slice(0, -1).map(([r, c], i) => (
              <line
                key={i}
                x1={cx(c)} y1={cy(r)}
                x2={cx(path[i + 1][1])} y2={cy(path[i + 1][0])}
                stroke={C.arrow}
                strokeWidth={1.5}
                strokeLinecap="round"
                opacity={0.6}
              />
            ))}
            {/* Arrowhead */}
            {path.length >= 1 && (() => {
              const [lr, lc] = path[path.length - 1];
              const [pr, pc] = path.length > 1 ? path[path.length - 2] : [cr, cc];
              const angle = Math.atan2(cy(lr) - cy(pr), cx(lc) - cx(pc));
              const ax = cx(lc) - Math.cos(angle) * 4;
              const ay = cy(lr) - Math.sin(angle) * 4;
              return (
                <polygon
                  points={`
                    ${cx(lc)},${cy(lr)}
                    ${ax - Math.sin(angle) * 4},${ay + Math.cos(angle) * 4}
                    ${ax + Math.sin(angle) * 4},${ay - Math.cos(angle) * 4}
                  `}
                  fill={C.arrow}
                  opacity={0.7}
                />
              );
            })()}
          </g>
        );
      })}

      {/* Kropki dots */}
      {dotElements}
    </svg>
  );
}
