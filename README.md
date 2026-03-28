# Variant Sudoku Solver

A full-stack Sudoku solving and puzzle creation tool powered by the **Z3 SMT solver**, built with **Next.js 16 (App Router)** and **TypeScript**. Models Sudoku as a Constraint Satisfaction Problem (CSP) and provides step-by-step visualization of the solving process.

---

## Architecture

```
CSP = (Variables, Domains, Constraints)

Variables  → 81 integer cells  x[r][c] ∈ {1..9}
Domains    → {1, 2, 3, 4, 5, 6, 7, 8, 9}
Constraints→ classic + any combination of variant rules
```

The solver encodes all constraints declaratively into Z3, calls the SMT engine server-side, and returns a fully annotated solution with step-by-step propagation traces.

---

## Features

### Solver (`/`)
- Solve any of the **7 built-in preset puzzles** or a custom puzzle from the Creator
- **Z3 SMT engine** — all constraints modelled symbolically, not heuristically
- **Step-by-step visualization** — every constraint emits an `equation` + `before/after candidates` diff
- **Uniqueness check** — after finding a solution, blocks it and re-solves to confirm uniqueness
- **Step playback** — Play / Pause / Next / Prev / Jump with 0.5× – 10× speed control

### Creator (`/creator`)
- Interactive **9×9 grid** with keyboard digit entry and arrow-key navigation
- **Variant toggle switches** — enable any combination of constraint types
- **Constraint drawing tools**:
  - **Killer cages** — click cells, enter sum, confirm
  - **Thermometers** — click cells in order, confirm
  - **Arrow constraints** — click circle, trace path, confirm
  - **Kropki dots** — click two adjacent cells to cycle black → white → remove
  - **Even/Odd markers** — click cell to cycle even → odd → remove
- **Live constraint summary** panel with per-constraint removal
- **Export JSON** — download the puzzle schema
- **Solve Puzzle** — sends the puzzle to the Solver via `sessionStorage`

### Supported Sudoku Variants

| Variant | Constraint | Z3 Equation |
|---|---|---|
| Classic | Row/col/box all-distinct | `Distinct(row)`, `Distinct(col)`, `Distinct(box)` |
| Killer | Cage sum + distinct | `Sum(cells) == S`, `Distinct(cells)` |
| Thermo | Strictly increasing | `x[i] < x[i+1]` |
| Arrow | Circle equals path sum | `circle == Sum(path)` |
| Kropki Black | Ratio 2 | `x == 2y OR y == 2x` |
| Kropki White | Consecutive | `|x - y| == 1` |
| Even/Odd | Parity constraint | `x % 2 == 0 or 1` |
| Diagonal | Diagonal all-distinct | `Distinct(main_diag)`, `Distinct(anti_diag)` |

