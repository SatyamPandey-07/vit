
import { solve } from "./lib/solver/solver";
import { Grid } from "./lib/solver/types";

const E = null;
const grid: Grid = Array.from({length:9}, ()=>Array(9).fill(E));
grid[0][0] = 5;

// Cage x00 + x01 = 14. Since x00=5, x01 MUST be 9.
const constraints = {
    killer: [
        { cells: [[0,0], [0,1]], sum: 14 }
    ]
};

console.log("Solving simple cage...");
const resp = solve(grid, constraints);
if (resp.solution) {
    console.log("✅ Solved! x01 =", resp.solution[0][1]);
} else {
    console.log("❌ Failed!", resp.error);
}
