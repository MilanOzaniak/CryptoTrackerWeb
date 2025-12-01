import { NextRequest, NextResponse } from "next/server";
import { queryRows } from "@/lib/db";
import jwt from "jsonwebtoken";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    try {
        const auth = req.headers.get("authorization");
        if (!auth?.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const token = auth.split(" ")[1];
        let payload: any;
        try {
            payload = jwt.verify(token, process.env.JWT_SECRET ?? "dev-secret");
        } catch (err) {
            return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
        }

       
        const requestedId = req.nextUrl.pathname.split("/").pop();
        if (payload.user_id !== Number(requestedId) && payload.role !== "admin") {
           return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const id = req.nextUrl.pathname.split("/").pop();
        const users = await queryRows(
            "SELECT user_id, email, role, p_language, p_currency, created_at FROM users WHERE user_id = ?",
            [id]
        );
        if (users.length === 0) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }
        return NextResponse.json({ users }, { status: 200 });
    } catch (err) {
        console.error("GET USERS ERROR:", err);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}