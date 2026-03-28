import { NextRequest, NextResponse } from "next/server";
import { solve } from "@/lib/solver/solver";
import { SolveRequest } from "@/lib/solver/types";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const body: SolveRequest = await req.json();

    if (!body.grid || !Array.isArray(body.grid) || body.grid.length !== 9) {
      return NextResponse.json(
        { error: "Invalid grid: must be 9×9 array" },
        { status: 400 }
      );
    }

    for (const row of body.grid) {
      if (!Array.isArray(row) || row.length !== 9) {
        return NextResponse.json(
          { error: "Invalid grid: each row must have 9 cells" },
          { status: 400 }
        );
      }
    }

    const result = await solve(body.grid, body.constraints ?? {});
    return NextResponse.json(result);
  } catch (err) {
    console.error("[/api/solve]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal solver error" },
      { status: 500 }
    );
  }
}
