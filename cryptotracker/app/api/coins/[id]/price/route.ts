import { NextRequest, NextResponse } from "next/server";
import { getSimplePrice } from "@/lib/coingecko";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const vsCurrenciesParam = searchParams.get("vs_currencies") || "usd";
    
    const vsCurrencies = vsCurrenciesParam.split(",").map(curr => curr.trim());
    const prices = await getSimplePrice([id], vsCurrencies);
    
    return NextResponse.json({
      success: true,
      data: prices[id] || null,
    });
  } catch (error) {
    console.error("Error fetching coin price:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch coin price",
      },
      { status: 500 }
    );
  }
}
