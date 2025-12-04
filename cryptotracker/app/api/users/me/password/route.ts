import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { queryRows, execute } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { currentPassword, newPassword } = body ?? {};

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: "currentPassword and newPassword required" }, { status: 400 });
    }

    if (typeof newPassword !== "string" || newPassword.length < 8) {
      return NextResponse.json({ error: "newPassword must be min 8 characters" }, { status: 400 });
    }

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

    const userId = Number(payload?.user_id);
    if (!userId || isNaN(userId)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const rows = await queryRows<{ password: string }>(
      "SELECT password FROM users WHERE user_id = ?",
      [userId]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: "user not found" }, { status: 404 });
    }

    const hashed = rows[0].password;
    const ok = await bcrypt.compare(String(currentPassword), hashed);
    if (!ok) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 401 });
    }

    // optional: prevent reusing same password
    const samePassword = await bcrypt.compare(String(newPassword), hashed);
    if (samePassword) {
      return NextResponse.json({ error: "New password must be different from current password" }, { status: 400 });
    }

    const newHashed = await bcrypt.hash(String(newPassword), 10);
    await execute("UPDATE users SET password = ? WHERE user_id = ?", [newHashed, userId]);

    return NextResponse.json({ message: "Password updated" }, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}