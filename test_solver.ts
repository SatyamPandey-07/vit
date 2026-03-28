
import { solve } from "./lib/solver/solver";
import { PUZZLES } from "./lib/puzzles";

const variants = ["classic-easy", "classic-hard", "even-odd", "diagonal", "killer-easy", "thermo", "kropki", "arrow"];

for (const id of variants) {
    const puzzle = PUZZLES.find(p => p.id === id);
    if (!puzzle) continue;

    console.log(`Solving ${puzzle.name}...`);
    const resp = solve(puzzle.request.grid, puzzle.request.constraints);
    if (resp.solution) {
        console.log(`✅ ${puzzle.name}: Solved (${resp.solveTimeMs}ms)`);
    } else {
        console.log(`❌ ${puzzle.name}: FAILED - ${resp.error || "No solution"}`);
    }
}
