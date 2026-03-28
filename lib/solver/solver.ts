// ─────────────────────────────────────────────────────────────
//  Pure JS Constraint Propagation + Backtracking Solver
//
//  Techniques (applied in order):
//   1. Domain initialization from givens
//   2. Naked Singles  — cell has exactly 1 candidate
//   3. Hidden Singles — value appears once in unit (row/col/box/variant)
//   4. Variant propagators (killer, thermo, arrow, kropki, evenOdd, diagonal)
//   5. Repeat until stable, then backtrack with MRV heuristic
//
//  ALL deductions produce rich SolveStep objects with:
//   - Human-readable equation
//   - Affected cells   
//   - Candidate eliminations logged
//   - Full solver state snapshot
// ─────────────────────────────────────────────────────────────

import {
  Grid,
  Candidates,
  ConstraintSet,
  SolveStep,
  SolveResponse,
  StepAction,
  ConstraintKind,
  CandidateChange,
  SolverState,
  CellHighlight,
} from "./types";

// ── Color palette per constraint type ──────────────────────
const COLORS: Record<ConstraintKind, string> = {
  classic:  "#6366f1",
  killer:   "#f59e0b",
  thermo:   "#ef4444",
  arrow:    "#22d3ee",
  kropki:   "#a855f7",
  evenOdd:  "#10b981",
  diagonal: "#f97316",
};

// ── Sudoku units (rows, cols, boxes) ───────────────────────
const ROWS:  [number,number][][] = Array.from({length:9},(_,r)=>Array.from({length:9},(_,c)=>[r,c] as [number,number]));
const COLS:  [number,number][][] = Array.from({length:9},(_,c)=>Array.from({length:9},(_,r)=>[r,c] as [number,number]));
const BOXES: [number,number][][] = Array.from({length:9},(_,b)=>{
  const br=Math.floor(b/3)*3, bc=(b%3)*3;
  const cells:  [number,number][]=[]; 
  for(let dr=0;dr<3;dr++) for(let dc=0;dc<3;dc++) cells.push([br+dr,bc+dc]); 
  return cells;
});
const ALL_UNITS = [...ROWS, ...COLS, ...BOXES];

// ── Clone candidates ────────────────────────────────────────
function cloneCands(c: Candidates): Candidates {
  return c.map(row => row.map(s => new Set(s)));
}

// ── Build solver state snapshot ─────────────────────────────
function buildState(cands: Candidates): SolverState {
  const assigned: [number,number,number][] = [];
  const remaining_candidates: Record<string,number[]> = {};
  for (let r=0; r<9; r++) for (let c=0; c<9; c++) {
    const v = [...cands[r][c]];
    if (v.length===1) assigned.push([r,c,v[0]]);
    else if (v.length>1) remaining_candidates[`${r},${c}`]=v.sort((a,b)=>a-b);
  }
  return {assigned, remaining_candidates};
}

// ── Step builder ────────────────────────────────────────────
let stepCounter = 0;
function makeStep(
  action: StepAction,
  constraint_type: ConstraintKind,
  equation: string,
  affected_cells: [number,number][],
  candidate_changes: CandidateChange[],
  reason: string,
  cands: Candidates,
): SolveStep {
  return {
    step_id: stepCounter++,
    action,
    constraint_type,
    equation,
    affected_cells,
    candidate_changes,
    reason,
    solver_state: buildState(cands),
    highlight: { cells: affected_cells, color: COLORS[constraint_type] },
  };
}

// ── Remove value from candidate set, return change if any ──
function remove(cands: Candidates, r: number, c: number, val: number): boolean {
  if (!cands[r][c].has(val)) return false;
  cands[r][c].delete(val);
  return true;
}

