"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface CoinDetails {
  id: string;
  symbol: string;
  name: string;
  description: {
    en: string;
  };
  image: {
    thumb: string;
    small: string;
    large: string;
  };
  market_data: {
    current_price: Record<string, number>;
    market_cap: Record<string, number>;
    total_volume: Record<string, number>;
    high_24h: Record<string, number>;
    low_24h: Record<string, number>;
    price_change_24h: number;
    price_change_percentage_24h: number;
    price_change_percentage_7d: number;
    price_change_percentage_30d: number;
    market_cap_rank: number;
    circulating_supply: number;
    total_supply: number;
    max_supply: number | null;
  };
}

export default function CoinPage({ params }: { params: Promise<{ id: string }> }) {
  const [coinId, setCoinId] = useState<string>("");
  const [coin, setCoin] = useState<CoinDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [currency, setCurrency] = useState("usd");
  const [addingToWatchlist, setAddingToWatchlist] = useState(false);
  const [watchlistMessage, setWatchlistMessage] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch("/api/auth/me", {
          credentials: "include",
        });
        if (response.ok) {
          const data = await response.json();
          setIsLoggedIn(data.loggedIn === true);
        } else {
          setIsLoggedIn(false);
        }
      } catch (error) {
        console.error("Auth check failed:", error);
        setIsLoggedIn(false);
      }
    };

    checkAuth();
  }, []);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("user");
      if (stored) {
        const userData = JSON.parse(stored);
        const code = (userData?.p_currency ?? "USD").toLowerCase();
        setCurrency(code);
      }
    } catch {
      setCurrency("usd");
    }
  }, []);

  useEffect(() => {
    params.then((p) => setCoinId(p.id));
  }, [params]);

  useEffect(() => {
    if (!coinId) return;

    const fetchCoin = async () => {
      try {
        const res = await fetch(`/api/coins/${coinId}`);
        if (res.ok) {
          const data = await res.json();
          setCoin(data.data);
        }
      } catch (error) {
        console.error("Error fetching coin:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCoin();
  }, [coinId]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
      minimumFractionDigits: price < 1 ? 4 : 2,
    }).format(price);
  };

  const formatNumber = (num: number) => {
    if (num >= 1e12) return `${(num / 1e12).toFixed(2)}T`;
    if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(2)}K`;
    return num.toFixed(2);
  };

  const handleAddToWatchlist = async () => {
    if (!coinId) return;
    
    setAddingToWatchlist(true);
    setWatchlistMessage(null);
    
    try {
      const res = await fetch("/api/watchlist/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coin_id: coinId }),
        credentials: "include",
      });

      const data = await res.json();

      if (res.ok) {
        setWatchlistMessage("✓ Added to watchlist!");
        setTimeout(() => setWatchlistMessage(null), 3000);
      } else {
        setWatchlistMessage(data.error || "Failed to add to watchlist");
      }
    } catch (error) {
      console.error("Error adding to watchlist:", error);
      setWatchlistMessage("Error adding to watchlist");
    } finally {
      setAddingToWatchlist(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-pulse">
          <div className="h-5 w-40 bg-gray-800 rounded mb-6" />

          {/* Header skeleton */}
          <div className="flex items-center gap-4 mb-8">
            <div className="w-16 h-16 rounded-full bg-gray-800" />
            <div className="space-y-2">
              <div className="h-8 w-48 bg-gray-800 rounded" />
              <div className="h-5 w-24 bg-gray-800 rounded" />
            </div>
            <div className="ml-auto bg-gray-900 px-4 py-2 rounded-lg">
              <div className="h-3 w-12 bg-gray-800 rounded mb-2" />
              <div className="h-6 w-16 bg-gray-800 rounded" />
            </div>
          </div>

          {/* Price section skeleton */}
          <div className="bg-gray-900 rounded-lg p-8 border border-gray-800 mb-8">
            <div className="h-4 w-40 bg-gray-800 rounded mb-3" />
            <div className="h-10 w-56 bg-gray-800 rounded mb-3" />
            <div className="h-5 w-40 bg-gray-800 rounded" />
            <div className="flex gap-2 mt-6">
              <div className="h-9 w-16 bg-gray-800 rounded" />
              <div className="h-9 w-16 bg-gray-800 rounded" />
              <div className="h-9 w-16 bg-gray-800 rounded" />
            </div>
          </div>

          {/* Stats grid skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-gray-900 rounded-lg p-6 border border-gray-800">
                <div className="h-4 w-24 bg-gray-800 rounded mb-3" />
                <div className="h-7 w-32 bg-gray-800 rounded" />
              </div>
            ))}
          </div>

          {/* Description skeleton */}
          <div className="bg-gray-900 rounded-lg p-8 border border-gray-800">
            <div className="h-6 w-48 bg-gray-800 rounded mb-4" />
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-4 w-full bg-gray-800 rounded" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!coin) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-white text-2xl mb-4">Coin not found</h1>
          <Link href="/" className="text-blue-400 hover:text-blue-300">
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  const currentPrice = coin.market_data.current_price[currency.toLowerCase()] || 0;
  const marketCap = coin.market_data.market_cap[currency.toLowerCase()] || 0;
  const volume = coin.market_data.total_volume[currency.toLowerCase()] || 0;
  const high24h = coin.market_data.high_24h[currency.toLowerCase()] || 0;
  const low24h = coin.market_data.low_24h[currency.toLowerCase()] || 0;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header Section */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/" className="text-gray-400 hover:text-white mb-6 inline-block">
          ← Back to markets
        </Link>

        {/* Coin Info Header */}
        <div className="flex flex-wrap items-center gap-4 mb-8">
          <img
            src={coin.image.large}
            alt={coin.name}
            className="w-16 h-16 rounded-full"
          />
          <div>
            <h1 className="text-4xl font-bold">{coin.name}</h1>
            <p className="text-gray-400 text-lg">{coin.symbol.toUpperCase()}</p>
          </div>
          {coin.market_data.market_cap_rank && (
            <div className="sm:ml-auto bg-gray-900 px-4 py-2 rounded-lg">
              <div className="text-gray-400 text-sm">Rank</div>
              <div className="text-2xl font-bold">#{coin.market_data.market_cap_rank}</div>
            </div>
          )}
          {isLoggedIn && (
            <button
              onClick={handleAddToWatchlist}
              disabled={addingToWatchlist}
              className="w-full sm:w-auto sm:ml-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
            >
              {addingToWatchlist ? (
                <>
                  <span className="inline-block animate-spin">⏳</span>
                  Adding...
                </>
              ) : (
                <>
                  <span>⭐</span>
                  Add to Watchlist
                </>
              )}
            </button>
          )}
        </div>

        {/* Watchlist Message */}
        {watchlistMessage && (
          <div
            className={`mb-4 p-4 rounded-lg ${
              watchlistMessage.startsWith("✓")
                ? "bg-green-900/50 text-green-200 border border-green-700"
                : "bg-red-900/50 text-red-200 border border-red-700"
            }`}
          >
            {watchlistMessage}
          </div>
        )}

        {/* Price Section */}
        <div className="bg-gray-900 rounded-lg p-8 border border-gray-800 mb-8">
          <div className="text-gray-400 text-sm mb-2">Price ({currency.toUpperCase()})</div>
          <div className="text-5xl font-bold">{formatPrice(currentPrice)}</div>
          <div
            className={`text-lg font-semibold mt-2 ${
              coin.market_data.price_change_24h >= 0 ? "text-green-400" : "text-red-400"
            }`}
          >
            {coin.market_data.price_change_24h >= 0 ? "▲" : "▼"}{" "}
            {Math.abs(coin.market_data.price_change_24h).toFixed(2)}{" "}
            ({coin.market_data.price_change_percentage_24h.toFixed(2)}%)
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
            <div className="text-gray-400 text-sm mb-2">Market Cap</div>
            <div className="text-2xl font-bold">{formatPrice(marketCap)}</div>
          </div>

          <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
            <div className="text-gray-400 text-sm mb-2">24h Volume</div>
            <div className="text-2xl font-bold">{formatPrice(volume)}</div>
          </div>

          <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
            <div className="text-gray-400 text-sm mb-2">24h High</div>
            <div className="text-2xl font-bold">{formatPrice(high24h)}</div>
          </div>

          <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
            <div className="text-gray-400 text-sm mb-2">24h Low</div>
            <div className="text-2xl font-bold">{formatPrice(low24h)}</div>
          </div>

          <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
            <div className="text-gray-400 text-sm mb-2">7d Change</div>
            <div
              className={`text-2xl font-bold ${
                coin.market_data.price_change_percentage_7d >= 0
                  ? "text-green-400"
                  : "text-red-400"
              }`}
            >
              {coin.market_data.price_change_percentage_7d.toFixed(2)}%
            </div>
          </div>

          <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
            <div className="text-gray-400 text-sm mb-2">30d Change</div>
            <div
              className={`text-2xl font-bold ${
                coin.market_data.price_change_percentage_30d >= 0
                  ? "text-green-400"
                  : "text-red-400"
              }`}
            >
              {coin.market_data.price_change_percentage_30d.toFixed(2)}%
            </div>
          </div>

          <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
            <div className="text-gray-400 text-sm mb-2">Circulating Supply</div>
            <div className="text-2xl font-bold">
              {formatNumber(coin.market_data.circulating_supply)} {coin.symbol.toUpperCase()}
            </div>
          </div>

          <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
            <div className="text-gray-400 text-sm mb-2">Total Supply</div>
            <div className="text-2xl font-bold">
              {coin.market_data.total_supply
                ? `${formatNumber(coin.market_data.total_supply)} ${coin.symbol.toUpperCase()}`
                : "Unlimited"}
            </div>
          </div>
        </div>

        {/* Description */}
        {coin.description.en && (
          <div className="bg-gray-900 rounded-lg p-8 border border-gray-800">
            <h2 className="text-2xl font-bold mb-4">About {coin.name}</h2>
            <div
              className="text-gray-300 leading-relaxed"
              dangerouslySetInnerHTML={{
                __html: coin.description.en
                  .replace(/<[^>]*>/g, "")
                  .substring(0, 500),
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
