// ─────────────────────────────────────────────────────────────
//  Constraint Propagators
//  Each function:
//    1. Declares equation string
//    2. Narrows candidates via StepLogger (generic pipeline)
//    3. Returns void
// ─────────────────────────────────────────────────────────────

import { StepLogger } from "./candidates";
import {
  ConstraintSet,
  KillerCage,
  ThermoCell,
  ArrowConstraint,
  KropkiDot,
  EvenOddCell,
  Grid,
} from "./types";

// ─── Classic Sudoku ─────────────────────────────────────────
export function propagateClassic(log: StepLogger, grid: Grid): void {
  const cands = log.getCandidates();

  // For each row
  for (let r = 0; r < 9; r++) {
    const fixed = new Set<number>();
    for (let c = 0; c < 9; c++) {
      const v = grid[r][c];
      if (v != null) fixed.add(v);
    }
    if (fixed.size === 0) continue;
    const allowed = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9].filter((v) => !fixed.has(v)));
    for (let c = 0; c < 9; c++) {
      if (grid[r][c] != null) continue;
      const eq = `Row ${r + 1}: all distinct in {1..9}`;
      log.narrow(r, c, new Set([...cands[r][c]].filter(v => !fixed.has(v))), "classic", eq,
        `Row ${r + 1} already has [${[...fixed].join(",")}]`);
    }
  }

  // For each column
  for (let c = 0; c < 9; c++) {
    const fixed = new Set<number>();
    for (let r = 0; r < 9; r++) {
      const v = grid[r][c];
      if (v != null) fixed.add(v);
    }
    if (fixed.size === 0) continue;
    for (let r = 0; r < 9; r++) {
      if (grid[r][c] != null) continue;
      const eq = `Col ${c + 1}: all distinct in {1..9}`;
      log.narrow(r, c, new Set([...cands[r][c]].filter(v => !fixed.has(v))), "classic", eq,
        `Col ${c + 1} already has [${[...fixed].join(",")}]`);
    }
  }

  // For each box
  for (let br = 0; br < 3; br++) {
    for (let bc = 0; bc < 3; bc++) {
      const fixed = new Set<number>();
      for (let dr = 0; dr < 3; dr++) {
        for (let dc = 0; dc < 3; dc++) {
          const v = grid[br * 3 + dr][bc * 3 + dc];
          if (v != null) fixed.add(v);
        }
      }
      if (fixed.size === 0) continue;
      for (let dr = 0; dr < 3; dr++) {
        for (let dc = 0; dc < 3; dc++) {
          const r = br * 3 + dr;
          const c = bc * 3 + dc;
          if (grid[r][c] != null) continue;
          const eq = `Box (${br + 1},${bc + 1}): all distinct in {1..9}`;
          log.narrow(r, c, new Set([...cands[r][c]].filter(v => !fixed.has(v))), "classic", eq,
            `Box has [${[...fixed].join(",")}]`);
        }
      }
    }
  }
}

// ─── Killer Cages ───────────────────────────────────────────
export function propagateKiller(log: StepLogger, cages: KillerCage[]): void {
  const cands = log.getCandidates();

  for (const cage of cages) {
    const { cells, sum } = cage;
    const n = cells.length;
    const cellLabels = cells.map(([r, c]) => `x${r}${c}`).join(" + ");
    const eq = `${cellLabels} = ${sum}`;

    // Generate all valid combos (distinct, 1-9, sum==target)
    const validCombos = generateCombos(n, sum);

    // For each cell, gather which values appear in at least one valid combo
    for (let i = 0; i < cells.length; i++) {
      const [r, c] = cells[i];
      const possible = new Set<number>();
      for (const combo of validCombos) {
        possible.add(combo[i]);
      }
      // Intersect with current candidates
      const allowed = new Set([...cands[r][c]].filter((v) => possible.has(v)));
      log.narrow(r, c, allowed, "killer", eq,
        `Killer cage sum ${sum} over ${n} cells restricts values`);
    }
  }
}

