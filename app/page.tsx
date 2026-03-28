"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { clsx } from "clsx";
import SudokuGrid from "@/components/SudokuGrid";
import StepViewer from "@/components/StepViewer";
import PuzzleSelector from "@/components/PuzzleSelector";
import { SolveStep, Grid, ConstraintSet, SolveResponse } from "@/lib/solver/types";
import { PUZZLES, PuzzlePreset } from "@/lib/puzzles";
import {
  BrainCircuit,
  Loader2,
  CheckCircle2,
  XCircle,
  Timer,
  Sparkles,
  Info,
  BookOpen,
  ChevronDown,
} from "lucide-react";

export default function Home() {
  const [activePuzzle, setActivePuzzle] = useState<PuzzlePreset>(PUZZLES[0]);
  const [grid, setGrid] = useState<Grid>(PUZZLES[0].request.grid);
  const [constraints, setConstraints] = useState<ConstraintSet>(PUZZLES[0].request.constraints);
  const [solution, setSolution] = useState<Grid | null>(null);
  const [steps, setSteps] = useState<SolveStep[]>([]);
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1000);
  const [solving, setSolving] = useState(false);
  const [solveResult, setSolveResult] = useState<{
    unique: boolean;
    timeMs: number;
    error?: string;
  } | null>(null);
  const [sidebarTab, setSidebarTab] = useState<"puzzles" | "steps">("puzzles");

  const playIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Puzzle selection ────────────────────────────────────────
  const handleSelectPuzzle = useCallback((puzzle: PuzzlePreset) => {
    setActivePuzzle(puzzle);
    setGrid(puzzle.request.grid);
    setConstraints(puzzle.request.constraints);
    setSolution(null);
    setSteps([]);
    setCurrentStepIdx(0);
    setIsPlaying(false);
    setSolveResult(null);
  }, []);

  // ── Solve ───────────────────────────────────────────────────
  const handleSolve = useCallback(async () => {
    setSolving(true);
    setSolution(null);
    setSteps([]);
    setCurrentStepIdx(0);
    setIsPlaying(false);
    setSolveResult(null);

    try {
      const res = await fetch("/api/solve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grid, constraints }),
      });
      const data: SolveResponse = await res.json();

      setSolution(data.solution);
      setSteps(data.steps ?? []);
      setSolveResult({
        unique: data.unique,
        timeMs: data.solveTimeMs,
        error: data.error,
      });

      if ((data.steps ?? []).length > 0) {
        setCurrentStepIdx(0);
        setSidebarTab("steps");
      }
    } catch (e) {
      setSolveResult({
        unique: false,
        timeMs: 0,
        error: "Network error — could not reach solver",
      });
    } finally {
      setSolving(false);
    }
  }, [grid, constraints]);

  // ── Playback ─────────────────────────────────────────────────
  const stopPlayback = useCallback(() => {
    if (playIntervalRef.current) {
      clearInterval(playIntervalRef.current);
      playIntervalRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  const startPlayback = useCallback(() => {
    if (steps.length === 0) return;
    setIsPlaying(true);
    playIntervalRef.current = setInterval(() => {
      setCurrentStepIdx((prev) => {
        if (prev >= steps.length - 1) {
          stopPlayback();
          return prev;
        }
        return prev + 1;
      });
    }, speed);
  }, [steps.length, speed, stopPlayback]);

  useEffect(() => {
    return () => { if (playIntervalRef.current) clearInterval(playIntervalRef.current); };
  }, []);

  // Restart playback when speed changes
  useEffect(() => {
    if (isPlaying) {
      stopPlayback();
      startPlayback();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speed]);

  const handlePlay = useCallback(() => { startPlayback(); }, [startPlayback]);
  const handlePause = useCallback(() => { stopPlayback(); }, [stopPlayback]);
  const handleNext = useCallback(() => {
    setCurrentStepIdx((p) => Math.min(p + 1, steps.length - 1));
  }, [steps.length]);
  const handlePrev = useCallback(() => {
    setCurrentStepIdx((p) => Math.max(p - 1, 0));
  }, []);
  const handleJump = useCallback((idx: number) => {
    stopPlayback();
    setCurrentStepIdx(idx);
  }, [stopPlayback]);

  const currentStep = steps[currentStepIdx] ?? null;

  // ── Constraint legend ────────────────────────────────────────
  const activeConstraints = Object.keys(constraints).filter(
    (k) => (constraints as Record<string, unknown>)[k] != null
  );

  return (
    <div className="min-h-screen bg-[#0b0d14] text-white font-sans overflow-x-hidden">
      {/* ── Animated background ── */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div
          className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, #6366f1 0%, transparent 70%)", filter: "blur(60px)" }}
        />
        <div
          className="absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full opacity-15"
          style={{ background: "radial-gradient(circle, #a855f7 0%, transparent 70%)", filter: "blur(60px)" }}
        />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full opacity-5"
          style={{ background: "radial-gradient(circle, #22d3ee 0%, transparent 70%)", filter: "blur(80px)" }}
        />
      </div>

      {/* ── Header ── */}
      <header className="relative z-10 border-b border-slate-800/60 bg-slate-900/30 backdrop-blur-xl">
        <div className="max-w-[1400px] mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #6366f1, #a855f7)" }}
            >
              <BrainCircuit size={20} />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                Variant Sudoku Solver
              </h1>
              <p className="text-[11px] text-slate-500">
                SMT-powered · Z3 · CSP Visualization
              </p>
            </div>
          </div>

          {/* Status badges */}
          <div className="flex items-center gap-3">
            {solveResult && (
              <>
                <div
                  className={clsx(
                    "flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium",
                    solveResult.error
                      ? "bg-red-500/15 text-red-400"
                      : "bg-emerald-500/15 text-emerald-400"
                  )}
                >
                  {solveResult.error ? (
                    <XCircle size={12} />
                  ) : (
                    <CheckCircle2 size={12} />
                  )}
                  {solveResult.error ? "No Solution" : "Solved"}
                </div>
                {!solveResult.error && (
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-indigo-500/15 text-indigo-400">
                    <Sparkles size={12} />
                    {solveResult.unique ? "Unique" : "Multiple Solutions"}
                  </div>
                )}
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-slate-700/60 text-slate-400">
                  <Timer size={12} />
                  {(solveResult.timeMs / 1000).toFixed(2)}s
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── Main layout ── */}
      <main className="relative z-10 max-w-[1400px] mx-auto px-4 md:px-6 py-6 grid grid-cols-1 lg:grid-cols-[260px_1fr_320px] gap-6">
        {/* ── LEFT: Puzzle Selector + Constraints ── */}
        <aside className="space-y-4">
          {/* Tabs */}
          <div className="flex gap-1 p-1 bg-slate-800/50 rounded-xl border border-slate-700/40">
            {(["puzzles", "steps"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setSidebarTab(tab)}
                className={clsx(
                  "flex-1 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all",
                  sidebarTab === tab
                    ? "bg-indigo-600 text-white shadow"
                    : "text-slate-400 hover:text-slate-200"
                )}
              >
                {tab === "puzzles" ? (
                  <span className="flex items-center justify-center gap-1">
                    <BookOpen size={12} /> Puzzles
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-1">
                    <BrainCircuit size={12} /> Steps{steps.length > 0 && ` (${steps.length})`}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="bg-slate-900/50 border border-slate-700/40 rounded-2xl p-4 overflow-y-auto max-h-[600px]">
            {sidebarTab === "puzzles" ? (
              <PuzzleSelector
                activeId={activePuzzle.id}
                onSelect={handleSelectPuzzle}
              />
            ) : (
              <StepViewer
                steps={steps}
                currentStepIdx={currentStepIdx}
                isPlaying={isPlaying}
                speed={speed}
                onPlay={handlePlay}
                onPause={handlePause}
                onNext={handleNext}
                onPrev={handlePrev}
                onJump={handleJump}
                onSpeedChange={setSpeed}
              />
            )}
          </div>
        </aside>

        {/* ── CENTER: Grid ── */}
        <section className="flex flex-col items-center gap-4">
          {/* Puzzle info */}
          <div className="w-full flex flex-col md:flex-row md:items-center justify-between gap-3 px-1">
            <div>
              <h2 className="text-xl font-black tracking-tight text-white">
                {activePuzzle.name}
              </h2>
              <p className="text-sm text-slate-400">{activePuzzle.description}</p>
            </div>

            <button
              onClick={handleSolve}
              disabled={solving}
              className={clsx(
                "flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all",
                "shadow-lg hover:scale-[1.03] active:scale-[0.97]",
                solving ? "opacity-60 cursor-not-allowed" : "hover:shadow-indigo-500/30"
              )}
              style={{
                background: solving
                  ? "#374151"
                  : "linear-gradient(135deg, #6366f1, #a855f7)",
              }}
            >
              {solving ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Solving via Z3…
                </>
              ) : (
                <>
                  <BrainCircuit size={16} />
                  Solve with Z3
                </>
              )}
            </button>
          </div>

          {/* Active constraints */}
          {activeConstraints.length > 0 && (
            <div className="flex flex-wrap gap-2 w-full px-1">
              {activeConstraints.map((c) => (
                <ConstraintBadge key={c} constraint={c} />
              ))}
            </div>
          )}

          {/* Step equation banner */}
          {currentStep && steps.length > 0 && (
            <div
              className="w-full rounded-xl border px-4 py-2 flex items-center gap-3"
              style={{
                borderColor: `${currentStep.highlight.color}40`,
                background: `${currentStep.highlight.color}10`,
              }}
            >
              <Info size={14} style={{ color: currentStep.highlight.color, flexShrink: 0 }} />
              <code className="text-sm font-mono text-amber-200 flex-1 truncate">
                {currentStep.equation}
              </code>
              <span className="text-xs text-slate-500 flex-shrink-0">
                Step {currentStepIdx + 1}/{steps.length}
              </span>
            </div>
          )}

          {/* Grid */}
          <div className="relative">
            <SudokuGrid
              grid={grid}
              solution={solution}
              currentStep={currentStep}
              constraints={constraints}
            />

            {/* Overlay pulse on solving */}
            {solving && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-900/60 rounded-xl backdrop-blur-sm z-50">
                <div className="flex flex-col items-center gap-3">
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center animate-pulse"
                    style={{ background: "linear-gradient(135deg, #6366f1, #a855f7)" }}
                  >
                    <BrainCircuit size={28} />
                  </div>
                  <p className="text-sm font-semibold text-slate-300">Solving via Z3 SMT…</p>
                </div>
              </div>
            )}
          </div>

          {/* Error message */}
          {solveResult?.error && (
            <div className="w-full bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 flex items-center gap-2">
              <XCircle size={16} className="text-red-400 flex-shrink-0" />
              <p className="text-sm text-red-300">{solveResult.error}</p>
            </div>
          )}
        </section>

        {/* ── RIGHT: Step detail (desktop) ── */}
        <aside className="hidden lg:block">
          <div className="bg-slate-900/50 border border-slate-700/40 rounded-2xl p-4 sticky top-6">
            <div className="flex items-center gap-2 mb-4">
              <BrainCircuit size={16} className="text-indigo-400" />
              <h3 className="font-bold text-sm text-slate-200">
                Solving Visualization
              </h3>
            </div>
            <StepViewer
              steps={steps}
              currentStepIdx={currentStepIdx}
              isPlaying={isPlaying}
              speed={speed}
              onPlay={handlePlay}
              onPause={handlePause}
              onNext={handleNext}
              onPrev={handlePrev}
              onJump={handleJump}
              onSpeedChange={setSpeed}
            />
          </div>
        </aside>
      </main>

      {/* ── Footer ── */}
      <footer className="relative z-10 border-t border-slate-800/40 mt-8 py-4 text-center text-xs text-slate-600">
        Variant Sudoku Solver · Z3 SMT Engine · CSP = (Variables, Domains, Constraints)
      </footer>
    </div>
  );
}

function ConstraintBadge({ constraint }: { constraint: string }) {
  const COLORS: Record<string, string> = {
    classic: "#6366f1",
    killer: "#f59e0b",
    thermo: "#ef4444",
    arrow: "#22d3ee",
    kropki: "#a855f7",
    evenOdd: "#10b981",
    diagonal: "#f97316",
  };
  const color = COLORS[constraint] ?? "#64748b";
  return (
    <span
      className="px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize"
      style={{ color, background: `${color}20`, border: `1px solid ${color}40` }}
    >
      {constraint}
    </span>
  );
}
