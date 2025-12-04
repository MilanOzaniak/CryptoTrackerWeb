import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { execute } from "@/lib/db";

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
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

        if (payload.role !== "admin") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const userId = Number(params.id);
        if (!userId || isNaN(userId)) {
            return NextResponse.json({ error: "Invalid id" }, { status: 400 });
        }

        if (payload.user_id === userId) {
            return NextResponse.json({ error: "Cant delete your own account" }, { status: 400 });
        }

        await execute("DELETE FROM users WHERE user_id = ?", [userId]);
        
        return NextResponse.json({ message: "User deleted", userId }, { status: 200 });
    } catch (err) {
        return NextResponse.json({ error: "server error" }, { status: 500 });
    }
}