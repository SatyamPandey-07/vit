"use client";

import React, { useState, useCallback, useReducer } from "react";
import { useRouter } from "next/navigation";
import SudokuGrid from "@/components/SudokuGrid";
import {
  Grid,
  ConstraintSet,
  ConstraintKind,
  KillerCage,
  ThermoCell,
  ArrowConstraint,
  KropkiDot,
  EvenOddCell,
} from "@/lib/solver/types";

// ─────────────────────────────────────────────────────────
//  Edit modes
// ─────────────────────────────────────────────────────────
type EditMode = "digit" | "killer" | "thermo" | "arrow-circle" | "arrow-path" | "kropki" | "evenOdd";

const MODE_INFO: Record<EditMode, { label: string; hint: string }> = {
  digit:        { label: "Enter Digits",   hint: "Click a cell, then press 1–9 (or Delete to clear)." },
  killer:       { label: "Draw Cages",     hint: "Click cells to add to cage, then press Enter to confirm sum." },
  thermo:       { label: "Draw Thermo",    hint: "Click cells in order (bulb first). Press Enter to confirm." },
  "arrow-circle": { label: "Arrow Circle", hint: "Click the circle cell." },
  "arrow-path": { label: "Arrow Path",    hint: "Click cells along the arrow path. Press Enter to confirm." },
  kropki:       { label: "Kropki Dots",    hint: "Click two adjacent cells to toggle black/white dot." },
  evenOdd:      { label: "Even / Odd",    hint: "Click a cell to toggle even/odd marker." },
};

// ─────────────────────────────────────────────────────────
//  State
// ─────────────────────────────────────────────────────────
interface CreatorState {
  grid: Grid;
  constraints: ConstraintSet;
  selectedCells: string[]; // ordered list of "r,c"
  arrowCircle: [number, number] | null;
  kropkiFirst: [number, number] | null;
  validationErrors: string[];
}

const emptyGrid = (): Grid =>
  Array.from({ length: 9 }, () => Array(9).fill(null));

const initialState: CreatorState = {
  grid: emptyGrid(),
  constraints: {},
  selectedCells: [],
  arrowCircle: null,
  kropkiFirst: null,
  validationErrors: [],
};

