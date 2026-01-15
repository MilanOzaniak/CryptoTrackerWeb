"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Holding = {
  portfolio_id: number;
  user_id: number;
  coin_id: string;
  amount: string; // comes as string from DB
  purchase_price: number | null;
  purchase_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type MeResponse = {
  loggedIn: boolean;
  user?: {
    user_id: number;
    email: string;
    role: string;
    p_language?: string;
    p_currency?: string;
  };
};

export default function PortfolioPage() {
  const router = useRouter();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch auth + portfolio
  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const meRes = await fetch("/api/auth/me", { credentials: "include", cache: "no-store" });
        if (meRes.status === 401) {
          router.push("/login");
          return;
        }
        const meData: MeResponse = await meRes.json();
        if (!meData.loggedIn) {
          router.push("/login");
          return;
        }
        setMe(meData);

        const portRes = await fetch("/api/portfolio", { credentials: "include", cache: "no-store" });
        if (!portRes.ok) {
          const d = await portRes.json().catch(() => null);
          setError(d?.error || `Failed to load portfolio (${portRes.status})`);
          return;
        }
        const portData = await portRes.json();
        const holdingsList: Holding[] = Array.isArray(portData.holdings) ? portData.holdings : [];
        setHoldings(holdingsList);

        // Fetch prices for unique coins
        const currency = (meData.user?.p_currency || "USD").toLowerCase();
        const coinIds = Array.from(new Set(holdingsList.map(h => h.coin_id)));
        const priceEntries: Array<[string, number]> = [];
        for (const cid of coinIds) {
          try {
            const pr = await fetch(`/api/coins/${cid}/price?vs_currencies=${currency}`);
            if (!pr.ok) continue;
            const pdata = await pr.json();
            const val = pdata?.data?.[currency];
            if (typeof val === "number") {
              priceEntries.push([cid, val]);
            }
          } catch {}
        }
        setPrices(Object.fromEntries(priceEntries));
      } catch (err) {
        setError("Network error");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [router]);

  const rows = useMemo(() => {
    return holdings.map((h) => {
      const amountNum = parseFloat(h.amount);
      const currentPrice = prices[h.coin_id] ?? null;
      const value = currentPrice ? amountNum * currentPrice : null;
      const costBasis = h.purchase_price != null ? amountNum * Number(h.purchase_price) : null;
      const pnl = value != null && costBasis != null ? value - costBasis : null;
      const pnlPct = value != null && costBasis != null && costBasis > 0 && pnl != null ? (pnl / costBasis) * 100 : null;
      return { h, amountNum, currentPrice, value, costBasis, pnl, pnlPct };
    });
  }, [holdings, prices]);

  const totals = useMemo(() => {
    const totalValue = rows.reduce((sum, r) => sum + (r.value ?? 0), 0);
    const totalCost = rows.reduce((sum, r) => sum + (r.costBasis ?? 0), 0);
    const totalPnl = totalValue - totalCost;
    const totalPnlPct = totalCost > 0 ? (totalPnl / totalCost) * 100 : null;
    return { totalValue, totalCost, totalPnl, totalPnlPct };
  }, [rows]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-white">Loading portfolio...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-red-400">{error}</div>
      </div>
    );
  }

  const currency = (me?.user?.p_currency || "USD").toUpperCase();

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="bg-gray-900 rounded-lg p-8 border border-gray-800 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Portfolio</h1>
              <p className="text-gray-400 mt-1">Currency: {currency}</p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-400">Total Value</div>
              <div className="text-2xl font-bold">{totals.totalValue.toLocaleString(undefined, { style: "currency", currency })}</div>
              <div className="text-sm text-gray-400">Cost Basis: {totals.totalCost.toLocaleString(undefined, { style: "currency", currency })}</div>
              <div className={"text-sm " + (totals.totalPnl >= 0 ? "text-green-400" : "text-red-400")}>PnL: {totals.totalPnl.toLocaleString(undefined, { style: "currency", currency })}{totals.totalPnlPct != null ? ` (${totals.totalPnlPct.toFixed(2)}%)` : ""}</div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-800 border-b border-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Coin</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-300 uppercase">Amount</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-300 uppercase">Purchase Price</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-300 uppercase">Current Price</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-300 uppercase">Value</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-300 uppercase">P/L</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-300 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {rows.map(({ h, amountNum, currentPrice, value, costBasis, pnl, pnlPct }) => (
                  <tr key={h.portfolio_id} className="hover:bg-gray-800 transition">
                    <td className="px-4 py-3 text-sm capitalize">{h.coin_id.replace(/-/g, " ")}</td>
                    <td className="px-4 py-3 text-sm text-right">{amountNum.toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm text-right">{h.purchase_price != null ? Number(h.purchase_price).toLocaleString(undefined, { style: "currency", currency }) : "-"}</td>
                    <td className="px-4 py-3 text-sm text-right">{currentPrice != null ? currentPrice.toLocaleString(undefined, { style: "currency", currency }) : "-"}</td>
                    <td className="px-4 py-3 text-sm text-right">{value != null ? value.toLocaleString(undefined, { style: "currency", currency }) : "-"}</td>
                    <td className={`px-4 py-3 text-sm text-right ${pnl != null ? (pnl >= 0 ? "text-green-400" : "text-red-400") : "text-gray-400"}`}>{pnl != null ? `${pnl.toLocaleString(undefined, { style: "currency", currency })}${pnlPct != null ? ` (${pnlPct.toFixed(2)}%)` : ""}` : "-"}</td>
                    <td className="px-4 py-3 text-sm text-right">{h.purchase_date ? new Date(h.purchase_date).toLocaleDateString() : "-"}</td>
                    <td className="px-4 py-3 text-sm">{h.notes || ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {rows.length === 0 && (
            <div className="text-gray-400 text-center py-6">No holdings yet.</div>
          )}
        </div>
      </div>
    </div>
  );
}
