// ─────────────────────────────────────────────────────────────
//  Z3 SMT Solver Core
//  Adds all constraints declaratively, solves, checks uniqueness.
//  Step extraction: incremental constraint addition + re-solve.
// ─────────────────────────────────────────────────────────────

import { init as initZ3 } from "z3-solver";
import {
  Grid,
  ConstraintSet,
  SolveResponse,
  SolveStep,
} from "./types";
import { initCandidates, candidatesSnapshot, StepLogger } from "./candidates";
import { propagateAll } from "./propagators";

// ─── Z3 session (cached per process) ────────────────────────
let z3Cache: Awaited<ReturnType<typeof initZ3>> | null = null;

async function getZ3() {
  if (!z3Cache) {
    z3Cache = await initZ3();
  }
  return z3Cache;
}

// ─── Build Z3 model ─────────────────────────────────────────
async function buildAndSolve(
  grid: Grid,
  constraints: ConstraintSet
): Promise<{ solution: Grid | null; z3: Awaited<ReturnType<typeof initZ3>> }> {
  const z3 = await getZ3();
  const { Context } = z3;
  const ctx = Context("main");

  // Create 9×9 integer variables
  const cells: ReturnType<typeof ctx.Int.const>[][] = Array.from(
    { length: 9 },
    (_, r) =>
      Array.from({ length: 9 }, (_, c) => ctx.Int.const(`x_${r}_${c}`))
  );

  const solver = new ctx.Solver();

  // Domain: 1..9 for each cell
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const v = grid[r][c];
      if (v != null) {
        solver.add(cells[r][c].eq(ctx.Int.val(v)));
      } else {
        solver.add(cells[r][c].ge(ctx.Int.val(1)));
        solver.add(cells[r][c].le(ctx.Int.val(9)));
      }
    }
  }

  // ── Classic constraints ─────────────────────────────────
  for (let r = 0; r < 9; r++) {
    solver.add(ctx.Distinct(...cells[r]));
  }
  for (let c = 0; c < 9; c++) {
    solver.add(ctx.Distinct(...cells.map((row) => row[c])));
  }
  for (let br = 0; br < 3; br++) {
    for (let bc = 0; bc < 3; bc++) {
      const box: ReturnType<typeof ctx.Int.const>[] = [];
      for (let dr = 0; dr < 3; dr++)
        for (let dc = 0; dc < 3; dc++)
          box.push(cells[br * 3 + dr][bc * 3 + dc]);
      solver.add(ctx.Distinct(...box));
    }
  }

  // ── Even / Odd ───────────────────────────────────────────
  if (constraints.evenOdd) {
    for (const { cell: [r, c], parity } of constraints.evenOdd) {
      const mod = cells[r][c].mod(ctx.Int.val(2));
      solver.add(parity === "even" ? mod.eq(ctx.Int.val(0)) : mod.eq(ctx.Int.val(1)));
    }
  }

  // ── Diagonal ─────────────────────────────────────────────
  if (constraints.diagonal) {
    for (const { direction } of constraints.diagonal) {
      const diag =
        direction === "main"
          ? Array.from({ length: 9 }, (_, i) => cells[i][i])
          : Array.from({ length: 9 }, (_, i) => cells[i][8 - i]);
      solver.add(ctx.Distinct(...diag));
    }
  }

  // ── Killer cages ─────────────────────────────────────────
  if (constraints.killer) {
    for (const { cells: cs, sum } of constraints.killer) {
      const cvars = cs.map(([r, c]) => cells[r][c]);
      // Sum constraint
      const sumExpr = cvars.reduce(
        (acc, v) => acc.add(v),
        ctx.Int.val(0) as ReturnType<typeof ctx.Int.val>
      );
      solver.add(sumExpr.eq(ctx.Int.val(sum)));
      // Distinct within cage
      if (cvars.length > 1) solver.add(ctx.Distinct(...cvars));
    }
  }

  // ── Thermo ───────────────────────────────────────────────
  if (constraints.thermo) {
    for (const { cells: cs } of constraints.thermo) {
      for (let i = 0; i < cs.length - 1; i++) {
        const [r1, c1] = cs[i];
        const [r2, c2] = cs[i + 1];
        solver.add(cells[r1][c1].lt(cells[r2][c2]));
      }
    }
  }

  // ── Arrow ────────────────────────────────────────────────
  if (constraints.arrow) {
    for (const { circle: [cr, cc], arrow: path } of constraints.arrow) {
      const pathSum = path
        .map(([r, c]) => cells[r][c])
        .reduce(
          (acc, v) => acc.add(v),
          ctx.Int.val(0) as ReturnType<typeof ctx.Int.val>
        );
      solver.add(cells[cr][cc].eq(pathSum));
    }
  }

  // ── Kropki dots ──────────────────────────────────────────
  if (constraints.kropki) {
    for (const { cells: [[r1, c1], [r2, c2]], type } of constraints.kropki) {
      const a = cells[r1][c1];
      const b = cells[r2][c2];
      if (type === "black") {
        solver.add(ctx.Or(a.eq(b.mul(ctx.Int.val(2))), b.eq(a.mul(ctx.Int.val(2)))));
      } else {
        const diff = a.sub(b);
        solver.add(
          ctx.Or(diff.eq(ctx.Int.val(1)), diff.eq(ctx.Int.val(-1)))
        );
      }
    }
  }

  // ── Solve ────────────────────────────────────────────────
  const result = await solver.check();
  if (result !== "sat") return { solution: null, z3 };

  const model = solver.model();
  const solution: Grid = Array.from({ length: 9 }, (_, r) =>
    Array.from({ length: 9 }, (_, c) =>
      Number(model.eval(cells[r][c]).toString())
    )
  );

  return { solution, z3 };
}

