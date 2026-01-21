import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { execute, queryRows, PortfolioHolding } from "@/lib/db";

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

export async function PUT(req: NextRequest) {
  try {
    const token = getToken(req);
    const auth = verifyToken(token);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { coin_id, amount, purchase_price, purchase_date, notes } = body ?? {};

    if (!coin_id || typeof coin_id !== "string") {
      return NextResponse.json({ error: "coin_id required" }, { status: 400 });
    }

    const rows = await queryRows<PortfolioHolding>(
      "SELECT portfolio_id, user_id FROM portfolio WHERE user_id = ? AND coin_id = ? LIMIT 1",
      [auth.user_id, coin_id]
    );
    if (rows.length === 0) {
      return NextResponse.json({ error: "holding not found" }, { status: 404 });
    }

    const fields: string[] = [];
    const values: any[] = [];

    if (amount !== undefined) {
      const amtNum = Number(amount);
      if (isNaN(amtNum) || amtNum <= 0) {
        return NextResponse.json({ error: "amount must be positive" }, { status: 400 });
      }
      fields.push("amount = ?");
      values.push(amtNum);
    }

    if (purchase_price !== undefined) {
      const priceNum = purchase_price === null ? null : Number(purchase_price);
      if (priceNum !== null && (isNaN(priceNum) || priceNum < 0)) {
        return NextResponse.json({ error: "invalid purchase_price" }, { status: 400 });
      }
      fields.push("purchase_price = ?");
      values.push(priceNum);
    }

    if (purchase_date !== undefined) {
      const dateVal = purchase_date === null ? null : String(purchase_date);
      fields.push("purchase_date = ?");
      values.push(dateVal);
    }

    if (notes !== undefined) {
      const notesVal = notes === null ? null : String(notes);
      fields.push("notes = ?");
      values.push(notesVal);
    }

    if (fields.length === 0) {
      return NextResponse.json({ error: "no fields to update" }, { status: 400 });
    }

    const sql = `UPDATE portfolio SET ${fields.join(", ")}, updated_at = NOW() WHERE user_id = ? AND coin_id = ?`;
    values.push(auth.user_id, coin_id.trim());
    await execute(sql, values);

    const updated = await queryRows<PortfolioHolding>(
      "SELECT portfolio_id, user_id, coin_id, amount, purchase_price, purchase_date, notes, created_at, updated_at FROM portfolio WHERE user_id = ? AND coin_id = ? LIMIT 1",
      [auth.user_id, coin_id]
    );

    return NextResponse.json({ updated: updated[0] ?? null }, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
