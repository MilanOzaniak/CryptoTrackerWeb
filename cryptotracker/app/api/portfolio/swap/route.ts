import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { execute, queryRows, PortfolioHolding } from "@/lib/db";
import { getSimplePrice } from "@/lib/coingecko";

export const dynamic = "force-dynamic";

function getToken(req: NextRequest): string | undefined {
  const tokenFromCookie = req.cookies.get("token")?.value;
  const authHeader = req.headers.get("authorization");
  const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.split(" ")[1] : undefined;
  return tokenFromCookie ?? bearerToken;
}

function verifyToken(token?: string): { user_id: number; role: string; email?: string } | null {
  if (!token) return null;
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET ?? "dev-secret") as any;
    const user_id = Number(payload?.user_id);
    const role = String(payload?.role || "user");
    const email = payload?.email ? String(payload.email) : undefined;
    if (!user_id || isNaN(user_id)) return null;
    return { user_id, role, email };
  } catch {
    return null;
  }
}

// POST /api/portfolio/swap
// Swap an amount of one coin for another based on current price data.
export async function POST(req: NextRequest) {
  try {
    const token = getToken(req);
    const auth = verifyToken(token);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { from_coin_id, to_coin_id, amount, vs_currency } = body ?? {};

    if (!from_coin_id || typeof from_coin_id !== "string") {
      return NextResponse.json({ error: "from_coin_id required" }, { status: 400 });
    }
    if (!to_coin_id || typeof to_coin_id !== "string") {
      return NextResponse.json({ error: "to_coin_id required" }, { status: 400 });
    }
    if (from_coin_id === to_coin_id) {
      return NextResponse.json({ error: "Choose a different coin to receive" }, { status: 400 });
    }

    const amtNum = Number(amount);
    if (!amount || isNaN(amtNum) || amtNum <= 0) {
      return NextResponse.json({ error: "amount must be a positive number" }, { status: 400 });
    }

    const currency = (vs_currency || "usd").toString().toLowerCase();

    const [fromHolding] = await queryRows<PortfolioHolding>(
      "SELECT portfolio_id, user_id, coin_id, amount FROM portfolio WHERE user_id = ? AND coin_id = ? LIMIT 1",
      [auth.user_id, from_coin_id]
    );

    if (!fromHolding) {
      return NextResponse.json({ error: "You do not hold this coin" }, { status: 400 });
    }

    const currentAmount = Number(fromHolding.amount);
    if (isNaN(currentAmount) || currentAmount <= 0) {
      return NextResponse.json({ error: "No available balance" }, { status: 400 });
    }
    if (amtNum > currentAmount) {
      return NextResponse.json({ error: "You cannot swap more than you hold" }, { status: 400 });
    }

    const priceData = await getSimplePrice([from_coin_id, to_coin_id], [currency]);
    const fromPrice = priceData?.[from_coin_id]?.[currency];
    const toPrice = priceData?.[to_coin_id]?.[currency];

    if (typeof fromPrice !== "number" || typeof toPrice !== "number" || toPrice === 0) {
      return NextResponse.json({ error: "Failed to fetch prices for swap" }, { status: 502 });
    }

    const receiveAmount = (amtNum * fromPrice) / toPrice;

    // Deduct from the source holding
    const remaining = currentAmount - amtNum;
    if (remaining <= 0) {
      await execute("DELETE FROM portfolio WHERE portfolio_id = ?", [fromHolding.portfolio_id]);
    } else {
      await execute("UPDATE portfolio SET amount = ?, updated_at = NOW() WHERE portfolio_id = ?", [remaining, fromHolding.portfolio_id]);
    }

    // Add or update the destination holding
    const [toHolding] = await queryRows<PortfolioHolding>(
      "SELECT portfolio_id, amount FROM portfolio WHERE user_id = ? AND coin_id = ? LIMIT 1",
      [auth.user_id, to_coin_id]
    );

    if (toHolding) {
      const newAmount = Number(toHolding.amount) + receiveAmount;
      await execute("UPDATE portfolio SET amount = ?, updated_at = NOW() WHERE portfolio_id = ?", [newAmount, toHolding.portfolio_id]);
    } else {
      await execute(
        "INSERT INTO portfolio (user_id, coin_id, amount, purchase_price, purchase_date, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())",
        [auth.user_id, to_coin_id.trim(), receiveAmount, toPrice, new Date().toISOString().split("T")[0], "Swapped from " + from_coin_id]
      );
    }

    const holdings = await queryRows<PortfolioHolding>(
      "SELECT portfolio_id, user_id, coin_id, amount, purchase_price, purchase_date, notes, created_at, updated_at FROM portfolio WHERE user_id = ? ORDER BY created_at DESC",
      [auth.user_id]
    );

    return NextResponse.json({ success: true, holdings, receive_amount: receiveAmount }, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
