# eToro & Gemini AI Trading Bot - AI Coding Agent Instructions

## Project Overview

Google Apps Script automation that acts as a bridge between the eToro API and Google's Gemini AI. The script fetches market data and current portfolio status from eToro, passes it to Gemini for analysis via a structured prompt, and logs/executes decisions autonomously.

**Tech Stack:** Google Apps Script (JavaScript), eToro API (Virtual/Demo), Google AI Studio API (Gemini)
**Development & Deployment:** Local development in VS Code. Use `./deploy.sh` to deploy changes (this script handles `clasp push` to Apps Script and automatically commits/pushes to the GitHub repository).
**IntelliSense:** TypeScript definitions from `@types/google-apps-script` provide autocomplete for `UrlFetchApp`, `PropertiesService`, `Logger`, etc.
**Current Phase:** Functional PoC — autonomous demo trading via Gemini AI.

## Financial Context (CRITICAL FOR AI LOGIC)

The user is running an **experimental swing-trading bot** in a Demo/Virtual environment. The bot should act as an **autonomous swing-trader**, actively analyzing market volatility, multi-day trends, and price action to execute trades and capture larger swings (aiming for 5–10% profit margins to overcome broker spreads).

**Current Portfolio & Strategy:**

- **Experimental Scope:** The bot has full autonomy to make buy/sell decisions. The primary goal is to trade high-volatility assets (Tech stocks, Leveraged ETFs, Crypto) to capture multi-day price swings. The previous day-trading strategy was abandoned due to eToro's high spreads consuming intraday profits.
- **Existing Assets (for context):** TSLA, NVDA, AMD, AAPL, META, TQQQ, BTC, ETH. The bot actively trades these high-volatility instruments for short-term momentum plays.
- **Funding:** The bot will operate using the "Available Cash" inside the eToro virtual account to find swing trade opportunities and compound gains over multi-day holds.

## Architecture & Data Flow

1. **Triggering (Apps Script):**
    - Time-driven trigger (cron job) configured in Apps Script UI to run the `main()` function every $N$ hours/minutes.
    - `main()` first calls `isMarketOpen()` — if US markets are closed (weekends or outside 09:30–16:00 ET), execution is skipped gracefully.

2. **Data Fetching (eToro Public API):**
    - **Base URL:** `https://public-api.etoro.com`
    - Uses `UrlFetchApp.fetch()` to communicate with eToro.
    - **Authentication headers (all three required on every request):**
        - `x-api-key` — Public API key (from eToro developer portal).
        - `x-user-key` — User-specific key (generated in eToro Settings > Trading > API Key Management).
        - `x-request-id` — A unique UUID per request (generated via `Utilities.getUuid()`).
    - **CRITICAL RULE:** Must use eToro's **Demo API endpoints** (paths containing `/demo/`) exclusively to prevent accidental real-money trades during development. The `ACCOUNT_MODE` script property controls this (`DEMO` or `REAL`).

    **Key Endpoints Used:**
    | Purpose | Method | Endpoint |
    |---|---|---|
    | Search instruments (resolve ticker → ID) | `GET` | `/api/v1/market-data/search?internalSymbolFull={SYMBOL}` |
    | Real-time market rates | `GET` | `/api/v1/market-data/instruments/rates?instrumentIds={IDS}` |
    | Historical OHLCV candles | `GET` | `/api/v1/market-data/instruments/{id}/history/candles/{dir}/{interval}/{count}` |
    | Portfolio & P&L | `GET` | `/api/v1/trading/info/{mode}pnl` (mode = `demo/` or empty) |
    | Open position (by amount) | `POST` | `/api/v1/trading/execution/{mode}market-open-orders/by-amount` |
    | Close position | `POST` | `/api/v1/trading/execution/{mode}market-close-orders/positions/{positionId}` |

3. **Analysis (Gemini API):**
    - Collects market rates, 20 daily historical candles, and full portfolio state from eToro.
    - Constructs a structured prompt and sends it to `generativelanguage.googleapis.com` (Google AI Studio, Gemini 3.5 Flash-Lite).
    - Uses `responseMimeType: 'application/json'` to enforce strict JSON output.
    - Asks Gemini to evaluate swing-trading conditions and return a JSON response with autonomous decisions: `{"analysis": "...", "actions": [{"type": "BUY", "symbol": "AAPL", "instrumentId": 123, "amount": 50, "stopLossRate": 115, "takeProfitRate": 135, "reason": "..."}]}`.
    - **Capital Rule:** Gemini is instructed to never invest more than 10% of available cash in a single BUY trade.
    - **Risk Management:** Every BUY action must include `stopLossRate` and `takeProfitRate` for automated risk management.

