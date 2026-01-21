import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { execute, queryRows } from "@/lib/db";

function getToken(req: NextRequest): string | undefined {
  const tokenFromCookie = req.cookies.get("token")?.value;
  const authHeader = req.headers.get("authorization");
  const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.split(" ")[1] : undefined;
  return tokenFromCookie ?? bearerToken;
}

function verifyToken(token?: string): { user_id: number; role: string } | null {
  if (!token) return null;
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET ?? "dev-secret") as jwt.JwtPayload & { user_id?: number; role?: string };
    const user_id = Number(payload?.user_id);
    const role = String(payload?.role || "user");
    if (!user_id || isNaN(user_id)) return null;
    return { user_id, role };
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = getToken(req);
    const auth = verifyToken(token);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { coin_id } = body ?? {};

    if (!coin_id || typeof coin_id !== "string") {
      return NextResponse.json({ error: "coin_id required" }, { status: 400 });
    }

    const trimmed = coin_id.trim();
    if (!trimmed) {
      return NextResponse.json({ error: "coin_id required" }, { status: 400 });
    }

    const existing = await queryRows<{ portfolio_id: number }>(
      "SELECT portfolio_id FROM portfolio WHERE user_id = ? AND coin_id = ?",
      [auth.user_id, trimmed]
    );

    if (existing.length === 0) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }

    const result = await execute(
      "DELETE FROM portfolio WHERE user_id = ? AND coin_id = ?",
      [auth.user_id, trimmed]
    );

    return NextResponse.json({ deleted: (result as any).affectedRows ?? 0, coin_id: trimmed }, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
