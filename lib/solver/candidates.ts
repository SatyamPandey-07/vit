// ─────────────────────────────────────────────────────────────
//  Candidate Tracker
//  Maintains candidates[r][c] = Set<1..9>
//  and logs step-by-step diffs from a generic pipeline.
// ─────────────────────────────────────────────────────────────

import {
  Candidates,
  ConstraintKind,
  SolveStep,
  StepType,
  CellHighlight,
  Grid,
} from "./types";

// Constraint-to-color palette (constraint-agnostic at call site)
const CONSTRAINT_COLORS: Record<ConstraintKind, string> = {
  classic: "#6366f1",
  killer: "#f59e0b",
  thermo: "#ef4444",
  arrow: "#22d3ee",
  kropki: "#a855f7",
  evenOdd: "#10b981",
  diagonal: "#f97316",
};

export function initCandidates(grid: Grid): Candidates {
  return Array.from({ length: 9 }, (_, r) =>
    Array.from({ length: 9 }, (_, c) => {
      const val = grid[r][c];
      return val != null ? new Set([val]) : new Set([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    })
  );
}

export function candidatesSnapshot(
  cands: Candidates
): Record<string, number[]> {
  const snap: Record<string, number[]> = {};
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      snap[`${r},${c}`] = [...cands[r][c]].sort((a, b) => a - b);
    }
  }
  return snap;
}

export function snapshotSubset(
  snap: Record<string, number[]>,
  cells: [number, number][]
): Record<string, number[]> {
  const sub: Record<string, number[]> = {};
  for (const [r, c] of cells) {
    const key = `${r},${c}`;
    sub[key] = snap[key] ?? [];
  }
  return sub;
}

export class StepLogger {
  private steps: SolveStep[] = [];
  private counter = 0;

  constructor(private cands: Candidates) {}

  /** Generic step emission — constraint-agnostic */
  emit(opts: {
    type: StepType;
    cells: [number, number][];
    constraint: ConstraintKind;
    equation: string;
    before: Record<string, number[]>;
    after: Record<string, number[]>;
    reason: string;
  }): void {
    const highlight: CellHighlight = {
      cells: opts.cells,
      color: CONSTRAINT_COLORS[opts.constraint],
    };
    this.steps.push({
      step_id: this.counter++,
      ...opts,
      highlight,
    });
  }

  /** Narrow candidates for a cell, emit diff step automatically */
  narrow(
    r: number,
    c: number,
    allowed: Set<number>,
    constraint: ConstraintKind,
    equation: string,
    reason: string
  ): boolean {
    const before = [...this.cands[r][c]].sort((a, b) => a - b);
    const removed: number[] = [];
    for (const v of [...this.cands[r][c]]) {
      if (!allowed.has(v)) {
        this.cands[r][c].delete(v);
        removed.push(v);
      }
    }
    if (removed.length === 0) return false;
    const after = [...this.cands[r][c]].sort((a, b) => a - b);
    const key = `${r},${c}`;
    const stepType: StepType =
      this.cands[r][c].size === 1 ? "value_fixed" : "candidate_removed";
    this.emit({
      type: stepType,
      cells: [[r, c]],
      constraint,
      equation,
      before: { [key]: before },
      after: { [key]: after },
      reason: `${reason} → removed [${removed.join(",")}]`,
    });
    return true;
  }

  getSteps(): SolveStep[] {
    return this.steps;
  }

  getCandidates(): Candidates {
    return this.cands;
  }
}