// ── Killer combo generator ──────────────────────────────────
const killerComboCache = new Map<string,number[][]>();
function killerCombos(n: number, target: number, domainMin=1, domainMax=9): number[][] {
  const key=`${n}:${target}:${domainMin}:${domainMax}`;
  if(killerComboCache.has(key)) return killerComboCache.get(key)!;
  const results: number[][]=[];
  function rec(rem:number, min:number, cur:number[], used:Set<number>){
    if(cur.length===n){ if(rem===0)results.push([...cur]); return; }
    for(let v=min;v<=domainMax;v++){
      if(used.has(v)) continue;
      if(v>rem) break;
      used.add(v); cur.push(v);
      rec(rem-v,v+1,cur,used);
      cur.pop(); used.delete(v);
    }
  }
  rec(target,domainMin,[],new Set());
  killerComboCache.set(key,results);
  return results;
}

// ═══════════════════════════════════════════════════════════
//  PROPAGATION ENGINE
// ═══════════════════════════════════════════════════════════

/**
 * Propagate classic Sudoku unit constraints.
 * If a cell is fixed (1 candidate), remove that value from all peers in same unit.
 */
function propagateUnits(cands: Candidates, steps: SolveStep[]): boolean {
  let changed = true;
  let anyChange = false;
  while (changed) {
    changed = false;
    for (const unit of ALL_UNITS) {
      // Naked singles propagation
      for (const [r,c] of unit) {
        if (cands[r][c].size !== 1) continue;
        const val = [...cands[r][c]][0];
        const removed: CandidateChange[] = [];
        for (const [pr,pc] of unit) {
          if (pr===r && pc===c) continue;
          if (remove(cands,pr,pc,val)) {
            removed.push({ cell:[pr,pc], removed:[val], remaining:[...cands[pr][pc]].sort((a,b)=>a-b) });
            changed=true; anyChange=true;
          }
        }
        if (removed.length>0) {
          const isRow = unit===ROWS[r];
          const isCol = unit===COLS[c];
          const unitName = isRow?`Row ${r+1}`:isCol?`Col ${c+1}`:`Box`;
          steps.push(makeStep(
            "naked_single","classic",
            `${unitName}: x${r+1}${c+1} = ${val} → peers cannot be ${val}`,
            removed.map(ch=>ch.cell),
            removed,
            `Cell (${r+1},${c+1}) is fixed to ${val}; removed from ${removed.length} peer(s) in ${unitName}`,
            cands,
          ));
        }
      }
      // Hidden singles: value appears exactly once in unit
      for (let val=1; val<=9; val++) {
        const positions = unit.filter(([r,c])=>cands[r][c].has(val));
        if (positions.length!==1) continue;
        const [r,c]=positions[0];
        if (cands[r][c].size===1) continue; // already naked single
        const removed_vals=[...cands[r][c]].filter(v=>v!==val);
        for (const v of removed_vals) cands[r][c].delete(v);
        const unitName = ROWS.includes(unit)?`Row ${r+1}`:COLS.includes(unit)?`Col ${c+1}`:`Box`;
        steps.push(makeStep(
          "hidden_single","classic",
          `${unitName}: only cell (${r+1},${c+1}) can be ${val}`,
          [[r,c]],
          [{cell:[r,c],removed:removed_vals,remaining:[val]}],
          `${val} can only go in (${r+1},${c+1}) in this ${unitName}`,
          cands,
        ));
        changed=true; anyChange=true;
      }
    }
  }
  return anyChange;
}

/**
 * Even/Odd propagation
 */
function propagateEvenOdd(cands: Candidates, cs: ConstraintSet, steps: SolveStep[]): boolean {
  if (!cs.evenOdd?.length) return false;
  let anyChange=false;
  for (const {cell:[r,c],parity} of cs.evenOdd) {
    const keep = parity==="even"?[2,4,6,8]:[1,3,5,7,9];
    const removed_vals=[...cands[r][c]].filter(v=>!keep.includes(v));
    if (!removed_vals.length) continue;
    for (const v of removed_vals) cands[r][c].delete(v);
    steps.push(makeStep(
      "constraint_applied","evenOdd",
      `x${r+1}${c+1} mod 2 = ${parity==="even"?0:1}`,
      [[r,c]],
      [{cell:[r,c],removed:removed_vals,remaining:[...cands[r][c]].sort((a,b)=>a-b)}],
      `Cell (${r+1},${c+1}) is marked ${parity} → removed {${removed_vals.join(",")}}`,
      cands,
    ));
    anyChange=true;
  }
  return anyChange;
}

