import { NextRequest, NextResponse } from "next/server";
import { queryRows } from "@/lib/db";
import jwt from "jsonwebtoken";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const tokenFromCookie = req.cookies.get("token")?.value;
    const authHeader = req.headers.get("authorization");
    const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.split(" ")[1] : undefined;
    const token = tokenFromCookie ?? bearerToken;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let payload: jwt.JwtPayload & { user_id?: number; role?: string };
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET ?? "dev-secret") as jwt.JwtPayload & { user_id?: number; role?: string };
    } catch {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    if (payload.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const users = await queryRows(
      "SELECT user_id, email, role, p_language, p_currency, created_at FROM users where role != 'admin'",
    );
    return NextResponse.json({ users }, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}