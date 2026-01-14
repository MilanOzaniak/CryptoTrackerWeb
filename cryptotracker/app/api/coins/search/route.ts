import { NextRequest, NextResponse } from "next/server";
import { searchCoins } from "@/lib/coingecko";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("query");

    if (!query) {
      return NextResponse.json(
        {
          success: false,
          error: "Query parameter is required",
        },
        { status: 400 }
      );
    }

    const results = await searchCoins(query);
    
    return NextResponse.json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error("Error searching coins:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to search coins",
      },
      { status: 500 }
    );
  }
}