/**
 * Diagonal propagation
 */
function propagateDiagonal(cands: Candidates, cs: ConstraintSet, steps: SolveStep[]): boolean {
  if (!cs.diagonal?.length) return false;
  let anyChange=false;
  for (const {direction} of cs.diagonal) {
    const diag:  [number,number][] = direction==="main"
      ?Array.from({length:9},(_,i)=>[i,i] as [number,number])
      :Array.from({length:9},(_,i)=>[i,8-i] as [number,number]);
    const name=direction==="main"?"Main diagonal (↘)":"Anti-diagonal (↙)";
    const eq=`${name}: all values distinct`;
    // Find fixed values
    for (const [r,c] of diag) {
      if (cands[r][c].size!==1) continue;
      const val=[...cands[r][c]][0];
      const removed:CandidateChange[]=[];
      for (const [pr,pc] of diag) {
        if (pr===r&&pc===c) continue;
        if (remove(cands,pr,pc,val)) {
          removed.push({cell:[pr,pc],removed:[val],remaining:[...cands[pr][pc]].sort((a,b)=>a-b)});
          anyChange=true;
        }
      }
      if (removed.length) steps.push(makeStep("constraint_applied","diagonal",eq,removed.map(ch=>ch.cell),removed,
        `${name} value ${val} fixed at (${r+1},${c+1}) → removed from ${removed.length} peer(s)`,cands));
    }
    // Hidden single on diagonal
    for (let val=1;val<=9;val++) {
      const positions=diag.filter(([r,c])=>cands[r][c].has(val));
      if (positions.length!==1) continue;
      const [r,c]=positions[0];
      if (cands[r][c].size===1) continue;
      const removed_vals=[...cands[r][c]].filter(v=>v!==val);
      for (const v of removed_vals) cands[r][c].delete(v);
      steps.push(makeStep("hidden_single","diagonal",
        `${name}: only (${r+1},${c+1}) can be ${val}`,[[r,c]],
        [{cell:[r,c],removed:removed_vals,remaining:[val]}],
        `${val} can only go at (${r+1},${c+1}) on the ${name}`,cands));
      anyChange=true;
    }
  }
  return anyChange;
}

/**
 * Killer cage propagation
 */