/** Generate all ordered permutation-like combos of n distinct digits (1-9) that sum to target */
function generateCombos(n: number, target: number): number[][] {
  const results: number[][] = [];
  function recurse(
    remaining: number,
    minVal: number,
    current: number[],
    used: Set<number>
  ) {
    if (current.length === n) {
      if (remaining === 0) results.push([...current]);
      return;
    }
    for (let v = minVal; v <= 9; v++) {
      if (used.has(v)) continue;
      if (v > remaining) break;
      used.add(v);
      current.push(v);
      recurse(remaining - v, v + 1, current, used);
      current.pop();
      used.delete(v);
    }
  }
  recurse(target, 1, [], new Set());
  return results;
}

// ─── Thermo ─────────────────────────────────────────────────
export function propagateThermo(log: StepLogger, thermos: ThermoCell[]): void {
  const cands = log.getCandidates();

  for (const thermo of thermos) {
    const { cells } = thermo;
    const n = cells.length;
    const labels = cells.map(([r, c], i) => `x${i + 1}`).join(" < ");
    const eq = `${labels}  (thermometer: strictly increasing)`;

    // Forward pass: cell[i] >= i+1 (min possible)
    for (let i = 0; i < n; i++) {
      const [r, c] = cells[i];
      const minVal = i + 1;
      const maxVal = 9 - (n - 1 - i);
      const allowed = new Set([...cands[r][c]].filter((v) => v >= minVal && v <= maxVal));
      log.narrow(r, c, allowed, "thermo", eq,
        `Thermo position ${i + 1}/${n}: must be in range [${minVal}..${maxVal}]`);
    }

    // Propagate actual min/max between neighbors
    for (let pass = 0; pass < 3; pass++) {
      // Forward
      for (let i = 1; i < n; i++) {
        const [pr, pc] = cells[i - 1];
        const [cr, cc] = cells[i];
        const prevMin = Math.min(...cands[pr][pc]);
        const allowed = new Set([...cands[cr][cc]].filter((v) => v > prevMin));
        log.narrow(cr, cc, allowed, "thermo", eq,
          `x${i + 1} > x${i} (prev min=${prevMin})`);
      }
      // Backward
      for (let i = n - 2; i >= 0; i--) {
        const [cr, cc] = cells[i];
        const [nr, nc] = cells[i + 1];
        const nextMax = Math.max(...cands[nr][nc]);
        const allowed = new Set([...cands[cr][cc]].filter((v) => v < nextMax));
        log.narrow(cr, cc, allowed, "thermo", eq,
          `x${i + 1} < x${i + 2} (next max=${nextMax})`);
      }
    }
  }
}

// ─── Arrow ──────────────────────────────────────────────────
export function propagateArrow(log: StepLogger, arrows: ArrowConstraint[]): void {
  const cands = log.getCandidates();

  for (const arrow of arrows) {
    const { circle, arrow: path } = arrow;
    const [cr, cc] = circle;
    const pathLabels = path.map((_, i) => `a${i + 1}`).join(" + ");
    const eq = `circle = ${pathLabels}`;

    // Min / max sum of arrow cells
    const minSum = path.reduce((s, [r, c]) => s + Math.min(...cands[r][c]), 0);
    const maxSum = path.reduce((s, [r, c]) => s + Math.max(...cands[r][c]), 0);

    // Restrict circle value to [minSum..maxSum] ∩ [1..9]
    const circleAllowed = new Set([...cands[cr][cc]].filter(
      (v) => v >= Math.max(1, minSum) && v <= Math.min(9, maxSum)
    ));
    log.narrow(cr, cc, circleAllowed, "arrow", `circle ∈ [${minSum}..${maxSum}]`,
      `Arrow sum range [${minSum}..${maxSum}] restricts circle`);

    // Restrict each arrow cell given circle range
    const circleMin = Math.min(...cands[cr][cc]);
    const circleMax = Math.max(...cands[cr][cc]);

    for (let i = 0; i < path.length; i++) {
      const [r, c] = path[i];
      // others min/max
      const othersMin = path.reduce(
        (s, [pr, pc], j) => (j !== i ? s + Math.min(...cands[pr][pc]) : s), 0
      );
      const othersMax = path.reduce(
        (s, [pr, pc], j) => (j !== i ? s + Math.max(...cands[pr][pc]) : s), 0
      );
      const cellMin = circleMin - othersMax;
      const cellMax = circleMax - othersMin;
      const allowed = new Set([...cands[r][c]].filter(
        (v) => v >= Math.max(1, cellMin) && v <= Math.min(9, cellMax)
      ));
      log.narrow(r, c, allowed, "arrow", eq,
        `Arrow cell ${i + 1}: circle ∈ [${circleMin}..${circleMax}], others ∈ [${othersMin}..${othersMax}]`);
    }
  }
}

