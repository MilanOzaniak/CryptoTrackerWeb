# CryptoTrackerWeb

Aplikácia na sledovanie a správu kryptomenového portfólia postavená na Next.js. Umožňuje používateľom spravovať, sledovať a vymieňať svoje kryptomeny s reálnymi cenami.

## Vlastnosti

- **Autentifikácia používateľov**: Bezpečné prihlasovanie a registrácia s JWT tokenmi
- **Správa portfólia**: Pridávanie, prezeranie a spravovanie kryptografických holdinov
- **Výmena kryptomien**: Výmena jednej kryptomeny za inú v rámci vášho portfólia
- **História transakcií**: Sledovanie všetkých nákupov, predajov a výmen
- **Viacjazyčná podpora**: Angličtina, Slovenčina
- **Podpora viacerých mien**: USD, EUR
- **Správcovský panel**: Správa používateľov a administrácia systému
- **Reálne ceny**: Integrácia s API pre ceny kryptomien

## Požiadavky

- Node.js 18+ a npm/yarn
- MySQL 8.0+
- Git

## Inštalácia

### 1. Klonovanie repozitára

```bash
git clone https://github.com/vasepouzivatel/CryptoTrackerWeb.git
cd CryptoTrackerWeb/cryptotracker
```

### 2. Inštalácia závislostí

```bash
npm install
# alebo
yarn install
# alebo
pnpm install
```

### 3. Konfigurácia premenných prostredia

Vytvorte súbor `.env` v koreňovom adresári projektu:

```env
# Databáza
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=vase_heslo
DB_NAME=cryptotracker

# JWT
JWT_SECRET=vasa_super_tajne_jwt_kluc

# CoinGecko API
CG_API_KEY=coingecko_api_kluc
```

### 4. Nastavenie databázy

Vytvorte databázu a tabuľky:

```sql
CREATE DATABASE cryptotracker;
USE cryptotracker;

-- Tabuľka používateľov
CREATE TABLE users (
  user_id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('user', 'admin') DEFAULT 'user',
  p_language VARCHAR(10) DEFAULT 'en',
  p_currency VARCHAR(10) DEFAULT 'USD',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tabuľka portfólia
CREATE TABLE portfolio (
  portfolio_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  coin_id VARCHAR(50) NOT NULL,
  amount DECIMAL(20, 8) NOT NULL,
  purchase_price DECIMAL(20, 8),
  purchase_date DATE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_user_coin (user_id, coin_id)
);

-- Tabuľka transakcií
CREATE TABLE transactions (
  transaction_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('buy', 'sell', 'swap')),
  coin_id VARCHAR(50),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_created_at (created_at),
  INDEX idx_type (transaction_type)
);

-- Tabuľka watchlist
CREATE TABLE watchlist (
  watchlist_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  coin_id VARCHAR(50) NOT NULL,
  added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  notes TEXT,
  target_price DECIMAL(20, 8),
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_coin (user_id, coin_id),
  INDEX idx_user_id (user_id)
);
```

### 5. Spustenie vývojového servera

```bash
npm run dev
# alebo
yarn dev
# alebo
pnpm dev
```

Otvorte [http://localhost:3000](http://localhost:3000) v prehliadači.

## Štruktúra projektu

```
cryptotracker/
├── app/
│   ├── api/              # API trasy (autentifikácia, portfólio, transakcie, atď.)
│   ├── portfolio/        # Stránka portfólia
│   ├── profile/          # Profil a nastavenia
│   └── page.tsx          # Domovská stránka
├── components/           # Znovupoužiteľné React komponenty
├── lib/                  # Užitočné funkcie (pripojenie DB, autentifikácia)
├── .env                  # Premenné prostredia (nie sú v git)
└── package.json
```

## Používanie

### Registrácia a prihlásenie

1. Prejdite na domovskú stránku a kliknite na "Registrácia"
2. Zadajte e-mail a heslo
3. Prihláste sa s vašimi údajmi

### Pridanie kryptomeny do portfólia

1. Prejdite na stránku **Portfólio**
2. Kliknite na "Pridať holding"
3. Zadajte symbol meny (napr. BTC, ETH), množstvo a nákupnú cenu
4. Odošlite

### Výmena kryptomien

1. Prejdite na stránku **Portfólio**
2. Kliknite na "Vymeniť" na ľubovoľnom holdingu
3. Vyberte cieľovú kryptomenu a množstvo na výmenu
4. Potvrďte výmenu

### Prezeranie histórie transakcií

1. Prejdite na stránku **Transakcie**
2. Zobrazte všetky nákupy, predaje a výmeny s časovými pečiatkami

### Zmena nastavení

1. Prejdite na stránku **Profil**
2. Kliknite na **Zmeniť jazyk** a vyberte preferovaný jazyk
3. Kliknite na **Zmeniť menu** a nastavte preferovanú menu
4. Správcovia môžu spravovať ostatných používateľov

## API Endpointy

### Autentifikácia
- `POST /api/auth/register` - Registrácia nového používateľa
- `POST /api/auth/login` - Prihlásenie používateľa
- `POST /api/auth/logout` - Odhlásenie používateľa

### Portfólio
- `GET /api/portfolio` - Získanie holdinov používateľa
- `POST /api/portfolio` - Pridanie nového holdingu
- `PUT /api/portfolio/:id` - Aktualizácia holdingu
- `DELETE /api/portfolio/:id` - Zmazanie holdingu
- `POST /api/portfolio/swap` - Výmena kryptomien

### Transakcie
- `GET /api/transactions` - Získanie histórie transakcií
- `POST /api/transactions` - Zaznamenanie novej transakcie

### Profil používateľa
- `GET /api/users/me` - Získanie informácií o aktuálnom používateľovi
- `POST /api/users/me/password` - Zmena hesla
- `POST /api/users/me/planguage` - Zmena preferovaného jazyka
- `POST /api/users/me/currency` - Zmena preferovanej meny

### Správa
- `GET /api/admin/users` - Zoznam všetkých používateľov (len správca)
- `PUT /api/admin/users/:id` - Deaktivovanie používateľa (len správca)
- `DELETE /api/admin/users/:id` - Zmazanie používateľa (len správca)

## Použité technológie

- **Next.js 15** - React framework
- **TypeScript** - Typová bezpečnosť
- **MySQL** - Databáza
- **JWT** - Autentifikácia
- **Tailwind CSS** - Štylizácia
- **bcryptjs** - Hashovanie hesiel



---

**Šťastné sledovanie! 🚀**
