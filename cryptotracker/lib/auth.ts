import { queryRows } from "@/lib/db";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export type SafeUser = {
  user_id: number;
  email: string;
  role: string;
  p_language: string;
  p_currency: string;
};

export async function authenticateUser(email: string, password: string): Promise<SafeUser | null> {
  const normalized = String(email).trim().toLowerCase();

  const users = await queryRows<{
    user_id: number;
    email: string;
    password: string;
    role: string;
    p_language?: string;
    p_currency?: string;
  }>(
    "SELECT user_id, email, password, role, p_language, p_currency FROM users WHERE email = ?",
    [normalized]
  );

  if (users.length === 0) return null;

  const user = users[0];
  const ok = await bcrypt.compare(String(password), user.password);
  if (!ok) return null;

  return {
    user_id: user.user_id,
    email: user.email,
    role: user.role,
    p_language: user.p_language ?? "en",
    p_currency: user.p_currency ?? "USD",
  };
}

export function signToken(payload: { user_id: number; email: string; role: string }) {
  const secret = process.env.JWT_SECRET ?? "dev-secret";
  return jwt.sign(payload, secret, { expiresIn: "1h" });
}