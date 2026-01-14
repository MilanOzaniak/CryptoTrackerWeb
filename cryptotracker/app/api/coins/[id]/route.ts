import { NextRequest, NextResponse } from "next/server";
import { getCoinDetails } from "@/lib/coingecko";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const coinDetails = await getCoinDetails(id);
    
    return NextResponse.json({
      success: true,
      data: coinDetails,
    });
  } catch (error) {
    console.error("Error fetching coin details:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch coin details",
      },
      { status: 500 }
    );
  }
}
