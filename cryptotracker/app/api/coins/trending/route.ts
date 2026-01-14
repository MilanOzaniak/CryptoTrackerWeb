import { NextRequest, NextResponse } from "next/server";
import { getTrendingCoins } from "@/lib/coingecko";

export async function GET(request: NextRequest) {
  try {
    const trending = await getTrendingCoins();
    
    return NextResponse.json({
      success: true,
      data: trending,
    });
  } catch (error) {
    console.error("Error fetching trending coins:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch trending coins",
      },
      { status: 500 }
    );
  }
}