4. **Execution / Logging:**
    - Parses Gemini's JSON response and executes each action via eToro's trading endpoints (demo or real based on `ACCOUNT_MODE`).
    - All steps, decisions, and errors are logged via `console.log/warn/error()` for review in the Apps Script Executions panel.

## Security & Configuration Management

**Never hardcode** API keys or sensitive IDs. Use Apps Script `PropertiesService`.

**Required Script Properties:**

| Property         | Description                                        |
| ---------------- | -------------------------------------------------- |
| `ETORO_API_KEY`  | eToro Public API key                               |
| `ETORO_USER_KEY` | eToro User key (from Settings > Trading)           |
| `GEMINI_API_KEY` | Google AI Studio (Gemini) API key                  |
| `WATCHLIST`      | Comma-separated ticker symbols (e.g. `TSLA,NVDA`)  |
| `ACCOUNT_MODE`   | `DEMO` or `REAL` — controls trading endpoint paths |

```javascript
const scriptProperties = PropertiesService.getScriptProperties()
const eToroApiKey = scriptProperties.getProperty('ETORO_API_KEY')
const eToroUserKey = scriptProperties.getProperty('ETORO_USER_KEY')
const geminiApiKey = scriptProperties.getProperty('GEMINI_API_KEY')
const watchlist = scriptProperties.getProperty('WATCHLIST')
const accountMode = scriptProperties.getProperty('ACCOUNT_MODE')

if (!eToroApiKey || !eToroUserKey || !geminiApiKey || !watchlist || !accountMode) {
    throw new Error('Required script properties are missing.')
}
```

## File Structure

| File           | Responsibility                                                                                                                                        |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Config.js`    | Constants (`ETORO_BASE_URL`, `GEMINI_BASE_URL`, `WATCHLIST`, `ACCOUNT_MODE`), `getScriptProperty`, `getEtoroHeaders`, `etoroFetch`, `isMarketOpen`    |
| `EtoroApi.js`  | eToro API functions: `searchInstrument`, `getInstrumentId`, `getMarketRates`, `getHistoricalCandles`, `getPortfolio`, `openPosition`, `closePosition` |
| `GeminiApi.js` | Gemini AI functions: `askGemini`, `buildGeminiPrompt`                                                                                                 |
| `Code.js`      | Main entry point: `main()`, `executeDecision()`, and `test*()` functions                                                                              |

All files share a single global scope in Google Apps Script — no imports needed between them.

## Key Functions Reference

| Function                 | Description                                                                                 |
| ------------------------ | ------------------------------------------------------------------------------------------- |
| `main()`                 | Main entry point — checks market hours, then: fetch data → Gemini analysis → execute trades |
| `executeDecision()`      | Parses Gemini's JSON response and executes BUY (with SL/TP) / SELL_CLOSE actions            |
| `isMarketOpen()`         | Returns `true` if US markets are open (Mon–Fri 09:30–16:00 ET)                              |
| `testEtoroConnection()`  | Quick connectivity test against eToro search API                                            |
| `testGetPortfolio()`     | Quick test of the portfolio/P&L endpoint                                                    |
| `testGeminiConnection()` | Quick test of Gemini API connectivity                                                       |

## Testing

**Framework:** Custom lightweight test runner (`tests/testUtils.js`) with `describe()`, `it()`, `assert*()` helpers.

**Run tests:**

```bash
npm test
```

**Test files:**

| File                      | Covers                                                                                                                       |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `tests/Config.test.js`    | Constants, `getScriptProperty`, `getEtoroHeaders`, `etoroFetch`, `isMarketOpen`                                              |
| `tests/Validator.test.js` | All validation functions (passing & failing schemas), `normalizePosition` (camelCase, eToro casing, nested PnL)              |
| `tests/EtoroApi.test.js`  | All eToro API functions, endpoint URLs, payloads (incl. SL/TP), DEMO/REAL mode switching                                     |
| `tests/GeminiApi.test.js` | `askGemini`, `buildGeminiPrompt` structure (10% rule, SL/TP format, daily candles), rate/position/candle mapping             |
| `tests/Code.test.js`      | `executeDecision` (all action types, SL/TP passthrough, error handling), `main()` integration (market hours, OneDay candles) |

Tests mock Google Apps Script globals (`UrlFetchApp`, `PropertiesService`, `Utilities`, `Logger`) and load source files via `eval()` into the global scope to match Apps Script's runtime behavior.
