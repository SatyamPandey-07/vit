"use client";

import React, { useRef, useEffect } from "react";
import { clsx } from "clsx";
import { SolveStep, ConstraintKind } from "@/lib/solver/types";
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  ChevronRight,
  ChevronLeft,
  Zap,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

interface StepViewerProps {
  steps: SolveStep[];
  currentStepIdx: number;
  isPlaying: boolean;
  speed: number;
  onPlay: () => void;
  onPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  onJump: (idx: number) => void;
  onSpeedChange: (speed: number) => void;
}

const CONSTRAINT_META: Record<
  ConstraintKind,
  { label: string; color: string; bg: string }
> = {
  classic: { label: "Classic", color: "#6366f1", bg: "bg-indigo-500/15" },
  killer: { label: "Killer", color: "#f59e0b", bg: "bg-amber-500/15" },
  thermo: { label: "Thermo", color: "#ef4444", bg: "bg-red-500/15" },
  arrow: { label: "Arrow", color: "#22d3ee", bg: "bg-cyan-500/15" },
  kropki: { label: "Kropki", color: "#a855f7", bg: "bg-purple-500/15" },
  evenOdd: { label: "Even/Odd", color: "#10b981", bg: "bg-emerald-500/15" },
  diagonal: { label: "Diagonal", color: "#f97316", bg: "bg-orange-500/15" },
};

const STEP_TYPE_ICON: Record<string, React.ReactNode> = {
  constraint_applied: <Zap size={14} />,
  candidate_removed: <AlertCircle size={14} />,
  value_fixed: <CheckCircle2 size={14} />,
  solving_start: <ChevronRight size={14} />,
  solving_complete: <CheckCircle2 size={14} />,
};

const SPEED_OPTIONS = [
  { label: "0.5×", value: 2000 },
  { label: "1×", value: 1000 },
  { label: "2×", value: 500 },
  { label: "5×", value: 200 },
  { label: "10×", value: 100 },
];