// ─── Check uniqueness ────────────────────────────────────────
async function checkUnique(
  grid: Grid,
  constraints: ConstraintSet,
  solution: Grid
): Promise<boolean> {
  const z3 = await getZ3();
  const { Context } = z3;
  const ctx = Context("unique_check");

  const cells: ReturnType<typeof ctx.Int.const>[][] = Array.from(
    { length: 9 },
    (_, r) =>
      Array.from({ length: 9 }, (_, c) => ctx.Int.const(`u_${r}_${c}`))
  );

  const solver = new ctx.Solver();

  // Same constraints
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const v = grid[r][c];
      if (v != null) {
        solver.add(cells[r][c].eq(ctx.Int.val(v)));
      } else {
        solver.add(cells[r][c].ge(ctx.Int.val(1)));
        solver.add(cells[r][c].le(ctx.Int.val(9)));
      }
    }
  }
  for (let r = 0; r < 9; r++) solver.add(ctx.Distinct(...cells[r]));
  for (let c = 0; c < 9; c++) solver.add(ctx.Distinct(...cells.map((row) => row[c])));
  for (let br = 0; br < 3; br++) {
    for (let bc = 0; bc < 3; bc++) {
      const box: ReturnType<typeof ctx.Int.const>[] = [];
      for (let dr = 0; dr < 3; dr++)
        for (let dc = 0; dc < 3; dc++)
          box.push(cells[br * 3 + dr][bc * 3 + dc]);
      solver.add(ctx.Distinct(...box));
    }
  }
  if (constraints.killer) {
    for (const { cells: cs, sum } of constraints.killer) {
      const cvars = cs.map(([r, c]) => cells[r][c]);
      const sumExpr = cvars.reduce(
        (acc, v) => acc.add(v),
        ctx.Int.val(0) as ReturnType<typeof ctx.Int.val>
      );
      solver.add(sumExpr.eq(ctx.Int.val(sum)));
      if (cvars.length > 1) solver.add(ctx.Distinct(...cvars));
    }
  }
  if (constraints.thermo) {
    for (const { cells: cs } of constraints.thermo) {
      for (let i = 0; i < cs.length - 1; i++) {
        const [r1, c1] = cs[i];
        const [r2, c2] = cs[i + 1];
        solver.add(cells[r1][c1].lt(cells[r2][c2]));
      }
    }
  }
  if (constraints.arrow) {
    for (const { circle: [cr, cc], arrow: path } of constraints.arrow) {
      const pathSum = path
        .map(([r, c]) => cells[r][c])
        .reduce(
          (acc, v) => acc.add(v),
          ctx.Int.val(0) as ReturnType<typeof ctx.Int.val>
        );
      solver.add(cells[cr][cc].eq(pathSum));
    }
  }
  if (constraints.kropki) {
    for (const { cells: [[r1, c1], [r2, c2]], type } of constraints.kropki) {
      const a = cells[r1][c1];
      const b = cells[r2][c2];
      if (type === "black") {
        solver.add(ctx.Or(a.eq(b.mul(ctx.Int.val(2))), b.eq(a.mul(ctx.Int.val(2)))));
      } else {
        const diff = a.sub(b);
        solver.add(ctx.Or(diff.eq(ctx.Int.val(1)), diff.eq(ctx.Int.val(-1))));
      }
    }
  }
  if (constraints.evenOdd) {
    for (const { cell: [r, c], parity } of constraints.evenOdd) {
      const mod = cells[r][c].mod(ctx.Int.val(2));
      solver.add(parity === "even" ? mod.eq(ctx.Int.val(0)) : mod.eq(ctx.Int.val(1)));
    }
  }
  if (constraints.diagonal) {
    for (const { direction } of constraints.diagonal) {
      const diag =
        direction === "main"
          ? Array.from({ length: 9 }, (_, i) => cells[i][i])
          : Array.from({ length: 9 }, (_, i) => cells[i][8 - i]);
      solver.add(ctx.Distinct(...diag));
    }
  }

  // Block the found solution
  const blockClauses = [];
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      blockClauses.push(cells[r][c].neq(ctx.Int.val(solution[r][c]!)));
    }
  }
  solver.add(ctx.Or(...blockClauses));

  const result = await solver.check();
  return result === "unsat"; // unique if no other solution
}

