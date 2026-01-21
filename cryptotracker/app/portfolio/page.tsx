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

type TransactionPayload = {
  transaction_type: "buy" | "sell" | "swap";
  coin_id: string;
  amount: number;
  price_usd?: number | null;
  notes?: string | null;
  to_coin_id?: string | null;
  to_amount?: number | null;
  to_price_usd?: number | null;
  total_value_usd?: number | null;
};

export default function PortfolioPage() {
  const router = useRouter();
  // const [me, setMe] = useState<MeResponse | null>(null);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userCurrency, setUserCurrency] = useState("usd");
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
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [swapFromHolding, setSwapFromHolding] = useState<Holding | null>(null);
  const [swapToCoinId, setSwapToCoinId] = useState("");
  const [swapAmount, setSwapAmount] = useState("");
  const [swapEstimate, setSwapEstimate] = useState<number | null>(null);
  const [swapError, setSwapError] = useState<string | null>(null);
  const [swapping, setSwapping] = useState(false);
  const [showSellModal, setShowSellModal] = useState(false);
  const [sellHolding, setSellHolding] = useState<Holding | null>(null);
  const [sellAmount, setSellAmount] = useState("");
  const [sellError, setSellError] = useState<string | null>(null);
  const [selling, setSelling] = useState(false);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Load currency from localStorage immediately
  useEffect(() => {
    try {
      const stored = localStorage.getItem("user");
      if (stored) {
        const userData = JSON.parse(stored);
        const code = (userData?.p_currency ?? "USD").toLowerCase();
        setUserCurrency(code);
      }
    } catch {
      setUserCurrency("usd");
    }
  }, []);

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
        const currency = userCurrency || (meData.user?.p_currency || "USD").toLowerCase();
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

  // Refresh prices when currency changes
  useEffect(() => {
    if (!holdings.length || !userCurrency) return;
    
    const refreshPrices = async () => {
      const coinIds = Array.from(new Set(holdings.map(h => h.coin_id)));
      const priceEntries: Array<[string, number]> = [];
      for (const cid of coinIds) {
        try {
          const pr = await fetch(`/api/coins/${cid}/price?vs_currencies=${userCurrency}`);
          if (!pr.ok) continue;
          const pdata = await pr.json();
          const val = pdata?.data?.[userCurrency];
          if (typeof val === "number") {
            priceEntries.push([cid, val]);
          }
        } catch {}
      }
      setPrices(Object.fromEntries(priceEntries));
    };
    
    refreshPrices();
  }, [userCurrency, holdings]);

  const ensurePrice = async (coinId: string): Promise<number | null> => {
    if (!coinId) return null;
    if (prices[coinId] != null) return prices[coinId];
    const currency = userCurrency || "usd";
    try {
      const pr = await fetch(`/api/coins/${coinId}/price?vs_currencies=${currency}`);
      if (!pr.ok) return null;
      const pdata = await pr.json();
      const val = pdata?.data?.[currency];
      if (typeof val === "number") {
        setPrices((prev) => ({ ...prev, [coinId]: val }));
        return val;
      }
    } catch {}
    return null;
  };

  const fetchPrice = async (coinId: string, currency?: string): Promise<number | null> => {
    if (!coinId) return null;
    const curr = currency || userCurrency || "usd";
    try {
      const pr = await fetch(`/api/coins/${coinId}/price?vs_currencies=${curr}`);
      if (!pr.ok) return null;
      const pdata = await pr.json();
      const val = pdata?.data?.[curr];
      if (typeof val === "number") return val;
    } catch {}
    return null;
  };

  const addTransaction = async (payload: TransactionPayload) => {
    try {
      const endpoints = ["/api/transactions", "/api/transactions/addTransaction"];
      for (const url of endpoints) {
        try {
          const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(payload),
          });
          if (res.ok) return;
          const msg = await res.text().catch(() => "");
          console.warn(`Failed to record transaction via ${url}`, msg);
        } catch (innerErr) {
          console.warn(`Error calling ${url}`, innerErr);
        }
      }
    } catch (err) {
      console.warn("Failed to record transaction", err);
    }
  };

  const reloadPortfolio = async () => {
    const portRes = await fetch("/api/portfolio", { credentials: "include", cache: "no-store" });
    if (portRes.ok) {
      const portData = await portRes.json();
      const holdingsList: Holding[] = Array.isArray(portData.holdings) ? portData.holdings : [];
      setHoldings(holdingsList);
      return holdingsList;
    }
    return holdings;
  };

  const handleCoinSelect = async (coinId: string) => {
    setSelectedCoinId(coinId);
    
    // Fetch current price and set it as default purchase price
    const currency = userCurrency || "usd";
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
    const amountNum = parseFloat(formData.amount);
    const noteVal = formData.notes ? formData.notes : null;
    if (!formData.amount || amountNum <= 0) {
      setAddError("Amount must be greater than 0");
      return;
    }

    setAdding(true);
    setAddError(null);

    try {
      const purchasePriceNum = formData.purchase_price ? parseFloat(formData.purchase_price) : null;
      const res = await fetch("/api/portfolio/addCoin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          coin_id: selectedCoinId,
          amount: amountNum,
          purchase_price: purchasePriceNum,
          purchase_date: formData.purchase_date || null,
          notes: noteVal,
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
      const price = await fetchPrice(selectedCoinId);
      await addTransaction({
        transaction_type: "buy",
        coin_id: selectedCoinId,
        amount: amountNum,
        price_usd: price,
        total_value_usd: price != null ? amountNum * price : null,
        notes: noteVal,
      });
      
      // const holdingsList = await reloadPortfolio();
      await reloadPortfolio();
      const currency = userCurrency || "usd";
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
    } catch {
      setAddError("Network error");
    } finally {
      setAdding(false);
    }
  };

  const handleOpenSwap = (holding: Holding) => {
    setSwapFromHolding(holding);
    setSwapToCoinId("");
    setSwapAmount("");
    setSwapEstimate(null);
    setSwapError(null);
    setShowSwapModal(true);
  };

  const handleOpenSell = (holding: Holding) => {
    setSellHolding(holding);
    setSellAmount("");
    setSellError(null);
    setShowSellModal(true);
  };

  const updateSwapEstimate = async (amountStr: string, toCoin?: string) => {
    setSwapEstimate(null);
    if (!swapFromHolding) return;
    const targetCoin = toCoin ?? swapToCoinId;
    const amtNum = parseFloat(amountStr);
    if (!targetCoin || isNaN(amtNum) || amtNum <= 0) return;
    const fromPrice = await ensurePrice(swapFromHolding.coin_id);
    const toPrice = await ensurePrice(targetCoin);
    if (fromPrice == null || toPrice == null || toPrice === 0) return;
    const est = Number(((amtNum * fromPrice) / toPrice).toFixed(6));
    setSwapEstimate(est);
  };

  const handleSwapToSelect = async (coinId: string) => {
    if (swapFromHolding && coinId === swapFromHolding.coin_id) {
      setSwapError("Choose a different coin to swap into");
      setSwapToCoinId("");
      setSwapEstimate(null);
      return;
    }
    setSwapToCoinId(coinId);
    setSwapError(null);
    await updateSwapEstimate(swapAmount, coinId);
  };

  const handleSwapSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!swapFromHolding) return;
    const amountNum = parseFloat(swapAmount);
    const available = parseFloat(swapFromHolding.amount);

    if (!swapToCoinId) {
      setSwapError("Select the coin to receive");
      return;
    }
    if (isNaN(amountNum) || amountNum <= 0) {
      setSwapError("Enter a valid amount to swap");
      return;
    }
    if (amountNum > available) {
      setSwapError("You cannot swap more than you hold");
      return;
    }

    setSwapping(true);
    setSwapError(null);
    try {
      const res = await fetch("/api/portfolio/swap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          from_coin_id: swapFromHolding.coin_id,
          to_coin_id: swapToCoinId,
          amount: amountNum,
          vs_currency: userCurrency || "usd",
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setSwapError(data?.error || "Failed to swap");
        return;
      }

      if (data?.holdings) {
        setHoldings(Array.isArray(data.holdings) ? data.holdings : []);
      } else {
        await reloadPortfolio();
      }

      await ensurePrice(swapFromHolding.coin_id);
      await ensurePrice(swapToCoinId);

      const [fromPrice, toPrice] = await Promise.all([
        fetchPrice(swapFromHolding.coin_id),
        fetchPrice(swapToCoinId),
      ]);
      const receiveAmount = typeof data?.receive_amount === "number" ? data.receive_amount : swapEstimate ?? null;
      const totalValue = fromPrice != null ? amountNum * fromPrice : null;
      await addTransaction({
        transaction_type: "swap",
        coin_id: swapFromHolding.coin_id,
        amount: amountNum,
        price_usd: fromPrice,
        to_coin_id: swapToCoinId,
        to_amount: receiveAmount,
        to_price_usd: toPrice,
        total_value_usd: totalValue,
      });

      setShowSwapModal(false);
      setSwapFromHolding(null);
      setSwapToCoinId("");
      setSwapAmount("");
      setSwapEstimate(null);
    } catch {
      setSwapError("Network error");
    } finally {
      setSwapping(false);
    }
  };

  const handleSellSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sellHolding) return;
    const amountNum = parseFloat(sellAmount);
    const available = parseFloat(sellHolding.amount);

    if (isNaN(amountNum) || amountNum <= 0) {
      setSellError("Enter a valid amount to sell");
      return;
    }
    if (amountNum > available) {
      setSellError("You cannot sell more than you hold");
      return;
    }

    setSelling(true);
    setSellError(null);
    try {
      if (amountNum === available) {
        // delete holding when fully sold
        const res = await fetch("/api/portfolio/deleteCoin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ coin_id: sellHolding.coin_id }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          setSellError(data?.error || "Failed to sell");
          return;
        }
      } else {
        const newAmount = available - amountNum;
        const res = await fetch("/api/portfolio/updateCoin", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ coin_id: sellHolding.coin_id, amount: newAmount }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          setSellError(data?.error || "Failed to sell");
          return;
        }
      }

      const price = await fetchPrice(sellHolding.coin_id);
      await addTransaction({
        transaction_type: "sell",
        coin_id: sellHolding.coin_id,
        amount: amountNum,
        price_usd: price,
        total_value_usd: price != null ? amountNum * price : null,
      });

      await reloadPortfolio();
      setShowSellModal(false);
      setSellHolding(null);
      setSellAmount("");
      setSellError(null);
    } catch {
      setSellError("Network error");
    } finally {
      setSelling(false);
    }
  };

  const rows = useMemo(() => {
    const data = holdings.map((h) => {
      const amountNum = parseFloat(h.amount);
      const currentPrice = prices[h.coin_id] ?? null;
      const value = currentPrice ? amountNum * currentPrice : null;
      const costBasis = h.purchase_price != null ? amountNum * Number(h.purchase_price) : null;
      const pnl = value != null && costBasis != null ? value - costBasis : null;
      const pnlPct = value != null && costBasis != null && costBasis > 0 && pnl != null ? (pnl / costBasis) * 100 : null;
      return { h, amountNum, currentPrice, value, costBasis, pnl, pnlPct };
    });

    if (sortColumn) {
      data.sort((a, b) => {
        let aVal: number | string;
        let bVal: number | string;

        switch (sortColumn) {
          case 'coin':
            aVal = a.h.coin_id;
            bVal = b.h.coin_id;
            break;
          case 'amount':
            aVal = a.amountNum;
            bVal = b.amountNum;
            break;
          case 'purchase_price':
            aVal = a.h.purchase_price ?? -Infinity;
            bVal = b.h.purchase_price ?? -Infinity;
            break;
          case 'current_price':
            aVal = a.currentPrice ?? -Infinity;
            bVal = b.currentPrice ?? -Infinity;
            break;
          case 'value':
            aVal = a.value ?? -Infinity;
            bVal = b.value ?? -Infinity;
            break;
          case 'pnl':
            aVal = a.pnl ?? -Infinity;
            bVal = b.pnl ?? -Infinity;
            break;
          case 'date':
            aVal = a.h.purchase_date ? new Date(a.h.purchase_date).getTime() : -Infinity;
            bVal = b.h.purchase_date ? new Date(b.h.purchase_date).getTime() : -Infinity;
            break;
          default:
            return 0;
        }

        if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return data;
  }, [holdings, prices, sortColumn, sortDirection]);

  const totals = useMemo(() => {
    const totalValue = rows.reduce((sum, r) => sum + (r.value ?? 0), 0);
    const totalCost = rows.reduce((sum, r) => sum + (r.costBasis ?? 0), 0);
    const totalPnl = totalValue - totalCost;
    const totalPnlPct = totalCost > 0 ? (totalPnl / totalCost) * 100 : null;
    return { totalValue, totalCost, totalPnl, totalPnlPct };
  }, [rows]);

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  const SortIcon = ({ column }: { column: string }) => {
    if (sortColumn !== column) {
      return (
        <svg className="w-4 h-4 opacity-0 group-hover:opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }
    return sortDirection === 'asc' ? (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header Skeleton */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex-1">
              <div className="h-10 bg-gray-800 rounded animate-pulse mb-4 w-1/3"></div>
              <div className="h-4 bg-gray-800 rounded animate-pulse w-1/4"></div>
            </div>
            <div className="h-10 bg-gray-800 rounded animate-pulse w-32"></div>
          </div>

          {/* Stats Grid Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-lg p-6 border border-gray-800 shadow-lg">
                <div className="h-3 bg-gray-700 rounded animate-pulse mb-3 w-1/2"></div>
                <div className="h-6 bg-gray-700 rounded animate-pulse mb-2 w-2/3"></div>
              </div>
            ))}
          </div>

          {/* Table Skeleton */}
          <div className="bg-gray-900 rounded-lg border border-gray-800 shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-800/50 border-b border-gray-700">
                  <tr>
                    <th className="px-6 py-4">
                      <div className="h-3 bg-gray-700 rounded animate-pulse w-12"></div>
                    </th>
                    <th className="px-6 py-4">
                      <div className="h-3 bg-gray-700 rounded animate-pulse w-16"></div>
                    </th>
                    <th className="px-6 py-4">
                      <div className="h-3 bg-gray-700 rounded animate-pulse w-20 ml-auto"></div>
                    </th>
                    <th className="px-6 py-4">
                      <div className="h-3 bg-gray-700 rounded animate-pulse w-20 ml-auto"></div>
                    </th>
                    <th className="px-6 py-4">
                      <div className="h-3 bg-gray-700 rounded animate-pulse w-16 ml-auto"></div>
                    </th>
                    <th className="px-6 py-4">
                      <div className="h-3 bg-gray-700 rounded animate-pulse w-16 ml-auto"></div>
                    </th>
                    <th className="px-6 py-4">
                      <div className="h-3 bg-gray-700 rounded animate-pulse w-12 ml-auto"></div>
                    </th>
                    <th className="px-6 py-4">
                      <div className="h-3 bg-gray-700 rounded animate-pulse w-12"></div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {[...Array(8)].map((_, i) => (
                    <tr key={i}>
                      <td className="px-6 py-4">
                        <div className="h-4 bg-gray-800 rounded animate-pulse w-20"></div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 bg-gray-800 rounded animate-pulse w-24"></div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 bg-gray-800 rounded animate-pulse w-20 ml-auto"></div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 bg-gray-800 rounded animate-pulse w-20 ml-auto"></div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 bg-gray-800 rounded animate-pulse w-24 ml-auto"></div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 bg-gray-800 rounded animate-pulse w-24 ml-auto"></div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 bg-gray-800 rounded animate-pulse w-20 ml-auto"></div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 bg-gray-800 rounded animate-pulse w-24"></div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
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

  const currency = userCurrency.toUpperCase();

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
                  <th onClick={() => handleSort('coin')} className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-700/50 transition group">
                    <div className="flex items-center gap-2">
                      Coin
                      <SortIcon column="coin" />
                    </div>
                  </th>
                  <th onClick={() => handleSort('amount')} className="px-6 py-4 text-right text-xs font-semibold text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-700/50 transition group">
                    <div className="flex items-center justify-end gap-2">
                      Amount
                      <SortIcon column="amount" />
                    </div>
                  </th>
                  <th onClick={() => handleSort('purchase_price')} className="px-6 py-4 text-right text-xs font-semibold text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-700/50 transition group">
                    <div className="flex items-center justify-end gap-2">
                      Purchase Price
                      <SortIcon column="purchase_price" />
                    </div>
                  </th>
                  <th onClick={() => handleSort('current_price')} className="px-6 py-4 text-right text-xs font-semibold text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-700/50 transition group">
                    <div className="flex items-center justify-end gap-2">
                      Current Price
                      <SortIcon column="current_price" />
                    </div>
                  </th>
                  <th onClick={() => handleSort('value')} className="px-6 py-4 text-right text-xs font-semibold text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-700/50 transition group">
                    <div className="flex items-center justify-end gap-2">
                      Value
                      <SortIcon column="value" />
                    </div>
                  </th>
                  <th onClick={() => handleSort('pnl')} className="px-6 py-4 text-right text-xs font-semibold text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-700/50 transition group">
                    <div className="flex items-center justify-end gap-2">
                      P/L
                      <SortIcon column="pnl" />
                    </div>
                  </th>
                  <th onClick={() => handleSort('date')} className="px-6 py-4 text-right text-xs font-semibold text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-700/50 transition group">
                    <div className="flex items-center justify-end gap-2">
                      Date
                      <SortIcon column="date" />
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Notes</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {rows.map(({ h, amountNum, currentPrice, value, pnl, pnlPct }) => (
                  <tr key={h.portfolio_id} className="hover:bg-gray-800/50 transition">
                    <td className="px-6 py-4 text-sm font-medium capitalize">{h.coin_id.replace(/-/g, " ")}</td>
                    <td className="px-6 py-4 text-sm text-right font-mono">{amountNum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 })}</td>
                    <td className="px-6 py-4 text-sm text-right font-mono">{h.purchase_price != null ? Number(h.purchase_price).toLocaleString(undefined, { style: "currency", currency }) : "-"}</td>
                    <td className="px-6 py-4 text-sm text-right font-mono">{currentPrice != null ? currentPrice.toLocaleString(undefined, { style: "currency", currency }) : "-"}</td>
                    <td className="px-6 py-4 text-sm text-right font-mono font-semibold">{value != null ? value.toLocaleString(undefined, { style: "currency", currency }) : "-"}</td>
                    <td className={`px-6 py-4 text-sm text-right font-mono font-semibold ${pnl != null ? (pnl >= 0 ? "text-green-400" : "text-red-400") : "text-gray-400"}`}>{pnl != null ? `${pnl.toLocaleString(undefined, { style: "currency", currency })}${pnlPct != null ? ` (${pnlPct.toFixed(2)}%)` : ""}` : "-"}</td>
                    <td className="px-6 py-4 text-sm text-right text-gray-400">{h.purchase_date ? new Date(h.purchase_date).toLocaleDateString() : "-"}</td>
                    <td className="px-6 py-4 text-sm text-gray-400">{h.notes || ""}</td>
                    <td className="px-6 py-4 text-sm text-left">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleOpenSwap(h)}
                          className="px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white text-sm font-semibold transition shadow-md shadow-blue-900/40"
                        >
                          Swap
                        </button>
                        <button
                          onClick={() => handleOpenSell(h)}
                          className="px-3 py-2 bg-amber-600 hover:bg-amber-700 rounded-lg text-white text-sm font-semibold transition shadow-md shadow-amber-900/40"
                        >
                          Sell
                        </button>
                      </div>
                    </td>
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

        {/* Swap Modal */}
        {showSwapModal && swapFromHolding && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl border border-gray-700 shadow-2xl w-full max-w-xl animate-in fade-in zoom-in duration-200">
              <div className="p-6 border-b border-gray-700 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">Swap Coins</h2>
                  <p className="text-gray-400 text-sm mt-1">Swap from {swapFromHolding.coin_id.replace(/-/g, " ")} (holdings: {parseFloat(swapFromHolding.amount).toLocaleString()})</p>
                </div>
                <button
                  onClick={() => {
                    setShowSwapModal(false);
                    setSwapFromHolding(null);
                    setSwapToCoinId("");
                    setSwapAmount("");
                    setSwapEstimate(null);
                    setSwapError(null);
                  }}
                  className="text-gray-400 hover:text-white transition"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSwapSubmit} className="p-6 space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">Amount to swap</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={swapAmount}
                      onChange={async (e) => {
                        setSwapAmount(e.target.value);
                        await updateSwapEstimate(e.target.value);
                      }}
                      className="w-full px-4 py-2.5 bg-gray-800 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                      placeholder="0.00"
                    />
                    <span className="text-gray-400 text-sm whitespace-nowrap">Avail: {parseFloat(swapFromHolding.amount).toLocaleString()}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">Receive coin</label>
                  <SearchBar onCoinSelect={handleSwapToSelect} />
                  {swapToCoinId && (
                    <div className="mt-2 px-3 py-2 bg-blue-500/10 border border-blue-500/30 rounded-lg text-sm text-blue-300 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="capitalize font-medium">{swapToCoinId.replace(/-/g, " ")}</span>
                    </div>
                  )}
                </div>

                {swapEstimate != null && swapToCoinId && (
                  <div className="px-4 py-3 bg-green-500/10 border border-green-500/30 rounded-lg text-sm text-green-300">
                    Estimated receive: <span className="font-semibold">{swapEstimate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 })} {swapToCoinId.replace(/-/g, " ")}</span> at current prices
                  </div>
                )}

                {swapError && (
                  <div className="px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400 flex items-center gap-2">
                    <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    {swapError}
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={swapping}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-700 disabled:to-gray-700 disabled:cursor-not-allowed text-white px-4 py-2.5 rounded-lg font-semibold shadow-lg disabled:shadow-none transition-all flex items-center justify-center gap-2"
                  >
                    {swapping ? (
                      <>
                        <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Swapping...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582a10 10 0 0115.356-2.145l-1.464 1.464A8 8 0 006.582 9H11V4H4zm16 16v-5h-.582a10 10 0 00-15.356 2.145l1.464 1.464A8 8 0 0117.418 15H13v5h7z" />
                        </svg>
                        Swap now
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowSwapModal(false);
                      setSwapFromHolding(null);
                      setSwapToCoinId("");
                      setSwapAmount("");
                      setSwapEstimate(null);
                      setSwapError(null);
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

        {/* Sell Modal */}
        {showSellModal && sellHolding && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl border border-gray-700 shadow-2xl w-full max-w-lg animate-in fade-in zoom-in duration-200">
              <div className="p-6 border-b border-gray-700 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">Sell Holdings</h2>
                  <p className="text-gray-400 text-sm mt-1">{sellHolding.coin_id.replace(/-/g, " ")} • Avail: {parseFloat(sellHolding.amount).toLocaleString()}</p>
                </div>
                <button
                  onClick={() => {
                    setShowSellModal(false);
                    setSellHolding(null);
                    setSellAmount("");
                    setSellError(null);
                  }}
                  className="text-gray-400 hover:text-white transition"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSellSubmit} className="p-6 space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">Amount to sell</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={sellAmount}
                      onChange={(e) => setSellAmount(e.target.value)}
                      className="w-full px-4 py-2.5 bg-gray-800 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition"
                      placeholder="0.00"
                    />
                    <button
                      type="button"
                      onClick={() => setSellAmount(sellHolding.amount)}
                      className="px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-semibold transition whitespace-nowrap"
                    >
                      Sell All
                    </button>
                  </div>
                  <p className="text-gray-400 text-xs mt-1">Available: {parseFloat(sellHolding.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 })}</p>
                </div>

                {sellError && (
                  <div className="px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400 flex items-center gap-2">
                    <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    {sellError}
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={selling}
                    className="flex-1 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 disabled:from-gray-700 disabled:to-gray-700 disabled:cursor-not-allowed text-white px-4 py-2.5 rounded-lg font-semibold shadow-lg disabled:shadow-none transition-all flex items-center justify-center gap-2"
                  >
                    {selling ? (
                      <>
                        <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Selling...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-3-3" />
                        </svg>
                        Sell now
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowSellModal(false);
                      setSellHolding(null);
                      setSellAmount("");
                      setSellError(null);
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                      className="w-full min-w-0 px-4 py-2.5 bg-gray-800 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
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
                      className="w-full min-w-0 px-4 py-2.5 bg-gray-800 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
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
                    className="w-full min-w-0 px-4 py-2.5 bg-gray-800 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
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
                    className="w-full min-w-0 px-4 py-2.5 bg-gray-800 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition resize-none"
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
