"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import SearchBar from "../components/SearchBar";

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
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedCoinId, setSelectedCoinId] = useState("");
  const [formData, setFormData] = useState({
    amount: "",
    purchase_price: "",
    purchase_date: new Date().toISOString().split('T')[0],
    notes: "",
  });
  const [addError, setAddError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

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

  const handleCoinSelect = async (coinId: string) => {
    setSelectedCoinId(coinId);
    
    // Fetch current price and set it as default purchase price
    const currency = (me?.user?.p_currency || "USD").toLowerCase();
    try {
      const pr = await fetch(`/api/coins/${coinId}/price?vs_currencies=${currency}`);
      if (pr.ok) {
        const pdata = await pr.json();
        const val = pdata?.data?.[currency];
        if (typeof val === "number") {
          setFormData((prev) => ({ ...prev, purchase_price: val.toString() }));
        }
      }
    } catch {
      // If price fetch fails, just leave the field empty
    }
  };

  const handleAddCoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCoinId) {
      setAddError("Please search and select a coin");
      return;
    }
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      setAddError("Amount must be greater than 0");
      return;
    }

    setAdding(true);
    setAddError(null);

    try {
      const res = await fetch("/api/portfolio/addCoin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          coin_id: selectedCoinId,
          amount: parseFloat(formData.amount),
          purchase_price: formData.purchase_price ? parseFloat(formData.purchase_price) : null,
          purchase_date: formData.purchase_date || null,
          notes: formData.notes || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setAddError(data?.error || "Failed to add coin");
        return;
      }

      // Reset form and reload portfolio
      setShowAddModal(false);
      setSelectedCoinId("");
      setFormData({ amount: "", purchase_price: "", purchase_date: new Date().toISOString().split('T')[0], notes: "" });
      
      // Reload the portfolio
      const portRes = await fetch("/api/portfolio", { credentials: "include", cache: "no-store" });
      if (portRes.ok) {
        const portData = await portRes.json();
        const holdingsList: Holding[] = Array.isArray(portData.holdings) ? portData.holdings : [];
        setHoldings(holdingsList);
        
        // Fetch prices for the new coin if needed
        const currency = (me?.user?.p_currency || "USD").toLowerCase();
        if (selectedCoinId && !prices[selectedCoinId]) {
          try {
            const pr = await fetch(`/api/coins/${selectedCoinId}/price?vs_currencies=${currency}`);
            if (pr.ok) {
              const pdata = await pr.json();
              const val = pdata?.data?.[currency];
              if (typeof val === "number") {
                setPrices((prev) => ({ ...prev, [selectedCoinId]: val }));
              }
            }
          } catch {}
        }
      }
    } catch (err) {
      setAddError("Network error");
    } finally {
      setAdding(false);
    }
  };

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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">Portfolio</h1>
            <p className="text-gray-400 mt-2">Track your crypto investments • {currency}</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-3 rounded-lg font-medium shadow-lg shadow-blue-900/50 transition-all hover:shadow-xl hover:shadow-blue-900/60 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Coin
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-lg p-6 border border-gray-800 shadow-lg">
            <div className="text-sm text-gray-400 mb-1">Total Value</div>
            <div className="text-2xl font-bold text-white">{totals.totalValue.toLocaleString(undefined, { style: "currency", currency })}</div>
          </div>
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-lg p-6 border border-gray-800 shadow-lg">
            <div className="text-sm text-gray-400 mb-1">Cost Basis</div>
            <div className="text-2xl font-bold text-white">{totals.totalCost.toLocaleString(undefined, { style: "currency", currency })}</div>
          </div>
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-lg p-6 border border-gray-800 shadow-lg">
            <div className="text-sm text-gray-400 mb-1">Profit/Loss</div>
            <div className={"text-2xl font-bold " + (totals.totalPnl >= 0 ? "text-green-400" : "text-red-400")}>
              {totals.totalPnl.toLocaleString(undefined, { style: "currency", currency })}
            </div>
          </div>
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-lg p-6 border border-gray-800 shadow-lg">
            <div className="text-sm text-gray-400 mb-1">P/L Percentage</div>
            <div className={"text-2xl font-bold " + (totals.totalPnl >= 0 ? "text-green-400" : "text-red-400")}>
              {totals.totalPnlPct != null ? `${totals.totalPnlPct.toFixed(2)}%` : "N/A"}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-gray-900 rounded-lg border border-gray-800 shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-800/50 border-b border-gray-700">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Coin</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-300 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-300 uppercase tracking-wider">Purchase Price</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-300 uppercase tracking-wider">Current Price</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-300 uppercase tracking-wider">Value</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-300 uppercase tracking-wider">P/L</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-300 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {rows.map(({ h, amountNum, currentPrice, value, costBasis, pnl, pnlPct }) => (
                  <tr key={h.portfolio_id} className="hover:bg-gray-800/50 transition">
                    <td className="px-6 py-4 text-sm font-medium capitalize">{h.coin_id.replace(/-/g, " ")}</td>
                    <td className="px-6 py-4 text-sm text-right font-mono">{amountNum.toLocaleString()}</td>
                    <td className="px-6 py-4 text-sm text-right font-mono">{h.purchase_price != null ? Number(h.purchase_price).toLocaleString(undefined, { style: "currency", currency }) : "-"}</td>
                    <td className="px-6 py-4 text-sm text-right font-mono">{currentPrice != null ? currentPrice.toLocaleString(undefined, { style: "currency", currency }) : "-"}</td>
                    <td className="px-6 py-4 text-sm text-right font-mono font-semibold">{value != null ? value.toLocaleString(undefined, { style: "currency", currency }) : "-"}</td>
                    <td className={`px-6 py-4 text-sm text-right font-mono font-semibold ${pnl != null ? (pnl >= 0 ? "text-green-400" : "text-red-400") : "text-gray-400"}`}>{pnl != null ? `${pnl.toLocaleString(undefined, { style: "currency", currency })}${pnlPct != null ? ` (${pnlPct.toFixed(2)}%)` : ""}` : "-"}</td>
                    <td className="px-6 py-4 text-sm text-right text-gray-400">{h.purchase_date ? new Date(h.purchase_date).toLocaleDateString() : "-"}</td>
                    <td className="px-6 py-4 text-sm text-gray-400">{h.notes || ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {rows.length === 0 && (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <p className="text-gray-400 mt-4 text-lg">No holdings yet</p>
              <p className="text-gray-500 text-sm mt-2">Click the &quot;Add Coin&quot; button to start tracking your portfolio</p>
            </div>
          )}
        </div>

        {/* Add Coin Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl border border-gray-700 shadow-2xl w-full max-w-lg animate-in fade-in zoom-in duration-200">
              <div className="p-6 border-b border-gray-700">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">Add to Portfolio</h2>
                  <button
                    onClick={() => {
                      setShowAddModal(false);
                      setSelectedCoinId("");
                      setFormData({ amount: "", purchase_price: "", purchase_date: new Date().toISOString().split('T')[0], notes: "" });
                      setAddError(null);
                    }}
                    className="text-gray-400 hover:text-white transition"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              <form onSubmit={handleAddCoin} className="p-6 space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">
                    Search for Coin <span className="text-red-400">*</span>
                  </label>
                  <SearchBar onCoinSelect={handleCoinSelect} />
                  {selectedCoinId && (
                    <div className="mt-2 px-3 py-2 bg-green-500/10 border border-green-500/30 rounded-lg text-sm text-green-400 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="capitalize font-medium">{selectedCoinId.replace(/-/g, " ")}</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="amount" className="block text-sm font-semibold text-gray-300 mb-2">
                      Amount <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="number"
                      id="amount"
                      step="any"
                      min="0"
                      required
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      className="w-full px-4 py-2.5 bg-gray-800 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <label htmlFor="purchase_price" className="block text-sm font-semibold text-gray-300 mb-2">
                      Purchase Price
                    </label>
                    <input
                      type="number"
                      id="purchase_price"
                      step="any"
                      min="0"
                      value={formData.purchase_price}
                      onChange={(e) => setFormData({ ...formData, purchase_price: e.target.value })}
                      className="w-full px-4 py-2.5 bg-gray-800 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="purchase_date" className="block text-sm font-semibold text-gray-300 mb-2">
                    Purchase Date
                  </label>
                  <input
                    type="date"
                    id="purchase_date"
                    value={formData.purchase_date}
                    onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-800 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  />
                </div>

                <div>
                  <label htmlFor="notes" className="block text-sm font-semibold text-gray-300 mb-2">
                    Notes
                  </label>
                  <textarea
                    id="notes"
                    rows={3}
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-800 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition resize-none"
                    placeholder="Any notes about this purchase..."
                  />
                </div>

                {addError && (
                  <div className="px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400 flex items-center gap-2">
                    <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    {addError}
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={adding}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-700 disabled:to-gray-700 disabled:cursor-not-allowed text-white px-4 py-2.5 rounded-lg font-semibold shadow-lg disabled:shadow-none transition-all flex items-center justify-center gap-2"
                  >
                    {adding ? (
                      <>
                        <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Adding...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Add to Portfolio
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddModal(false);
                      setSelectedCoinId("");
                      setFormData({ amount: "", purchase_price: "", purchase_date: new Date().toISOString().split('T')[0], notes: "" });
                      setAddError(null);
                    }}
                    className="px-6 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-semibold transition"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
