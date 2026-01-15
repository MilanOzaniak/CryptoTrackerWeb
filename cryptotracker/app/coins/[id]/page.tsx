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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-white text-lg">Loading coin details...</div>
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
        <div className="flex items-center gap-4 mb-8">
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
            <div className="ml-auto bg-gray-900 px-4 py-2 rounded-lg">
              <div className="text-gray-400 text-sm">Rank</div>
              <div className="text-2xl font-bold">#{coin.market_data.market_cap_rank}</div>
            </div>
          )}
        </div>

        {/* Price Section */}
        <div className="bg-gray-900 rounded-lg p-8 border border-gray-800 mb-8">
          <div className="mb-6">
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

          {/* Currency Selector */}
          <div className="flex gap-2">
            {["USD", "EUR", "GBP"].map((curr) => (
              <button
                key={curr}
                onClick={() => setCurrency(curr.toLowerCase())}
                className={`px-4 py-2 rounded ${
                  currency.toUpperCase() === curr
                    ? "bg-blue-600 text-white"
                    : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                }`}
              >
                {curr}
              </button>
            ))}
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