function propagateKiller(cands: Candidates, cs: ConstraintSet, steps: SolveStep[]): boolean {
  if (!cs.killer?.length) return false;
  let anyChange=false;
  for (const cage of cs.killer) {
    const {cells,sum}=cage;
    const n=cells.length;
    const label=cells.map(([r,c])=>`x${r+1}${c+1}`).join("+");
    const eq=`${label} = ${sum} (cage sum, all distinct)`;

    // Get current candidates per cell in cage
    const domPerCell=cells.map(([r,c])=>[...cands[r][c]]);
    
    // Find valid combos given current domains
    const allCombos=killerCombos(n,sum);
    const validCombos=allCombos.filter(combo=>
      combo.every((v,i)=>domPerCell[i].includes(v))
    );
    
    if (validCombos.length===0) continue; // will be caught by backtrack
    
    // For each cell, allowed values = union over valid combos at position i
    for (let i=0;i<n;i++) {
      const [r,c]=cells[i];
      const allowed=new Set(validCombos.map(combo=>combo[i]));
      const removed_vals=[...cands[r][c]].filter(v=>!allowed.has(v));
      if (!removed_vals.length) continue;
      for (const v of removed_vals) cands[r][c].delete(v);
      steps.push(makeStep(
        "candidate_eliminated","killer",eq,[[r,c]],
        [{cell:[r,c],removed:removed_vals,remaining:[...cands[r][c]].sort((a,b)=>a-b)}],
        `Valid cage combos restrict cell (${r+1},${c+1}) — removed {${removed_vals.join(",")}}`,cands));
      anyChange=true;
    }

    // Also: if a value is fixed in a cage cell, remove from other cage cells
    for (let i=0;i<n;i++) {
      if (cands[cells[i][0]][cells[i][1]].size!==1) continue;
      const val=[...cands[cells[i][0]][cells[i][1]]][0];
      for (let j=0;j<n;j++) {
        if (i===j) continue;
        const [r,c]=cells[j];
        if (!remove(cands,r,c,val)) continue;
        steps.push(makeStep(
          "constraint_applied","killer",eq,[[r,c]],
          [{cell:[r,c],removed:[val],remaining:[...cands[r][c]].sort((a,b)=>a-b)}],
          `Cage: ${val} used at (${cells[i][0]+1},${cells[i][1]+1}) → removed from (${r+1},${c+1})`,cands));
        anyChange=true;
      }
    }
  }
  return anyChange;
}

/**
 * Thermo propagation
 */
function propagateThermo(cands: Candidates, cs: ConstraintSet, steps: SolveStep[]): boolean {
  if (!cs.thermo?.length) return false;
  let anyChange=false;
  for (const thermo of cs.thermo) {
    const thermoCells=thermo.cells;
    const n=thermoCells.length;
    const labels=thermoCells.map((_,i)=>`t${i+1}`).join(" < ");
    const eq=`Thermometer: ${labels} (strictly increasing)`;
    
    let localChange=true;
    while(localChange){
      localChange=false;
      // Forward pass: t[i] > min(t[i-1])
      for (let i=1;i<n;i++) {
        const [pr,pc]=thermoCells[i-1];
        const [cr,cc]=thermoCells[i];
        const prevMin=Math.min(...cands[pr][pc]);
        const removed_vals=[...cands[cr][cc]].filter(v=>v<=prevMin);
        if (!removed_vals.length) continue;
        for (const v of removed_vals) cands[cr][cc].delete(v);
        steps.push(makeStep("constraint_applied","thermo",eq,[[cr,cc]],
          [{cell:[cr,cc],removed:removed_vals,remaining:[...cands[cr][cc]].sort((a,b)=>a-b)}],
          `Thermo: t${i+1} > t${i} (min=${prevMin}) → removed {${removed_vals.join(",")}} from (${cr+1},${cc+1})`,cands));
        anyChange=true; localChange=true;
      }
      // Backward pass: t[i] < max(t[i+1])
      for (let i=n-2;i>=0;i--) {
        const [cr,cc]=thermoCells[i];
        const [nr,nc]=thermoCells[i+1];
        const nextMax=Math.max(...cands[nr][nc]);
        const removed_vals=[...cands[cr][cc]].filter(v=>v>=nextMax);
        if (!removed_vals.length) continue;
        for (const v of removed_vals) cands[cr][cc].delete(v);
        steps.push(makeStep("constraint_applied","thermo",eq,[[cr,cc]],
          [{cell:[cr,cc],removed:removed_vals,remaining:[...cands[cr][cc]].sort((a,b)=>a-b)}],
          `Thermo: t${i+1} < t${i+2} (max=${nextMax}) → removed {${removed_vals.join(",")}} from (${cr+1},${cc+1})`,cands));
        anyChange=true; localChange=true;
      }
    }
  }
  return anyChange;
}

/**
 * Arrow propagation
 */
