"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import SudokuGrid from "@/components/SudokuGrid";
import StepViewer from "@/components/StepViewer";
import PuzzleSelector from "@/components/PuzzleSelector";
import { SolveStep, Grid, ConstraintSet, SolveResponse } from "@/lib/solver/types";
import { PUZZLES, PuzzlePreset } from "@/lib/puzzles";

// ── Responsive layout hook ─────────────────────────────
function useLayout() {
  const [w, setW] = useState(1280);
  useEffect(() => {
    const update = () => setW(window.innerWidth);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const isMobile  = w < 640;
  const isTablet  = w >= 640 && w < 900;
  const isDesktop = w >= 900;

  // Dynamic cell size based on available space
  const cellSize = isMobile
    ? Math.max(34, Math.floor((w - 28) / 9))   // fills screen width
    : isTablet ? 44 : 52;

  return { w, isMobile, isTablet, isDesktop, cellSize };
}

export default function SolverPage() {
  const [activePuzzle, setActivePuzzle] = useState<PuzzlePreset>(PUZZLES[0]);
  const [grid, setGrid]               = useState<Grid>(PUZZLES[0].request.grid);
  const [constraints, setConstraints] = useState<ConstraintSet>(PUZZLES[0].request.constraints);
  const [solution, setSolution]       = useState<Grid | null>(null);
  const [steps, setSteps]             = useState<SolveStep[]>([]);
  const [stepIdx, setStepIdx]         = useState(0);
  const [isPlaying, setIsPlaying]     = useState(false);
  const [speed, setSpeed]             = useState(1000);
  const [solving, setSolving]         = useState(false);
  const [result, setResult]           = useState<{ unique: boolean; ms: number; error?: string } | null>(null);
  const [showStepsPanel, setShowStepsPanel] = useState(false); // mobile toggle
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { isMobile, isTablet, isDesktop, cellSize } = useLayout();

  // ── Puzzle select ─────────────────────────────────────
  const selectPuzzle = useCallback((p: PuzzlePreset) => {
    setActivePuzzle(p);
    setGrid(p.request.grid);
    setConstraints(p.request.constraints);
    setSolution(null);
    setSteps([]);
    setStepIdx(0);
    setIsPlaying(false);
    setResult(null);
    setShowStepsPanel(false);
  }, []);

  // ── Solve ─────────────────────────────────────────────
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
      setStepIdx(0);
      if ((data.steps ?? []).length > 0) setShowStepsPanel(true);
    } catch {
      setResult({ unique: false, ms: 0, error: "Network error" });
    } finally {
      setSolving(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grid, constraints]);

  // ── Playback ──────────────────────────────────────────
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (isPlaying) { stopPlayback(); startPlayback(); } }, [speed]);

  const currentStep = steps[stepIdx] ?? null;

  // Creator flow
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

  // ── Step controls shared props ─────────────────────────
  const stepViewerProps = {
    steps, currentStepIdx: stepIdx, isPlaying, speed,
    onPlay: startPlayback, onPause: stopPlayback,
    onNext: () => setStepIdx(p => Math.min(p + 1, steps.length - 1)),
    onPrev: () => setStepIdx(p => Math.max(p - 1, 0)),
    onJump: (i: number) => { stopPlayback(); setStepIdx(i); },
    onSpeedChange: setSpeed,
  };

  // ── Result/status badges ───────────────────────────────
  const StatusBadges = (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
      {result && !result.error && (
        <>
          <span className="tag" style={{ fontWeight: 600 }}>
            {result.unique ? "Unique" : "Multiple solutions"}
          </span>
          <span className="tag">{(result.ms / 1000).toFixed(2)}s</span>
        </>
      )}
      {result?.error && (
        <span className="tag" style={{ color: "#dc2626", borderColor: "#fca5a5", background: "#fef2f2" }}>
          {result.error}
        </span>
      )}
    </div>
  );

  // ── Active constraint tags ─────────────────────────────
  const ConstraintTags = Object.keys(constraints).filter(k => (constraints as Record<string, unknown>)[k]).length > 0 && (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 5, justifyContent: "center" }}>
      {Object.keys(constraints).map(k => (
        <span key={k} className="tag" style={{ color: `var(--c-${k.toLowerCase().replace("/", "")})`, textTransform: "capitalize" }}>
          {k}
        </span>
      ))}
    </div>
  );

  // ── Equation banner ────────────────────────────────────
  const EquationBanner = currentStep && steps.length > 0 && (
    <div style={{
      width: "100%", maxWidth: cellSize * 9 + 4,
      padding: "6px 12px",
      border: "1px solid var(--border)", borderRadius: 6,
      background: "var(--bg-subtle)",
      display: "flex", alignItems: "baseline", gap: 8,
    }}>
      <span style={{ fontSize: "0.58rem", fontWeight: 700, color: "var(--text-subtle)", flexShrink: 0, textTransform: "uppercase", letterSpacing: "0.06em" }}>Eq.</span>
      <code style={{ fontSize: "0.75rem", color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
        {currentStep.equation}
      </code>
    </div>
  );

  // ── Grid section ───────────────────────────────────────
  const GridSection = (
    <section style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
      {ConstraintTags}
      {EquationBanner}
      <div style={{ position: "relative" }}>
        <SudokuGrid grid={grid} solution={solution} currentStep={currentStep} constraints={constraints} cellSize={cellSize} />
        {solving && (
          <div style={{ position: "absolute", inset: 0, background: "rgba(255,255,255,0.85)", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 2, zIndex: 50 }}>
            <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
              <div className="spinner" style={{ width: 22, height: 22, border: "2.5px solid var(--border)", borderTopColor: "var(--text)", borderRadius: "50%" }} />
              <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 500 }}>Solving…</span>
            </div>
          </div>
        )}
      </div>
    </section>
  );

  // ── Mobile steps toggle button ─────────────────────────
  const MobileStepsToggle = isMobile && steps.length > 0 && (
    <button
      onClick={() => setShowStepsPanel(v => !v)}
      className="btn btn-outline"
      style={{ width: "100%", justifyContent: "center", fontSize: "0.8rem" }}
    >
      {showStepsPanel ? "Hide Steps" : `Show Steps (${steps.length})`}
    </button>
  );

  // ── RENDER DESKTOP ─────────────────────────────────────
  return (
    <>
      {/* Sticky header */}
      <header style={{
        position: "sticky", top: 0, zIndex: 100,
        background: "rgba(255,255,255,0.92)", backdropFilter: "blur(10px)",
        borderBottom: "1px solid var(--border)",
      }}>
        <div style={{
          maxWidth: 1400, margin: "0 auto", padding: "0 var(--page-pad)",
          height: isMobile ? 52 : 58,
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
        }}>
          <div>
            <h1 style={{ fontSize: isMobile ? "0.95rem" : "1.1rem", fontWeight: 700, letterSpacing: "-0.02em", margin: 0, lineHeight: 1 }}>
              {activePuzzle.name}
            </h1>
            {!isMobile && (
              <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", margin: "2px 0 0" }}>
                {activePuzzle.description}
              </p>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            {!isMobile && StatusBadges}
            <button
              className="btn btn-primary"
              onClick={handleSolve}
              disabled={solving}
              style={{ padding: isMobile ? "7px 14px" : "8px 18px", fontSize: isMobile ? "0.8rem" : "0.875rem" }}
            >
              {solving
                ? <><span className="spinner" style={{ display: "inline-block", width: 13, height: 13, border: "2px solid #fff", borderTopColor: "transparent", borderRadius: "50%" }} /> Solving</>
                : "Solve ▸"}
            </button>
          </div>
        </div>
        {isMobile && result && (
          <div style={{ padding: "4px var(--page-pad) 6px", borderTop: "1px solid var(--border)" }}>
            {StatusBadges}
          </div>
        )}
      </header>

      {/* Page body */}
      <main className="page-root">
        {isDesktop ? (
          /* ── DESKTOP (3 columns) ─────────────────── */
          <div className="layout-grid" style={{ gridTemplateAreas: '"sidebar center steps"', gridTemplateColumns: "var(--sidebar-w) 1fr var(--steps-w)" }}>
            <aside className="layout-sidebar">
              <p style={{ fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-subtle)", marginBottom: 8 }}>Puzzles</p>
              <div style={{ maxHeight: "calc(100dvh - 140px)", overflowY: "auto" }}>
                <PuzzleSelector activeId={activePuzzle.id} onSelect={selectPuzzle} />
              </div>
            </aside>

            <section className="layout-center">{GridSection}</section>

            <aside className="layout-steps" style={{ position: "sticky", top: 70 }}>
              <div className="steps-panel panel" style={{ maxHeight: "calc(100dvh - 90px)", overflow: "auto" }}>
                <p style={{ fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-subtle)", marginBottom: 10 }}>
                  Reasoning {steps.length > 0 && `· ${steps.length} steps`}
                </p>
                <StepViewer {...stepViewerProps} />
              </div>
            </aside>
          </div>

        ) : isTablet ? (
          /* ── TABLET (puzzle strip on top, grid + steps below) ── */
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--panel-gap)" }}>
            <div>
              <p style={{ fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-subtle)", marginBottom: 6 }}>Puzzles</p>
              <div className="puzzle-list-wrap">
                <PuzzleSelector activeId={activePuzzle.id} onSelect={selectPuzzle} />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: `1fr var(--steps-w)`, gap: "var(--panel-gap)", alignItems: "start" }}>
              {GridSection}
              <div className="steps-panel panel" style={{ maxHeight: "calc(100dvh - 160px)", overflow: "auto" }}>
                <p style={{ fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-subtle)", marginBottom: 10 }}>
                  Reasoning {steps.length > 0 && `· ${steps.length}`}
                </p>
                <StepViewer {...stepViewerProps} />
              </div>
            </div>
          </div>

        ) : (
          /* ── MOBILE (stacked) ────────────────────── */
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--panel-gap)" }}>
            <div>
              <p style={{ fontSize: "0.62rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-subtle)", marginBottom: 6 }}>Puzzles</p>
              <div className="puzzle-list-wrap" style={{ display: "flex", flexDirection: "row", overflowX: "auto", gap: 6 }}>
                <PuzzleSelector activeId={activePuzzle.id} onSelect={selectPuzzle} />
              </div>
            </div>

            {GridSection}
            {MobileStepsToggle}

            {showStepsPanel && steps.length > 0 && (
              <div className="steps-panel panel" style={{ animation: "fadeUp 0.2s ease" }}>
                <p style={{ fontSize: "0.62rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-subtle)", marginBottom: 10 }}>
                  Reasoning · {steps.length} steps
                </p>
                <StepViewer {...stepViewerProps} />
              </div>
            )}
          </div>
        )}
      </main>
    </>
  );
}
