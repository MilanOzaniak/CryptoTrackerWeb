import { NextResponse } from "next/server";
import { getCoinsList } from "@/lib/coingecko";

export async function GET() {
  try {
    const coins = await getCoinsList();
    
    return NextResponse.json({
      success: true,
      data: coins,
    });
  } catch (error) {
    console.error("Error fetching coins list:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch coins list",
      },
      { status: 500 }
    );
  }
}
