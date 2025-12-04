import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { execute } from "@/lib/db";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
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

    const requestedUserId = Number(params.id);
    if (!requestedUserId || isNaN(requestedUserId)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const currentUserId = Number(payload?.user_id);
    if (!currentUserId || isNaN(currentUserId)) {
      return NextResponse.json({ error: "Invalid token" }, { status: 400 });
    }

    const isAdmin = payload.role === "admin";
    const isOwnAccount = currentUserId === requestedUserId;

    if (!isAdmin && !isOwnAccount) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (isAdmin && isOwnAccount) {
      return NextResponse.json({ error: "admin cant disable own account" }, { status: 400 });
    }

    await execute("UPDATE users SET active = FALSE WHERE user_id = ?", [requestedUserId]);

    const res = NextResponse.json({ message: "Account disabled", userId: requestedUserId }, { status: 200 });
    
    return res;
  } catch (err) {
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}