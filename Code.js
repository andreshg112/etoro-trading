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
        console.log('  No actions recommended. Holding current positions.')
        if (decision && decision.analysis) {
            console.log('  Analysis: ' + decision.analysis)
        }
        return
    }

    console.log('  Analysis: ' + decision.analysis)

    decision.actions.forEach(function (action) {
        console.log('  -> ' + action.type + ' ' + action.symbol + ' | Reason: ' + action.reason)

        try {
            if (action.type === 'BUY') {
                var buyResult = openDemoPosition(
                    /** @type {number} */ (action.instrumentId),
                    /** @type {number} */ (action.amount),
                    true,
                    1,
                    action.stopLossRate,
                    action.takeProfitRate,
                )
                console.log('     BUY order placed: ' + JSON.stringify(buyResult))
            } else if (action.type === 'SELL_CLOSE') {
                var closeResult = closeDemoPosition(/** @type {number} */ (action.positionId))
                console.log('     Position closed: ' + JSON.stringify(closeResult))
            } else {
                console.log('     Unknown action type: ' + action.type)
            }
        } catch (e) {
            console.error('     EXECUTION ERROR: ' + /** @type {Error} */ (e).message)
        }
    })
}

// ── Main Entry Point ───────────────────────────────────────────────────────

/**
 * Main function — intended to be called by a time-driven trigger.
 * Orchestrates the full data-fetch -> analysis -> execution pipeline.
 */
function main() {
    console.log('=== eToro & Gemini Trading Bot - Execution Started ===')

    try {
        // 0. Check if US markets are open
        if (!isMarketOpen()) {
            console.log('US markets are currently closed. Skipping execution.')
            console.log('=== Execution Complete ===')
            return
        }

        // 1. Resolve instrument IDs for watchlist symbols
        console.log('Step 1/6: Resolving instrument IDs for watchlist...')
        /** @type {InstrumentMap} */
        var instrumentMap = {}
        WATCHLIST.forEach(function (symbol) {
            try {
                instrumentMap[symbol] = getInstrumentId(symbol)
                console.log('  ' + symbol + ' -> ID ' + instrumentMap[symbol])
            } catch (e) {
                console.warn(
                    '  WARNING: Could not resolve ' +
                        symbol +
                        ': ' +
                        /** @type {Error} */ (e).message,
                )
            }
        })

        var instrumentIds = Object.values(instrumentMap)
        if (instrumentIds.length === 0) {
            throw new Error('No instruments could be resolved from watchlist.')
        }

        // 2. Fetch real-time market rates
        console.log('Step 2/6: Fetching market rates...')
        var ratesData = getMarketRates(instrumentIds)
        console.log('  Received rates for ' + ratesData.rates.length + ' instruments.')

        // 3. Fetch historical candles for each instrument
        console.log('Step 3/6: Fetching historical candles (20 hourly)...')
        /** @type {CandlesMap} */
        var candlesMap = {}
        for (var symbol in instrumentMap) {
            try {
                candlesMap[symbol] = getHistoricalCandles(instrumentMap[symbol], 'OneHour', 20)
            } catch (e) {
                console.warn(
                    '  WARNING: Could not fetch candles for ' +
                        symbol +
                        ': ' +
                        /** @type {Error} */ (e).message,
                )
            }
        }

        // 4. Fetch demo portfolio (P&L, positions, cash)
        console.log('Step 4/6: Fetching demo portfolio...')
        var portfolio = getDemoPortfolio()
        var credit = portfolio.clientPortfolio.credit
        var positions = portfolio.clientPortfolio.positions || []
        var pendingOrders = portfolio.clientPortfolio.ordersForOpen || []
        var pendingAmount = pendingOrders.reduce(function (sum, o) {
            return sum + (o.amount || 0)
        }, 0)
        var availableCash = credit - pendingAmount

        console.log('  Credit: $' + credit.toFixed(2))
        console.log('  Pending orders total: $' + pendingAmount.toFixed(2))
        console.log('  Available cash: $' + availableCash.toFixed(2))
        console.log('  Open positions: ' + positions.length)

        // 5. Send data to Gemini for analysis
        console.log('Step 5/6: Sending market data to Gemini for analysis...')
        var prompt = buildGeminiPrompt(
            instrumentMap,
            ratesData,
            candlesMap,
            portfolio,
            availableCash,
        )
        var aiDecision = askGemini(prompt)
        console.log('  Gemini responded with ' + (aiDecision.actions || []).length + ' action(s).')

        // 6. Execute AI decision
        console.log('Step 6/6: Executing AI decision...')
        executeDecision(aiDecision)

        console.log('=== Execution Complete ===')
    } catch (error) {
        console.error('CRITICAL ERROR: ' + String(error))
    }
}

// ── Standalone Test Functions ──────────────────────────────────────────────

/** Quick test: verify eToro API connectivity by searching for VOO. */
function testEtoroConnection() {
    console.log('Testing eToro API connection...')
    try {
        var data = searchInstrument('VOO')
        console.log('SUCCESS: Found ' + data.totalItems + ' result(s) for VOO.')
        if (data.items && data.items[0]) {
            console.log('  Instrument ID: ' + data.items[0].instrumentId)
            console.log('  Display Name: ' + data.items[0].displayname)
        }
    } catch (e) {
        console.error('FAILED: ' + /** @type {Error} */ (e).message)
    }
}

/** Quick test: verify demo portfolio endpoint. */
function testGetPortfolio() {
    console.log('Testing demo portfolio endpoint...')
    try {
        var portfolio = getDemoPortfolio()
        var credit = portfolio.clientPortfolio.credit
        var positions = (portfolio.clientPortfolio.positions || []).length
        console.log('SUCCESS: Credit = $' + credit + ' | Open positions: ' + positions)
    } catch (e) {
        console.error('FAILED: ' + /** @type {Error} */ (e).message)
    }
}

/** Quick test: verify Gemini API connectivity. */
function testGeminiConnection() {
    console.log('Testing Gemini API connection...')
    try {
        var result = askGemini('Respond with exactly this JSON: {"status": "ok"}')
        console.log('SUCCESS: ' + JSON.stringify(result))
    } catch (e) {
        console.error('FAILED: ' + /** @type {Error} */ (e).message)
    }
}
