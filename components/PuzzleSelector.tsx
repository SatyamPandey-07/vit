"use client";

import React from "react";
import { PUZZLES, PuzzlePreset } from "@/lib/puzzles";

const TAG_COLORS: Record<string, string> = {
  classic:  "var(--c-classic)",
  killer:   "var(--c-killer)",
  thermo:   "var(--c-thermo)",
  diagonal: "var(--c-diagonal)",
  evenOdd:  "var(--c-evenodd)",
  arrow:    "var(--c-arrow)",
  kropki:   "var(--c-kropki)",
};

export default function PuzzleSelector({
  activeId,
  onSelect,
}: {
  activeId: string | null;
  onSelect: (p: PuzzlePreset) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <p style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-subtle)", marginBottom: 4 }}>
        Presets
      </p>
      {PUZZLES.map(p => {
        const active = p.id === activeId;
        return (
          <button
            key={p.id}
            onClick={() => onSelect(p)}
            style={{
              textAlign: "left",
              padding: "10px 12px",
              borderRadius: 7,
              border: active ? "1.5px solid var(--text)" : "1px solid var(--border)",
              background: active ? "var(--bg-muted)" : "var(--bg)",
              cursor: "pointer",
              transition: "all 0.15s",
            }}
          >
            <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--text)", marginBottom: 2 }}>
              {p.name}
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: 6, lineHeight: 1.4 }}>
              {p.description}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {p.tags.map(t => (
                <span
                  key={t}
                  className="tag"
                  style={{ color: TAG_COLORS[t] ?? "var(--text-muted)", borderColor: `color-mix(in srgb, ${TAG_COLORS[t] ?? "#71717a"} 25%, transparent)` }}
                >
                  {t}
                </span>
              ))}
            </div>
          </button>
        );
      })}
    </div>
  );
}
