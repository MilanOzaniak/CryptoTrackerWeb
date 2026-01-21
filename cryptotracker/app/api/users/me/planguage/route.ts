import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { execute } from "@/lib/db";

export async function POST(req: NextRequest) {
	try {
		const body = await req.json().catch(() => ({}));
		const { p_language } = body ?? {};

		if (!p_language || typeof p_language !== "string") {
			return NextResponse.json({ error: "p_language required" }, { status: 400 });
		}

		const normalized = p_language.trim().toLowerCase();
		if (normalized.length === 0 || normalized.length > 8) {
			return NextResponse.json({ error: "invalid language code" }, { status: 400 });
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

		await execute("UPDATE users SET p_language = ? WHERE user_id = ?", [normalized, userId]);

		return NextResponse.json({ message: "Preferred language updated", p_language: normalized }, { status: 200 });
	} catch (err) {
		return NextResponse.json({ error: "server error" }, { status: 500 });
	}
}
