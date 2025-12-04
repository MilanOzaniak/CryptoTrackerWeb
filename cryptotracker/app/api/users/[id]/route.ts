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

    let payload: any;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET ?? "dev-secret");
    } catch (err) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const requestedId = Number(req.nextUrl.pathname.split("/").pop());
    if (isNaN(requestedId)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    if (payload.user_id !== requestedId && payload.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const users = await queryRows(
      "SELECT user_id, email, role, p_language, p_currency, created_at FROM users WHERE user_id = ?",
      [requestedId]
    );
    if (users.length === 0) {
      return NextResponse.json({ error: "user not found" }, { status: 404 });
    }
    return NextResponse.json({ user: users[0] }, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}