function propagateArrow(cands: Candidates, cs: ConstraintSet, steps: SolveStep[]): boolean {
  if (!cs.arrow?.length) return false;
  let anyChange=false;
  for (const {circle:[cr,cc],arrow:path} of cs.arrow) {
    const pathLabel=path.map((_,i)=>`a${i+1}`).join("+");
    const eq=`Arrow: circle=(${cr+1},${cc+1}) = ${pathLabel}`;
    
    const minSum=path.reduce((s,[r,c])=>s+Math.min(...cands[r][c]),0);
    const maxSum=path.reduce((s,[r,c])=>s+Math.max(...cands[r][c]),0);
    
    // Restrict circle to [minSum..maxSum]
    const circleRemoved=[...cands[cr][cc]].filter(v=>v<minSum||v>maxSum);
    if (circleRemoved.length>0) {
      for (const v of circleRemoved) cands[cr][cc].delete(v);
      steps.push(makeStep("constraint_applied","arrow",eq,[[cr,cc]],
        [{cell:[cr,cc],removed:circleRemoved,remaining:[...cands[cr][cc]].sort((a,b)=>a-b)}],
        `Arrow sum range [${minSum}..${maxSum}] restricts circle (${cr+1},${cc+1})`,cands));
      anyChange=true;
    }
    
    const circleMin=Math.min(...cands[cr][cc]);
    const circleMax=Math.max(...cands[cr][cc]);
    
    // Restrict each arrow cell
    for (let i=0;i<path.length;i++) {
      const [r,c]=path[i];
      const othersMin=path.reduce((s,[pr,pc],j)=>j!==i?s+Math.min(...cands[pr][pc]):s,0);
      const othersMax=path.reduce((s,[pr,pc],j)=>j!==i?s+Math.max(...cands[pr][pc]):s,0);
      const cellMin=Math.max(1,circleMin-othersMax);
      const cellMax=Math.min(9,circleMax-othersMin);
      const removed_vals=[...cands[r][c]].filter(v=>v<cellMin||v>cellMax);
      if (!removed_vals.length) continue;
      for (const v of removed_vals) cands[r][c].delete(v);
      steps.push(makeStep("candidate_eliminated","arrow",eq,[[r,c]],
        [{cell:[r,c],removed:removed_vals,remaining:[...cands[r][c]].sort((a,b)=>a-b)}],
        `Arrow cell a${i+1} restricted to [${cellMin}..${cellMax}] → removed {${removed_vals.join(",")}}`,cands));
      anyChange=true;
    }
  }
  return anyChange;
}

/**
 * Kropki propagation
 */
function propagateKropki(cands: Candidates, cs: ConstraintSet, steps: SolveStep[]): boolean {
  if (!cs.kropki?.length) return false;
  let anyChange=false;
  for (const dot of cs.kropki) {
    const [[r1,c1],[r2,c2]]=dot.cells;
    const eq=dot.type==="black"
      ?`Kropki Black: x${r1+1}${c1+1} = 2·x${r2+1}${c2+1}  OR  x${r2+1}${c2+1} = 2·x${r1+1}${c1+1}`
      :`Kropki White: |x${r1+1}${c1+1} − x${r2+1}${c2+1}| = 1`;
    
    const a1=new Set<number>(), a2=new Set<number>();
    for (const v1 of cands[r1][c1]) for (const v2 of cands[r2][c2]) {
      const ok=dot.type==="black"?(v1===2*v2||v2===2*v1):(Math.abs(v1-v2)===1);
      if(ok){a1.add(v1);a2.add(v2);}
    }
    
    const rem1=[...cands[r1][c1]].filter(v=>!a1.has(v));
    const rem2=[...cands[r2][c2]].filter(v=>!a2.has(v));
    
    if(rem1.length>0){
      for(const v of rem1)cands[r1][c1].delete(v);
      steps.push(makeStep("constraint_applied","kropki",eq,[[r1,c1]],
        [{cell:[r1,c1],removed:rem1,remaining:[...cands[r1][c1]].sort((a,b)=>a-b)}],
        `Kropki: no valid pair with (${r2+1},${c2+1}) → removed {${rem1.join(",")}} from (${r1+1},${c1+1})`,cands));
      anyChange=true;
    }
    if(rem2.length>0){
      for(const v of rem2)cands[r2][c2].delete(v);
      steps.push(makeStep("constraint_applied","kropki",eq,[[r2,c2]],
        [{cell:[r2,c2],removed:rem2,remaining:[...cands[r2][c2]].sort((a,b)=>a-b)}],
        `Kropki: no valid pair with (${r1+1},${c1+1}) → removed {${rem2.join(",")}} from (${r2+1},${c2+1})`,cands));
      anyChange=true;
    }
  }
  return anyChange;
}

