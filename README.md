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

## Background & Real-World Results

I built this project to test a straightforward question: *Can an LLM autonomously trade and make money on eToro?*

I started the experiment on February 23, 2026, with \$100,000 in virtual cash. Over more than 7 months of continuous execution (through October 2026), the bot initially lost ~\$10,000 during early intraday iterations due to broker spreads and execution friction. After pivoting to a swing-trading approach with mandatory stop-loss/take-profit guards, the account recovered back to ~\$99,400 (essentially break-even).

Because I still do not trust this enough to risk real capital, it continues running purely in DEMO mode (which costs virtually nothing to operate on Google Apps Script). I am open-sourcing the codebase to share the setup, gather feedback, and show how you can build automated pipelines on Google Apps Script with zero server costs.

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
- **Anti-Corruption Layer**: Fail-fast schema validation inspects all third-party payloads before processing.
- **Market Hours Guard**: Automatically skips execution when US markets are closed (weekends and outside 09:30–16:00 ET).
- **Incident Notifications**: Automatically sends email alerts to the script owner on execution errors or API warnings using Apps Script's `MailApp`.
- **Zero-Cloud Hosting Costs**: Runs entirely inside Google Apps Script's serverless environment.
- **100% Locally Testable**: Full unit test suite mocking Apps Script globals (`UrlFetchApp`, `PropertiesService`, `Logger`) via Node.js.

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

### 6. Set Up Time-Driven Triggers (Execution Cadence & Fee Strategy)

> [!TIP]
> **Why 1–2 Triggers Per Day Instead of Hourly/Minute Intervals?**
> - **Broker Spreads & Fees**: Running every minute or hour can cause frequent overtrading. Broker spreads (and overnight CFD fees) quickly eat into capital.
> - **Swing-Trading Mechanics**: The bot targets **5% to 10% multi-day price swings**. Positions need breathing room across days to develop; re-evaluating twice a day during regular market hours avoids churn.
> - **Quota Conservation**: Prevents exceeding Google Apps Script daily execution quotas (90 min/day) and Gemini API limits.

In the Apps Script editor:
1. Click **Triggers** (alarm clock icon on the left menu).
2. Click **+ Add Trigger** (bottom right).
3. Set up **two daily triggers** during US trading hours:

| Setting | Trigger 1 (Morning Check) | Trigger 2 (Afternoon Check) |
|---|---|---|
| **Function to run** | `main` | `main` |
| **Deployment** | `Head` | `Head` |
| **Event source** | `Time-driven` | `Time-driven` |
| **Type of time based trigger** | `Day timer` | `Day timer` |
| **Time of day** | `10am to 11am` (post-market open) | `2pm to 3pm` (mid/late session) |
| **Failure notification** | `Notify me immediately` | `Notify me immediately` |

*(Note: Market hours guard in `Config.js` will automatically skip execution on weekends or outside 09:30–16:00 ET.)*

---

## Deployment Workflow & Git Hooks

This repository includes an automated deployment script ([`deploy.sh`](deploy.sh)) paired with a local Git `pre-push` hook ([`.githooks/pre-push`](.githooks/pre-push)).

### How It Works:
```bash
./deploy.sh
```

1. **Safety Gate (Pre-Push Hook)**:
   - When `deploy.sh` runs `git push`, Git automatically executes `.githooks/pre-push`.
   - The hook runs `npm run check` (TypeScript typecheck + ESLint) followed by `npm test` (full unit test suite).
   - If **any** test or typecheck fails, `git push` is aborted, `deploy.sh` halts immediately, and broken code is **never pushed to Google Apps Script**.
2. **Apps Script Sync**:
   - Only after Git validations succeed does `clasp push` update your remote Apps Script files.
3. **Immutable Snapshot**:
   - `clasp version` automatically tags a versioned history snapshot in Apps Script using your latest commit message.

*(The `prepare` script in `package.json` sets up this git hook automatically during `npm install`.)*

---

## Testing & Quality Assurance

Run the test suite and quality checks locally:

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
├── deploy.sh            # Deployment automation script (git push + clasp push + clasp version)
├── appsscript.json      # Apps Script project manifest
├── .clasp.json.example  # Clasp configuration template
├── .githooks/           # Git hooks (pre-push quality gate)
│   └── pre-push
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
