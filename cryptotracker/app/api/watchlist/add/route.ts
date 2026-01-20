import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { execute, queryRows } from "@/lib/db";

export const dynamic = "force-dynamic";

function getToken(req: NextRequest): string | undefined {
  const tokenFromCookie = req.cookies.get("token")?.value;
  const authHeader = req.headers.get("authorization");
  const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.split(" ")[1] : undefined;
  return tokenFromCookie ?? bearerToken;
}

function verifyToken(token?: string): { user_id: number; role: string } | null {
  if (!token) return null;
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET ?? "dev-secret") as any;
    const user_id = Number(payload?.user_id);
    const role = String(payload?.role || "user");
    if (!user_id || isNaN(user_id)) return null;
    return { user_id, role };
  } catch {
    return null;
  }
}

// POST /api/watchlist/add
// Adds a coin to the authenticated user's watchlist
export async function POST(req: NextRequest) {
  try {
    const token = getToken(req);
    const auth = verifyToken(token);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { coin_id, notes, target_price } = body ?? {};

    if (!coin_id || typeof coin_id !== "string") {
      return NextResponse.json({ error: "coin_id required" }, { status: 400 });
    }

    // Check if coin already in watchlist
    const existing = await queryRows(
      "SELECT watchlist_id FROM watchlist WHERE user_id = ? AND coin_id = ?",
      [auth.user_id, coin_id]
    );

    if (existing.length > 0) {
      return NextResponse.json({ error: "Coin already in watchlist" }, { status: 409 });
    }

    const targetPriceNum = target_price !== undefined && target_price !== null ? Number(target_price) : null;
    if (targetPriceNum !== null && (isNaN(targetPriceNum) || targetPriceNum < 0)) {
      return NextResponse.json({ error: "target_price must be a non-negative number" }, { status: 400 });
    }

    const result = await execute(
      "INSERT INTO watchlist (user_id, coin_id, notes, target_price) VALUES (?, ?, ?, ?)",
      [auth.user_id, coin_id, notes || null, targetPriceNum]
    );

    return NextResponse.json(
      {
        message: "Coin added to watchlist",
        watchlist_id: result.insertId,
        user_id: auth.user_id,
        coin_id,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("POST /api/watchlist/add error:", err);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
