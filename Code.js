// ===========================================================================
// eToro & Gemini AI Trading Bot — Main Entry Point
// ===========================================================================
// Orchestration: main() pipeline, trade execution, and standalone test
// functions. Depends on Config.js, EtoroApi.js, and GeminiApi.js.
//
// Required Script Properties (PropertiesService):
//   ETORO_API_KEY  - Public API key from eToro developer portal
//   ETORO_USER_KEY - User-specific key from eToro Settings > Trading
//   GEMINI_API_KEY - Google AI Studio API key
// ===========================================================================

// ── Trade Execution ────────────────────────────────────────────────────────

/**
 * Executes the actions returned by Gemini.
 * @param {GeminiDecision} decision - Gemini's parsed JSON response
 */
function executeDecision(decision) {
    if (!decision || !decision.actions || decision.actions.length === 0) {
        Logger.log('  No actions recommended. Holding current positions.')
        if (decision && decision.analysis) {
            Logger.log('  Analysis: ' + decision.analysis)
        }
        return
    }

    Logger.log('  Analysis: ' + decision.analysis)

    decision.actions.forEach(function (action) {
        Logger.log('  -> ' + action.type + ' ' + action.symbol + ' | Reason: ' + action.reason)

        try {
            if (action.type === 'BUY') {
                var buyResult = openDemoPosition(action.instrumentId, action.amount, true, 1)
                Logger.log('     BUY order placed: ' + JSON.stringify(buyResult))
            } else if (action.type === 'SELL_CLOSE') {
                var closeResult = closeDemoPosition(action.positionId)
                Logger.log('     Position closed: ' + JSON.stringify(closeResult))
            } else {
                Logger.log('     Unknown action type: ' + action.type)
            }
        } catch (e) {
            Logger.log('     EXECUTION ERROR: ' + e.message)
        }
    })
}

// ── Main Entry Point ───────────────────────────────────────────────────────

/**
 * Main function — intended to be called by a time-driven trigger.
 * Orchestrates the full data-fetch -> analysis -> execution pipeline.
 */
function main() {
    Logger.log('=== eToro & Gemini Trading Bot - Execution Started ===')

    try {
        // 1. Resolve instrument IDs for watchlist symbols
        Logger.log('Step 1/6: Resolving instrument IDs for watchlist...')
        /** @type {InstrumentMap} */
        var instrumentMap = {}
        WATCHLIST.forEach(function (symbol) {
            try {
                instrumentMap[symbol] = getInstrumentId(symbol)
                Logger.log('  ' + symbol + ' -> ID ' + instrumentMap[symbol])
            } catch (e) {
                Logger.log('  WARNING: Could not resolve ' + symbol + ': ' + e.message)
            }
        })

        var instrumentIds = Object.values(instrumentMap)
        if (instrumentIds.length === 0) {
            throw new Error('No instruments could be resolved from watchlist.')
        }

        // 2. Fetch real-time market rates
        Logger.log('Step 2/6: Fetching market rates...')
        var ratesData = getMarketRates(instrumentIds)
        Logger.log('  Received rates for ' + ratesData.rates.length + ' instruments.')

        // 3. Fetch historical candles for each instrument
        Logger.log('Step 3/6: Fetching historical candles (20 daily)...')
        /** @type {CandlesMap} */
        var candlesMap = {}
        for (var symbol in instrumentMap) {
            try {
                candlesMap[symbol] = getHistoricalCandles(instrumentMap[symbol], 'OneDay', 20)
            } catch (e) {
                Logger.log('  WARNING: Could not fetch candles for ' + symbol + ': ' + e.message)
            }
        }

        // 4. Fetch demo portfolio (P&L, positions, cash)
        Logger.log('Step 4/6: Fetching demo portfolio...')
        var portfolio = getDemoPortfolio()
        var credit = portfolio.clientPortfolio.credit
        var positions = portfolio.clientPortfolio.positions || []
        var pendingOrders = portfolio.clientPortfolio.ordersForOpen || []
        var pendingAmount = pendingOrders.reduce(function (sum, o) {
            return sum + (o.amount || 0)
        }, 0)
        var availableCash = credit - pendingAmount

        Logger.log('  Credit: $' + credit.toFixed(2))
        Logger.log('  Pending orders total: $' + pendingAmount.toFixed(2))
        Logger.log('  Available cash: $' + availableCash.toFixed(2))
        Logger.log('  Open positions: ' + positions.length)

        // 5. Send data to Gemini for analysis
        Logger.log('Step 5/6: Sending market data to Gemini for analysis...')
        var prompt = buildGeminiPrompt(
            instrumentMap,
            ratesData,
            candlesMap,
            portfolio,
            availableCash,
        )
        var aiDecision = askGemini(prompt)
        Logger.log('  Gemini responded with ' + (aiDecision.actions || []).length + ' action(s).')

        // 6. Execute AI decision
        Logger.log('Step 6/6: Executing AI decision...')
        executeDecision(aiDecision)

        Logger.log('=== Execution Complete ===')
    } catch (error) {
        Logger.log('CRITICAL ERROR: ' + error.toString())
    }
}

// ── Standalone Test Functions ──────────────────────────────────────────────

/** Quick test: verify eToro API connectivity by searching for VOO. */
function testEtoroConnection() {
    Logger.log('Testing eToro API connection...')
    try {
        var data = searchInstrument('VOO')
        Logger.log('SUCCESS: Found ' + data.totalItems + ' result(s) for VOO.')
        if (data.items && data.items[0]) {
            Logger.log('  Instrument ID: ' + data.items[0].instrumentId)
            Logger.log('  Display Name: ' + data.items[0].displayname)
        }
    } catch (e) {
        Logger.log('FAILED: ' + e.message)
    }
}

/** Quick test: verify demo portfolio endpoint. */
function testGetPortfolio() {
    Logger.log('Testing demo portfolio endpoint...')
    try {
        var portfolio = getDemoPortfolio()
        var credit = portfolio.clientPortfolio.credit
        var positions = (portfolio.clientPortfolio.positions || []).length
        Logger.log('SUCCESS: Credit = $' + credit + ' | Open positions: ' + positions)
    } catch (e) {
        Logger.log('FAILED: ' + e.message)
    }
}

/** Quick test: verify Gemini API connectivity. */
function testGeminiConnection() {
    Logger.log('Testing Gemini API connection...')
    try {
        var result = askGemini('Respond with exactly this JSON: {"status": "ok"}')
        Logger.log('SUCCESS: ' + JSON.stringify(result))
    } catch (e) {
        Logger.log('FAILED: ' + e.message)
    }
}
