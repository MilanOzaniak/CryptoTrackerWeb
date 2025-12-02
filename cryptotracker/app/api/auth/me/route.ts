import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json({ loggedIn: false }, { status: 200 });
    }

    const secret = process.env.JWT_SECRET ?? "dev-secret";
    let payload;
    try {
      payload = jwt.verify(token, secret);
    } catch (err) {
      return NextResponse.json({ loggedIn: false }, { status: 200 });
    }

    return NextResponse.json({ loggedIn: true, user: payload }, { status: 200 });
  } catch (err) {
    return NextResponse.json({ loggedIn: false }, { status: 500 });
  }
}
