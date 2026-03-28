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
        [E, E, E, 4, 1, E, E, 7, E],
        [5, 8, 1, E, 6, E, 4, E, E],
        [E, E, E, E, E, 8, 5, E, E],
        [1, E, 5, E, E, 2, E, 8, E],
        [E, E, E, E, E, E, E, E, 7],
        [E, 2, E, E, E, E, 6, E, 3],
        [6, 9, E, E, E, 7, E, E, E],
        [8, E, E, E, E, E, 7, E, E],
        [E, E, E, E, E, E, E, E, E],
      ],
      constraints: {
        killer: [
          // Row 0
          { cells: [[0, 0], [1, 0]], sum: 7 },
          { cells: [[0, 1], [1, 1]], sum: 14 },
          { cells: [[0, 2], [0, 3]], sum: 13 },
          { cells: [[0, 4], [0, 5], [1, 4], [1, 5]], sum: 23 },
          { cells: [[0, 6], [0, 7], [1, 6]], sum: 14 },
          { cells: [[0, 8], [1, 8]], sum: 17 },

          // Row 1–2 transitions
          { cells: [[1, 2], [1, 3], [2, 3]], sum: 17 },
          { cells: [[1, 7]], sum: 2 },

          { cells: [[2, 0], [2, 1]], sum: 11 },
          { cells: [[2, 2]], sum: 3 },
          { cells: [[2, 4]], sum: 2 },
          { cells: [[2, 5], [3, 5]], sum: 8 },
          { cells: [[2, 6], [2, 7]], sum: 15 },
          { cells: [[2, 8], [3, 8]], sum: 17 },

          // Row 3
          { cells: [[3, 0], [3, 1]], sum: 4 },
          { cells: [[3, 2], [4, 2], [5, 2], [5, 1]], sum: 21 },
          { cells: [[3, 3], [4, 3]], sum: 14 },
          { cells: [[3, 4], [3, 5]], sum: 9 },
          { cells: [[3, 6], [3, 7], [4, 6], [5, 6]], sum: 25 },

          // Row 4
          { cells: [[4, 0], [4, 1]], sum: 13 },
          { cells: [[4, 4], [4, 5]], sum: 4 },
          { cells: [[4, 7], [4, 8]], sum: 7 },

          // Row 5
          { cells: [[5, 0], [6, 0], [6, 1]], sum: 22 },
          { cells: [[5, 3], [5, 4], [5, 5]], sum: 18 },
          { cells: [[5, 7], [6, 7]], sum: 4 },
          { cells: [[5, 8]], sum: 3 },

          // Row 6
          { cells: [[6, 2], [6, 3], [6, 4]], sum: 10 },
          { cells: [[6, 5], [6, 6], [7, 5]], sum: 21 },
          { cells: [[6, 8], [7, 8]], sum: 5 },

          // Row 7
          { cells: [[7, 0], [7, 1]], sum: 9 },
          { cells: [[7, 2], [8, 2]], sum: 9 },
          { cells: [[7, 3], [7, 4], [8, 4], [8, 5]], sum: 24 },
          { cells: [[7, 6], [8, 6]], sum: 8 },
          { cells: [[7, 7], [7, 8]], sum: 9 },

          // Row 8
          { cells: [[8, 0], [8, 1]], sum: 8 },
          { cells: [[8, 3]], sum: 2 },
          { cells: [[8, 7], [8, 8]], sum: 15 }
        ]
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
  [E, 1, E, 8, E, E, 2, E, E],
  [8, 7, E, E, E, E, E, 1, 3],
  [E, E, E, E, E, E, E, E, E],

  [E, E, E, E, E, E, E, E, E],
  [6, E, E, E, E, E, E, E, 7],
  [E, E, E, E, E, E, E, E, E],

  [7, 2, E, E, E, E, 4, E, 1],
  [E, 4, E, 3, E, E, 9, E, E],
  [E, E, E, E, E, E, E, E, E],
],
      constraints: {
        kropki: [
  // Row 0
  { cells: [[0,1],[0,2]], type: "white" },
  { cells: [[0,3],[0,4]], type: "white" },
  { cells: [[0,6],[1,6]], type: "black" },

  // Row 1
  { cells: [[1,0],[1,1]], type: "white" },
  { cells: [[1,2],[1,3]], type: "white" },
  { cells: [[1,6],[1,7]], type: "white" },

  // Row 2
  { cells: [[2,1],[2,2]], type: "black" },
  { cells: [[2,4],[2,5]], type: "white" },

  // Row 3
  { cells: [[3,4],[3,5]], type: "white" },

  // Row 4
  { cells: [[4,1],[4,2]], type: "white" },
  { cells: [[4,5],[4,6]], type: "white" },
  { cells: [[4,7],[4,8]], type: "black" },

  // Row 5
  { cells: [[5,3],[5,4]], type: "black" },

  // Row 6
  { cells: [[6,2],[6,3]], type: "white" },
  { cells: [[6,5],[6,6]], type: "white" },

  // Row 7
  { cells: [[7,0],[7,1]], type: "white" },
  { cells: [[7,4],[7,5]], type: "white" },

  // Row 8
  { cells: [[8,3],[8,4]], type: "white" },

  // Vertical constraints
  { cells: [[0,0],[1,0]], type: "white" },
  { cells: [[0,5],[1,5]], type: "white" },
  { cells: [[1,1],[2,1]], type: "black" },
  { cells: [[1,4],[2,4]], type: "white" },
  { cells: [[2,5],[3,5]], type: "black" },
  { cells: [[3,2],[4,2]], type: "white" },
  { cells: [[3,6],[4,6]], type: "white" },
  { cells: [[4,4],[5,4]], type: "white" },
  { cells: [[5,5],[6,5]], type: "white" },
  { cells: [[6,7],[7,7]], type: "white" },
  { cells: [[7,2],[8,2]], type: "white" },
]
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
  [8, E, E, E, E, E, 7, E, E],
  [2, E, 6, 4, 7, E, E, 3, E],
  [5, E, E, E, E, 9, 4, E, 8],

  [E, E, E, 9, E, E, 8, E, E],
  [E, 4, E, 3, E, E, 2, E, E],
  [3, 6, E, E, E, E, 9, 4, 5],

  [E, E, 9, E, E, E, E, E, 4],
  [E, E, 2, E, E, E, E, E, E],
  [1, 7, E, E, 9, E, E, E, E],
],
      constraints: {
       arrow: [
  // Top-left horizontal arrow
  { circle: [1,1], arrow: [[2,1],[3,2]] },

  // Top-center zig-zag
  { circle: [1,4], arrow: [[0,3],[0,4]] },

  // Top-right long diagonal
  { circle: [0,7], arrow: [[1,8],[2,8]] },

  // Middle-left vertical + turn
  { circle: [3,0], arrow: [[4,0],[4,1],[4,2]] },

  // Middle-center
  { circle: [3,3], arrow: [[4,3],[5,2]] },

  // Center-right L-shape
  { circle: [2,5], arrow: [[3,5],[4,5]] },

  // Bottom-left diagonal
  { circle: [8,1], arrow: [[7,2],[6,2]] },

  // Bottom-center upward arrow
  { circle: [8,3], arrow: [[7,3],[6,4],[6,5],[5,5]] },

  // Bottom-right vertical
  { circle: [7,8], arrow: [[6,8],[5,8]] },

  // Right-middle down arrow
  { circle: [6,7], arrow: [[5,7],[4,7],[4,6]] },
]
      },
    },
  },

 
];
