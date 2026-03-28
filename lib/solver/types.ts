// ─────────────────────────────────────────────
//  CSP Types — Variant Sudoku Solver
// ─────────────────────────────────────────────

export type Grid = (number | null)[][];
export type Candidates = Set<number>[][];

// ─── Constraint Types ──────────────────────────
export type ConstraintKind =
  | "classic"
  | "killer"
  | "thermo"
  | "arrow"
  | "kropki"
  | "evenOdd"
  | "diagonal";

export interface KillerCage {
  cells: [number, number][];
  sum: number;
}

export interface ThermoCell {
  cells: [number, number][]; // ordered: cold → hot
}

export interface ArrowConstraint {
  circle: [number, number];
  arrow: [number, number][];
}

export interface KropkiDot {
  cells: [[number, number], [number, number]];
  type: "black" | "white"; // black = ratio 2, white = consecutive
}

export interface EvenOddCell {
  cell: [number, number];
  parity: "even" | "odd";
}

export interface DiagonalConstraint {
  direction: "main" | "anti"; // main = top-left to bottom-right
}

export interface ConstraintSet {
  killer?: KillerCage[];
  thermo?: ThermoCell[];
  arrow?: ArrowConstraint[];
  kropki?: KropkiDot[];
  evenOdd?: EvenOddCell[];
  diagonal?: DiagonalConstraint[];
}

// ─── Visualization Step ──────────────────────────
export type StepType =
  | "constraint_applied"
  | "candidate_removed"
  | "value_fixed"
  | "solving_start"
  | "solving_complete";

export interface CellHighlight {
  cells: [number, number][];
  color: string;
}

export interface SolveStep {
  step_id: number;
  type: StepType;
  cells: [number, number][];
  constraint: ConstraintKind;
  equation: string;
  before: Record<string, number[]>; // "r,c" → candidates
  after: Record<string, number[]>;  // "r,c" → candidates
  reason: string;
  highlight: CellHighlight;
}

// ─── Solver I/O ──────────────────────────────────
export interface SolveRequest {
  grid: Grid;
  constraints: ConstraintSet;
}

export interface SolveResponse {
  solution: Grid | null;
  steps: SolveStep[];
  unique: boolean;
  error?: string;
  solveTimeMs: number;
}
