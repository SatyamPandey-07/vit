"use client";

import React, { useRef, useEffect } from "react";
import { SolveStep, ConstraintKind } from "@/lib/solver/types";

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

const CONSTRAINT_LABEL: Record<ConstraintKind, string> = {
  classic:  "Classic",
  killer:   "Killer",
  thermo:   "Thermo",
  arrow:    "Arrow",
  kropki:   "Kropki",
  evenOdd:  "Even/Odd",
  diagonal: "Diagonal",
};

const CONSTRAINT_COLOR: Record<ConstraintKind, string> = {
  classic:  "var(--c-classic)",
  killer:   "var(--c-killer)",
  thermo:   "var(--c-thermo)",
  arrow:    "var(--c-arrow)",
  kropki:   "var(--c-kropki)",
  evenOdd:  "var(--c-evenodd)",
  diagonal: "var(--c-diagonal)",
};

const SPEED_OPTIONS = [
  { label: "0.5×", ms: 2000 },
  { label: "1×",   ms: 1000 },
  { label: "2×",   ms: 500  },
  { label: "5×",   ms: 200  },
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
  const activeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { activeRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" }); }, [currentStepIdx]);

  const current = steps[currentStepIdx];
  const pct = steps.length ? ((currentStepIdx + 1) / steps.length) * 100 : 0;

  if (!steps.length) {
    return (
      <div style={{ padding: "32px 0", textAlign: "center", color: "var(--text-subtle)", fontSize: "0.875rem" }}>
        Solve a puzzle to see steps.
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, height: "100%" }}>

      {/* ── Step detail ─────────────────────────────────── */}
      {current && (
        <div style={{ padding: 14, border: "1px solid var(--border)", borderRadius: 8, background: "var(--bg-subtle)", display: "flex", flexDirection: "column", gap: 10 }}>
          {/* Type + constraint badge */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
            <span style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              fontSize: "0.75rem",
              fontWeight: 600,
              padding: "2px 8px",
              borderRadius: 4,
              background: `color-mix(in srgb, ${CONSTRAINT_COLOR[current.constraint]} 12%, transparent)`,
              color: CONSTRAINT_COLOR[current.constraint],
              border: `1px solid color-mix(in srgb, ${CONSTRAINT_COLOR[current.constraint]} 30%, transparent)`,
            }}>
              {CONSTRAINT_LABEL[current.constraint]}
              <span style={{ fontWeight: 400, opacity: 0.7 }}>· {current.type.replace(/_/g, " ")}</span>
            </span>
            <span style={{ fontSize: "0.75rem", color: "var(--text-subtle)" }}>
              {currentStepIdx + 1} / {steps.length}
            </span>
          </div>

          {/* Equation */}
          <div style={{ padding: "8px 12px", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 6 }}>
            <p style={{ fontSize: "0.6875rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-subtle)", marginBottom: 4 }}>
              Equation
            </p>
            <code style={{ fontSize: "0.8125rem", color: "var(--text)", wordBreak: "break-all", display: "block" }}>
              {current.equation}
            </code>
          </div>

          {/* Reason */}
          <p style={{ fontSize: "0.8125rem", color: "var(--text-muted)", lineHeight: 1.5 }}>
            {current.reason}
          </p>

          {/* Before / after */}
          {Object.keys(current.before).length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <CandBox label="Before" data={current.before} dimmed />
              <CandBox label="After"  data={current.after}  />
            </div>
          )}
        </div>
      )}

      {/* ── Playback controls ────────────────────────────── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {/* Progress */}
        <div style={{ height: 2, background: "var(--border)", borderRadius: 2, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${pct}%`, background: "var(--text)", transition: "width 0.2s" }} />
        </div>

        {/* Buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: 4, justifyContent: "center" }}>
          <IconBtn onClick={() => onJump(0)} disabled={currentStepIdx === 0} title="First">⏮</IconBtn>
          <IconBtn onClick={onPrev}           disabled={currentStepIdx === 0} title="Previous">‹</IconBtn>

          <button
            onClick={isPlaying ? onPause : onPlay}
            className="btn btn-primary"
            style={{ minWidth: 80, justifyContent: "center" }}
          >
            {isPlaying ? "Pause" : "Play"}
          </button>

          <IconBtn onClick={onNext}           disabled={currentStepIdx === steps.length - 1} title="Next">›</IconBtn>
          <IconBtn onClick={() => onJump(steps.length - 1)} disabled={currentStepIdx === steps.length - 1} title="Last">⏭</IconBtn>
        </div>

        {/* Speed */}
        <div style={{ display: "flex", alignItems: "center", gap: 4, justifyContent: "center" }}>
          <span style={{ fontSize: "0.75rem", color: "var(--text-subtle)", marginRight: 4 }}>Speed:</span>
          {SPEED_OPTIONS.map(o => (
            <button
              key={o.ms}
              onClick={() => onSpeedChange(o.ms)}
              style={{
                padding: "2px 8px",
                borderRadius: 4,
                fontSize: "0.75rem",
                fontWeight: 500,
                cursor: "pointer",
                border: "1px solid var(--border)",
                background: speed === o.ms ? "var(--text)" : "transparent",
                color: speed === o.ms ? "var(--bg)" : "var(--text-muted)",
                transition: "all 0.15s",
              }}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Step list ────────────────────────────────────── */}
      <div style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column", gap: 2, minHeight: 0 }}>
        {steps.map((step, idx) => {
          const active = idx === currentStepIdx;
          const color = CONSTRAINT_COLOR[step.constraint];
          return (
            <button
              key={step.step_id}
              ref={active ? activeRef : undefined}
              onClick={() => onJump(idx)}
              className={`step-item${active ? " active" : ""}`}
              style={{ textAlign: "left", background: undefined }} // handled by CSS class
            >
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: color, flexShrink: 0, display: "inline-block" }} />
                <span style={{ fontSize: "0.75rem", fontWeight: 600, color }}>
                  [{CONSTRAINT_LABEL[step.constraint]}]
                </span>
                <span style={{ fontSize: "0.75rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 200 }}>
                  {step.equation}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function IconBtn({ onClick, disabled, title, children }: { onClick: () => void; disabled?: boolean; title: string; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        width: 32, height: 32,
        display: "flex", alignItems: "center", justifyContent: "center",
        borderRadius: 6,
        border: "1px solid var(--border)",
        background: "transparent",
        color: disabled ? "var(--text-subtle)" : "var(--text-muted)",
        cursor: disabled ? "not-allowed" : "pointer",
        fontSize: "1rem",
        fontWeight: 600,
        transition: "all 0.15s",
      }}
    >
      {children}
    </button>
  );
}

function CandBox({ label, data, dimmed }: { label: string; data: Record<string, number[]>; dimmed?: boolean }) {
  return (
    <div style={{ padding: "8px 10px", borderRadius: 6, border: "1px solid var(--border)", background: "var(--bg)" }}>
      <p style={{ fontSize: "0.625rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-subtle)", marginBottom: 4 }}>
        {label}
      </p>
      {Object.entries(data).map(([k, vs]) => (
        <div key={k} style={{ fontSize: "0.75rem", display: "flex", gap: 4, alignItems: "baseline" }}>
          <span style={{ color: "var(--text-subtle)" }}>({k})</span>
          <code style={{ color: dimmed ? "var(--text-muted)" : "var(--text)" }}>
            {"{" + vs.join(",") + "}"}
          </code>
        </div>
      ))}
    </div>
  );
}
