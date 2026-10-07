# eToro & Gemini AI Trading Bot

An autonomous swing-trading bot built on **Google Apps Script** that connects **eToro's Public API** with **Google Gemini AI**. The bot runs scheduled market analyses, evaluates multi-day price action and portfolio state, and executes risk-managed swing trades autonomously.

---

> [!WARNING]
> **DISCLAIMER & FINANCIAL RISK WARNING**
> This project is for **educational, experimental, and research purposes only**. Algorithmic trading and trading financial instruments carry substantial risk of loss.
>
> - Never trade with money you cannot afford to lose.
> - Always run and evaluate this bot exclusively in **DEMO / Virtual account mode** (`ACCOUNT_MODE=DEMO`).
> - The authors and contributors assume no responsibility or liability for financial losses, missed opportunities, or execution errors resulting from the use of this software.

---

## Architecture Overview

```text
 ┌──────────────────────────────────────────────────────────────┐
 │             Google Apps Script Time-Driven Trigger           │
 └──────────────────────────────┬───────────────────────────────┘
                                │ runs main()
                                ▼
                   ┌───────────────────────────┐
                   │   isMarketOpen() Check    │
                   │ (Mon-Fri 09:30 - 16:00 ET)│
                   └────────────┬──────────────┘
                                │ Open
                                ▼
 ┌──────────────────────────────────────────────────────────────┐
 │                     eToro Public API                         │
 │  • Real-time market rates (Bid/Ask)                          │
 │  • 20 Daily OHLCV candles per asset                          │
 │  • Portfolio state, cash balance, and existing positions     │
 └──────────────────────────────┬───────────────────────────────┘
                                │
                                ▼
 ┌──────────────────────────────────────────────────────────────┐
 │                      Anti-Corruption Layer                   │
 │  • Schema validation on all incoming eToro responses         │
 │  • Position data normalization to strict camelCase           │
 └──────────────────────────────┬───────────────────────────────┘
                                │
                                ▼
 ┌──────────────────────────────────────────────────────────────┐
 │                     Google Gemini AI                         │
 │  • Structured JSON prompt with portfolio & market context     │
 │  • Evaluates multi-day price action & swing opportunities    │
 │  • Outputs structured actions (BUY with SL/TP, SELL_CLOSE)   │
 └──────────────────────────────┬───────────────────────────────┘
                                │
                                ▼
 ┌──────────────────────────────────────────────────────────────┐
 │                      Execution & Alerts                      │
 │  • Executes trades on eToro (DEMO by default)                │
 │  • Enforces 10% maximum capital allocation rule              │
 │  • Sends email alerts on critical errors or warnings         │
 └──────────────────────────────────────────────────────────────┘
```

## Features

- **Autonomous Decision Making**: Uses Google Gemini to analyze market trends, support/resistance, and volatility.
- **Swing-Trading Focus**: Designed for multi-day holding periods (targeting 5%–10% profit margins) to overcome broker spreads.
- **Built-in Risk Management**:
  - Mandatory **Stop-Loss** and **Take-Profit** rates on every BUY action.
  - Strict capital allocation limit: never invests more than 10% of available cash into any single trade.
- **Anti-Corruption Layer**: Fail-fast validation validates all third-party payloads before processing.
- **Market Hours Guard**: Automatically skips execution when US markets are closed (weekends and outside 09:30–16:00 ET).
- **Incident Notifications**: Automatically sends email alerts to the script owner on execution errors or API warnings using Apps Script's `MailApp`.
- **Zero-Cloud Hosting Costs**: Runs entirely inside Google Apps Script's serverless environment.
- **100% Locally Testable**: 215+ unit tests mocking Apps Script globals (`UrlFetchApp`, `PropertiesService`, `Logger`) via Node.js.

---

## Prerequisites

