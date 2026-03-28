"use client";

import React from "react";
import { clsx } from "clsx";
import { PUZZLES, PuzzlePreset } from "@/lib/puzzles";
import { Cpu, Flame, Clock, Layers } from "lucide-react";

interface PuzzleSelectorProps {
  activeId: string | null;
  onSelect: (puzzle: PuzzlePreset) => void;
}

const TAG_META: Record<string, { icon: React.ReactNode; color: string }> = {
  classic: { icon: <Layers size={10} />, color: "#6366f1" },
  killer: { icon: <Flame size={10} />, color: "#f59e0b" },
  thermo: { icon: <Clock size={10} />, color: "#ef4444" },
  diagonal: { icon: <Cpu size={10} />, color: "#f97316" },
  evenOdd: { icon: <Cpu size={10} />, color: "#10b981" },
  arrow: { icon: <Cpu size={10} />, color: "#22d3ee" },
  kropki: { icon: <Cpu size={10} />, color: "#a855f7" },
};

export default function PuzzleSelector({
  activeId,
  onSelect,
}: PuzzleSelectorProps) {
  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-400 font-semibold uppercase tracking-widest px-1 mb-3">
        Choose Puzzle
      </p>
      <div className="grid grid-cols-1 gap-2">
        {PUZZLES.map((puzzle) => {
          const isActive = puzzle.id === activeId;
          return (
            <button
              key={puzzle.id}
              onClick={() => onSelect(puzzle)}
              className={clsx(
                "text-left p-3 rounded-xl border transition-all duration-200",
                isActive
                  ? "border-indigo-500/70 bg-indigo-500/10 shadow-lg shadow-indigo-500/10"
                  : "border-slate-700/50 bg-slate-800/40 hover:border-slate-600/60 hover:bg-slate-800/60"
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p
                    className={clsx(
                      "text-sm font-semibold",
                      isActive ? "text-indigo-300" : "text-slate-200"
                    )}
                  >
                    {puzzle.name}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                    {puzzle.description}
                  </p>
                </div>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-1 mt-2">
                {puzzle.tags.map((tag) => {
                  const meta = TAG_META[tag];
                  return (
                    <span
                      key={tag}
                      className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium"
                      style={{
                        color: meta?.color ?? "#64748b",
                        background: `${meta?.color ?? "#64748b"}18`,
                      }}
                    >
                      {meta?.icon}
                      {tag}
                    </span>
                  );
                })}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
