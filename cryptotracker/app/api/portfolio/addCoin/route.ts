import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { execute, queryRows, PortfolioHolding } from "@/lib/db";

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
    const payload = jwt.verify(token, process.env.JWT_SECRET ?? "dev-secret") as jwt.JwtPayload & { user_id?: number; role?: string };
    const user_id = Number(payload?.user_id);
    const role = String(payload?.role || "user");
    if (!user_id || isNaN(user_id)) return null;
    return { user_id, role };
  } catch {
    return null;
  }
}

// POST /api/portfolio/addCoin
// Adds a new coin holding entry for the authenticated user.
export async function POST(req: NextRequest) {
  try {
    const token = getToken(req);
    const auth = verifyToken(token);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { coin_id, amount, purchase_price, purchase_date, notes } = body ?? {};

    if (!coin_id || typeof coin_id !== "string") {
      return NextResponse.json({ error: "coin_id required" }, { status: 400 });
    }
    const amtNum = Number(amount);
    if (!amount || isNaN(amtNum) || amtNum <= 0) {
      return NextResponse.json({ error: "amount must be a positive number" }, { status: 400 });
    }

    const priceNum = purchase_price !== undefined && purchase_price !== null ? Number(purchase_price) : null;
    if (priceNum !== null && (isNaN(priceNum) || priceNum < 0)) {
      return NextResponse.json({ error: "purchase_price must be a non-negative number" }, { status: 400 });
    }

    const dateVal = purchase_date ? String(purchase_date) : null;
    const notesVal = notes ? String(notes) : null;

    const result = await execute(
      "INSERT INTO portfolio (user_id, coin_id, amount, purchase_price, purchase_date, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())",
      [auth.user_id, coin_id.trim(), amtNum, priceNum, dateVal, notesVal]
    );

    const insertedId = result.insertId as number;
    const rows = await queryRows<PortfolioHolding>(
      "SELECT portfolio_id, user_id, coin_id, amount, purchase_price, purchase_date, notes, created_at, updated_at FROM portfolio WHERE portfolio_id = ?",
      [insertedId]
    );

    return NextResponse.json({ created: rows[0] ?? null }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
