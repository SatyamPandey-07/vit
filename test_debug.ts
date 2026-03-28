
import { solve } from "./lib/solver/solver";
import { PUZZLES } from "./lib/puzzles";

const id = "killer-easy";
const puzzle = PUZZLES.find(p => p.id === id);
if (puzzle) {
    console.log(`Solving ${puzzle.name}...`);
    const resp = solve(puzzle.request.grid, puzzle.request.constraints);
    if (resp.solution) console.log("✅ Solved!");
    else console.log("❌ FAILED -", resp.error);
}
