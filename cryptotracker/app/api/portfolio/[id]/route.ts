import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { queryRows, execute, PortfolioHolding } from "@/lib/db";

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

// GET /api/portfolio/[id] -> fetch single holding (owner or admin)
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	try {
		const token = getToken(req);
		const auth = verifyToken(token);
		if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

		const { id: idParam } = await params;
		const id = Number(idParam);
		if (!id || isNaN(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

		const rows = await queryRows<PortfolioHolding>(
			"SELECT portfolio_id, user_id, coin_id, amount, purchase_price, purchase_date, notes, created_at, updated_at FROM portfolio WHERE portfolio_id = ?",
			[id]
		);
		if (rows.length === 0) return NextResponse.json({ error: "not found" }, { status: 404 });
		const holding = rows[0];
		if (holding.user_id !== auth.user_id && auth.role !== "admin") {
			return NextResponse.json({ error: "Forbidden" }, { status: 403 });
		}
		return NextResponse.json({ holding }, { status: 200 });
	} catch (err) {
		return NextResponse.json({ error: "server error" }, { status: 500 });
	}
}

// PUT /api/portfolio/[id] -> update holding (owner or admin)
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	try {
		const token = getToken(req);
		const auth = verifyToken(token);
		if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

		const { id: idParam } = await params;
		const id = Number(idParam);
		if (!id || isNaN(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

		const rows = await queryRows<PortfolioHolding>(
			"SELECT portfolio_id, user_id FROM portfolio WHERE portfolio_id = ?",
			[id]
		);
		if (rows.length === 0) return NextResponse.json({ error: "not found" }, { status: 404 });
		const holding = rows[0];
		if (holding.user_id !== auth.user_id && auth.role !== "admin") {
			return NextResponse.json({ error: "Forbidden" }, { status: 403 });
		}

		const body = await req.json().catch(() => ({}));
		const { coin_id, amount, purchase_price, purchase_date, notes } = body ?? {};

		const fields: string[] = [];
		const values: any[] = [];

		if (coin_id && typeof coin_id === "string") {
			fields.push("coin_id = ?");
			values.push(coin_id.trim());
		}
		if (amount !== undefined) {
			const amtNum = Number(amount);
			if (isNaN(amtNum) || amtNum <= 0) return NextResponse.json({ error: "amount must be positive" }, { status: 400 });
			fields.push("amount = ?");
			values.push(amtNum);
		}
		if (purchase_price !== undefined) {
			const priceNum = purchase_price === null ? null : Number(purchase_price);
			if (priceNum !== null && (isNaN(priceNum) || priceNum < 0)) return NextResponse.json({ error: "invalid purchase_price" }, { status: 400 });
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

		const sql = `UPDATE portfolio SET ${fields.join(", ")}, updated_at = NOW() WHERE portfolio_id = ?`;
		values.push(id);
		await execute(sql, values);

		const updated = await queryRows<PortfolioHolding>(
			"SELECT portfolio_id, user_id, coin_id, amount, purchase_price, purchase_date, notes, created_at, updated_at FROM portfolio WHERE portfolio_id = ?",
			[id]
		);

		return NextResponse.json({ updated: updated[0] ?? null }, { status: 200 });
	} catch (err) {
		return NextResponse.json({ error: "server error" }, { status: 500 });
	}
}

// DELETE /api/portfolio/[id] -> delete holding (owner or admin)
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	try {
		const token = getToken(req);
		const auth = verifyToken(token);
		if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

		const { id: idParam } = await params;
		const id = Number(idParam);
		if (!id || isNaN(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

		const rows = await queryRows<PortfolioHolding>(
			"SELECT portfolio_id, user_id FROM portfolio WHERE portfolio_id = ?",
			[id]
		);
		if (rows.length === 0) return NextResponse.json({ error: "not found" }, { status: 404 });
		const holding = rows[0];
		if (holding.user_id !== auth.user_id && auth.role !== "admin") {
			return NextResponse.json({ error: "Forbidden" }, { status: 403 });
		}

		await execute("DELETE FROM portfolio WHERE portfolio_id = ?", [id]);
		return NextResponse.json({ deleted: true, portfolio_id: id }, { status: 200 });
	} catch (err) {
		return NextResponse.json({ error: "server error" }, { status: 500 });
	}
}

