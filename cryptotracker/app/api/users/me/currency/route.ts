import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { execute } from "@/lib/db";

export async function POST(req: NextRequest) {
	try {
		const body = await req.json().catch(() => ({}));
		const { p_currency } = body ?? {};

		if (!p_currency || typeof p_currency !== "string") {
			return NextResponse.json({ error: "p_currency required" }, { status: 400 });
		}

		const normalized = p_currency.trim().toUpperCase();
		if (normalized.length === 0 || normalized.length > 8) {
			return NextResponse.json({ error: "invalid currency code" }, { status: 400 });
		}

		const tokenFromCookie = req.cookies.get("token")?.value;
		const authHeader = req.headers.get("authorization");
		const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.split(" ")[1] : undefined;
		const token = tokenFromCookie ?? bearerToken;

		if (!token) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		let payload: jwt.JwtPayload & { user_id?: number };
		try {
			payload = jwt.verify(token, process.env.JWT_SECRET ?? "dev-secret") as jwt.JwtPayload & { user_id?: number };
		} catch {
			return NextResponse.json({ error: "Invalid token" }, { status: 401 });
		}

		const userId = Number(payload?.user_id);
		if (!userId || isNaN(userId)) {
			return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
		}

		await execute("UPDATE users SET p_currency = ? WHERE user_id = ?", [normalized, userId]);

		return NextResponse.json({ message: "Preferred currency updated", p_currency: normalized }, { status: 200 });
	} catch (err) {
		return NextResponse.json({ error: "server error" }, { status: 500 });
	}
}
