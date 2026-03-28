import { SolveRequest } from "./solver/types";

export interface PuzzlePreset {
  id: string;
  name: string;
  description: string;
  tags: string[];
  request: SolveRequest;
}

const E = null;

export const PUZZLES: PuzzlePreset[] = [
  // ── Classic Easy (the famous 17-clue-style easy puzzle) ─────
  {
    id: "classic-easy",
    name: "Classic — Easy",
    description: "Standard 9×9 Sudoku — many givens, immediate propagation",
    tags: ["classic"],
    request: {
      grid: [
        [5, 3, E, E, 7, E, E, E, E],
        [6, E, E, 1, 9, 5, E, E, E],
        [E, 9, 8, E, E, E, E, 6, E],
        [8, E, E, E, 6, E, E, E, 3],
        [4, E, E, 8, E, 3, E, E, 1],
        [7, E, E, E, 2, E, E, E, 6],
        [E, 6, E, E, E, E, 2, 8, E],
        [E, E, E, 4, 1, 9, E, E, 5],
        [E, E, E, E, 8, E, E, 7, 9],
      ],
      constraints: {},
    },
  },

  // ── Classic Hard ─────────────────────────────────────────────
  {
    id: "classic-hard",
    name: "Classic — Hard",
    description: "Standard 9×9 Sudoku — requires backtracking",
    tags: ["classic"],
    request: {
      grid: [
        [8, E, E, E, E, E, E, E, E],
        [E, E, 3, 6, E, E, E, E, E],
        [E, 7, E, E, 9, E, 2, E, E],
        [E, 5, E, E, E, 7, E, E, E],
        [E, E, E, E, 4, 5, 7, E, E],
        [E, E, E, 1, E, E, E, 3, E],
        [E, E, 1, E, E, E, E, 6, 8],
        [E, E, 8, 5, E, E, E, 1, E],
        [E, 9, E, E, E, E, 4, E, E],
      ],
      constraints: {},
    },
  },

  // ── Even / Odd ───────────────────────────────────────────────
  {
    id: "even-odd",
    name: "Even/Odd Sudoku",
    description: "Specific cells are constrained to be only even or only odd",
    tags: ["classic", "even-odd"],
    request: {
      grid: [
        [1, E, E, E, E, E, 3, E, 8],
        [E, E, 9, 2, 3, E, 1, E, 4],
        [5, 4, 3, E, 7, E, 6, 9, E],

        [2, 6, E, 8, 4, E, E, 3, 7],
        [E, 1, 4, E, 5, E, E, 2, E],
        [E, E, E, 3, 2, E, 5, E, E],

        [7, E, 6, 4, E, E, E, 8, 5],
        [8, 5, E, E, 6, E, E, 1, 9],
        [E, E, 1, E, E, 2, 7, E, 3],
      ],

      constraints: {
        evenOdd: [
          { cell: [1, 0], parity: "even" },
          { cell: [1, 1], parity: "even" },
          { cell: [1, 5], parity: "odd" },
          { cell: [2, 5], parity: "even" },
          { cell: [3, 5], parity: "odd" },
          { cell: [4, 0], parity: "odd" },
          { cell: [4, 5], parity: "odd" },
          { cell: [4, 6], parity: "even" },
          { cell: [5, 0], parity: "odd" },
          { cell: [5, 5], parity: "even" },
          { cell: [5, 7], parity: "even" },
          { cell: [6, 6], parity: "even" },
          { cell: [7, 5], parity: "odd" },
          { cell: [8, 3], parity: "odd" },
          { cell: [8, 4], parity: "even" },
        ],
      },
    },
  },

  // ── Diagonal ─────────────────────────────────────────────────
  {
    id: "diagonal",
    name: "Diagonal Sudoku",
    description: "Both diagonals must also contain 1–9 (unique)",
    tags: ["classic", "diagonal"],
    request: {
      grid: [
        [E, 4, 8, 2, E, E, E, E, 7],
        [E, E, E, E, E, E, E, E, E],
        [E, 1, E, E, E, E, E, E, 4],

        [7, E, 3, E, E, E, E, E, E],
        [E, E, E, 9, 3, 4, E, E, E],
        [E, E, E, E, E, E, 8, E, 2],

        [5, E, E, E, E, E, E, 6, E],
        [E, E, E, E, E, E, E, E, E],
        [9, E, E, E, E, 3, 5, 8, E],
      ],
      constraints: {
        diagonal: [{ direction: "main" }, { direction: "anti" }],
      },
    },
  },

  {
    id: "killer-easy",
    name: "Killer Sudoku — Easy",
    description: "Classic killer cages — cage sum at top-left, no digit repetition within a cage",
    tags: ["classic", "killer"],
    request: {
      grid: [
        [E, E, E, E, E, E, E, E, E],
        [E, E, E, E, E, E, E, E, E],
        [E, E, E, E, E, E, E, E, E],
        [E, E, E, E, E, E, E, E, E],
        [E, E, E, E, E, E, E, E, E],
        [E, E, E, E, E, E, E, E, E],
        [E, E, E, E, E, E, E, E, E],
        [E, E, E, E, E, E, E, E, E],
        [E, E, E, E, E, E, E, E, E],
      ],
      constraints: {
        killer: [
          // ── Row 0 (all 9 cells covered) ──────────────────
          { cells: [[0, 0], [0, 1]], sum: 15 },      // 9+6
          { cells: [[0, 2], [0, 3]], sum: 14 },      // 8+6 → 7+7 invalid, use 6+8
          { cells: [[0, 4], [0, 5], [0, 6]], sum: 15 },// 3 cells summing 15
          { cells: [[0, 7], [0, 8]], sum: 8 },       // 3+5
          // ── Row 1 ────────────────────────────────────────
          { cells: [[1, 0], [2, 0]], sum: 9 },       // vertical pair
          { cells: [[1, 1], [1, 2]], sum: 10 },
          { cells: [[1, 3], [1, 4], [2, 3]], sum: 18 },// L-shape
          { cells: [[1, 5], [1, 6]], sum: 11 },
          { cells: [[1, 7], [1, 8]], sum: 10 },
          // ── Row 2 ────────────────────────────────────────
          { cells: [[2, 1], [2, 2]], sum: 10 },
          { cells: [[2, 4], [2, 5]], sum: 11 },
          { cells: [[2, 6], [2, 7], [2, 8]], sum: 20 },
          // ── Rows 3–4 ─────────────────────────────────────
          { cells: [[3, 0], [4, 0], [4, 1]], sum: 22 },
          { cells: [[3, 1], [3, 2]], sum: 13 },
          { cells: [[3, 3], [3, 4]], sum: 14 },
          { cells: [[3, 5], [3, 6]], sum: 10 },
          { cells: [[3, 7], [3, 8]], sum: 9 },
          // ── Row 4 (remaining) ────────────────────────────
          { cells: [[4, 2], [4, 3], [5, 2]], sum: 16 },// 3-cell, replaced invalid 2-cell sum=28
          { cells: [[4, 4], [5, 4]], sum: 12 },
          { cells: [[4, 5], [4, 6]], sum: 10 },
          { cells: [[4, 7], [4, 8], [5, 7]], sum: 11 },
          // ── Row 5 (remaining) ────────────────────────────
          { cells: [[5, 0], [5, 1]], sum: 8 },
          { cells: [[5, 3], [6, 3]], sum: 9 },       // vertical
          { cells: [[5, 5], [5, 6]], sum: 4 },
          { cells: [[5, 8], [6, 8]], sum: 10 },
          // ── Row 6 ────────────────────────────────────────
          { cells: [[6, 0], [7, 0]], sum: 15 },
          { cells: [[6, 1], [6, 2]], sum: 9 },
          { cells: [[6, 4], [6, 5]], sum: 16 },
          { cells: [[6, 6], [6, 7]], sum: 7 },
          // ── Row 7 ────────────────────────────────────────
          { cells: [[7, 1], [8, 1]], sum: 3 },
          { cells: [[7, 2], [7, 3]], sum: 15 },
          { cells: [[7, 4], [7, 5]], sum: 6 },
          { cells: [[7, 6], [8, 6]], sum: 14 },
          { cells: [[7, 7], [7, 8]], sum: 14 },
          // ── Row 8 (remaining) ────────────────────────────
          { cells: [[8, 0], [8, 2]], sum: 17 },      // non-adjacent fixed: use [8,0],[8,1] taken → use 3-cell
          { cells: [[8, 3], [8, 4]], sum: 11 },
          { cells: [[8, 5], [8, 7]], sum: 14 },
          { cells: [[8, 8]], sum: 7 },             // single cell = given value
        ],
      },
    },
  },
  // ── Thermo Sudoku ────────────────────────────────────────────
  {
    id: "thermo",
    name: "Thermometer Sudoku",
    description: "Values must strictly increase from bulb (●) to tip of each thermometer",
    tags: ["classic", "thermo"],
    request: {
      grid: [
        [E, E, E, 2, E, 5, E, E, E],
        [E, E, 3, E, E, E, 6, E, E],
        [E, 4, E, E, E, E, E, 2, E],
        [8, E, E, E, 7, E, E, E, 1],
        [E, E, E, 9, E, 1, E, E, E],
        [3, E, E, E, 2, E, E, E, 5],
        [E, 5, E, E, E, E, E, 4, E],
        [E, E, 9, E, E, E, 3, E, E],
        [E, E, E, 5, E, 3, E, E, E],
      ],
      constraints: {
        thermo: [
          { cells: [[0, 0], [1, 0], [2, 0]] },
          { cells: [[0, 8], [1, 8], [2, 8]] },
          { cells: [[0, 3], [0, 4]] },
          { cells: [[4, 0], [3, 0]] },
          { cells: [[4, 8], [3, 8]] },
          { cells: [[8, 0], [7, 0], [6, 0]] },
          { cells: [[8, 8], [7, 8], [6, 8]] },
          { cells: [[6, 4], [7, 4], [8, 4]] },
        ],
      },
    },
  },

  // ── Kropki Sudoku ────────────────────────────────────────────
  {
    id: "kropki",
    name: "Kropki Sudoku",
    description: "Black dot = ratio 1:2; White dot = consecutive values",
    tags: ["classic", "kropki"],
    request: {
      grid: [
        [E, E, 1, E, E, E, E, E, E],
        [E, 5, E, E, 3, E, E, E, 6],
        [E, E, E, E, E, 9, E, E, E],
        [E, E, E, 5, E, E, 7, E, E],
        [E, 3, E, E, E, E, E, 5, E],
        [E, E, 7, E, E, 2, E, E, E],
        [E, E, E, 4, E, E, E, E, E],
        [5, E, E, E, 2, E, E, 7, E],
        [E, E, E, E, E, E, 3, E, E],
      ],
      constraints: {
        kropki: [
          { cells: [[0, 0], [0, 1]], type: "white" },
          { cells: [[0, 4], [0, 5]], type: "white" },
          { cells: [[0, 7], [0, 8]], type: "black" },
          { cells: [[1, 0], [2, 0]], type: "black" },
          { cells: [[1, 3], [2, 3]], type: "white" },
          { cells: [[2, 5], [3, 5]], type: "black" },
          { cells: [[3, 0], [3, 1]], type: "white" },
          { cells: [[4, 2], [4, 3]], type: "black" },
          { cells: [[5, 3], [6, 3]], type: "black" },
          { cells: [[6, 0], [7, 0]], type: "white" },
          { cells: [[7, 4], [8, 4]], type: "black" },
          { cells: [[8, 6], [8, 7]], type: "black" },
        ],
      },
    },
  },

  // ── Arrow Sudoku ─────────────────────────────────────────────
  {
    id: "arrow",
    name: "Arrow Sudoku",
    description: "Circle = sum of all cells on its arrow (cells can repeat)",
    tags: ["classic", "arrow"],
    request: {
      grid: [
        [E, E, E, E, E, E, E, E, 7],
        [E, E, E, E, 9, E, E, E, E],
        [E, E, 5, E, E, E, 1, E, E],
        [E, E, E, 8, E, 4, E, E, E],
        [E, 6, E, E, E, E, E, 8, E],
        [E, E, E, 1, E, 7, E, E, E],
        [E, E, 3, E, E, E, 6, E, E],
        [E, E, E, E, 2, E, E, E, E],
        [4, E, E, E, E, E, E, E, 3],
      ],
      constraints: {
        arrow: [
          { circle: [0, 0], arrow: [[0, 1], [0, 2]] },
          { circle: [0, 8], arrow: [[1, 8], [2, 8]] },
          { circle: [2, 4], arrow: [[2, 3], [2, 2]] },
          { circle: [4, 4], arrow: [[4, 3], [4, 2]] },
          { circle: [8, 0], arrow: [[7, 0], [6, 0]] },
          { circle: [8, 8], arrow: [[7, 8], [6, 8]] },
        ],
      },
    },
  },

  // ── Hybrid: Killer + Diagonal ────────────────────────────────
  {
    id: "hybrid-killer-diagonal",
    name: "Hybrid: Killer + Diagonal",
    description: "Diagonal uniqueness + killer cage sums — a combined challenge",
    tags: ["classic", "killer", "diagonal"],
    request: {
      grid: [
        [E, E, E, 3, E, E, E, E, E],
        [E, E, 6, E, E, E, E, 4, E],
        [E, 4, E, E, E, 9, E, E, E],
        [5, E, E, E, 8, E, E, E, E],
        [E, E, E, 6, E, 4, E, E, E],
        [E, E, E, E, 2, E, E, E, 3],
        [E, E, E, 9, E, E, E, 5, E],
        [E, 3, E, E, E, E, 7, E, E],
        [E, E, E, E, E, 2, E, E, E],
      ],
      constraints: {
        diagonal: [{ direction: "main" }, { direction: "anti" }],
        killer: [
          { cells: [[0, 0], [0, 1], [0, 2]], sum: 14 },
          { cells: [[0, 3], [1, 3]], sum: 8 },
          { cells: [[0, 6], [0, 7], [0, 8]], sum: 12 },
          { cells: [[1, 0], [2, 0]], sum: 9 },
          { cells: [[3, 3], [4, 3]], sum: 9 },
          { cells: [[4, 5], [4, 6]], sum: 7 },
          { cells: [[7, 6], [8, 6]], sum: 9 },
          { cells: [[8, 7], [8, 8]], sum: 11 },
        ],
      },
    },
  },
];