// ─────────────────────────────────────────────────────────
export default function CreatorPage() {
  const router = useRouter();

  const [state, setState] = useState<CreatorState>(initialState);
  const [mode, setMode] = useState<EditMode>("digit");
  const [activeVariants, setActiveVariants] = useState<Set<ConstraintKind>>(
    new Set(["classic" as ConstraintKind])
  );
  const [selectedCell, setSelectedCell] = useState<[number, number] | null>(null); // for digit mode
  const [killerSumInput, setKillerSumInput] = useState("");
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  // ─── Toggle variant ────────────────────────────────────
  const toggleVariant = (v: ConstraintKind) => {
    if (v === "classic") return; // always on
    setActiveVariants(prev => {
      const n = new Set(prev);
      if (n.has(v)) n.delete(v); else n.add(v);
      return n;
    });
    // Reset mode if variant turned off
    setMode("digit");
    setState(prev => ({ ...prev, selectedCells: [], arrowCircle: null, kropkiFirst: null }));
  };

  // ─── Cell click handler ────────────────────────────────
  const handleCellClick = useCallback((r: number, c: number) => {
    const key = `${r},${c}`;

    if (mode === "digit") {
      setSelectedCell([r, c]);
      return;
    }

    if (mode === "evenOdd") {
      setState(prev => {
        const eo = [...(prev.constraints.evenOdd ?? [])];
        const idx = eo.findIndex(e => e.cell[0] === r && e.cell[1] === c);
        if (idx === -1) {
          eo.push({ cell: [r, c], parity: "even" });
          setStatusMsg("Added EVEN marker — click again to toggle ODD");
        } else if (eo[idx].parity === "even") {
          eo[idx] = { cell: [r, c], parity: "odd" };
          setStatusMsg("Changed to ODD marker — click again to remove");
        } else {
          eo.splice(idx, 1);
          setStatusMsg("Removed even/odd marker");
        }
        return { ...prev, constraints: { ...prev.constraints, evenOdd: eo } };
      });
      return;
    }

    if (mode === "killer") {
      setState(prev => {
        const alreadyIn = prev.selectedCells.includes(key);
        const newSel = alreadyIn
          ? prev.selectedCells.filter(k => k !== key)
          : [...prev.selectedCells, key];
        return { ...prev, selectedCells: newSel };
      });
      return;
    }

    if (mode === "thermo") {
      setState(prev => {
        const alreadyIn = prev.selectedCells.includes(key);
        if (alreadyIn) return prev;
        return { ...prev, selectedCells: [...prev.selectedCells, key] };
      });
      return;
    }

    if (mode === "arrow-circle") {
      setState(prev => ({ ...prev, arrowCircle: [r, c], selectedCells: [] }));
      setMode("arrow-path");
      setStatusMsg(`Circle set at (${r + 1},${c + 1}). Now click arrow path cells. Press Enter to confirm.`);
      return;
    }

    if (mode === "arrow-path") {
      setState(prev => {
        const alreadyIn = prev.selectedCells.includes(key);
        if (alreadyIn) return prev;
        return { ...prev, selectedCells: [...prev.selectedCells, key] };
      });
      return;
    }

    if (mode === "kropki") {
      setState(prev => {
        if (!prev.kropkiFirst) {
          return { ...prev, kropkiFirst: [r, c] };
        }
        const [r1, c1] = prev.kropkiFirst;
        // Must be adjacent
        if (Math.abs(r - r1) + Math.abs(c - c1) !== 1) {
          setStatusMsg("Kropki dots can only be placed between adjacent cells.");
          return { ...prev, kropkiFirst: null };
        }
        const dots = [...(prev.constraints.kropki ?? [])];
        const existing = dots.findIndex(
          d => (d.cells[0][0] === r1 && d.cells[0][1] === c1 && d.cells[1][0] === r && d.cells[1][1] === c) ||
               (d.cells[0][0] === r  && d.cells[0][1] === c  && d.cells[1][0] === r1 && d.cells[1][1] === c1)
        );
        if (existing === -1) {
          dots.push({ cells: [[r1, c1], [r, c]], type: "black" });
          setStatusMsg("Added black dot. Click same pair to toggle white / remove.");
        } else if (dots[existing].type === "black") {
          dots[existing] = { ...dots[existing], type: "white" };
          setStatusMsg("Changed to white dot. Click same pair to remove.");
        } else {
          dots.splice(existing, 1);
          setStatusMsg("Removed Kropki dot.");
        }
        return { ...prev, constraints: { ...prev.constraints, kropki: dots }, kropkiFirst: null };
      });
      return;
    }
  }, [mode]);

  // ─── Keyboard for digit input ──────────────────────────
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (mode === "digit" && selectedCell) {
      const [r, c] = selectedCell;
      if (e.key >= "1" && e.key <= "9") {
        setState(prev => {
          const g = prev.grid.map(row => [...row]);
          g[r][c] = Number(e.key);
          return { ...prev, grid: g };
        });
      } else if (e.key === "Backspace" || e.key === "Delete" || e.key === "0") {
        setState(prev => {
          const g = prev.grid.map(row => [...row]);
          g[r][c] = null;
          return { ...prev, grid: g };
        });
      } else if (e.key === "ArrowRight") setSelectedCell([r, Math.min(c + 1, 8)]);
      else if (e.key === "ArrowLeft")  setSelectedCell([r, Math.max(c - 1, 0)]);
      else if (e.key === "ArrowDown")  setSelectedCell([Math.min(r + 1, 8), c]);
      else if (e.key === "ArrowUp")    setSelectedCell([Math.max(r - 1, 0), c]);
    }

    if (e.key === "Enter") confirmCurrentConstraint();
    if (e.key === "Escape") cancelCurrentConstraint();
  }, [mode, selectedCell]); // eslint-disable-line

  // ─── Confirm constraint ────────────────────────────────
  const confirmCurrentConstraint = useCallback(() => {
    if (mode === "killer") {
      const sum = parseInt(killerSumInput, 10);
      if (!sum || sum < 1 || sum > 45 || !state.selectedCells.length) {
        setStatusMsg("Enter a valid sum and select at least one cell.");
        return;
      }
      const cells = state.selectedCells.map(k => k.split(",").map(Number) as [number, number]);
      setState(prev => ({
        ...prev,
        constraints: {
          ...prev.constraints,
          killer: [...(prev.constraints.killer ?? []), { cells, sum }],
        },
        selectedCells: [],
      }));
      setKillerSumInput("");
      setStatusMsg(`Killer cage added (sum=${sum}, ${cells.length} cells).`);
    }

    if (mode === "thermo") {
      if (state.selectedCells.length < 2) {
        setStatusMsg("Select at least 2 cells for a thermometer.");
        return;
      }
      const cells = state.selectedCells.map(k => k.split(",").map(Number) as [number, number]);
      setState(prev => ({
        ...prev,
        constraints: {
          ...prev.constraints,
          thermo: [...(prev.constraints.thermo ?? []), { cells }],
        },
        selectedCells: [],
      }));
      setStatusMsg(`Thermometer added (${cells.length} cells).`);
    }

    if (mode === "arrow-path") {
      if (!state.arrowCircle || !state.selectedCells.length) {
        setStatusMsg("Set a circle cell and at least one arrow path cell.");
        return;
      }
      const path = state.selectedCells.map(k => k.split(",").map(Number) as [number, number]);
      setState(prev => ({
        ...prev,
        constraints: {
          ...prev.constraints,
          arrow: [...(prev.constraints.arrow ?? []),
            { circle: prev.arrowCircle!, arrow: path }],
        },
        selectedCells: [],
        arrowCircle: null,
      }));
      setMode("arrow-circle");
      setStatusMsg(`Arrow added. Click another circle cell to continue.`);
    }
  }, [mode, state.selectedCells, state.arrowCircle, killerSumInput]);

  const cancelCurrentConstraint = useCallback(() => {
    setState(prev => ({ ...prev, selectedCells: [], arrowCircle: null, kropkiFirst: null }));
    if (mode === "arrow-path") setMode("arrow-circle");
    setStatusMsg("Cancelled.");
  }, [mode]);

  // ─── Clear everything ──────────────────────────────────
  const handleClear = () => {
    setState(initialState);
    setMode("digit");
    setSelectedCell(null);
    setKillerSumInput("");
    setStatusMsg(null);
  };

  // ─── Export JSON ───────────────────────────────────────
  const handleExport = () => {
    const payload = { grid: state.grid, constraints: state.constraints };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "sudoku-puzzle.json";
    a.click();
  };

  // ─── Solve flow ────────────────────────────────────────
  const handleSolve = () => {
    const payload = { grid: state.grid, constraints: state.constraints };
    sessionStorage.setItem("creatorPuzzle", JSON.stringify(payload));
    router.push("/");
  };

  // Build sets for grid props
  const selectedSet = new Set(state.selectedCells);
  if (selectedCell) selectedSet.add(`${selectedCell[0]},${selectedCell[1]}`);
  if (state.arrowCircle) selectedSet.add(`${state.arrowCircle[0]},${state.arrowCircle[1]}`);
  if (state.kropkiFirst) selectedSet.add(`${state.kropkiFirst[0]},${state.kropkiFirst[1]}`);

  return (
    <div
      style={{ maxWidth: 1280, margin: "0 auto", padding: "20px 24px", outline: "none" }}
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      {/* Title */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: "1.25rem", fontWeight: 700, letterSpacing: "-0.02em", margin: "0 0 2px" }}>
          Puzzle Creator
        </h1>
        <p style={{ fontSize: "0.875rem", color: "var(--text-muted)", margin: 0 }}>
          Build a custom Sudoku variant and send it to the solver.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "220px 1fr 260px", gap: 20, alignItems: "start" }}>

        {/* ── LEFT: Variant toggles + mode buttons ───── */}
        <aside style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Variants */}
          <div style={{ border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
            <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--border)", background: "var(--bg-subtle)" }}>
              <p style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-subtle)", margin: 0 }}>
                Variants
              </p>
            </div>
            <div style={{ padding: "8px 0" }}>
              {(["classic", "killer", "thermo", "arrow", "kropki", "evenOdd"] as ConstraintKind[]).map(v => (
                <VariantRow
                  key={v}
                  label={v === "evenOdd" ? "Even / Odd" : v.charAt(0).toUpperCase() + v.slice(1)}
                  active={activeVariants.has(v)}
                  locked={v === "classic"}
                  onToggle={() => toggleVariant(v)}
                />
              ))}
            </div>
          </div>

          {/* Mode buttons */}
          <div style={{ border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
            <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--border)", background: "var(--bg-subtle)" }}>
              <p style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-subtle)", margin: 0 }}>
                Edit Mode
              </p>
            </div>
            <div style={{ padding: "8px 0", display: "flex", flexDirection: "column", gap: 2 }}>
              <ModeBtn id="digit" current={mode} onClick={() => setMode("digit")} label="Enter Digits" />
              {activeVariants.has("evenOdd") && <ModeBtn id="evenOdd" current={mode} onClick={() => setMode("evenOdd")} label="Even / Odd" />}
              {activeVariants.has("killer") && <ModeBtn id="killer" current={mode} onClick={() => setMode("killer")} label="Draw Cages" />}
              {activeVariants.has("thermo") && <ModeBtn id="thermo" current={mode} onClick={() => setMode("thermo")} label="Draw Thermo" />}
              {activeVariants.has("arrow") && <ModeBtn id="arrow-circle" current={mode} onClick={() => setMode("arrow-circle")} label="Arrow" />}
              {activeVariants.has("kropki") && <ModeBtn id="kropki" current={mode} onClick={() => setMode("kropki")} label="Kropki Dots" />}
            </div>
          </div>

          {/* Killer sum input */}
          {mode === "killer" && (
            <div style={{ border: "1px solid var(--border)", borderRadius: 8, padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
              <label style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--text)" }}>
                Cage Sum
              </label>
              <input
                type="number"
                min={1} max={45}
                value={killerSumInput}
                onChange={e => setKillerSumInput(e.target.value)}
                placeholder="e.g. 15"
                style={{
                  padding: "6px 10px",
                  border: "1px solid var(--border)",
                  borderRadius: 6,
                  fontSize: "0.875rem",
                  width: "100%",
                  outline: "none",
                  fontFamily: "inherit",
                }}
              />
              <button
                className="btn btn-primary"
                style={{ width: "100%", justifyContent: "center", fontSize: "0.8125rem" }}
                onClick={confirmCurrentConstraint}
                disabled={!killerSumInput || !state.selectedCells.length}
              >
                Confirm Cage ({state.selectedCells.length} cells)
              </button>
            </div>
          )}

          {/* Thermo / Arrow confirm */}
          {(mode === "thermo" || mode === "arrow-path") && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <button className="btn btn-primary" style={{ width: "100%", justifyContent: "center", fontSize: "0.8125rem" }} onClick={confirmCurrentConstraint}>
                Confirm ({state.selectedCells.length} cells)
              </button>
              <button className="btn btn-outline" style={{ width: "100%", justifyContent: "center", fontSize: "0.8125rem" }} onClick={cancelCurrentConstraint}>
                Cancel
              </button>
            </div>
          )}

          {/* Action buttons */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <button className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }} onClick={handleSolve}>
              ▶ Solve Puzzle
            </button>
            <button className="btn btn-outline" style={{ width: "100%", justifyContent: "center" }} onClick={handleExport}>
              ↓ Export JSON
            </button>
            <button className="btn btn-ghost" style={{ width: "100%", justifyContent: "center", fontSize: "0.8125rem" }} onClick={handleClear}>
              Clear all
            </button>
          </div>
        </aside>

        {/* ── CENTER: Grid ────────────────────────────── */}
        <section style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          {/* Hint bar */}
          <div style={{
            width: "100%", maxWidth: 468,
            padding: "8px 14px",
            border: "1px solid var(--border)",
            borderRadius: 6,
            background: "var(--bg-subtle)",
            fontSize: "0.8125rem",
            color: "var(--text-muted)",
          }}>
            <strong style={{ color: "var(--text)" }}>{MODE_INFO[mode]?.label}:</strong>{" "}
            {MODE_INFO[mode]?.hint}
          </div>

          {/* Status message */}
          {statusMsg && (
            <div style={{
              width: "100%", maxWidth: 468,
              padding: "6px 14px",
              border: "1px solid var(--border)",
              borderRadius: 6,
              fontSize: "0.8125rem",
              color: "var(--text)",
              background: "var(--bg-muted)",
            }}>
              {statusMsg}
            </div>
          )}

          <div onClick={() => { /* make outer div focusable seems tricky, handled by tabIndex on parent */ }}>
            <SudokuGrid
              grid={state.grid}
              constraints={state.constraints}
              selectedCells={selectedSet}
              onCellClick={handleCellClick}
            />
          </div>

          <p style={{ fontSize: "0.75rem", color: "var(--text-subtle)", textAlign: "center" }}>
            Press <kbd style={{ padding: "1px 5px", border: "1px solid var(--border)", borderRadius: 3, fontSize: "0.75rem" }}>1–9</kbd> to enter digits ·{" "}
            <kbd style={{ padding: "1px 5px", border: "1px solid var(--border)", borderRadius: 3, fontSize: "0.75rem" }}>Enter</kbd> to confirm constraint ·{" "}
            <kbd style={{ padding: "1px 5px", border: "1px solid var(--border)", borderRadius: 3, fontSize: "0.75rem" }}>Esc</kbd> to cancel
          </p>
        </section>

        {/* ── RIGHT: Constraint summary ──────────────── */}
        <aside>
          <ConstraintSummary
            constraints={state.constraints}
            onRemoveKiller={idx =>
              setState(prev => ({
                ...prev,
                constraints: {
                  ...prev.constraints,
                  killer: prev.constraints.killer?.filter((_, i) => i !== idx),
                },
              }))
            }
            onRemoveThermo={idx =>
              setState(prev => ({
                ...prev,
                constraints: {
                  ...prev.constraints,
                  thermo: prev.constraints.thermo?.filter((_, i) => i !== idx),
                },
              }))
            }
            onRemoveArrow={idx =>
              setState(prev => ({
                ...prev,
                constraints: {
                  ...prev.constraints,
                  arrow: prev.constraints.arrow?.filter((_, i) => i !== idx),
                },
              }))
            }
            onRemoveKropki={idx =>
              setState(prev => ({
                ...prev,
                constraints: {
                  ...prev.constraints,
                  kropki: prev.constraints.kropki?.filter((_, i) => i !== idx),
                },
              }))
            }
            onRemoveEvenOdd={idx =>
              setState(prev => ({
                ...prev,
                constraints: {
                  ...prev.constraints,
                  evenOdd: prev.constraints.evenOdd?.filter((_, i) => i !== idx),
                },
              }))
            }
          />
        </aside>
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────

