import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { queryRows, execute } from "@/lib/db";

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

export async function POST(req: NextRequest) {
  try {
    const token = getToken(req);
    const auth = verifyToken(token);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const {
      transaction_type,
      coin_id,
      amount,
      price_usd,
      notes,
      to_coin_id,
      to_amount,
      to_price_usd,
      total_value_usd,
    } = body ?? {};

    if (!transaction_type || typeof transaction_type !== "string") {
      return NextResponse.json({ error: "transaction_type required" }, { status: 400 });
    }
    const normalizedType = transaction_type.trim().toLowerCase();
    if (!["buy", "sell", "swap"].includes(normalizedType)) {
      return NextResponse.json({ error: "transaction_type must be buy, sell, or swap" }, { status: 400 });
    }

    if (!coin_id || typeof coin_id !== "string") {
      return NextResponse.json({ error: "coin_id required" }, { status: 400 });
    }

    const amtNum = amount !== undefined ? Number(amount) : null;
    if (amtNum === null || isNaN(amtNum) || amtNum <= 0) {
      return NextResponse.json({ error: "amount must be a positive number" }, { status: 400 });
    }

    const priceNum = price_usd !== undefined && price_usd !== null ? Number(price_usd) : null;
    if (priceNum !== null && (isNaN(priceNum) || priceNum < 0)) {
      return NextResponse.json({ error: "price_usd must be non-negative" }, { status: 400 });
    }

    const toAmtNum = to_amount !== undefined && to_amount !== null ? Number(to_amount) : null;
    if (toAmtNum !== null && (isNaN(toAmtNum) || toAmtNum < 0)) {
      return NextResponse.json({ error: "to_amount must be non-negative" }, { status: 400 });
    }

    const toPriceNum = to_price_usd !== undefined && to_price_usd !== null ? Number(to_price_usd) : null;
    if (toPriceNum !== null && (isNaN(toPriceNum) || toPriceNum < 0)) {
      return NextResponse.json({ error: "to_price_usd must be non-negative" }, { status: 400 });
    }

    const totalNum = total_value_usd !== undefined && total_value_usd !== null ? Number(total_value_usd) : null;
    if (totalNum !== null && (isNaN(totalNum) || totalNum < 0)) {
      return NextResponse.json({ error: "total_value_usd must be non-negative" }, { status: 400 });
    }

    const noteParts: string[] = [];
    if (notes) noteParts.push(String(notes));
    noteParts.push(`amount=${amtNum}`);
    if (priceNum !== null) noteParts.push(`price_usd=${priceNum}`);
    if (totalNum !== null) noteParts.push(`total_value_usd=${totalNum}`);
    if (to_coin_id) noteParts.push(`to_coin_id=${String(to_coin_id)}`);
    if (toAmtNum !== null) noteParts.push(`to_amount=${toAmtNum}`);
    if (toPriceNum !== null) noteParts.push(`to_price_usd=${toPriceNum}`);
    const noteVal = noteParts.join(" | ");

    const result = await execute(
      "INSERT INTO transactions (user_id, transaction_type, coin_id, notes, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())",
      [auth.user_id, normalizedType, coin_id.trim(), noteVal]
    );

    const insertedId = result.insertId as number;
    const rows = await queryRows(
      "SELECT transaction_id, user_id, transaction_type, coin_id, notes, created_at, updated_at FROM transactions WHERE transaction_id = ?",
      [insertedId]
    );

    return NextResponse.json({ created: rows[0] ?? null }, { status: 201 });
  } catch (err) {
    console.error("POST /api/transactions/addTransaction error", err);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
