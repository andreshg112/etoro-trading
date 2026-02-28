// ===========================================================================
// eToro API Functions
// ===========================================================================
// All eToro-specific API calls: search, rates, candles, portfolio, and
// order execution. Depends on Config.js (etoroFetch, getInstrumentId, etc).
// ===========================================================================

/**
 * Searches for an instrument by ticker symbol.
 * @param {string} symbol - e.g. 'VOO', 'AAPL'
 * @returns {EtoroSearchResult} Search results with items array
 */
function searchInstrument(symbol) {
    var data = etoroFetch(
        '/api/v1/market-data/search?internalSymbolFull=' + encodeURIComponent(symbol),
    )
    validateEtoroSearch(data)
    return data
}

/**
 * Resolves a ticker symbol to its numeric eToro instrument ID.
 * Uses Script Properties as a cache to avoid redundant search API calls.
 * @param {string} symbol - Ticker symbol
 * @returns {number} Instrument ID
 */
function getInstrumentId(symbol) {
    var cacheKey = 'INSTRUMENT_ID_' + symbol
    var cached = PropertiesService.getScriptProperties().getProperty(cacheKey)
    if (cached) {
        return parseInt(cached, 10)
    }

    var data = searchInstrument(symbol)
    if (!data.items || data.items.length === 0) {
        throw new Error('Instrument not found: ' + symbol)
    }
    var match = data.items.find(function (item) {
        return item.internalSymbolFull === symbol
    })
    var instrumentId = (match || data.items[0]).instrumentId

    PropertiesService.getScriptProperties().setProperty(cacheKey, String(instrumentId))
    return instrumentId
}

/**
 * Retrieves real-time market rates for a list of instrument IDs.
 * @param {number[]} instrumentIds
 * @returns {EtoroRatesResponse}
 */
function getMarketRates(instrumentIds) {
    var data = etoroFetch(
        '/api/v1/market-data/instruments/rates?instrumentIds=' + instrumentIds.join(','),
    )
    validateEtoroRates(data)
    return data
}

/**
 * Fetches OHLCV historical candle data for an instrument.
 * @param {number} instrumentId
 * @param {string} [interval='OneDay'] - Candle interval
 * @param {number} [count=20] - Number of candles (max 1000)
 * @returns {EtoroCandleResponse}
 */
function getHistoricalCandles(instrumentId, interval, count) {
    interval = interval || 'OneDay'
    count = count || 20
    var data = etoroFetch(
        '/api/v1/market-data/instruments/' +
            instrumentId +
            '/history/candles/desc/' +
            interval +
            '/' +
            count,
    )
    validateEtoroCandles(data)
    return data
}

/**
 * Retrieves the account portfolio: credit, positions, orders, and P&L.
 * Uses ACCOUNT_MODE to target demo or real endpoint.
 * Validates the response schema and normalizes raw positions into strict
 * camelCase EtoroPosition objects (Anti-Corruption Layer).
 * @returns {EtoroPortfolioResponse}
 */
function getPortfolio() {
    var modeSegment = ACCOUNT_MODE === 'DEMO' ? 'demo/' : ''
    var data = etoroFetch('/api/v1/trading/info/' + modeSegment + 'pnl')
    validateEtoroPortfolio(data)

    var rawPositions = data.clientPortfolio.positions || []
    validateEtoroPositions(rawPositions)

    // Normalize raw positions to strict camelCase (Anti-Corruption Layer)
    var positions = rawPositions.map(normalizePosition)

    return {
        clientPortfolio: {
            credit: data.clientPortfolio.credit,
            positions: positions,
            ordersForOpen: data.clientPortfolio.ordersForOpen || [],
        },
    }
}

/**
 * Opens a BUY or SELL position by dollar amount.
 * Uses ACCOUNT_MODE to target demo or real endpoint.
 * @param {number} instrumentId
 * @param {number} amount - USD amount to invest
 * @param {boolean} [isBuy=true]
 * @param {number} [leverage=1]
 * @param {number} [stopLossRate] - Stop-loss price (omit or 0 to skip)
 * @param {number} [takeProfitRate] - Take-profit price (omit or 0 to skip)
 * @returns {EtoroOrderResult}
 */
function openPosition(instrumentId, amount, isBuy, leverage, stopLossRate, takeProfitRate) {
    var modeSegment = ACCOUNT_MODE === 'DEMO' ? 'demo/' : ''
    /** @type {Record<string, unknown>} */
    var payload = {
        InstrumentId: instrumentId,
        Amount: amount,
        IsBuy: isBuy !== false,
        Leverage: leverage || 1,
    }
    if (stopLossRate) {
        payload.StopLossRate = stopLossRate
    }
    if (takeProfitRate) {
        payload.TakeProfitRate = takeProfitRate
    }
    var data = etoroFetch(
        '/api/v1/trading/execution/' + modeSegment + 'market-open-orders/by-amount',
        'post',
        payload,
    )
    validateEtoroOpenOrder(data)
    return data
}

/**
 * Closes a position (full or partial).
 * Uses ACCOUNT_MODE to target demo or real endpoint.
 * The eToro API requires InstrumentId in the body even for full closures.
 * @param {number} positionId
 * @param {number} instrumentId - Required by eToro's close endpoint
 * @param {number} [unitsToDeduct] - Omit for full close
 * @returns {EtoroCloseResult}
 */
function closePosition(positionId, instrumentId, unitsToDeduct) {
    var modeSegment = ACCOUNT_MODE === 'DEMO' ? 'demo/' : ''
    /** @type {Record<string, unknown>} */
    var payload = { InstrumentId: instrumentId }
    if (unitsToDeduct) {
        payload.UnitsToDeduct = unitsToDeduct
    }
    var data = etoroFetch(
        '/api/v1/trading/execution/' + modeSegment + 'market-close-orders/positions/' + positionId,
        'post',
        payload,
    )
    validateEtoroCloseOrder(data)
    return data
}
