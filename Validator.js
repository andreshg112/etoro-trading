// ===========================================================================
// Schema Validation Functions (Anti-Corruption Layer)
// ===========================================================================
// Validates every external API response before the data enters our system.
// Each function throws a descriptive Error if the schema is unexpected,
// following the Fail-Fast principle.
// Depends on: nothing (pure validation logic).
// ===========================================================================

/**
 * Validates the response from eToro's instrument search endpoint.
 * Ensures `items` is a non-empty array with `instrumentId` and `internalSymbolFull`.
 * @param {any} data - Parsed JSON from /api/v1/market-data/search
 * @returns {void}
 */
function validateEtoroSearch(data) {
    if (!data || !Array.isArray(data.items)) {
        throw new Error(
            'CRITICAL: Schema validation failed — ' +
                'eToro Search response missing "items" array. Got: ' +
                JSON.stringify(data),
        )
    }
    if (data.items.length > 0) {
        var first = data.items[0]
        if (
            typeof first.instrumentId !== 'number' ||
            typeof first.internalSymbolFull !== 'string'
        ) {
            throw new Error(
                'CRITICAL: Schema validation failed — ' +
                    'eToro Search item missing required fields (instrumentId, internalSymbolFull). ' +
                    'Got: ' +
                    JSON.stringify(first),
            )
        }
    }
}

/**
 * Validates the response from eToro's market rates endpoint.
 * Ensures `rates` is an array and each rate has the expected numeric fields.
 * The eToro API uses `instrumentID` (capital ID) for this endpoint.
 * @param {any} data - Parsed JSON from /api/v1/market-data/instruments/rates
 * @returns {void}
 */
function validateEtoroRates(data) {
    if (!data || !Array.isArray(data.rates)) {
        throw new Error(
            'CRITICAL: Schema validation failed — ' +
                'eToro Rates response missing "rates" array. Got: ' +
                JSON.stringify(data),
        )
    }
    if (data.rates.length > 0) {
        var first = data.rates[0]
        if (
            typeof first.instrumentID !== 'number' ||
            typeof first.ask !== 'number' ||
            typeof first.bid !== 'number' ||
            typeof first.lastExecution !== 'number'
        ) {
            throw new Error(
                'CRITICAL: Schema validation failed — ' +
                    'eToro Rate item missing required fields (instrumentID, ask, bid, lastExecution). ' +
                    'Got: ' +
                    JSON.stringify(first),
            )
        }
    }
}

/**
 * Validates the response from eToro's historical candles endpoint.
 * Ensures `candles` is an array of instrument groups, each containing a
 * nested `candles` array with OHLC fields.
 * @param {any} data - Parsed JSON from /api/v1/market-data/instruments/{id}/history/candles
 * @returns {void}
 */
function validateEtoroCandles(data) {
    if (!data || !Array.isArray(data.candles)) {
        throw new Error(
            'CRITICAL: Schema validation failed — ' +
                'eToro Candles response missing "candles" array. Got: ' +
                JSON.stringify(data),
        )
    }
    if (data.candles.length > 0) {
        var group = data.candles[0]
        if (!Array.isArray(group.candles)) {
            throw new Error(
                'CRITICAL: Schema validation failed — ' +
                    'eToro Candle instrument group missing nested "candles" array. ' +
                    'Got: ' +
                    JSON.stringify(group),
            )
        }
        if (group.candles.length > 0) {
            var first = group.candles[0]
            if (
                typeof first.fromDate !== 'string' ||
                typeof first.open !== 'number' ||
                typeof first.high !== 'number' ||
                typeof first.low !== 'number' ||
                typeof first.close !== 'number'
            ) {
                throw new Error(
                    'CRITICAL: Schema validation failed — ' +
                        'eToro Candle missing required OHLC fields (fromDate, open, high, low, close). ' +
                        'Got: ' +
                        JSON.stringify(first),
                )
            }
        }
    }
}

/**
 * Validates the raw portfolio response from eToro's PnL endpoint.
 * Ensures `clientPortfolio` exists with a numeric `credit`.
 * @param {any} data - Parsed JSON from /api/v1/trading/info/{mode}pnl
 * @returns {void}
 */
function validateEtoroPortfolio(data) {
    if (!data || !data.clientPortfolio) {
        throw new Error(
            'CRITICAL: Schema validation failed — ' +
                'eToro Portfolio response missing "clientPortfolio". Got: ' +
                JSON.stringify(data),
        )
    }
    if (typeof data.clientPortfolio.credit !== 'number') {
        throw new Error(
            'CRITICAL: Schema validation failed — ' +
                'eToro Portfolio "clientPortfolio.credit" is not a number. Got: ' +
                JSON.stringify(data.clientPortfolio),
        )
    }
}

/**
 * Validates the raw positions array from eToro's portfolio response.
 * Ensures each position has an identifiable positionId and instrumentId
 * (handling eToro's case-insensitivity: positionID/positionId, instrumentID/instrumentId).
 * @param {any[]} rawPositions - The positions array from clientPortfolio
 * @returns {void}
 */
