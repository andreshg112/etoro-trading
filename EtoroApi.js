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
    return etoroFetch('/api/v1/market-data/search?internalSymbolFull=' + encodeURIComponent(symbol))
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
    return etoroFetch(
        '/api/v1/market-data/instruments/rates?instrumentIds=' + instrumentIds.join(','),
    )
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
    return etoroFetch(
        '/api/v1/market-data/instruments/' +
            instrumentId +
            '/history/candles/desc/' +
            interval +
            '/' +
            count,
    )
}

/**
 * Retrieves the account portfolio: credit, positions, orders, and P&L.
 * Uses ACCOUNT_MODE to target demo or real endpoint.
 * @returns {EtoroPortfolioResponse}
 */
function getPortfolio() {
    var modeSegment = ACCOUNT_MODE === 'DEMO' ? 'demo/' : ''
    return etoroFetch('/api/v1/trading/info/' + modeSegment + 'pnl')
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
    return etoroFetch(
        '/api/v1/trading/execution/' + modeSegment + 'market-open-orders/by-amount',
        'post',
        payload,
    )
}

/**
 * Closes a position (full or partial).
 * Uses ACCOUNT_MODE to target demo or real endpoint.
 * @param {number} positionId
 * @param {number|null} [unitsToDeduct=null] - null for full close
 * @returns {EtoroCloseResult}
 */
function closePosition(positionId, unitsToDeduct) {
    var modeSegment = ACCOUNT_MODE === 'DEMO' ? 'demo/' : ''
    return etoroFetch(
        '/api/v1/trading/execution/' + modeSegment + 'market-close-orders/positions/' + positionId,
        'post',
        { UnitsToDeduct: unitsToDeduct || null },
    )
}
