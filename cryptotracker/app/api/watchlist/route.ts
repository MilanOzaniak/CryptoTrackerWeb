import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { queryRows } from "@/lib/db";

export const dynamic = "force-dynamic";

interface WatchlistItem {
  watchlist_id: number;
  user_id: number;
  coin_id: string;
  added_at: string;
  notes?: string;
  target_price?: number;
}

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

// GET /api/watchlist -> current user's watchlist
export async function GET(req: NextRequest) {
  try {
    const token = getToken(req);
    const auth = verifyToken(token);
    if (!auth) {
      console.log("[Watchlist] No auth token found");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("[Watchlist] Fetching for user_id:", auth.user_id);
    const items = await queryRows<WatchlistItem>(
      "SELECT watchlist_id, user_id, coin_id, added_at, notes, target_price FROM watchlist WHERE user_id = ? ORDER BY added_at DESC",
      [auth.user_id]
    );
    console.log("[Watchlist] Found items:", items.length, items);

    return NextResponse.json({ user_id: auth.user_id, items }, { status: 200 });
  } catch (err) {
    console.error("GET /api/watchlist error:", err);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