export default function StepViewer({
  steps,
  currentStepIdx,
  isPlaying,
  speed,
  onPlay,
  onPause,
  onNext,
  onPrev,
  onJump,
  onSpeedChange,
}: StepViewerProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);

  const current = steps[currentStepIdx];

  // Auto-scroll step list
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [currentStepIdx]);

  if (steps.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-500 gap-3">
        <Zap size={32} className="opacity-40" />
        <p className="text-sm">No steps yet. Solve a puzzle to see visualization.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* ── Current step detail ── */}
      {current && (
        <div className="rounded-xl border border-slate-700/60 bg-slate-800/50 p-4 space-y-3">
          {/* Header */}
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={clsx(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold",
                CONSTRAINT_META[current.constraint].bg
              )}
              style={{ color: CONSTRAINT_META[current.constraint].color }}
            >
              {STEP_TYPE_ICON[current.type]}
              {CONSTRAINT_META[current.constraint].label}
            </span>
            <span className="text-xs text-slate-500 ml-auto">
              Step {currentStepIdx + 1} / {steps.length}
            </span>
          </div>

          {/* Equation */}
          <div className="rounded-lg bg-slate-900/80 border border-slate-700/40 px-3 py-2">
            <p className="text-xs text-slate-400 mb-1 font-medium uppercase tracking-wide">
              Equation
            </p>
            <code className="text-sm font-mono text-amber-300 break-all">
              {current.equation}
            </code>
          </div>

          {/* Reason */}
          <p className="text-xs text-slate-300 leading-relaxed">{current.reason}</p>

          {/* Before / After candidates */}
          {Object.keys(current.before).length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              <CandidateBox label="Before" data={current.before} color="#94a3b8" />
              <CandidateBox label="After" data={current.after} color="#6366f1" />
            </div>
          )}
        </div>
      )}

      {/* ── Playback controls ── */}
      <div className="flex flex-col gap-3">
        {/* Progress bar */}
        <div className="relative h-1.5 bg-slate-700/60 rounded-full overflow-hidden">
          <div
            className="absolute left-0 top-0 h-full rounded-full transition-all duration-300"
            style={{
              width: `${((currentStepIdx + 1) / steps.length) * 100}%`,
              background: "linear-gradient(90deg, #6366f1, #a855f7)",
            }}
          />
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-2 justify-center">
          <ControlBtn onClick={() => onJump(0)} title="First" disabled={currentStepIdx === 0}>
            <SkipBack size={16} />
          </ControlBtn>
          <ControlBtn onClick={onPrev} title="Previous" disabled={currentStepIdx === 0}>
            <ChevronLeft size={18} />
          </ControlBtn>

          <button
            onClick={isPlaying ? onPause : onPlay}
            className="flex items-center justify-center w-11 h-11 rounded-full text-white font-bold transition-all hover:scale-105 active:scale-95 shadow-lg"
            style={{
              background: isPlaying
                ? "linear-gradient(135deg, #f59e0b, #ef4444)"
                : "linear-gradient(135deg, #6366f1, #a855f7)",
              boxShadow: isPlaying ? "0 0 20px rgba(239,68,68,0.4)" : "0 0 20px rgba(99,102,241,0.4)",
            }}
          >
            {isPlaying ? <Pause size={18} /> : <Play size={18} />}
          </button>

          <ControlBtn
            onClick={onNext}
            title="Next"
            disabled={currentStepIdx === steps.length - 1}
          >
            <ChevronRight size={18} />
          </ControlBtn>
          <ControlBtn
            onClick={() => onJump(steps.length - 1)}
            title="Last"
            disabled={currentStepIdx === steps.length - 1}
          >
            <SkipForward size={16} />
          </ControlBtn>
        </div>

        {/* Speed selector */}
        <div className="flex items-center gap-1.5 justify-center">
          <span className="text-xs text-slate-500 mr-1">Speed:</span>
          {SPEED_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onSpeedChange(opt.value)}
              className={clsx(
                "px-2 py-0.5 rounded text-xs font-medium transition-all",
                speed === opt.value
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-700/50 text-slate-400 hover:bg-slate-700"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Step list ── */}
      <div
        ref={listRef}
        className="flex-1 overflow-y-auto space-y-1 pr-1 min-h-0 scrollbar-thin scrollbar-thumb-slate-700"
        style={{ maxHeight: "300px" }}
      >
        {steps.map((step, idx) => {
          const meta = CONSTRAINT_META[step.constraint];
          const isActive = idx === currentStepIdx;
          return (
            <button
              key={step.step_id}
              ref={isActive ? activeRef : undefined}
              onClick={() => onJump(idx)}
              className={clsx(
                "w-full text-left px-3 py-2 rounded-lg text-xs flex items-start gap-2 transition-all",
                isActive
                  ? "bg-slate-700/80 border border-indigo-500/50 text-white"
                  : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
              )}
            >
              <span
                className="mt-0.5 flex-shrink-0 w-1.5 h-1.5 rounded-full mt-1.5"
                style={{ background: meta.color }}
              />
              <span className="flex-1 line-clamp-1">
                <span className="font-semibold" style={{ color: meta.color }}>
                  [{meta.label}]
                </span>{" "}
                {step.equation}
              </span>
              {STEP_TYPE_ICON[step.type] && (
                <span className="flex-shrink-0 opacity-60" style={{ color: meta.color }}>
                  {STEP_TYPE_ICON[step.type]}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ControlBtn({
  onClick,
  disabled,
  title,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={clsx(
        "w-9 h-9 flex items-center justify-center rounded-lg transition-all",
        disabled
          ? "text-slate-600 cursor-not-allowed"
          : "text-slate-300 hover:bg-slate-700/60 hover:text-white active:scale-95"
      )}
    >
      {children}
    </button>
  );
}

function CandidateBox({
  label,
  data,
  color,
}: {
  label: string;
  data: Record<string, number[]>;
  color: string;
}) {
  return (
    <div className="rounded-lg bg-slate-900/60 border border-slate-700/30 p-2">
      <p className="text-[10px] text-slate-500 mb-1 font-medium uppercase tracking-wide">
        {label}
      </p>
      {Object.entries(data).map(([key, vals]) => (
        <div key={key} className="flex items-center gap-1 text-[11px]">
          <span className="text-slate-500">({key})</span>
          <span className="font-mono" style={{ color }}>
            {"{"}
            {vals.join(",")}
            {"}"}
          </span>
        </div>
      ))}
    </div>
  );
}
