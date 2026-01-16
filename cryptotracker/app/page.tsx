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

export default function Home() {
  const [coins, setCoins] = useState<CoinMarket[]>([]);
  const [trending, setTrending] = useState<TrendingCoin[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalMarketCap, setTotalMarketCap] = useState<number>(0);
  const [marketCapChange, setMarketCapChange] = useState<number>(0);
  const [totalVolume, setTotalVolume] = useState<number>(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const coinsRes = await fetch("/api/coins/markets?vs_currency=usd&per_page=100&page=1");
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
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const topGainers = [...coins]
    .sort((a, b) => (b.price_change_percentage_24h || 0) - (a.price_change_percentage_24h || 0))
    .slice(0, 3);

  const formatNumber = (num: number) => {
    if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
    if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
    return `$${num.toLocaleString()}`;
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: price < 1 ? 4 : 2,
    }).format(price);
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
            <span className="font-semibold">{formatNumber(totalMarketCap)}</span>, a{" "}
            <span className="text-green-400">▲ {marketCapChange}% change</span> in the last 24 hours.
          </p>
        </div>

        {/* Market Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
            <div className="text-gray-400 text-sm mb-2">Market Cap</div>
            <div className="text-3xl font-bold mb-2">{formatNumber(totalMarketCap)}</div>
            <div className="text-green-400 text-sm font-medium">▲ {marketCapChange}%</div>
          </div>
          <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
            <div className="text-gray-400 text-sm mb-2">24h Trading Volume</div>
            <div className="text-3xl font-bold">{formatNumber(totalVolume)}</div>
          </div>
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
                  <div>
                    <div className="font-medium">{coin.item.name}</div>
                    <div className="text-gray-400 text-sm">{coin.item.symbol.toUpperCase()}</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Top Gainers */}
          <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                📈 Top Gainers
              </h2>
            </div>
            <div className="space-y-3">
              {topGainers.slice(0, 3).map((coin) => (
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
                    <div className="text-green-400 text-sm font-semibold">
                      ▲ {(coin.price_change_percentage_24h || 0).toFixed(2)}%
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
                    <td className="px-6 py-4 text-sm text-right hidden lg:table-cell">{formatNumber(coin.total_volume)}</td>
                    <td className="px-6 py-4 text-sm text-right hidden lg:table-cell">{formatNumber(coin.market_cap)}</td>
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