// ═══════════════════════════════════════════════════════════
//  VALIDITY CHECK
// ═══════════════════════════════════════════════════════════
function isValid(cands: Candidates, cs: ConstraintSet): boolean {
  // Any cell with 0 candidates → invalid
  for (let r=0;r<9;r++) for (let c=0;c<9;c++) if(cands[r][c].size===0) return false;
  return true;
}

function isSolved(cands: Candidates): boolean {
  for (let r=0;r<9;r++) for (let c=0;c<9;c++) if(cands[r][c].size!==1) return false;
  return true;
}

function toGrid(cands: Candidates): Grid {
  return cands.map(row=>row.map(s=>s.size===1?[...s][0]:null));
}

// ═══════════════════════════════════════════════════════════
//  FULL PROPAGATION ROUND
// ═══════════════════════════════════════════════════════════
function propagateAll(cands: Candidates, cs: ConstraintSet, steps: SolveStep[]): boolean {
  let anyChange=true, totalChange=false;
  while(anyChange){
    anyChange=false;
    if(propagateEvenOdd(cands,cs,steps)) anyChange=true;
    if(propagateDiagonal(cands,cs,steps)) anyChange=true;
    if(propagateKiller(cands,cs,steps)) anyChange=true;
    if(propagateThermo(cands,cs,steps)) anyChange=true;
    if(propagateArrow(cands,cs,steps)) anyChange=true;
    if(propagateKropki(cands,cs,steps)) anyChange=true;
    if(propagateUnits(cands,steps)) anyChange=true;
    if(anyChange) totalChange=true;
  }
  return totalChange;
}

// ═══════════════════════════════════════════════════════════
//  BACKTRACKING SOLVER
//  Returns null if no solution, Grid if solution found
// ═══════════════════════════════════════════════════════════
function pickCell(cands: Candidates): [number,number]|null {
  let best: [number,number]|null=null, bestSize=10;
  for (let r=0;r<9;r++) for (let c=0;c<9;c++) {
    const sz=cands[r][c].size;
    if(sz>1&&sz<bestSize){bestSize=sz;best=[r,c];}
  }
  return best;
}

function backtrack(
  cands: Candidates,
  cs: ConstraintSet,
  steps: SolveStep[],
  depth: number,
  maxDepth = 100,
  collectSteps = true,
): Grid|null {
  if(!isValid(cands,cs)) return null;
  propagateAll(cands,cs,collectSteps?steps:[]);
  if(!isValid(cands,cs)) return null;
  if(isSolved(cands)) return toGrid(cands);
  
  const cell=pickCell(cands);
  if(!cell) return null;
  const [r,c]=cell;
  
  for (const val of [...cands[r][c]].sort((a,b)=>a-b)) {
    const snapshot=cloneCands(cands);
    cands[r][c]=new Set([val]);
    
    if(collectSteps) steps.push(makeStep(
      "backtrack_guess","classic",
      `x${r+1}${c+1} = ${val} (trial)`,[[r,c]],[],
      `Guessing ${val} for cell (${r+1},${c+1}) — MRV choice (${cands[r][c].size} candidate)`,cands));
    
    const result=backtrack(cloneCands(cands),cs,steps,depth+1,maxDepth,collectSteps);
    if(result) return result;
    
    // Restore from snapshot
    for(let rr=0;rr<9;rr++) for(let cc=0;cc<9;cc++) cands[rr][cc]=new Set(snapshot[rr][cc]);
  }
  return null;
}