// ─── Kropki Dots ────────────────────────────────────────────
export function propagateKropki(log: StepLogger, dots: KropkiDot[]): void {
  const cands = log.getCandidates();

  for (const dot of dots) {
    const [[r1, c1], [r2, c2]] = dot.cells;

    if (dot.type === "black") {
      const eq = `x = 2y  OR  y = 2x  (Kropki black dot)`;
      // cell1 allowed values: must pair with some value in cell2
      const a1 = new Set<number>();
      const a2 = new Set<number>();
      for (const v1 of cands[r1][c1]) {
        for (const v2 of cands[r2][c2]) {
          if (v1 === 2 * v2 || v2 === 2 * v1) {
            a1.add(v1);
            a2.add(v2);
          }
        }
      }
      log.narrow(r1, c1, a1, "kropki", eq, "Kropki black: ratio 2 constraint");
      log.narrow(r2, c2, a2, "kropki", eq, "Kropki black: ratio 2 constraint");
    } else {
      const eq = `|x - y| = 1  (Kropki white dot)`;
      const a1 = new Set<number>();
      const a2 = new Set<number>();
      for (const v1 of cands[r1][c1]) {
        for (const v2 of cands[r2][c2]) {
          if (Math.abs(v1 - v2) === 1) {
            a1.add(v1);
            a2.add(v2);
          }
        }
      }
      log.narrow(r1, c1, a1, "kropki", eq, "Kropki white: consecutive constraint");
      log.narrow(r2, c2, a2, "kropki", eq, "Kropki white: consecutive constraint");
    }
  }
}

// ─── Even / Odd ─────────────────────────────────────────────
export function propagateEvenOdd(
  log: StepLogger,
  cells: EvenOddCell[]
): void {
  const cands = log.getCandidates();

  for (const { cell: [r, c], parity } of cells) {
    const eq = parity === "even" ? `x % 2 = 0` : `x % 2 = 1`;
    const allowed = new Set([...cands[r][c]].filter((v) =>
      parity === "even" ? v % 2 === 0 : v % 2 === 1
    ));
    log.narrow(r, c, allowed, "evenOdd", eq,
      `Cell (${r + 1},${c + 1}) must be ${parity}`);
  }
}

// ─── Diagonal ───────────────────────────────────────────────
export function propagateDiagonal(
  log: StepLogger,
  grid: Grid,
  directions: ("main" | "anti")[]
): void {
  const cands = log.getCandidates();

  for (const dir of directions) {
    const diagCells: [number, number][] = dir === "main"
      ? Array.from({ length: 9 }, (_, i) => [i, i] as [number, number])
      : Array.from({ length: 9 }, (_, i) => [i, 8 - i] as [number, number]);

    const fixed = new Set<number>();
    for (const [r, c] of diagCells) {
      const v = grid[r][c];
      if (v != null) fixed.add(v);
    }
    if (fixed.size === 0) continue;

    const name = dir === "main" ? "main diagonal (↘)" : "anti-diagonal (↙)";
    const eq = `${name}: all distinct in {1..9}`;

    for (const [r, c] of diagCells) {
      if (grid[r][c] != null) continue;
      const allowed = new Set([...cands[r][c]].filter((v) => !fixed.has(v)));
      log.narrow(r, c, allowed, "diagonal", eq,
        `${name} already has [${[...fixed].join(",")}]`);
    }
  }
}

// ─── Master propagator ─────────────────────────────────────
export function propagateAll(
  log: StepLogger,
  grid: Grid,
  constraints: ConstraintSet
): void {
  propagateClassic(log, grid);
  if (constraints.evenOdd?.length) propagateEvenOdd(log, constraints.evenOdd);
  if (constraints.diagonal?.length)
    propagateDiagonal(log, grid, constraints.diagonal.map((d) => d.direction));
  if (constraints.killer?.length) propagateKiller(log, constraints.killer);
  if (constraints.thermo?.length) propagateThermo(log, constraints.thermo);
  if (constraints.arrow?.length) propagateArrow(log, constraints.arrow);
  if (constraints.kropki?.length) propagateKropki(log, constraints.kropki);
}
