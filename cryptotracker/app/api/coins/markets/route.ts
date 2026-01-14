import { NextRequest, NextResponse } from "next/server";
import { getCoinsMarkets } from "@/lib/coingecko";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const vsCurrency = searchParams.get("vs_currency") || "usd";
    const perPage = Number(searchParams.get("per_page") || "100");
    const page = Number(searchParams.get("page") || "1");
    const order = searchParams.get("order") || "market_cap_desc";

    const markets = await getCoinsMarkets(vsCurrency, perPage, page, order);
    
    return NextResponse.json({
      success: true,
      data: markets,
    });
  } catch (error) {
    console.error("Error fetching coin markets:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch coin markets",
      },
      { status: 500 }
    );
  }
}
