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
  // ─── Classic ──────────────────────────────────────────────────
  {
    id: "classic-easy",
    name: "Classic — Easy",
    description: "Standard 9×9 Sudoku with many givens",
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

  // ─── Diagonal ─────────────────────────────────────────────────
  {
    id: "diagonal",
    name: "Diagonal Sudoku",
    description: "Both diagonals must also contain 1–9 each",
    tags: ["classic", "diagonal"],
    request: {
      grid: [
        [E, E, E, E, E, E, E, E, 1],
        [E, E, E, E, E, E, E, 2, E],
        [E, E, E, E, E, E, 3, E, E],
        [E, E, E, E, E, 4, E, E, E],
        [E, E, E, E, 5, E, E, E, E],
        [E, E, E, 6, E, E, E, E, E],
        [E, E, 7, E, E, E, E, E, E],
        [E, 8, E, E, E, E, E, E, E],
        [9, E, E, E, E, E, E, E, E],
      ],
      constraints: {
        diagonal: [{ direction: "main" }, { direction: "anti" }],
      },
    },
  },

  // ─── Even-Odd ─────────────────────────────────────────────────
  {
    id: "even-odd",
    name: "Even/Odd Sudoku",
    description: "Shaded cells must be even; unshaded odd",
    tags: ["classic", "evenOdd"],
    request: {
      grid: [
        [E, 2, E, E, E, E, E, E, E],
        [E, E, E, 6, E, E, E, E, E],
        [E, E, E, E, E, E, E, 4, E],
        [E, E, E, E, E, E, E, E, 6],
        [E, E, E, E, 4, E, E, E, E],
        [2, E, E, E, E, E, E, E, E],
        [E, 6, E, E, E, E, E, E, E],
        [E, E, E, E, E, 2, E, E, E],
        [E, E, E, E, E, E, E, 8, E],
      ],
      constraints: {
        evenOdd: [
          { cell: [0, 0], parity: "odd" },
          { cell: [0, 2], parity: "odd" },
          { cell: [1, 1], parity: "even" },
          { cell: [1, 3], parity: "odd" },
          { cell: [2, 0], parity: "even" },
          { cell: [2, 4], parity: "even" },
          { cell: [3, 3], parity: "odd" },
          { cell: [4, 4], parity: "even" },
          { cell: [5, 5], parity: "odd" },
          { cell: [6, 6], parity: "even" },
          { cell: [7, 7], parity: "odd" },
          { cell: [8, 8], parity: "even" },
        ],
      },
    },
  },

  // ─── Killer ───────────────────────────────────────────────────
  {
    id: "killer-easy",
    name: "Killer Sudoku — Intro",
    description: "Killer cages with sums — no given digits",
    tags: ["classic", "killer"],
    request: {
      grid: Array.from({ length: 9 }, () => Array(9).fill(null)),
      constraints: {
        killer: [
          { cells: [[0, 0], [0, 1]], sum: 3 },
          { cells: [[0, 2], [0, 3]], sum: 15 },
          { cells: [[0, 4], [0, 5]], sum: 9 },
          { cells: [[0, 6], [0, 7], [0, 8]], sum: 21 },
          { cells: [[1, 0], [2, 0]], sum: 8 },
          { cells: [[1, 1], [1, 2]], sum: 9 },
          { cells: [[1, 3], [2, 3]], sum: 8 },
          { cells: [[1, 4], [1, 5]], sum: 11 },
          { cells: [[1, 6], [2, 6]], sum: 7 },
          { cells: [[1, 7], [1, 8]], sum: 14 },
          { cells: [[2, 1], [2, 2]], sum: 10 },
          { cells: [[2, 4], [3, 4]], sum: 8 },
          { cells: [[2, 5], [3, 5]], sum: 13 },
          { cells: [[2, 7], [2, 8]], sum: 12 },
          { cells: [[3, 0], [4, 0]], sum: 14 },
          { cells: [[3, 1], [3, 2]], sum: 5 },
          { cells: [[3, 3], [4, 3]], sum: 6 },
          { cells: [[3, 6], [3, 7], [3, 8]], sum: 15 },
          { cells: [[4, 1], [4, 2]], sum: 7 },
          { cells: [[4, 4], [5, 4]], sum: 9 },
          { cells: [[4, 5], [4, 6]], sum: 11 },
          { cells: [[4, 7], [4, 8]], sum: 10 },
          { cells: [[5, 0], [6, 0]], sum: 12 },
          { cells: [[5, 1], [5, 2]], sum: 11 },
          { cells: [[5, 3], [6, 3]], sum: 7 },
          { cells: [[5, 5], [5, 6]], sum: 8 },
          { cells: [[5, 7], [5, 8]], sum: 9 },
          { cells: [[6, 1], [6, 2]], sum: 6 },
          { cells: [[6, 4], [6, 5]], sum: 16 },
          { cells: [[6, 6], [7, 6]], sum: 9 },
          { cells: [[6, 7], [6, 8]], sum: 11 },
          { cells: [[7, 0], [8, 0]], sum: 10 },
          { cells: [[7, 1], [7, 2]], sum: 8 },
          { cells: [[7, 3], [8, 3]], sum: 12 },
          { cells: [[7, 4], [7, 5]], sum: 11 },
          { cells: [[7, 7], [7, 8]], sum: 14 },
          { cells: [[8, 1], [8, 2]], sum: 9 },
          { cells: [[8, 4], [8, 5]], sum: 11 },
          { cells: [[8, 6], [8, 7], [8, 8]], sum: 23 },
        ],
      },
    },
  },

  // ─── Thermo ───────────────────────────────────────────────────
  {
    id: "thermo",
    name: "Thermometer Sudoku",
    description: "Values increase along thermometer lines",
    tags: ["classic", "thermo"],
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
        thermo: [
          { cells: [[0, 0], [1, 0], [2, 0], [3, 0]] },
          { cells: [[0, 8], [1, 8], [2, 8], [3, 8]] },
          { cells: [[4, 4], [3, 4], [2, 4], [1, 4]] },
          { cells: [[5, 0], [5, 1], [5, 2], [5, 3]] },
          { cells: [[5, 8], [5, 7], [5, 6], [5, 5]] },
          { cells: [[8, 0], [7, 0], [6, 0]] },
          { cells: [[8, 8], [7, 8], [6, 8]] },
          { cells: [[6, 3], [7, 3], [8, 3]] },
          { cells: [[6, 5], [7, 5], [8, 5]] },
        ],
      },
    },
  },

  // ─── Kropki ───────────────────────────────────────────────────
  {
    id: "kropki",
    name: "Kropki Sudoku",
    description: "Black dots = ratio 2, White dots = consecutive",
    tags: ["classic", "kropki"],
    request: {
      grid: Array.from({ length: 9 }, () => Array(9).fill(null)),
      constraints: {
        kropki: [
          { cells: [[0, 0], [0, 1]], type: "white" },
          { cells: [[0, 1], [0, 2]], type: "black" },
          { cells: [[0, 3], [0, 4]], type: "white" },
          { cells: [[0, 5], [0, 6]], type: "black" },
          { cells: [[0, 7], [0, 8]], type: "white" },
          { cells: [[1, 0], [2, 0]], type: "black" },
          { cells: [[1, 4], [2, 4]], type: "white" },
          { cells: [[1, 8], [2, 8]], type: "black" },
          { cells: [[3, 0], [3, 1]], type: "black" },
          { cells: [[3, 4], [3, 5]], type: "white" },
          { cells: [[4, 2], [4, 3]], type: "black" },
          { cells: [[4, 5], [4, 6]], type: "white" },
          { cells: [[5, 0], [6, 0]], type: "white" },
          { cells: [[5, 8], [6, 8]], type: "black" },
          { cells: [[6, 3], [6, 4]], type: "white" },
          { cells: [[7, 1], [7, 2]], type: "black" },
          { cells: [[7, 6], [7, 7]], type: "white" },
          { cells: [[8, 0], [8, 1]], type: "black" },
          { cells: [[8, 4], [8, 5]], type: "white" },
          { cells: [[8, 7], [8, 8]], type: "black" },
        ],
      },
    },
  },

  // ─── Hybrid: Killer + Diagonal ────────────────────────────────
  {
    id: "hybrid-killer-diagonal",
    name: "Hybrid: Killer + Diagonal",
    description: "Killer cages combined with diagonal uniqueness",
    tags: ["classic", "killer", "diagonal"],
    request: {
      grid: Array.from({ length: 9 }, () => Array(9).fill(null)),
      constraints: {
        diagonal: [{ direction: "main" }],
        killer: [
          { cells: [[0, 0], [0, 1], [0, 2]], sum: 14 },
          { cells: [[1, 0], [1, 1]], sum: 9 },
          { cells: [[2, 0], [2, 1]], sum: 12 },
          { cells: [[0, 3], [0, 4], [1, 3]], sum: 16 },
          { cells: [[0, 5], [0, 6]], sum: 10 },
          { cells: [[0, 7], [0, 8], [1, 8]], sum: 15 },
          { cells: [[3, 0], [3, 1], [4, 0]], sum: 13 },
          { cells: [[4, 4], [5, 4], [5, 5]], sum: 17 },
          { cells: [[8, 6], [8, 7], [8, 8]], sum: 17 },
        ],
      },
    },
  },
];
