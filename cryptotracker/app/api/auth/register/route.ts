import { NextRequest, NextResponse } from "next/server";
import { queryRows, execute } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { email, password, role, p_language, p_currency } = body;

        if (!email || !password) {
            return NextResponse.json({ error: "email and password are required" }, { status: 400 });
        }

        const normalizedEmail = String(email).trim().toLowerCase();

        const existing = await queryRows<{ user_id: number }[]>(
            "SELECT user_id FROM users WHERE email = ?",
            [normalizedEmail]
        );

        if (existing.length > 0) {
            return NextResponse.json({ error: "User with this email already exists" }, { status: 409 });
        }

        const hashed = await bcrypt.hash(String(password), 10);

        const result = await execute(
            "INSERT INTO users (email, password, role, p_language, p_currency) VALUES (?, ?, ?, ?, ?)",
            [normalizedEmail, hashed, role ?? "user", p_language ?? "en", p_currency ?? "USD"]
        );

        const insertedId = typeof result.insertId === "number" ? result.insertId : null;

        return NextResponse.json({ message: "User registered", user_id: insertedId }, { status: 201 });
    } catch (err) {
        console.error("REGISTER ERROR:", err);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}