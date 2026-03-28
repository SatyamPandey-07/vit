"use client";

import React, { useRef, useEffect, useState } from "react";
import { SolveStep, ConstraintKind, StepAction } from "@/lib/solver/types";

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

const KIND_LABEL: Record<ConstraintKind, string> = {
  classic: "Classic", killer: "Killer", thermo: "Thermo",
  arrow: "Arrow", kropki: "Kropki", evenOdd: "Even/Odd", diagonal: "Diagonal",
};

const KIND_COLOR: Record<ConstraintKind, string> = {
  classic:  "#6366f1",
  killer:   "#f59e0b",
  thermo:   "#ef4444",
  arrow:    "#06b6d4",
  kropki:   "#a855f7",
  evenOdd:  "#10b981",
  diagonal: "#f97316",
};

const ACTION_TAG: Record<StepAction, string> = {
  solving_start:       "Start",
  solving_complete:    "Done",
  constraint_applied:  "Constraint",
  candidate_eliminated:"Eliminate",
  naked_single:        "Naked Single",
  hidden_single:       "Hidden Single",
  backtrack_guess:     "Guess",
};

const SPEED_OPTIONS = [
  { label: "0.5×", ms: 2000 },
  { label: "1×",   ms: 1000 },
  { label: "2×",   ms: 500  },
  { label: "5×",   ms: 200  },
];

