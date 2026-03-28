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

export default function PuzzleSelector({ activeId, onSelect }: {
  activeId: string | null;
  onSelect: (p: PuzzlePreset) => void;
}) {
  return (
    <>
      {PUZZLES.map(p => {
        const active = p.id === activeId;
        return (
          <button
            key={p.id}
            onClick={() => onSelect(p)}
            className={`puzzle-item${active ? " active" : ""}`}
            style={{ border: active ? "1.5px solid var(--text)" : "1px solid var(--border)", background: active ? "var(--bg-muted)" : "var(--bg)" }}
          >
            <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {p.name}
            </div>
            <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", lineHeight: 1.35, marginBottom: 4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
              {p.description}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
              {p.tags.filter(t => t !== "classic").map(t => (
                <span key={t} className="tag" style={{ fontSize: "0.6rem", padding: "1px 5px", color: TAG_COLORS[t] ?? "var(--text-muted)" }}>
                  {t}
                </span>
              ))}
            </div>
          </button>
        );
      })}
    </>
  );
}
