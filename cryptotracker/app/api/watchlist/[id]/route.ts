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

// DELETE /api/watchlist/[id]
// Removes a coin from the authenticated user's watchlist
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = getToken(req);
    const auth = verifyToken(token);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const watchlist_id = Number(resolvedParams.id);
    console.log("[DELETE Watchlist] Attempting to delete watchlist_id:", watchlist_id);
    
    if (isNaN(watchlist_id)) {
      console.error("[DELETE Watchlist] Invalid ID:", resolvedParams.id);
      return NextResponse.json({ error: "Invalid watchlist_id" }, { status: 400 });
    }

    // Check if item exists and belongs to the user
    const existing = await queryRows(
      "SELECT user_id FROM watchlist WHERE watchlist_id = ?",
      [watchlist_id]
    );

    if (existing.length === 0) {
      return NextResponse.json({ error: "Watchlist item not found" }, { status: 404 });
    }

    const item = existing[0] as any;
    if (item.user_id !== auth.user_id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await execute("DELETE FROM watchlist WHERE watchlist_id = ?", [watchlist_id]);

    return NextResponse.json(
      { message: "Coin removed from watchlist", watchlist_id },
      { status: 200 }
    );
  } catch (err) {
    console.error("DELETE /api/watchlist/[id] error:", err);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