// ─── Main solver entry ──────────────────────────────────────
export async function solve(
  grid: Grid,
  constraints: ConstraintSet
): Promise<SolveResponse> {
  const startMs = Date.now();
  const steps: SolveStep[] = [];

  try {
    // ── Phase 1: Propagation-based step generation ──────────
    const cands = initCandidates(grid);
    const log = new StepLogger(cands);

    // Emit start step
    const beforeAll = candidatesSnapshot(cands);
    log.emit({
      type: "solving_start",
      cells: [],
      constraint: "classic",
      equation: "CSP = (Variables={x_r_c}, Domain={1..9}, Constraints=...)",
      before: {},
      after: {},
      reason: "Initializing solver with classic Sudoku rules + variant constraints",
    });

    propagateAll(log, grid, constraints);

    const propagationSteps = log.getSteps();
    steps.push(...propagationSteps);

    // ── Phase 2: Z3 SMT solve ───────────────────────────────
    const { solution } = await buildAndSolve(grid, constraints);

    if (!solution) {
      steps.push({
        step_id: steps.length,
        type: "solving_complete",
        cells: [],
        constraint: "classic",
        equation: "UNSAT — no solution exists",
        before: {},
        after: {},
        reason: "Z3 returned UNSAT — the puzzle has no valid solution",
        highlight: { cells: [], color: "#ef4444" },
      });
      return {
        solution: null,
        steps,
        unique: false,
        solveTimeMs: Date.now() - startMs,
      };
    }

    // Emit value_fixed steps for the final solution
    const finalSnap = candidatesSnapshot(cands);
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (grid[r][c] == null) {
          const val = solution[r][c];
          const key = `${r},${c}`;
          steps.push({
            step_id: steps.length,
            type: "value_fixed",
            cells: [[r, c]],
            constraint: "classic",
            equation: `x_${r}_${c} = ${val}`,
            before: { [key]: finalSnap[key] ?? [] },
            after: { [key]: [val!] },
            reason: `Z3 SMT solver assigned value ${val} to cell (${r + 1},${c + 1})`,
            highlight: { cells: [[r, c]], color: "#6366f1" },
          });
        }
      }
    }

    steps.push({
      step_id: steps.length,
      type: "solving_complete",
      cells: [],
      constraint: "classic",
      equation: "SAT — solution found",
      before: {},
      after: {},
      reason: "Z3 SMT solver successfully found a valid solution",
      highlight: { cells: [], color: "#10b981" },
    });

    // ── Phase 3: Uniqueness check ──────────────────────────
    const unique = await checkUnique(grid, constraints, solution);

    return {
      solution,
      steps,
      unique,
      solveTimeMs: Date.now() - startMs,
    };
  } catch (err) {
    return {
      solution: null,
      steps,
      unique: false,
      error: err instanceof Error ? err.message : String(err),
      solveTimeMs: Date.now() - startMs,
    };
  }
}
