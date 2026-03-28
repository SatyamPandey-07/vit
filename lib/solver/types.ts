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

// ─── Solve Steps ──────────────────────────────
export type StepAction =
  | "constraint_applied"
  | "naked_single"
  | "hidden_single"
  | "candidate_eliminated"
  | "backtrack_guess"
  | "solving_start"
  | "solving_complete";

export interface CellHighlight {
  cells: [number, number][];
  color: string;
}

export interface CandidateChange {
  cell: [number, number];
  removed: number[];
  remaining: number[];
}

export interface SolverState {
  assigned: [number, number, number][];
  remaining_candidates: Record<string, number[]>;
}

export interface SolveStep {
  step_id: number;
  action: StepAction;
  constraint_type: ConstraintKind;
  equation: string;
  affected_cells: [number, number][];
  candidate_changes: CandidateChange[];
  reason: string;
  solver_state: SolverState;
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