1. **Google Account** (to host and run Google Apps Script).
2. **eToro Account & API Keys**:
   - Register on the [eToro Developer Portal](https://api-portal.etoro.com/).
   - Obtain your Public API Key (`ETORO_API_KEY`) and User Key (`ETORO_USER_KEY`).
3. **Google AI Studio API Key**:
   - Obtain a Gemini API key from [Google AI Studio](https://aistudio.google.com/).
4. **Node.js** (v18 or higher) and npm installed locally.
5. **Google Clasp CLI**:
   ```bash
   npm install -g @google/clasp
   ```

---

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/andreshg112/etoro-trading.git
cd etoro-trading
npm install
```

### 2. Authenticate Google Clasp

Log in to your Google account from the terminal:

```bash
clasp login
```

Make sure Google Apps Script API is enabled in your Google account settings: [Apps Script User Settings](https://script.google.com/home/usersettings).

### 3. Create or Link Your Apps Script Project

**Option A: Create a new project**
```bash
clasp create --type standalone --title "eToro Gemini AI Bot"
```
This automatically generates your local `.clasp.json`.

**Option B: Link an existing Apps Script project**
Copy the sample config:
```bash
cp .clasp.json.example .clasp.json
```
Edit `.clasp.json` and replace `YOUR_APPS_SCRIPT_ID` with your project's script ID (found in Project Settings in the Apps Script editor).

### 4. Push Code to Apps Script

```bash
clasp push
```

### 5. Configure Script Properties

Open your Apps Script project in the browser:
```bash
clasp open
```

Navigate to **Project Settings** (gear icon) > **Script Properties**, and add the following keys:

| Property | Description | Example |
|---|---|---|
| `ETORO_API_KEY` | eToro Public API Key | `your-etoro-api-key` |
| `ETORO_USER_KEY` | eToro User-Specific Key | `your-etoro-user-key` |
| `GEMINI_API_KEY` | Google AI Studio Gemini API Key | `AIzaSy...` |
| `WATCHLIST` | Comma-separated list of symbols to trade | `TSLA,NVDA,AMD,AAPL,META,TQQQ,BTC,ETH` |
| `ACCOUNT_MODE` | Account environment (`DEMO` or `REAL`) | `DEMO` |

> [!IMPORTANT]
> Always keep `ACCOUNT_MODE` set to `DEMO` while testing or developing!

### 6. Set Up the Time-Driven Trigger

In the Apps Script editor:
1. Click **Triggers** (alarm clock icon on the left menu).
2. Click **+ Add Trigger** (bottom right).
3. Configure the trigger:
   - **Choose which function to run**: `main`
   - **Choose which deployment should run**: `Head`
   - **Select event source**: `Time-driven`
   - **Select type of time based trigger**: `Hour timer` (e.g., `Every hour` or `Every 2 hours`)
4. Save the trigger and authorize the requested permissions.

---

## Testing & Quality Assurance

Run the test suite locally:

```bash
# Run all unit tests
npm test

# Run tests in watch mode
npm run test:watch

# Run TypeScript typecheck and ESLint
npm run check
```

---

## Project Structure

```text
├── Code.js              # Orchestrator: main(), executeDecision(), test helpers
├── Config.js            # Configuration, script properties, headers, market hours
├── EtoroApi.js          # eToro API integrations (rates, candles, portfolio, orders)
├── GeminiApi.js         # Google AI Studio API calls & prompt generation
├── Validator.js         # Anti-Corruption Layer: schema validations & normalizers
├── appsscript.json      # Apps Script project manifest
├── .clasp.json.example  # Clasp configuration template
├── tests/               # Local test suite using mocked GAS globals
│   ├── Code.test.js
│   ├── Config.test.js
│   ├── EtoroApi.test.js
│   ├── GeminiApi.test.js
│   ├── Validator.test.js
│   └── testUtils.js
└── types.d.ts           # JSDoc and TypeScript definitions
```

---

## License

This project is licensed under the [MIT License](LICENSE).