export default function StepViewer({
  steps, currentStepIdx, isPlaying, speed,
  onPlay, onPause, onNext, onPrev, onJump, onSpeedChange,
}: StepViewerProps) {
  const activeRef = useRef<HTMLButtonElement>(null);
  const [prevIdx, setPrevIdx] = useState(currentStepIdx);
  const [animKey, setAnimKey] = useState(0);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    if (currentStepIdx !== prevIdx) {
      setAnimKey(k => k + 1);
      setPrevIdx(currentStepIdx);
    }
  }, [currentStepIdx]);

  const current = steps[currentStepIdx];
  const pct = steps.length ? ((currentStepIdx + 1) / steps.length) * 100 : 0;
  const color = current ? KIND_COLOR[current.constraint_type] : "#6366f1";

  if (!steps.length) return (
    <div style={{ padding: "40px 0", textAlign: "center" }}>
      <div style={{ fontSize: "0.75rem", color: "var(--text-subtle)", fontWeight: 500, letterSpacing: "0.03em" }}>
        Solve a puzzle to see the reasoning steps.
      </div>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, height: "100%", fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* ── Animated step card ─────────────────────── */}
      {current && (
        <div
          key={animKey}
          style={{
            padding: "12px 14px",
            borderRadius: 10,
            border: `1px solid ${color}28`,
            background: `color-mix(in srgb, ${color} 6%, var(--bg))`,
            display: "flex", flexDirection: "column", gap: 9,
            animation: "sv-fade-in 0.22s ease",
          }}
        >
          {/* Header row */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{
                fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.06em",
                padding: "2px 7px", borderRadius: 4,
                background: `${color}18`,
                color,
                border: `1px solid ${color}30`,
                textTransform: "uppercase",
              }}>
                {KIND_LABEL[current.constraint_type]}
              </span>
              <span style={{ fontSize: "0.65rem", color: "var(--text-subtle)", fontWeight: 500, letterSpacing: "0.03em" }}>
                {ACTION_TAG[current.action]}
              </span>
            </div>
            <span style={{ fontSize: "0.65rem", color: "var(--text-subtle)", fontVariantNumeric: "tabular-nums", letterSpacing: "0.02em" }}>
              {currentStepIdx + 1} / {steps.length}
            </span>
          </div>

          {/* Equation block */}
          <div style={{
            padding: "7px 10px", borderRadius: 6,
            background: "var(--bg)", border: "1px solid var(--border)",
            fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
          }}>
            <div style={{ fontSize: "0.55rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.09em", color: "var(--text-subtle)", marginBottom: 3 }}>
              Equation
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--text)", wordBreak: "break-word", lineHeight: 1.4 }}>
              {current.equation}
            </div>
          </div>

          {/* Reason line */}
          <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", lineHeight: 1.55, margin: 0 }}>
            {current.reason}
          </p>

          {/* Candidate changes */}
          {current.candidate_changes.length > 0 && (
            <div>
              <div style={{ fontSize: "0.58rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-subtle)", marginBottom: 5 }}>
                Eliminations · {current.candidate_changes.length} cell{current.candidate_changes.length > 1 ? "s" : ""}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 3, maxHeight: 108, overflowY: "auto" }}>
                {current.candidate_changes.map((ch, i) => (
                  <div key={i} style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "3px 8px", background: "var(--bg)", borderRadius: 4,
                    border: "1px solid var(--border)",
                    fontSize: "0.7rem",
                    fontFamily: "'JetBrains Mono', monospace",
                    animation: `sv-slide-in 0.18s ease ${i * 0.03}s both`,
                  }}>
                    <span style={{ color: "var(--text-subtle)", fontWeight: 500, minWidth: 38 }}>
                      R{ch.cell[0]+1}C{ch.cell[1]+1}
                    </span>
                    <span style={{ color: "#ef4444", fontWeight: 600, letterSpacing: "0.02em" }}>
                      −{"{" + ch.removed.join(",") + "}"}
                    </span>
                    <span style={{ color: "var(--text-muted)", marginLeft: "auto" }}>
                      {"{" + ch.remaining.join(",") + "}"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Controls ───────────────────────────────── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {/* Animated progress bar */}
        <div style={{ height: 3, borderRadius: 2, background: "var(--border)", overflow: "hidden" }}>
          <div style={{
            height: "100%", borderRadius: 2,
            width: `${pct}%`,
            background: `linear-gradient(90deg, ${color}, color-mix(in srgb, ${color} 70%, #fff))`,
            transition: "width 0.25s cubic-bezier(.4,0,.2,1), background 0.4s ease",
          }} />
        </div>

        {/* Playback row */}
        <div style={{ display: "flex", alignItems: "center", gap: 4, justifyContent: "center" }}>
          <CtrlBtn onClick={() => onJump(0)} disabled={currentStepIdx === 0} title="First">
            <svg width="11" height="11" viewBox="0 0 12 12" fill="currentColor"><path d="M2 2h1.5v8H2V2zm1.5 4L10 2v8L3.5 6z"/></svg>
          </CtrlBtn>
          <CtrlBtn onClick={onPrev} disabled={currentStepIdx === 0} title="Previous">
            <svg width="11" height="11" viewBox="0 0 12 12" fill="currentColor"><path d="M7.5 2L2 6l5.5 4V2z"/></svg>
          </CtrlBtn>

          <button
            onClick={isPlaying ? onPause : onPlay}
            style={{
              display: "flex", alignItems: "center", gap: 5,
              padding: "5px 16px", borderRadius: 6,
              border: "none", cursor: "pointer",
              background: color, color: "#fff",
              fontSize: "0.75rem", fontWeight: 600, letterSpacing: "0.03em",
              transition: "opacity 0.15s, transform 0.1s",
              fontFamily: "inherit",
            }}
            onMouseEnter={e=>(e.currentTarget.style.opacity="0.88")}
            onMouseLeave={e=>(e.currentTarget.style.opacity="1")}
          >
            {isPlaying
              ? <><svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"><rect x="1.5" y="1" width="3" height="8"/><rect x="5.5" y="1" width="3" height="8"/></svg> Pause</>
              : <><svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"><path d="M2 1l7 4-7 4V1z"/></svg> Play</>
            }
          </button>

          <CtrlBtn onClick={onNext} disabled={currentStepIdx === steps.length - 1} title="Next">
            <svg width="11" height="11" viewBox="0 0 12 12" fill="currentColor"><path d="M4.5 2l5.5 4-5.5 4V2z"/></svg>
          </CtrlBtn>
          <CtrlBtn onClick={() => onJump(steps.length - 1)} disabled={currentStepIdx === steps.length - 1} title="Last">
            <svg width="11" height="11" viewBox="0 0 12 12" fill="currentColor"><path d="M2 2l6.5 4L2 10V2zm6.5 0H10v8H8.5V2z"/></svg>
          </CtrlBtn>
        </div>

        {/* Speed row */}
        <div style={{ display: "flex", alignItems: "center", gap: 4, justifyContent: "center" }}>
          <span style={{ fontSize: "0.65rem", color: "var(--text-subtle)", fontWeight: 500, letterSpacing: "0.04em" }}>SPEED</span>
          {SPEED_OPTIONS.map(o => (
            <button key={o.ms} onClick={() => onSpeedChange(o.ms)} style={{
              padding: "2px 8px", borderRadius: 4,
              fontSize: "0.65rem", fontWeight: 600, letterSpacing: "0.03em",
              cursor: "pointer", border: "1px solid var(--border)",
              background: speed === o.ms ? color : "transparent",
              color: speed === o.ms ? "#fff" : "var(--text-muted)",
              transition: "all 0.15s",
              fontFamily: "inherit",
            }}>
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Step list ──────────────────────────────── */}
      <div style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column", gap: 1, minHeight: 0 }}>
        {steps.map((step, idx) => {
          const active = idx === currentStepIdx;
          const c = KIND_COLOR[step.constraint_type];
          const isElim = step.candidate_changes.length > 0;
          return (
            <button
              key={step.step_id}
              ref={active ? activeRef : undefined}
              onClick={() => onJump(idx)}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "5px 8px", borderRadius: 5,
                background: active ? `${c}14` : "transparent",
                border: `1px solid ${active ? `${c}30` : "transparent"}`,
                cursor: "pointer", textAlign: "left", width: "100%",
                transition: "background 0.15s, border-color 0.15s",
                fontFamily: "inherit",
              }}
            >
              {/* Type pill */}
              <span style={{
                fontSize: "0.55rem", fontWeight: 700, letterSpacing: "0.05em",
                padding: "1px 5px", borderRadius: 3,
                background: `${c}18`, color: c, flexShrink: 0,
                textTransform: "uppercase",
              }}>
                {KIND_LABEL[step.constraint_type][0]}
              </span>

              {/* Equation text */}
              <span style={{
                fontSize: "0.7rem",
                color: active ? "var(--text)" : "var(--text-muted)",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1,
                fontWeight: active ? 500 : 400,
                transition: "color 0.15s",
              }}>
                {step.equation}
              </span>

              {/* Elimination count badge */}
              {isElim && (
                <span style={{
                  fontSize: "0.58rem", fontWeight: 700, color: "#ef4444",
                  background: "#fef2f2", borderRadius: 3, padding: "0 4px", flexShrink: 0,
                  fontFamily: "JetBrains Mono, monospace",
                }}>
                  −{step.candidate_changes.reduce((s, ch) => s + ch.removed.length, 0)}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Keyframe styles injected inline */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        @keyframes sv-fade-in { from { opacity:0; transform:translateY(4px); } to { opacity:1; transform:translateY(0); } }
        @keyframes sv-slide-in { from { opacity:0; transform:translateX(-6px); } to { opacity:1; transform:translateX(0); } }
        .step-item:hover { background: var(--bg-subtle) !important; }
      `}</style>
    </div>
  );
}

function CtrlBtn({ onClick, disabled, title, children }: {
  onClick: () => void; disabled?: boolean; title: string; children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick} disabled={disabled} title={title}
      style={{
        width: 28, height: 28, borderRadius: 5,
        display: "flex", alignItems: "center", justifyContent: "center",
        border: "1px solid var(--border)", background: "transparent",
        color: disabled ? "var(--text-subtle)" : "var(--text-muted)",
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "background 0.12s, color 0.12s",
      }}
      onMouseEnter={e => { if (!disabled) { e.currentTarget.style.background = "var(--bg-subtle)"; e.currentTarget.style.color = "var(--text)"; }}}
      onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = disabled ? "var(--text-subtle)" : "var(--text-muted)"; }}
    >
      {children}
    </button>
  );
}
