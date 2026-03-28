"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import SudokuGrid from "@/components/SudokuGrid";
import StepViewer from "@/components/StepViewer";
import PuzzleSelector from "@/components/PuzzleSelector";
import { SolveStep, Grid, ConstraintSet, SolveResponse } from "@/lib/solver/types";
import { PUZZLES, PuzzlePreset } from "@/lib/puzzles";

export default function SolverPage() {
  const [activePuzzle, setActivePuzzle] = useState<PuzzlePreset>(PUZZLES[0]);
  const [grid, setGrid]                 = useState<Grid>(PUZZLES[0].request.grid);
  const [constraints, setConstraints]   = useState<ConstraintSet>(PUZZLES[0].request.constraints);
  const [solution, setSolution]         = useState<Grid | null>(null);
  const [steps, setSteps]               = useState<SolveStep[]>([]);
  const [stepIdx, setStepIdx]           = useState(0);
  const [isPlaying, setIsPlaying]       = useState(false);
  const [speed, setSpeed]               = useState(1000);
  const [solving, setSolving]           = useState(false);
  const [result, setResult]             = useState<{ unique: boolean; ms: number; error?: string } | null>(null);
  const [activePanel, setActivePanel]   = useState<"puzzles" | "steps">("puzzles");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Puzzle select ───────────────────────────────────
  const selectPuzzle = useCallback((p: PuzzlePreset) => {
    setActivePuzzle(p);
    setGrid(p.request.grid);
    setConstraints(p.request.constraints);
    setSolution(null);
    setSteps([]);
    setStepIdx(0);
    setIsPlaying(false);
    setResult(null);
  }, []);

  // ── Solve ───────────────────────────────────────────
  const handleSolve = useCallback(async () => {
    setSolving(true);
    setSolution(null);
    setSteps([]);
    setStepIdx(0);
    setIsPlaying(false);
    setResult(null);
    stopPlayback();
    try {
      const res = await fetch("/api/solve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grid, constraints }),
      });
      const data: SolveResponse = await res.json();
      setSolution(data.solution);
      setSteps(data.steps ?? []);
      setResult({ unique: data.unique, ms: data.solveTimeMs, error: data.error });
      if ((data.steps ?? []).length > 0) {
        setStepIdx(0);
        setActivePanel("steps");
      }
    } catch {
      setResult({ unique: false, ms: 0, error: "Network error" });
    } finally {
      setSolving(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grid, constraints]);

  // ── Playback ────────────────────────────────────────
  const stopPlayback = useCallback(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    setIsPlaying(false);
  }, []);

  const startPlayback = useCallback(() => {
    if (!steps.length) return;
    setIsPlaying(true);
    intervalRef.current = setInterval(() => {
      setStepIdx(prev => {
        if (prev >= steps.length - 1) { stopPlayback(); return prev; }
        return prev + 1;
      });
    }, speed);
  }, [steps.length, speed, stopPlayback]);

  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);
  // Restart when speed changes while playing
  useEffect(() => { if (isPlaying) { stopPlayback(); startPlayback(); } }, [speed]); // eslint-disable-line

  const currentStep = steps[stepIdx] ?? null;

  // ── Import custom puzzle from sessionStorage (creator flow) ──
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("creatorPuzzle");
      if (raw) {
        const parsed = JSON.parse(raw);
        sessionStorage.removeItem("creatorPuzzle");
        setActivePuzzle({ id: "custom", name: "Custom Puzzle", description: "Created in Puzzle Creator", tags: ["custom"], request: parsed });
        setGrid(parsed.grid);
        setConstraints(parsed.constraints ?? {});
        setSolution(null);
        setSteps([]);
      }
    } catch { /* ignore */ }
  }, []);

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 20 }}>

      {/* ── Title row ─────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 700, letterSpacing: "-0.02em", margin: 0 }}>
            {activePuzzle.name}
          </h1>
          <p style={{ fontSize: "0.875rem", color: "var(--text-muted)", margin: "2px 0 0" }}>
            {activePuzzle.description}
          </p>
        </div>

        {/* Status badges + solve button */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {result && !result.error && (
            <>
              <span className="tag" style={{ color: "var(--text)", borderColor: "var(--border-strong)" }}>
                {result.unique ? "Unique solution" : "Multiple solutions"}
              </span>
              <span className="tag">
                {(result.ms / 1000).toFixed(2)}s
              </span>
            </>
          )}
          {result?.error && (
            <span className="tag" style={{ color: "#dc2626", borderColor: "#fca5a5" }}>
              {result.error}
            </span>
          )}

          <button
            className="btn btn-primary"
            onClick={handleSolve}
            disabled={solving}
          >
            {solving ? (
              <><span className="spinner" style={{ display: "inline-block", width: 14, height: 14, border: "2px solid #fff", borderTopColor: "transparent", borderRadius: "50%" }} />Solving…</>
            ) : "Solve with Z3"}
          </button>
        </div>
      </div>

      {/* ── Three-column layout ───────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "220px 1fr 300px", gap: 20, alignItems: "start" }}>

        {/* LEFT: puzzle list + steps tabs */}
        <aside>
          <div style={{ display: "flex", gap: 4, padding: 4, background: "var(--bg-muted)", borderRadius: 8, border: "1px solid var(--border)", marginBottom: 12 }}>
            {(["puzzles", "steps"] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActivePanel(tab)}
                style={{
                  flex: 1, padding: "5px 0", borderRadius: 5, fontSize: "0.8125rem", fontWeight: 600,
                  border: "none", cursor: "pointer", textTransform: "capitalize",
                  background: activePanel === tab ? "var(--bg)" : "transparent",
                  color: activePanel === tab ? "var(--text)" : "var(--text-muted)",
                  boxShadow: activePanel === tab ? "0 1px 3px rgba(0,0,0,0.07)" : "none",
                  transition: "all 0.15s",
                }}
              >
                {tab === "steps" && steps.length ? `Steps (${steps.length})` : tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
          <div style={{ maxHeight: "calc(100vh - 160px)", overflow: "auto" }}>
            {activePanel === "puzzles"
              ? <PuzzleSelector activeId={activePuzzle.id} onSelect={selectPuzzle} />
              : <StepViewer steps={steps} currentStepIdx={stepIdx} isPlaying={isPlaying} speed={speed}
                  onPlay={startPlayback} onPause={stopPlayback}
                  onNext={() => setStepIdx(p => Math.min(p + 1, steps.length - 1))}
                  onPrev={() => setStepIdx(p => Math.max(p - 1, 0))}
                  onJump={i => { stopPlayback(); setStepIdx(i); }}
                  onSpeedChange={setSpeed} />
            }
          </div>
        </aside>

        {/* CENTER: grid */}
        <section style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          {/* Active constraint tags */}
          {Object.keys(constraints).filter(k => (constraints as Record<string, unknown>)[k]).length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, width: "100%", justifyContent: "center" }}>
              {Object.keys(constraints).map(k => (
                <span key={k} className="tag" style={{
                  color: `var(--c-${k.toLowerCase().replace("/","")})`,
                  textTransform: "capitalize",
                }}>
                  {k}
                </span>
              ))}
            </div>
          )}

          {/* Step equation banner */}
          {currentStep && steps.length > 0 && (
            <div style={{
              width: "100%", maxWidth: 468,
              padding: "8px 14px",
              border: "1px solid var(--border)",
              borderRadius: 6,
              background: "var(--bg-subtle)",
              display: "flex",
              alignItems: "baseline",
              gap: 8,
            }}>
              <span style={{ fontSize: "0.6875rem", fontWeight: 700, color: "var(--text-subtle)", flexShrink: 0, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Eq.
              </span>
              <code style={{ fontSize: "0.8125rem", color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                {currentStep.equation}
              </code>
            </div>
          )}

          {/* Grid */}
          <div style={{ position: "relative" }}>
            <SudokuGrid
              grid={grid}
              solution={solution}
              currentStep={currentStep}
              constraints={constraints}
            />
            {/* Solving overlay */}
            {solving && (
              <div style={{
                position: "absolute", inset: 0,
                background: "rgba(255,255,255,0.8)",
                display: "flex", alignItems: "center", justifyContent: "center",
                borderRadius: 2,
                zIndex: 50,
              }}>
                <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                  <div className="spinner" style={{ width: 24, height: 24, border: "2px solid var(--border)", borderTopColor: "var(--text)", borderRadius: "50%" }} />
                  <span style={{ fontSize: "0.875rem", color: "var(--text-muted)" }}>Solving via Z3 SMT…</span>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* RIGHT: step viewer */}
        <aside style={{ position: "sticky", top: 72 }}>
          <div style={{ padding: 16, border: "1px solid var(--border)", borderRadius: 8, maxHeight: "calc(100vh - 100px)", overflow: "auto" }}>
            <p style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-subtle)", marginBottom: 12 }}>
              Visualization
            </p>
            <StepViewer
              steps={steps}
              currentStepIdx={stepIdx}
              isPlaying={isPlaying}
              speed={speed}
              onPlay={startPlayback}
              onPause={stopPlayback}
              onNext={() => setStepIdx(p => Math.min(p + 1, steps.length - 1))}
              onPrev={() => setStepIdx(p => Math.max(p - 1, 0))}
              onJump={i => { stopPlayback(); setStepIdx(i); }}
              onSpeedChange={setSpeed}
            />
          </div>
        </aside>
      </div>
    </div>
  );
}
