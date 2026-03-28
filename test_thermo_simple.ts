
import { solve } from "./lib/solver/solver";
import { Grid } from "./lib/solver/types";

const E = null;
const grid: Grid = Array.from({length:9}, ()=>Array(9).fill(E));
grid[2][0] = 5; // Thermo ends at (2,0) with value 5
const constraints = {
    thermo: [
        { cells: [[0,0], [1,0], [2,0]] }
    ]
};

console.log("Solving simple thermo...");
const resp = solve(grid, constraints);
if (resp.solution) {
    console.log("✅ Solved! x00 =", resp.solution[0][0], ", x10 =", resp.solution[1][0]);
} else {
    console.log("❌ Failed!", resp.error);
}