function validateEtoroPositions(rawPositions) {
    if (!Array.isArray(rawPositions)) {
        throw new Error(
            'CRITICAL: Schema validation failed — ' +
                'eToro positions is not an array. Got: ' +
                JSON.stringify(rawPositions),
        )
    }
    if (rawPositions.length > 0) {
        var first = rawPositions[0]
        var posId = first.positionId != null ? first.positionId : first.positionID
        var instId = first.instrumentId != null ? first.instrumentId : first.instrumentID
        if (typeof posId !== 'number' || typeof instId !== 'number') {
            throw new Error(
                'CRITICAL: Schema validation failed — ' +
                    'eToro Position missing required ID fields (positionId/positionID, instrumentId/instrumentID). ' +
                    'Got: ' +
                    JSON.stringify(first),
            )
        }
        if (typeof first.isBuy !== 'boolean') {
            throw new Error(
                'CRITICAL: Schema validation failed — ' +
                    'eToro Position missing required field "isBuy" (boolean). ' +
                    'Got: ' +
                    JSON.stringify(first),
            )
        }
        if (typeof first.openRate !== 'number' || typeof first.amount !== 'number') {
            throw new Error(
                'CRITICAL: Schema validation failed — ' +
                    'eToro Position missing required numeric fields (openRate, amount). ' +
                    'Got: ' +
                    JSON.stringify(first),
            )
        }
    }
}

/**
 * Validates the response from eToro's open-position endpoint.
 * Checks for nested `data.orderForOpen.orderID` per actual eToro response schema.
 * @param {any} data - Parsed JSON from /api/v1/trading/execution/.../market-open-orders/by-amount
 * @returns {void}
 */
function validateEtoroOpenOrder(data) {
    if (!data || !data.orderForOpen || typeof data.orderForOpen.orderID !== 'number') {
        throw new Error(
            'CRITICAL: Schema validation failed — ' +
                'eToro Open Order response missing nested "orderForOpen.orderID". Got: ' +
                JSON.stringify(data),
        )
    }
}

/**
 * Validates the response from eToro's close-position endpoint.
 * Checks for nested `data.orderForClose.orderID` per eToro API docs.
 * @param {any} data - Parsed JSON from /api/v1/trading/execution/.../market-close-orders/positions/{id}
 * @returns {void}
 */
function validateEtoroCloseOrder(data) {
    if (!data || !data.orderForClose || typeof data.orderForClose.orderID !== 'number') {
        throw new Error(
            'CRITICAL: Schema validation failed — ' +
                'eToro Close Order response missing nested "orderForClose.orderID". Got: ' +
                JSON.stringify(data),
        )
    }
}

/**
 * Validates a Gemini AI decision response.
 * Ensures `actions` is an array and each action has the required fields
 * for its type (BUY requires instrumentId/amount/SL/TP, SELL_CLOSE requires symbol only).
 * @param {any} decision - Parsed JSON from Gemini's response
 * @returns {void}
 */
function validateGeminiDecision(decision) {
    if (!decision || typeof decision !== 'object') {
        throw new Error(
            'CRITICAL: Schema validation failed — ' +
                'Gemini response is not an object. Got: ' +
                JSON.stringify(decision),
        )
    }
    if (!Array.isArray(decision.actions)) {
        throw new Error(
            'CRITICAL: Schema validation failed — ' +
                'Gemini response missing "actions" array. Got: ' +
                JSON.stringify(decision),
        )
    }

    decision.actions.forEach(function (/** @type {any} */ action, /** @type {number} */ index) {
        if (typeof action.type !== 'string' || typeof action.symbol !== 'string') {
            throw new Error(
                'CRITICAL: Schema validation failed — ' +
                    'Gemini action[' +
                    index +
                    '] missing required "type" or "symbol". Got: ' +
                    JSON.stringify(action),
            )
        }
        if (typeof action.reason !== 'string') {
            throw new Error(
                'CRITICAL: Schema validation failed — ' +
                    'Gemini action[' +
                    index +
                    '] missing required "reason" string. Got: ' +
                    JSON.stringify(action),
            )
        }

        if (action.type === 'BUY') {
            if (typeof action.instrumentId !== 'number') {
                throw new Error(
                    'CRITICAL: Schema validation failed — ' +
                        'Gemini BUY action[' +
                        index +
                        '] missing numeric "instrumentId". Got: ' +
                        JSON.stringify(action),
                )
            }
            if (typeof action.amount !== 'number' || action.amount <= 0) {
                throw new Error(
                    'CRITICAL: Schema validation failed — ' +
                        'Gemini BUY action[' +
                        index +
                        '] missing valid "amount" (positive number). Got: ' +
                        JSON.stringify(action),
                )
            }
            if (typeof action.stopLossRate !== 'number' || action.stopLossRate <= 0) {
                throw new Error(
                    'CRITICAL: Schema validation failed — ' +
                        'Gemini BUY action[' +
                        index +
                        '] missing valid "stopLossRate" (positive number). Got: ' +
                        JSON.stringify(action),
                )
            }
            if (typeof action.takeProfitRate !== 'number' || action.takeProfitRate <= 0) {
                throw new Error(
                    'CRITICAL: Schema validation failed — ' +
                        'Gemini BUY action[' +
                        index +
                        '] missing valid "takeProfitRate" (positive number). Got: ' +
                        JSON.stringify(action),
                )
            }
        }

        // SELL_CLOSE only requires symbol (already validated above) — no positionId needed.
        // The bot resolves all matching positions by symbol at execution time.
    })
}

/**
 * Normalizes a raw eToro position into our strict camelCase EtoroPosition shape.
 * Handles eToro's inconsistent casing (positionID/instrumentID) and nested PnL.
 * @param {RawEtoroPosition} p - Raw position from the API
 * @returns {EtoroPosition}
 */
function normalizePosition(p) {
    return {
        positionId: p.positionId || p.positionID || 0,
        instrumentId: p.instrumentId || p.instrumentID || 0,
        isBuy: p.isBuy,
        openRate: p.openRate,
        amount: p.amount,
        units: p.units,
        leverage: p.leverage,
        pnL: p.pnL != null ? p.pnL : (p.unrealizedPnL && p.unrealizedPnL.pnL) || 0,
        stopLossRate: p.stopLossRate,
        takeProfitRate: p.takeProfitRate,
    }
}
