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
//   WATCHLIST      - Comma-separated list of symbols to monitor (e.g. "TSLA,NVDA,AMD")
//   ACCOUNT_MODE   - "DEMO" or "REAL" (determines which eToro account to use)
// ===========================================================================

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
        var instrumentMap = buildInstrumentMap()

        var instrumentIds = Object.values(instrumentMap)

        // 2. Fetch real-time market rates
        console.log('Step 2/6: Fetching market rates...')
        var ratesData = getMarketRates(instrumentIds)
        console.log('  Received rates for ' + ratesData.rates.length + ' instruments.')

        // 3. Fetch historical candles for each instrument
        console.log('Step 3/6: Fetching historical candles (20 hourly)...')
        var candlesMap = fetchCandlesMap(instrumentMap)

        // 4. Fetch portfolio (P&L, positions, cash)
        console.log('Step 4/6: Fetching portfolio...')
        var portfolioData = getBotPortfolio(instrumentMap)

        // 5. Send data to Gemini for analysis
        console.log('Step 5/6: Sending market data to Gemini for analysis...')
        var prompt = buildGeminiPrompt(
            instrumentMap,
            ratesData,
            candlesMap,
            portfolioData.botPortfolio,
            portfolioData.availableCash,
        )
        console.log('  --- Gemini Prompt ---\n' + prompt)
        var aiDecision = askGemini(prompt)
        console.log('  Gemini responded with ' + (aiDecision.actions || []).length + ' action(s).')

        // 6. Execute AI decision
        console.log('Step 6/6: Executing AI decision...')
        executeDecision(
            aiDecision,
            portfolioData.botPortfolio.clientPortfolio.positions ?? [],
            instrumentMap,
        )

        console.log('=== Execution Complete ===')
    } catch (error) {
        console.error('CRITICAL ERROR: ' + String(error))
    }
}

// ── Trade Execution ────────────────────────────────────────────────────────

/**
 * Resolves eToro instrument IDs for every symbol in the WATCHLIST.
 * Symbols that fail to resolve are logged and skipped.
 * @returns {InstrumentMap} Map of symbol → instrument ID
 */
function buildInstrumentMap() {
    /** @type {InstrumentMap} */
    var map = {}
    WATCHLIST.forEach(function (symbol) {
        try {
            map[symbol] = getInstrumentId(symbol)
            console.log('  ' + symbol + ' -> ID ' + map[symbol])
        } catch (e) {
            console.warn(
                '  WARNING: Could not resolve ' + symbol + ': ' + /** @type {Error} */ (e).message,
            )
        }
    })
    if (Object.keys(map).length === 0) {
        throw new Error('No instruments could be resolved from watchlist.')
    }
    return map
}

/**
 * Fetches 20 hourly OHLCV candles for every instrument in the map.
 * Instruments that fail are logged and skipped.
 * @param {InstrumentMap} instrumentMap
 * @returns {CandlesMap}
 */
function fetchCandlesMap(instrumentMap) {
    /** @type {CandlesMap} */
    var map = {}
    for (var symbol in instrumentMap) {
        try {
            map[symbol] = getHistoricalCandles(instrumentMap[symbol], 'OneHour', 20)
        } catch (e) {
            console.warn(
                '  WARNING: Could not fetch candles for ' +
                    symbol +
                    ': ' +
                    /** @type {Error} */ (e).message,
            )
        }
    }
    return map
}

/**
 * Fetches the full account portfolio, computes available cash, and builds
 * a filtered "bot portfolio" containing only WATCHLIST positions.
 * Available cash is based on the real account credit (not filtered).
 * @param {InstrumentMap} instrumentMap
 * @returns {{ botPortfolio: EtoroPortfolioResponse, availableCash: number }}
 */