Multiple variants can be combined freely — the solver pipeline is fully generic.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript 5 |
| Styling | Vanilla CSS (monochrome design system) |
| Fonts | Space Grotesk · IBM Plex Mono |
| SMT Solver | [z3-solver](https://www.npmjs.com/package/z3-solver) (WASM + Node.js) |
| Package manager | pnpm |
| Animations | CSS transitions only |

No Python backend. The Z3 solver runs entirely inside **Next.js API Routes** (`/api/solve`).

---

## Project Structure

```
suduko/
├── app/
│   ├── api/
│   │   └── solve/
│   │       └── route.ts          # POST /api/solve — calls Z3 solver
│   ├── creator/
│   │   └── page.tsx              # /creator — puzzle builder UI
│   ├── globals.css               # Monochrome design system + tokens
│   ├── layout.tsx                # Root layout with Navbar
│   └── page.tsx                  # / — solver UI
│
├── components/
│   ├── Navbar.tsx                # Shared navigation bar
│   ├── PuzzleSelector.tsx        # Preset puzzle list
│   ├── StepViewer.tsx            # Step playback + equation display
│   └── SudokuGrid.tsx            # Interactive grid + SVG overlays
│
├── lib/
│   ├── puzzles.ts                # 7 preset puzzle definitions
│   └── solver/
│       ├── candidates.ts         # Candidate tracker + StepLogger
│       ├── propagators.ts        # Constraint propagators (one per type)
│       ├── types.ts              # All shared TypeScript types
│       └── z3solver.ts           # Z3 model builder + solver + uniqueness check
│
├── next.config.ts
├── package.json
└── pnpm-lock.yaml
```

---

## Getting Started

### Prerequisites

- Node.js ≥ 20.9
- pnpm ≥ 10

### Install

```bash
git clone https://github.com/SatyamPandey-07/vit.git
cd vit
pnpm install
```

### Run dev server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## API Reference

### `POST /api/solve`

**Request body:**

```json
{
  "grid": [
    [5, 3, null, null, 7, null, null, null, null],
    ...
  ],
  "constraints": {
    "killer": [
      { "cells": [[0,0],[0,1]], "sum": 3 }
    ],
    "thermo": [
      { "cells": [[0,0],[1,0],[2,0]] }
    ],
    "arrow": [
      { "circle": [0,0], "arrow": [[0,1],[0,2]] }
    ],
    "kropki": [
      { "cells": [[0,0],[0,1]], "type": "black" }
    ],
    "evenOdd": [
      { "cell": [0,0], "parity": "even" }
    ],
    "diagonal": [
      { "direction": "main" }
    ]
  }
}
```

**Response:**

```json
{
  "solution": [[5,3,4,6,7,8,9,1,2], ...],
  "steps": [
    {
      "step_id": 0,
      "type": "constraint_applied",
      "cells": [[0,0],[0,1]],
      "constraint": "killer",
      "equation": "x00 + x01 = 3",
      "before": { "0,0": [1,2,3,4,5,6,7,8,9], "0,1": [1,2,3,4,5,6,7,8,9] },
      "after":  { "0,0": [1,2], "0,1": [1,2] },
      "reason": "Killer cage sum 3 over 2 cells restricts values",
      "highlight": { "cells": [[0,0],[0,1]], "color": "#92400e" }
    }
  ],
  "unique": true,
  "solveTimeMs": 1240
}
```

All fields of each step are constraint-agnostic — the same schema applies regardless of which variant generated the step.

---

## Visualization Pipeline

The step-generation system is fully generic:

```
1. initCandidates(grid)          → candidates[r][c] = Set{1..9}
2. propagateAll(log, grid, constraints)
     ↳ propagateClassic()        → emit steps for row/col/box
     ↳ propagateEvenOdd()        → emit steps with equation "x%2=0"
     ↳ propagateKiller()         → generate valid combos, narrow candidates
     ↳ propagateThermo()         → forward+backward pass, emit diffs
     ↳ propagateArrow()          → restrict circle and path cells
     ↳ propagateKropki()         → pairwise filter
3. Z3 solves globally
4. value_fixed steps emitted for each Z3-assigned cell
5. Uniqueness: block solution, re-solve, check sat/unsat
```

Every constraint emits steps through the same `StepLogger.narrow()` call, producing identical step objects regardless of constraint type.

---

## Puzzle JSON Schema

Export from the Creator or craft by hand:

```json
{
  "grid": [[null, ...], ...],
  "constraints": {
    "killer":   [{ "cells": [[r,c],...], "sum": N }],
    "thermo":   [{ "cells": [[r,c],...] }],
    "arrow":    [{ "circle": [r,c], "arrow": [[r,c],...] }],
    "kropki":   [{ "cells": [[r1,c1],[r2,c2]], "type": "black"|"white" }],
    "evenOdd":  [{ "cell": [r,c], "parity": "even"|"odd" }],
    "diagonal": [{ "direction": "main"|"anti" }]
  }
}
```

All constraint arrays are optional. Import via the Creator's "Solve Puzzle" button or post to `/api/solve` directly.

---

## Design System

The UI uses a minimal monochrome design:

| Token | Value |
|---|---|
| `--bg` | `#ffffff` |
| `--text` | `#09090b` |
| `--border` | `#e4e4e7` |
| `--border-box` | `#3f3f46` (thick 3×3 borders) |
| `--text-muted` | `#71717a` |

Constraint colours are deliberately muted (dark amber for Killer, dark red for Thermo, etc.) to keep the UI professional and mathematically focused.

---

## License

MIT
