import Link from "next/link";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-gray-900 border-t border-gray-800 text-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">
              ₿
            </div>
            <div>
              <p className="text-white font-semibold">CryptoTracker</p>
              <p className="text-sm text-gray-400">Live prices, portfolio a watchlist na jednom mieste.</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-sm font-medium">

          </div>
        </div>

        <div className="mt-6 text-xs text-gray-500 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <p>© {year} CryptoTracker. Všetky práva vyhradené.</p>
          <p className="text-gray-400">Aktualizované v reálnom čase z vašich API zdrojov.</p>
        </div>
      </div>
    </footer>
  );
}