function getBotPortfolio(instrumentMap) {
    var portfolio = getPortfolio()
    var credit = portfolio.clientPortfolio.credit
    var positions = portfolio.clientPortfolio.positions || []

    var pendingOrders = portfolio.clientPortfolio.ordersForOpen || []
    var pendingAmount = pendingOrders.reduce(function (sum, o) {
        return sum + (o.amount || 0)
    }, 0)
    var availableCash = credit - pendingAmount

    var botPositions = positions.filter(function (p) {
        return Object.values(instrumentMap).includes(p.instrumentId)
    })
    /** @type {EtoroPortfolioResponse} */
    var botPortfolio = {
        clientPortfolio: {
            credit: credit,
            positions: botPositions,
            ordersForOpen: pendingOrders,
        },
    }

    console.log('  Credit: $' + credit.toFixed(2))
    console.log('  Pending orders total: $' + pendingAmount.toFixed(2))
    console.log('  Available cash: $' + availableCash.toFixed(2))
    console.log('  Total open positions (Account): ' + positions.length)
    console.log('  Open positions managed by Bot: ' + botPositions.length)

    return { botPortfolio, availableCash }
}

/**
 * Executes a single BUY action from Gemini.
 * @param {GeminiAction} action
 */
function executeBuy(action) {
    if (!action.instrumentId) {
        throw new Error('Missing instrumentId for BUY action')
    }
    var result = openPosition(
        /** @type {number} */ (action.instrumentId),
        /** @type {number} */ (action.amount),
        true,
        1,
        action.stopLossRate,
        action.takeProfitRate,
    )
    console.log('     BUY order placed: ' + JSON.stringify(result))
}

/**
 * Executes a single SELL_CLOSE action from Gemini.
 * Resolves the symbol to an instrumentId, finds all matching positions,
 * and closes every one of them.
 * @param {GeminiAction} action
 * @param {EtoroPosition[]} botPositions
 * @param {InstrumentMap} instrumentMap
 */
function executeSellClose(action, botPositions, instrumentMap) {
    var resolvedInstrumentId = instrumentMap[action.symbol]
    if (!resolvedInstrumentId) {
        throw new Error('Symbol not found in instrumentMap: ' + action.symbol)
    }
    var matchingPositions = botPositions.filter(function (p) {
        return p.instrumentId === resolvedInstrumentId
    })
    if (matchingPositions.length === 0) {
        console.log('     No open positions found to close for symbol: ' + action.symbol)
        return
    }
    console.log(
        '     Found ' + matchingPositions.length + ' position(s) to close for ' + action.symbol,
    )
    matchingPositions.forEach(function (pos) {
        try {
            var closeResult = closePosition(
                /** @type {number} */ (pos.positionId),
                /** @type {number} */ (pos.instrumentId),
            )
            console.log(
                '     Position ' + pos.positionId + ' closed: ' + JSON.stringify(closeResult),
            )
        } catch (err) {
            console.error(
                '     Failed to close position ' +
                    pos.positionId +
                    ': ' +
                    /** @type {Error} */ (err).message,
            )
        }
    })
}

/**
 * Executes the actions returned by Gemini.
 * @param {GeminiDecision} decision - Gemini's parsed JSON response
 * @param {EtoroPosition[]} botPositions - Filtered list of positions managed by the bot
 * @param {InstrumentMap} instrumentMap - Maps ticker symbols to eToro instrument IDs
 */
function executeDecision(decision, botPositions, instrumentMap) {
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
        console.log('     Action payload received: ' + JSON.stringify(action))

        try {
            if (action.type === 'BUY') {
                executeBuy(action)
            } else if (action.type === 'SELL_CLOSE') {
                executeSellClose(action, botPositions, instrumentMap)
            } else {
                console.log('     Unknown action type: ' + action.type)
            }
        } catch (e) {
            console.error('     EXECUTION ERROR: ' + /** @type {Error} */ (e).message)
        }
    })
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

/** Quick test: verify portfolio endpoint. */
function testGetPortfolio() {
    console.log('Testing portfolio endpoint...')
    try {
        var portfolio = getPortfolio()
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
