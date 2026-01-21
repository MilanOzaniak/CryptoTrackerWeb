const CG_API_BASE = "https://api.coingecko.com/api/v3";
const CG_API_KEY = process.env.CG_API_KEY || "";

interface CoinGeckoRequestOptions {
  params?: Record<string, string | number | boolean>;
}

async function coinGeckoRequest<T>(
  endpoint: string,
  options?: CoinGeckoRequestOptions
): Promise<T> {
  const url = new URL(`${CG_API_BASE}${endpoint}`);
  
  
  if (CG_API_KEY) {
    url.searchParams.append("x_cg_demo_api_key", CG_API_KEY);
  }
  
  
  if (options?.params) {
    Object.entries(options.params).forEach(([key, value]) => {
      url.searchParams.append(key, String(value));
    });
  }

  const response = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
    },
    next: { revalidate: 60 },
  });

  if (!response.ok) {
    throw new Error(`CoinGecko API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

export interface Coin {
  id: string;
  symbol: string;
  name: string;
  image?: string;
}

export interface CoinMarketData {
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
  circulating_supply: number;
  total_supply: number;
  max_supply: number | null;
  ath: number;
  ath_change_percentage: number;
  ath_date: string;
  atl: number;
  atl_change_percentage: number;
  atl_date: string;
  last_updated: string;
}

export interface CoinDetails {
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

export interface SearchResult {
  coins: Array<{
    id: string;
    name: string;
    symbol: string;
    market_cap_rank: number;
    thumb: string;
    large: string;
  }>;
}

export interface SimplePriceData {
  [coinId: string]: {
    [currency: string]: number;
    [key: `${string}_24h_change`]: number;
    [key: `${string}_market_cap`]: number;
    [key: `${string}_24h_vol`]: number;
  };
}


export async function getCoinsList(): Promise<Coin[]> {
  return coinGeckoRequest<Coin[]>("/coins/list");
}


export async function getCoinsMarkets(
  vsCurrency: string = "usd",
  perPage: number = 100,
  page: number = 1,
  order: string = "market_cap_desc"
): Promise<CoinMarketData[]> {
  return coinGeckoRequest<CoinMarketData[]>("/coins/markets", {
    params: {
      vs_currency: vsCurrency,
      per_page: perPage,
      page,
      order,
      sparkline: false,
    },
  });
}


export async function getCoinDetails(
  coinId: string,
  localization: boolean = false
): Promise<CoinDetails> {
  return coinGeckoRequest<CoinDetails>(`/coins/${coinId}`, {
    params: {
      localization: localization,
      tickers: false,
      market_data: true,
      community_data: false,
      developer_data: false,
      sparkline: false,
    },
  });
}


export async function searchCoins(query: string): Promise<SearchResult> {
  return coinGeckoRequest<SearchResult>("/search", {
    params: { query },
  });
}


export async function getSimplePrice(
  coinIds: string[],
  vsCurrencies: string[] = ["usd"],
  includeMarketCap: boolean = true,
  include24hrVol: boolean = true,
  include24hrChange: boolean = true
): Promise<SimplePriceData> {
  return coinGeckoRequest<SimplePriceData>("/simple/price", {
    params: {
      ids: coinIds.join(","),
      vs_currencies: vsCurrencies.join(","),
      include_market_cap: includeMarketCap,
      include_24hr_vol: include24hrVol,
      include_24hr_change: include24hrChange,
    },
  });
}


export async function getSupportedVsCurrencies(): Promise<string[]> {
  return coinGeckoRequest<string[]>("/simple/supported_vs_currencies");
}

export interface TrendingCoins {
  coins: Array<{ item: { id: string; name: string; symbol: string; thumb: string } }>;
}

export async function getTrendingCoins(): Promise<TrendingCoins> {
  return coinGeckoRequest<TrendingCoins>("/search/trending");
}
