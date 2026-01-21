import { NextResponse } from "next/server";
import { getSupportedVsCurrencies } from "@/lib/coingecko";

export async function GET() {
  try {
    const currencies = await getSupportedVsCurrencies();
    
    return NextResponse.json({
      success: true,
      data: currencies,
    });
  } catch (error) {
    console.error("Error fetching supported currencies:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch supported currencies",
      },
      { status: 500 }
    );
  }
}
