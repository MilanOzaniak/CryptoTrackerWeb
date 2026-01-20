"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

interface CoinMarket {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  total_volume: number;
  high_24h: number;
  low_24h: number;
  price_change_24h: number;
  price_change_percentage_24h: number;
  price_change_percentage_7d_in_currency?: number;
}

interface TrendingCoin {
  item: {
    id: string;
    name: string;
    symbol: string;
    thumb: string;
  };
}

interface WatchlistItem {
  watchlist_id: number;
  user_id: number;
  coin_id: string;
  added_at: string;
  notes?: string;
  target_price?: number;
}

interface WatchlistCoinData {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  price_change_percentage_24h: number;
}

export default function Home() {
  const [coins, setCoins] = useState<CoinMarket[]>([]);
  const [trending, setTrending] = useState<TrendingCoin[]>([]);
  const [trendingPrices, setTrendingPrices] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [watchlistData, setWatchlistData] = useState<Record<string, WatchlistCoinData>>({});
  const [watchlistLoading, setWatchlistLoading] = useState(false);
  const [totalMarketCap, setTotalMarketCap] = useState<number>(0);
  const [marketCapChange, setMarketCapChange] = useState<number>(0);
  const [totalVolume, setTotalVolume] = useState<number>(0);
  const [preferredCurrency, setPreferredCurrency] = useState<string>("USD");
  const [currencySymbol, setCurrencySymbol] = useState<string>("$");
  const [showGainers, setShowGainers] = useState<boolean>(true);

  function computeCurrencySymbol(code: string) {
    try {
      const formatted = (0).toLocaleString("en-US", { style: "currency", currency: code });
      return formatted.replace(/[0-9.,\s]/g, "");
    } catch {
      return "$";
    }
  }

  useEffect(() => {
    const updateCurrency = () => {
      try {
        const stored = localStorage.getItem("user");
        if (stored) {
          const userData = JSON.parse(stored);
          const code = (userData?.p_currency ?? "USD").toUpperCase();
          setPreferredCurrency(code);
          setCurrencySymbol(computeCurrencySymbol(code));
        } else {
          const code = "USD";
          setPreferredCurrency(code);
          setCurrencySymbol(computeCurrencySymbol(code));
        }
      } catch {
        const code = "USD";
        setPreferredCurrency(code);
        setCurrencySymbol(computeCurrencySymbol(code));
      }
    };

    updateCurrency();

    // Update currency when tab becomes visible (user returns from profile)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        updateCurrency();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", updateCurrency);
    
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", updateCurrency);
    };
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const coinsRes = await fetch(`/api/coins/markets?vs_currency=${preferredCurrency.toLowerCase()}&per_page=100&page=1`);
        if (coinsRes.ok) {
          const coinsData = await coinsRes.json();
          setCoins(coinsData.data || []);

          let totalMarketCapValue = 0;
          let totalVolumeValue = 0;
          coinsData.data?.forEach((coin: CoinMarket) => {
            if (coin.market_cap) totalMarketCapValue += coin.market_cap;
            if (coin.total_volume) totalVolumeValue += coin.total_volume;
          });
          setTotalMarketCap(totalMarketCapValue);
          setTotalVolume(totalVolumeValue);
          setMarketCapChange(3.2);
        }

        const trendingRes = await fetch("/api/coins/trending");
        if (trendingRes.ok) {
          const trendingData = await trendingRes.json();
          setTrending(trendingData.data?.coins || []);
        }

        // Fetch watchlist
        const watchlistRes = await fetch("/api/watchlist", {
          credentials: "include",
        });
        console.log("[Watchlist] Response status:", watchlistRes.status);
        if (watchlistRes.ok) {
          const watchlistData = await watchlistRes.json();
          console.log("[Watchlist] Received data:", watchlistData);
          console.log("[Watchlist] Setting watchlist items:", watchlistData.items);
          setWatchlist(watchlistData.items || []);
        } else {
          console.error("[Watchlist] Error:", await watchlistRes.text());
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [preferredCurrency]);

  useEffect(() => {
    const ids = trending.slice(0, 3).map((c) => c.item.id);
    if (!ids.length) {
      setTrendingPrices({});
      return;
    }
    (async () => {
      try {
        const results = await Promise.all(
          ids.map(async (id) => {
            try {
              const res = await fetch(
                `/api/coins/${id}/price?vs_currencies=${preferredCurrency.toLowerCase()}`
              );
              if (!res.ok) return { id, price: undefined };
              const data = await res.json();
              const price = data?.data?.[preferredCurrency.toLowerCase()];
              return { id, price: typeof price === "number" ? price : undefined };
            } catch {
              return { id, price: undefined };
            }
          })
        );
        const map: Record<string, number> = {};
        results.forEach((r) => {
          if (r.price !== undefined) map[r.id] = r.price as number;
        });
        setTrendingPrices(map);
      } catch {
        setTrendingPrices({});
      }
    })();
  }, [trending, preferredCurrency]);

  useEffect(() => {
    if (!watchlist.length) {
      setWatchlistData({});
      return;
    }
    
    (async () => {
      setWatchlistLoading(true);
      try {
        
        const results = await Promise.all(
          watchlist.map(async (item) => {
            try {
              const res = await fetch(`/api/coins/${item.coin_id}`);
              if (!res.ok) {
                console.error(`[Watchlist Data] Failed to fetch ${item.coin_id}:`, res.status);
                return null;
              }
              const data = await res.json();
              
              const coinData = data.data;
              if (!coinData) return null;
              
              return {
                id: coinData.id,
                symbol: coinData.symbol,
                name: coinData.name,
                image: coinData.image?.large || coinData.image?.small || coinData.image?.thumb,
                current_price: coinData.market_data?.current_price?.[preferredCurrency.toLowerCase()] || 0,
                price_change_percentage_24h: coinData.market_data?.price_change_percentage_24h || 0,
              };
            } catch (error) {
              console.error(`[Watchlist Data] Error fetching ${item.coin_id}:`, error);
              return null;
            }
          })
        );
        
        const map: Record<string, WatchlistCoinData> = {};
        results.forEach((coinData) => {
          if (coinData) {
            map[coinData.id] = coinData;
          }
        });
        
        setWatchlistData(map);
      } catch (error) {
        console.error("Error fetching watchlist data:", error);
      } finally {
        setWatchlistLoading(false);
      }
    })();
  }, [watchlist, preferredCurrency]);

  const topGainers = [...coins]
    .sort((a, b) => (b.price_change_percentage_24h || 0) - (a.price_change_percentage_24h || 0))
    .slice(0, 3);

  const topLosers = [...coins]
    .sort((a, b) => (a.price_change_percentage_24h || 0) - (b.price_change_percentage_24h || 0))
    .slice(0, 3);

  const displayedCoins = showGainers ? topGainers : topLosers;

  const formatLargeNumber = (num: number) => {
    if (num >= 1e12) return `${currencySymbol}${(num / 1e12).toFixed(2)}T`;
    if (num >= 1e9) return `${currencySymbol}${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `${currencySymbol}${(num / 1e6).toFixed(2)}M`;
    try {
      return new Intl.NumberFormat("en-US", { style: "currency", currency: preferredCurrency }).format(num);
    } catch {
      return `${currencySymbol}${num.toLocaleString()}`;
    }
  };

  const formatPrice = (price: number) => {
    try {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: preferredCurrency,
        minimumFractionDigits: price < 1 ? 4 : 2,
      }).format(price);
    } catch {
      return `${currencySymbol}${price.toFixed(price < 1 ? 4 : 2)}`;
    }
  };

  const handleRemoveFromWatchlist = async (watchlistId: number) => {
    try {
      const res = await fetch(`/api/watchlist/${watchlistId}`, {
        method: "DELETE",
        credentials: "include",
      });
      
      if (res.ok) {
        setWatchlist((prev) => prev.filter((item) => item.watchlist_id !== watchlistId));
      }
    } catch (error) {
      console.error("Error removing from watchlist:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header Skeleton */}
          <div className="mb-8">
            <div className="h-10 bg-gray-800 rounded animate-pulse mb-4 w-1/2"></div>
            <div className="h-6 bg-gray-800 rounded animate-pulse w-3/4"></div>
          </div>

          {/* Stats Grid Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
              <div className="h-4 bg-gray-800 rounded animate-pulse mb-3 w-1/3"></div>
              <div className="h-8 bg-gray-800 rounded animate-pulse mb-3 w-1/2"></div>
              <div className="h-4 bg-gray-800 rounded animate-pulse w-1/4"></div>
            </div>
            <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
              <div className="h-4 bg-gray-800 rounded animate-pulse mb-3 w-1/3"></div>
              <div className="h-8 bg-gray-800 rounded animate-pulse mb-3 w-1/2"></div>
              <div className="h-4 bg-gray-800 rounded animate-pulse w-1/4"></div>
            </div>
          </div>

          {/* Trending & Top Gainers Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            {/* Trending Skeleton */}
            <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
              <div className="h-6 bg-gray-800 rounded animate-pulse mb-4 w-1/3"></div>
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-3">
                    <div className="w-8 h-8 bg-gray-800 rounded-full animate-pulse"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-gray-800 rounded animate-pulse mb-2 w-1/2"></div>
                      <div className="h-3 bg-gray-800 rounded animate-pulse w-1/3"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Gainers Skeleton */}
            <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
              <div className="h-6 bg-gray-800 rounded animate-pulse mb-4 w-1/3"></div>
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center justify-between p-3">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-8 h-8 bg-gray-800 rounded-full animate-pulse"></div>
                      <div className="flex-1">
                        <div className="h-4 bg-gray-800 rounded animate-pulse mb-2 w-1/2"></div>
                        <div className="h-3 bg-gray-800 rounded animate-pulse w-1/3"></div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="h-4 bg-gray-800 rounded animate-pulse mb-2 w-20"></div>
                      <div className="h-3 bg-gray-800 rounded animate-pulse w-16"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Table Skeleton */}
          <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-800">
              <div className="h-6 bg-gray-800 rounded animate-pulse w-1/4"></div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-800 border-b border-gray-700">
                  <tr>
                    <th className="px-6 py-3">
                      <div className="h-4 bg-gray-700 rounded animate-pulse w-8"></div>
                    </th>
                    <th className="px-6 py-3">
                      <div className="h-4 bg-gray-700 rounded animate-pulse w-20"></div>
                    </th>
                    <th className="px-6 py-3">
                      <div className="h-4 bg-gray-700 rounded animate-pulse w-16 ml-auto"></div>
                    </th>
                    <th className="px-6 py-3">
                      <div className="h-4 bg-gray-700 rounded animate-pulse w-12 ml-auto"></div>
                    </th>
                    <th className="px-6 py-3">
                      <div className="h-4 bg-gray-700 rounded animate-pulse w-12 ml-auto"></div>
                    </th>
                    <th className="px-6 py-3 hidden lg:table-cell">
                      <div className="h-4 bg-gray-700 rounded animate-pulse w-20 ml-auto"></div>
                    </th>
                    <th className="px-6 py-3 hidden lg:table-cell">
                      <div className="h-4 bg-gray-700 rounded animate-pulse w-20 ml-auto"></div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {[...Array(10)].map((_, i) => (
                    <tr key={i}>
                      <td className="px-6 py-4">
                        <div className="h-4 bg-gray-800 rounded animate-pulse w-8"></div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 bg-gray-800 rounded-full animate-pulse"></div>
                          <div className="flex-1">
                            <div className="h-4 bg-gray-800 rounded animate-pulse mb-2 w-20"></div>
                            <div className="h-3 bg-gray-800 rounded animate-pulse w-16"></div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 bg-gray-800 rounded animate-pulse w-20 ml-auto"></div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 bg-gray-800 rounded animate-pulse w-12 ml-auto"></div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 bg-gray-800 rounded animate-pulse w-12 ml-auto"></div>
                      </td>
                      <td className="px-6 py-4 hidden lg:table-cell">
                        <div className="h-4 bg-gray-800 rounded animate-pulse w-20 ml-auto"></div>
                      </td>
                      <td className="px-6 py-4 hidden lg:table-cell">
                        <div className="h-4 bg-gray-800 rounded animate-pulse w-20 ml-auto"></div>
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

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Cryptocurrency Prices by Market Cap</h1>
          <p className="text-gray-400">
            The global cryptocurrency market cap today is{" "}
            <span className="font-semibold">{formatLargeNumber(totalMarketCap)}</span>, a{" "}
            <span className="text-green-400">▲ {marketCapChange}% change</span> in the last 24 hours.
          </p>
        </div>

        {/* Market Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
            <div className="text-gray-400 text-sm mb-2">Market Cap</div>
            <div className="text-3xl font-bold mb-2">{formatLargeNumber(totalMarketCap)}</div>
            <div className="text-green-400 text-sm font-medium">▲ {marketCapChange}%</div>
          </div>
          <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
            <div className="text-gray-400 text-sm mb-2">24h Trading Volume</div>
            <div className="text-3xl font-bold">{formatLargeNumber(totalVolume)}</div>
          </div>
        </div>

        {/* Watchlist */}
        <div className="bg-gray-900 rounded-lg p-6 border border-gray-800 mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              ⭐ My Watchlist ({watchlist.length} items)
            </h2>
          </div>
          {watchlist.length === 0 ? (
            <div className="text-gray-400 text-center py-4">
              No coins in watchlist. Add coins from coin detail pages.
            </div>
          ) : watchlistLoading ? (
            <div className="text-gray-400 text-center py-4">Loading...</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {watchlist.map((item) => {
                const coinData = watchlistData[item.coin_id];
                console.log(`[Watchlist UI] Item ${item.coin_id}:`, coinData ? "has data" : "NO DATA");
                if (!coinData) {
                  return (
                    <div key={item.watchlist_id} className="bg-gray-800 rounded-lg p-4 border border-red-700">
                      <div className="text-red-400">No data for {item.coin_id}</div>
                    </div>
                  );
                }
                
                return (
                  <div
                    key={item.watchlist_id}
                    className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-gray-600 transition relative group"
                  >
                    <button
                      onClick={() => handleRemoveFromWatchlist(item.watchlist_id)}
                      className="absolute top-2 right-2 text-gray-400 hover:text-red-400 opacity-0 group-hover:opacity-100 transition"
                      title="Remove from watchlist"
                    >
                      ✕
                    </button>
                    <Link href={`/coins/${item.coin_id}`}>
                      <div className="flex items-center gap-3 mb-3">
                        <img
                          src={coinData.image}
                          alt={coinData.name}
                          className="w-10 h-10 rounded-full"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{coinData.name}</div>
                          <div className="text-gray-400 text-sm">
                            {coinData.symbol.toUpperCase()}
                          </div>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-lg font-bold">
                          {formatPrice(coinData.current_price)}
                        </div>
                        <div
                          className={`text-sm font-semibold ${
                            coinData.price_change_percentage_24h >= 0
                              ? "text-green-400"
                              : "text-red-400"
                          }`}
                        >
                          {coinData.price_change_percentage_24h >= 0 ? "▲" : "▼"}{" "}
                          {Math.abs(coinData.price_change_percentage_24h).toFixed(2)}%
                        </div>
                      </div>
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Trending & Top Gainers */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          {/* Trending */}
          <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                🔥 Trending
              </h2>
            </div>
            <div className="space-y-3">
              {trending.slice(0, 3).map((coin) => (
                <Link
                  key={coin.item.id}
                  href={`/coins/${coin.item.id}`}
                  className="flex items-center gap-3 p-3 rounded hover:bg-gray-800 transition"
                >
                  <img src={coin.item.thumb} alt={coin.item.name} className="w-8 h-8 rounded-full" />
                  <div className="flex-1">
                    <div className="font-medium">{coin.item.name}</div>
                    <div className="text-gray-400 text-sm">{coin.item.symbol.toUpperCase()}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">
                      {trendingPrices[coin.item.id] !== undefined
                        ? formatPrice(trendingPrices[coin.item.id])
                        : "—"}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Top Gainers/Losers */}
          <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                {showGainers ? "📈 Top Gainers" : "📉 Top Losers"}
              </h2>
              <button
                onClick={() => setShowGainers(!showGainers)}
                className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-sm rounded-lg transition flex items-center gap-2"
              >
                {showGainers ? (
                  <>
                    <span>📉</span>
                    <span className="hidden sm:inline">Losers</span>
                  </>
                ) : (
                  <>
                    <span>📈</span>
                    <span className="hidden sm:inline">Gainers</span>
                  </>
                )}
              </button>
            </div>
            <div className="space-y-3">
              {displayedCoins.map((coin) => (
                <Link
                  key={coin.id}
                  href={`/coins/${coin.id}`}
                  className="flex items-center justify-between p-3 rounded hover:bg-gray-800 transition"
                >
                  <div className="flex items-center gap-3">
                    <img src={coin.image} alt={coin.name} className="w-8 h-8 rounded-full" />
                    <div>
                      <div className="font-medium">{coin.name}</div>
                      <div className="text-gray-400 text-sm">{coin.symbol.toUpperCase()}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{formatPrice(coin.current_price)}</div>
                    <div className={`text-sm font-semibold ${
                      (coin.price_change_percentage_24h || 0) >= 0 ? "text-green-400" : "text-red-400"
                    }`}>
                      {(coin.price_change_percentage_24h || 0) >= 0 ? "▲" : "▼"} {Math.abs(coin.price_change_percentage_24h || 0).toFixed(2)}%
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Coins Table */}
        <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-800">
            <h2 className="text-xl font-bold">Top Cryptocurrencies</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-800 border-b border-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">#</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Coin</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase">Price</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase">1h</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase">24h</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase hidden lg:table-cell">24h Volume</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase hidden lg:table-cell">Market Cap</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {coins.slice(0, 20).map((coin) => (
                  <tr key={coin.id} className="hover:bg-gray-800 transition">
                    <td className="px-6 py-4 text-sm font-medium">{coin.market_cap_rank}</td>
                    <td className="px-6 py-4">
                      <Link
                        href={`/coins/${coin.id}`}
                        className="flex items-center gap-3 hover:text-blue-400 transition"
                      >
                        <img src={coin.image} alt={coin.name} className="w-6 h-6 rounded-full" />
                        <div>
                          <div className="font-medium">{coin.name}</div>
                          <div className="text-gray-400 text-xs">{coin.symbol.toUpperCase()}</div>
                        </div>
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-sm text-right font-medium">{formatPrice(coin.current_price)}</td>
                    <td className={`px-6 py-4 text-sm text-right ${coin.price_change_24h >= 0 ? "text-green-400" : "text-red-400"}`}>
                      {coin.price_change_24h >= 0 ? "▲" : "▼"} {Math.abs((coin.price_change_24h || 0) / 100).toFixed(2)}%
                    </td>
                    <td className={`px-6 py-4 text-sm text-right ${coin.price_change_percentage_24h >= 0 ? "text-green-400" : "text-red-400"}`}>
                      {coin.price_change_percentage_24h >= 0 ? "▲" : "▼"} {Math.abs(coin.price_change_percentage_24h || 0).toFixed(2)}%
                    </td>
                    <td className="px-6 py-4 text-sm text-right hidden lg:table-cell">{formatLargeNumber(coin.total_volume)}</td>
                    <td className="px-6 py-4 text-sm text-right hidden lg:table-cell">{formatLargeNumber(coin.market_cap)}</td>
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

const linkButtonStyle: React.CSSProperties = {
  padding: "8px 16px",
  borderRadius: 6,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "transparent",
  color: "#eee",
  cursor: "pointer",
  fontWeight: 600,
};