function VariantRow({ label, active, locked, onToggle }: { label: string; active: boolean; locked?: boolean; onToggle: () => void }) {
  return (
    <div
      style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "7px 14px",
        opacity: locked ? 0.5 : 1,
      }}
    >
      <span style={{ fontSize: "0.875rem", color: "var(--text)" }}>{label}</span>
      <label className="toggle" style={{ cursor: locked ? "not-allowed" : "pointer" }}>
        <input type="checkbox" checked={active} onChange={onToggle} disabled={locked} />
        <span className="toggle-slider" />
      </label>
    </div>
  );
}

function ModeBtn({ id, current, onClick, label }: { id: EditMode; current: EditMode; onClick: () => void; label: string }) {
  const active = current === id || (id === "arrow-circle" && current === "arrow-path");
  return (
    <button
      onClick={onClick}
      style={{
        display: "block", width: "100%", textAlign: "left",
        padding: "7px 14px",
        fontSize: "0.875rem",
        color: active ? "var(--text)" : "var(--text-muted)",
        background: active ? "var(--bg-muted)" : "transparent",
        fontWeight: active ? 600 : 400,
        border: "none", cursor: "pointer",
        transition: "all 0.15s",
      }}
    >
      {label}
    </button>
  );
}

function ConstraintSummary({
  constraints,
  onRemoveKiller,
  onRemoveThermo,
  onRemoveArrow,
  onRemoveKropki,
  onRemoveEvenOdd,
}: {
  constraints: ConstraintSet;
  onRemoveKiller: (i: number) => void;
  onRemoveThermo: (i: number) => void;
  onRemoveArrow:  (i: number) => void;
  onRemoveKropki: (i: number) => void;
  onRemoveEvenOdd:(i: number) => void;
}) {
  const items: { key: string; label: string; items: { desc: string; remove: () => void }[] }[] = [
    {
      key: "killer",
      label: "Killer Cages",
      items: (constraints.killer ?? []).map((c, i) => ({
        desc: `Sum=${c.sum}, ${c.cells.length} cells`,
        remove: () => onRemoveKiller(i),
      })),
    },
    {
      key: "thermo",
      label: "Thermometers",
      items: (constraints.thermo ?? []).map((t, i) => ({
        desc: `${t.cells.length} cells`,
        remove: () => onRemoveThermo(i),
      })),
    },
    {
      key: "arrow",
      label: "Arrows",
      items: (constraints.arrow ?? []).map((a, i) => ({
        desc: `(${a.circle[0]+1},${a.circle[1]+1}) → ${a.arrow.length} cells`,
        remove: () => onRemoveArrow(i),
      })),
    },
    {
      key: "kropki",
      label: "Kropki Dots",
      items: (constraints.kropki ?? []).map((k, i) => ({
        desc: `${k.type} (${k.cells[0][0]+1},${k.cells[0][1]+1})–(${k.cells[1][0]+1},${k.cells[1][1]+1})`,
        remove: () => onRemoveKropki(i),
      })),
    },
    {
      key: "evenOdd",
      label: "Even / Odd",
      items: (constraints.evenOdd ?? []).map((e, i) => ({
        desc: `${e.parity} at (${e.cell[0]+1},${e.cell[1]+1})`,
        remove: () => onRemoveEvenOdd(i),
      })),
    },
  ].filter(g => g.items.length > 0);

  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden", position: "sticky", top: 72 }}>
      <div style={{ padding: "10px 14px", borderBottom: items.length ? "1px solid var(--border)" : undefined, background: "var(--bg-subtle)" }}>
        <p style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-subtle)", margin: 0 }}>
          Constraints
        </p>
      </div>
      {items.length === 0 ? (
        <div style={{ padding: "20px 14px", color: "var(--text-subtle)", fontSize: "0.8125rem", textAlign: "center" }}>
          No constraints yet.
        </div>
      ) : (
        <div style={{ maxHeight: "calc(100vh - 200px)", overflow: "auto" }}>
          {items.map(group => (
            <div key={group.key} style={{ borderBottom: "1px solid var(--border)" }}>
              <p style={{ padding: "8px 14px 4px", fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", margin: 0 }}>
                {group.label}
              </p>
              {group.items.map((item, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "5px 14px",
                    gap: 8,
                  }}
                >
                  <span style={{ fontSize: "0.8125rem", color: "var(--text)" }}>{item.desc}</span>
                  <button
                    onClick={item.remove}
                    style={{
                      fontSize: "0.75rem", color: "var(--text-subtle)",
                      background: "none", border: "none", cursor: "pointer",
                      padding: "1px 4px", borderRadius: 3,
                      flexShrink: 0,
                    }}
                    title="Remove"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
