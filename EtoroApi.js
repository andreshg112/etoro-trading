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
 * @param {string} symbol - Ticker symbol
 * @returns {number} Instrument ID
 */
function getInstrumentId(symbol) {
    var data = searchInstrument(symbol)
    if (!data.items || data.items.length === 0) {
        throw new Error('Instrument not found: ' + symbol)
    }
    var match = data.items.find(function (item) {
        return item.internalSymbolFull === symbol
    })
    return (match || data.items[0]).instrumentId
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
 * Retrieves the demo account portfolio: credit, positions, orders, and P&L.
 * @returns {EtoroPortfolioResponse}
 */
function getDemoPortfolio() {
    return etoroFetch('/api/v1/trading/info/demo/pnl')
}

/**
 * Opens a BUY or SELL position on the demo account by dollar amount.
 * @param {number} instrumentId
 * @param {number} amount - USD amount to invest
 * @param {boolean} [isBuy=true]
 * @param {number} [leverage=1]
 * @returns {EtoroOrderResult}
 */
function openDemoPosition(instrumentId, amount, isBuy, leverage) {
    return etoroFetch('/api/v1/trading/execution/demo/market-open-orders/by-amount', 'post', {
        InstrumentId: instrumentId,
        Amount: amount,
        IsBuy: isBuy !== false,
        Leverage: leverage || 1,
    })
}

/**
 * Closes a demo position (full or partial).
 * @param {number} positionId
 * @param {number|null} [unitsToDeduct=null] - null for full close
 * @returns {EtoroCloseResult}
 */
function closeDemoPosition(positionId, unitsToDeduct) {
    return etoroFetch(
        '/api/v1/trading/execution/demo/market-close-orders/positions/' + positionId,
        'post',
        { UnitsToDeduct: unitsToDeduct || null },
    )
}
