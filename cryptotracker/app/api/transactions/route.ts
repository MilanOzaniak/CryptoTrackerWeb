import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { queryRows } from "@/lib/db";

function getToken(req: NextRequest): string | undefined {
  const tokenFromCookie = req.cookies.get("token")?.value;
  const authHeader = req.headers.get("authorization");
  const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.split(" ")[1] : undefined;
  return tokenFromCookie ?? bearerToken;
}

function verifyToken(token?: string): { user_id: number; role: string; email?: string } | null {
  if (!token) return null;
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET ?? "dev-secret") as jwt.JwtPayload & { user_id?: number; role?: string; email?: string };
    const user_id = Number(payload?.user_id);
    const role = String(payload?.role || "user");
    if (!user_id || isNaN(user_id)) return null;
    return { user_id, role, email: payload?.email };
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  try {
    const token = getToken(req);
    const auth = verifyToken(token);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const rows = await queryRows(
      "SELECT transaction_id, user_id, transaction_type, coin_id, notes, created_at, updated_at FROM transactions WHERE user_id = ? ORDER BY created_at DESC",
      [auth.user_id]
    );

    return NextResponse.json({ transactions: rows }, { status: 200 });
  } catch (err) {
    console.error("GET /api/transactions error", err);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}