// ═══════════════════════════════════════════════════════════
//  UNIQUENESS CHECK (fast, no step gen)
// ═══════════════════════════════════════════════════════════
function countSolutions(cands: Candidates, cs: ConstraintSet, max = 2): number {
  if(!isValid(cands,cs)) return 0;
  propagateAll(cloneCands(cands),cs,[]);
  // Re-propagate on a clean clone
  const wk=cloneCands(cands);
  propagateAll(wk,cs,[]);
  if(!isValid(wk,cs)) return 0;
  if(isSolved(wk)) return 1;
  
  const cell=pickCell(wk);
  if(!cell) return 0;
  const [r,c]=cell;
  let count=0;
  for(const val of wk[r][c]) {
    const branch=cloneCands(wk);
    branch[r][c]=new Set([val]);
    count+=countSolutions(branch,cs,max);
    if(count>=max) break;
  }
  return count;
}

// ═══════════════════════════════════════════════════════════
//  PUBLIC ENTRY POINT
// ═══════════════════════════════════════════════════════════
export function solve(grid: Grid, constraints: ConstraintSet): SolveResponse {
  const startMs=Date.now();
  stepCounter=0;
  killerComboCache.clear();
  const steps: SolveStep[]=[];

  try {
    // Init candidates
    const cands: Candidates=Array.from({length:9},(_,r)=>
      Array.from({length:9},(_,c)=>{
        const v=grid[r][c];
        return v!=null?new Set([v]):new Set([1,2,3,4,5,6,7,8,9]);
      })
    );

    steps.push(makeStep(
      "solving_start","classic",
      "Initialize: 81 variables x_{r,c} ∈ {1..9}, 27 unit-distinct constraints",
      [],[],"Solver started — applying constraint propagation before search",cands));

    // Phase 1: Constraint propagation
    propagateAll(cands,constraints,steps);

    if (!isValid(cands,constraints)){
      steps.push(makeStep("solving_complete","classic","UNSATISFIABLE",[],[],
        "Puzzle has no valid solution",cands));
      return {solution:null,steps,unique:false,error:"No solution exists",solveTimeMs:Date.now()-startMs};
    }

    // Phase 2: Backtracking (only if not already solved)
    let solution: Grid|null=null;
    if(isSolved(cands)){
      solution=toGrid(cands);
    } else {
      solution=backtrack(cloneCands(cands),constraints,steps,0);
    }

    if (!solution) {
      steps.push(makeStep("solving_complete","classic","UNSATISFIABLE",[],[],
        "No solution found after exhaustive search",cands));
      return {solution:null,steps,unique:false,error:"No solution exists",solveTimeMs:Date.now()-startMs};
    }

    // Reconstruct final cands for state display
    const finalCands: Candidates=solution.map(row=>row.map(v=>new Set([v!])));
    steps.push(makeStep("solving_complete","classic","SAT — solution found ✓",[],[],
      `Puzzle solved in ${(Date.now()-startMs)}ms with ${steps.length} deduction steps`,finalCands));

    // Uniqueness check (fast)
    const checkCands: Candidates=Array.from({length:9},(_,r)=>
      Array.from({length:9},(_,c)=>{
        const v=grid[r][c];
        return v!=null?new Set([v]):new Set([1,2,3,4,5,6,7,8,9]);
      })
    );
    const unique=countSolutions(checkCands,constraints,2)===1;

    return {solution,steps,unique,solveTimeMs:Date.now()-startMs};

  } catch(err: any) {
    return {solution:null,steps,unique:false,error:err.message||String(err),solveTimeMs:Date.now()-startMs};
  }
}
