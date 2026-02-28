/**
 * Unit tests for Validator.js — validateEtoroSearch, validateEtoroRates,
 * validateEtoroCandles, validateEtoroPortfolio, validateEtoroPositions,
 * validateEtoroOpenOrder, validateEtoroCloseOrder, validateGeminiDecision,
 * normalizePosition
 *
 * To run this file alone: node tests/Validator.test.js
 */

import {
    describe,
    it,
    assertEqual,
    assertThrows,
    printSummary,
    loadSourceFiles,
    installGasMocks,
} from './testUtils.js'

installGasMocks()

loadSourceFiles('Config.js', 'Validator.js')

// ── Tests ──────────────────────────────────────────────────────────────────

function runTests() {
    // ── validateEtoroSearch ────────────────────────────────────────────────

    describe('validateEtoroSearch — passing schemas', () => {
        it('Should accept valid search response with items', () => {
            validateEtoroSearch({
                items: [{ instrumentId: 1234, internalSymbolFull: 'VOO', displayname: 'Vanguard' }],
                totalItems: 1,
            })
        })

        it('Should accept search response with empty items array', () => {
            validateEtoroSearch({ items: [], totalItems: 0 })
        })
    })

    describe('validateEtoroSearch — failing schemas', () => {
        it('Should throw when data is null', () => {
            assertThrows(() => validateEtoroSearch(null), 'CRITICAL: Schema validation failed')
        })

        it('Should throw when data is undefined', () => {
            assertThrows(() => validateEtoroSearch(undefined), 'CRITICAL: Schema validation failed')
        })

        it('Should throw when items is missing', () => {
            assertThrows(() => validateEtoroSearch({ totalItems: 0 }), 'missing "items" array')
        })

        it('Should throw when items is not an array', () => {
            assertThrows(() => validateEtoroSearch({ items: 'not-array' }), 'missing "items" array')
        })

        it('Should throw when first item missing instrumentId', () => {
            assertThrows(
                () => validateEtoroSearch({ items: [{ internalSymbolFull: 'VOO' }] }),
                'missing required fields',
            )
        })

        it('Should throw when first item missing internalSymbolFull', () => {
            assertThrows(
                () => validateEtoroSearch({ items: [{ instrumentId: 1234 }] }),
                'missing required fields',
            )
        })

        it('Should throw when instrumentId is wrong type', () => {
            assertThrows(
                () =>
                    validateEtoroSearch({
                        items: [{ instrumentId: '1234', internalSymbolFull: 'VOO' }],
                    }),
                'missing required fields',
            )
        })
    })

    // ── validateEtoroRates ─────────────────────────────────────────────────

    describe('validateEtoroRates — passing schemas', () => {
        it('Should accept valid rates response', () => {
            validateEtoroRates({
                rates: [{ instrumentID: 100, ask: 500.5, bid: 500.2, lastExecution: 500.3 }],
            })
        })

        it('Should accept empty rates array', () => {
            validateEtoroRates({ rates: [] })
        })
    })

    describe('validateEtoroRates — failing schemas', () => {
        it('Should throw when data is null', () => {
            assertThrows(() => validateEtoroRates(null), 'CRITICAL: Schema validation failed')
        })

        it('Should throw when rates is missing', () => {
            assertThrows(() => validateEtoroRates({}), 'missing "rates" array')
        })

        it('Should throw when rates is not an array', () => {
            assertThrows(() => validateEtoroRates({ rates: 'bad' }), 'missing "rates" array')
        })

        it('Should throw when rate item missing instrumentID', () => {
            assertThrows(
                () => validateEtoroRates({ rates: [{ ask: 1, bid: 1, lastExecution: 1 }] }),
                'missing required fields',
            )
        })

        it('Should throw when rate item missing ask', () => {
            assertThrows(
                () =>
                    validateEtoroRates({ rates: [{ instrumentID: 1, bid: 1, lastExecution: 1 }] }),
                'missing required fields',
            )
        })

        it('Should throw when rate item missing bid', () => {
            assertThrows(
                () =>
                    validateEtoroRates({ rates: [{ instrumentID: 1, ask: 1, lastExecution: 1 }] }),
                'missing required fields',
            )
        })

        it('Should throw when rate item missing lastExecution', () => {
            assertThrows(
                () => validateEtoroRates({ rates: [{ instrumentID: 1, ask: 1, bid: 1 }] }),
                'missing required fields',
            )
        })
    })

    // ── validateEtoroCandles ───────────────────────────────────────────────

    describe('validateEtoroCandles — passing schemas', () => {
        it('Should accept valid candles response', () => {
            validateEtoroCandles({
                candles: [
                    {
                        instrumentId: 1234,
                        candles: [
                            { fromDate: '2026-01-01', open: 100, high: 110, low: 95, close: 105 },
                        ],
                    },
                ],
            })
        })

        it('Should accept empty candles array', () => {
            validateEtoroCandles({ candles: [] })
        })

        it('Should accept candle group with empty nested candles', () => {
            validateEtoroCandles({
                candles: [{ instrumentId: 1234, candles: [] }],
            })
        })
    })

    describe('validateEtoroCandles — failing schemas', () => {
        it('Should throw when data is null', () => {
            assertThrows(() => validateEtoroCandles(null), 'CRITICAL: Schema validation failed')
        })

        it('Should throw when candles is missing', () => {
            assertThrows(() => validateEtoroCandles({}), 'missing "candles" array')
        })

        it('Should throw when candles is not an array', () => {
            assertThrows(() => validateEtoroCandles({ candles: 'bad' }), 'missing "candles" array')
        })

        it('Should throw when candle group missing nested candles array', () => {
            assertThrows(
                () => validateEtoroCandles({ candles: [{ instrumentId: 1234 }] }),
                'missing nested "candles" array',
            )
        })

        it('Should throw when candle missing fromDate', () => {
            assertThrows(
                () =>
                    validateEtoroCandles({
                        candles: [
                            {
                                instrumentId: 1234,
                                candles: [{ open: 1, high: 2, low: 0.5, close: 1.5 }],
                            },
                        ],
                    }),
                'missing required OHLC fields',
            )
        })

        it('Should throw when candle missing open', () => {
            assertThrows(
                () =>
                    validateEtoroCandles({
                        candles: [
                            {
                                instrumentId: 1234,
                                candles: [
                                    { fromDate: '2026-01-01', high: 2, low: 0.5, close: 1.5 },
                                ],
                            },
                        ],
                    }),
                'missing required OHLC fields',
            )
        })

        it('Should throw when candle has string open instead of number', () => {
            assertThrows(
                () =>
                    validateEtoroCandles({
                        candles: [
                            {
                                instrumentId: 1234,
                                candles: [
                                    {
                                        fromDate: '2026-01-01',
                                        open: '100',
                                        high: 110,
                                        low: 95,
                                        close: 105,
                                    },
                                ],
                            },
                        ],
                    }),
                'missing required OHLC fields',
            )
        })
    })

    // ── validateEtoroPortfolio ─────────────────────────────────────────────

    describe('validateEtoroPortfolio — passing schemas', () => {
        it('Should accept valid portfolio response', () => {
            validateEtoroPortfolio({
                clientPortfolio: { credit: 10000, positions: [], ordersForOpen: [] },
            })
        })

        it('Should accept portfolio without positions array', () => {
            validateEtoroPortfolio({
                clientPortfolio: { credit: 5000 },
            })
        })
    })

    describe('validateEtoroPortfolio — failing schemas', () => {
        it('Should throw when data is null', () => {
            assertThrows(() => validateEtoroPortfolio(null), 'CRITICAL: Schema validation failed')
        })

        it('Should throw when clientPortfolio is missing', () => {
            assertThrows(() => validateEtoroPortfolio({}), 'missing "clientPortfolio"')
        })

        it('Should throw when credit is not a number', () => {
            assertThrows(
                () => validateEtoroPortfolio({ clientPortfolio: { credit: 'ten' } }),
                'credit" is not a number',
            )
        })

        it('Should throw when credit is missing', () => {
            assertThrows(
                () => validateEtoroPortfolio({ clientPortfolio: {} }),
                'credit" is not a number',
            )
        })
    })

    // ── validateEtoroPositions ─────────────────────────────────────────────

    describe('validateEtoroPositions — passing schemas', () => {
        it('Should accept valid positions array (camelCase)', () => {
            validateEtoroPositions([
                {
                    positionId: 1,
                    instrumentId: 100,
                    isBuy: true,
                    openRate: 50,
                    amount: 500,
                    units: 10,
                    leverage: 1,
                },
            ])
        })

        it('Should accept valid positions array (eToro casing)', () => {
            validateEtoroPositions([
                {
                    positionID: 1,
                    instrumentID: 100,
                    isBuy: false,
                    openRate: 50,
                    amount: 500,
                    units: 10,
                    leverage: 1,
                },
            ])
        })

        it('Should accept empty positions array', () => {
            validateEtoroPositions([])
        })
    })

    describe('validateEtoroPositions — failing schemas', () => {
        it('Should throw when input is not an array', () => {
            assertThrows(() => validateEtoroPositions('not-array'), 'not an array')
        })

        it('Should throw when input is null', () => {
            assertThrows(() => validateEtoroPositions(null), 'not an array')
        })

        it('Should throw when position missing all ID fields', () => {
            assertThrows(
                () => validateEtoroPositions([{ isBuy: true, openRate: 50, amount: 500 }]),
                'missing required ID fields',
            )
        })

        it('Should throw when position missing isBuy', () => {
            assertThrows(
                () =>
                    validateEtoroPositions([
                        { positionId: 1, instrumentId: 100, openRate: 50, amount: 500 },
                    ]),
                'missing required field "isBuy"',
            )
        })

        it('Should throw when position missing openRate', () => {
            assertThrows(
                () =>
                    validateEtoroPositions([
                        { positionId: 1, instrumentId: 100, isBuy: true, amount: 500 },
                    ]),
                'missing required numeric fields',
            )
        })

        it('Should throw when position missing amount', () => {
            assertThrows(
                () =>
                    validateEtoroPositions([
                        { positionId: 1, instrumentId: 100, isBuy: true, openRate: 50 },
                    ]),
                'missing required numeric fields',
            )
        })
    })

    // ── validateEtoroOpenOrder ─────────────────────────────────────────────

    describe('validateEtoroOpenOrder — passing schemas', () => {
        it('Should accept valid open order response with nested orderForOpen', () => {
            validateEtoroOpenOrder({ orderForOpen: { orderID: 12345 } })
        })
    })

    describe('validateEtoroOpenOrder — failing schemas', () => {
        it('Should throw when data is null', () => {
            assertThrows(() => validateEtoroOpenOrder(null), 'CRITICAL: Schema validation failed')
        })

        it('Should throw when orderForOpen is missing', () => {
            assertThrows(() => validateEtoroOpenOrder({}), 'missing nested "orderForOpen.orderID"')
        })

        it('Should throw when orderForOpen.orderID is not a number', () => {
            assertThrows(
                () => validateEtoroOpenOrder({ orderForOpen: { orderID: 'abc' } }),
                'missing nested "orderForOpen.orderID"',
            )
        })

        it('Should throw when orderForOpen is not an object', () => {
            assertThrows(
                () => validateEtoroOpenOrder({ orderForOpen: 12345 }),
                'missing nested "orderForOpen.orderID"',
            )
        })

        it('Should throw when flat orderId is provided instead of nested', () => {
            assertThrows(
                () => validateEtoroOpenOrder({ orderId: 12345 }),
                'missing nested "orderForOpen.orderID"',
            )
        })
    })

    // ── validateEtoroCloseOrder ────────────────────────────────────────────

    describe('validateEtoroCloseOrder — passing schemas', () => {
        it('Should accept valid close order response with nested orderForClose', () => {
            validateEtoroCloseOrder({ orderForClose: { orderID: 9001 } })
        })
    })

    describe('validateEtoroCloseOrder — failing schemas', () => {
        it('Should throw when data is null', () => {
            assertThrows(() => validateEtoroCloseOrder(null), 'CRITICAL: Schema validation failed')
        })

        it('Should throw when orderForClose is missing', () => {
            assertThrows(
                () => validateEtoroCloseOrder({}),
                'missing nested "orderForClose.orderID"',
            )
        })

        it('Should throw when orderForClose.orderID is not a number', () => {
            assertThrows(
                () => validateEtoroCloseOrder({ orderForClose: { orderID: 'abc' } }),
                'missing nested "orderForClose.orderID"',
            )
        })

        it('Should throw when data is a string', () => {
            assertThrows(
                () => validateEtoroCloseOrder('OK'),
                'missing nested "orderForClose.orderID"',
            )
        })

        it('Should throw when data is a number', () => {
            assertThrows(
                () => validateEtoroCloseOrder(42),
                'missing nested "orderForClose.orderID"',
            )
        })
    })

    // ── validateGeminiDecision ─────────────────────────────────────────────

    describe('validateGeminiDecision — passing schemas', () => {
        it('Should accept valid decision with empty actions', () => {
            validateGeminiDecision({ analysis: 'Neutral', actions: [] })
        })

        it('Should accept valid BUY action', () => {
            validateGeminiDecision({
                analysis: 'Bullish',
                actions: [
                    {
                        type: 'BUY',
                        symbol: 'TSLA',
                        instrumentId: 1234,
                        amount: 500,
                        stopLossRate: 480,
                        takeProfitRate: 520,
                        reason: 'Momentum',
                    },
                ],
            })
        })

        it('Should accept valid SELL_CLOSE action (symbol only, no positionId)', () => {
            validateGeminiDecision({
                analysis: 'Taking profit',
                actions: [
                    {
                        type: 'SELL_CLOSE',
                        symbol: 'TSLA',
                        reason: 'Target reached',
                    },
                ],
            })
        })

        it('Should accept mixed BUY and SELL_CLOSE actions', () => {
            validateGeminiDecision({
                analysis: 'Rebalancing',
                actions: [
                    { type: 'SELL_CLOSE', symbol: 'AAPL', reason: 'Sell' },
                    {
                        type: 'BUY',
                        symbol: 'NVDA',
                        instrumentId: 200,
                        amount: 300,
                        stopLossRate: 280,
                        takeProfitRate: 320,
                        reason: 'Buy',
                    },
                ],
            })
        })
    })

    describe('validateGeminiDecision — failing schemas', () => {
        it('Should throw when decision is null', () => {
            assertThrows(() => validateGeminiDecision(null), 'not an object')
        })

        it('Should throw when decision is a string', () => {
            assertThrows(() => validateGeminiDecision('{"actions":[]}'), 'not an object')
        })

        it('Should throw when actions is missing', () => {
            assertThrows(
                () => validateGeminiDecision({ analysis: 'Test' }),
                'missing "actions" array',
            )
        })

        it('Should throw when actions is not an array', () => {
            assertThrows(
                () => validateGeminiDecision({ analysis: 'Test', actions: 'none' }),
                'missing "actions" array',
            )
        })

        it('Should throw when action missing type', () => {
            assertThrows(
                () =>
                    validateGeminiDecision({
                        analysis: 'Test',
                        actions: [{ symbol: 'TSLA', reason: 'Buy' }],
                    }),
                'missing required "type" or "symbol"',
            )
        })

        it('Should throw when action missing symbol', () => {
            assertThrows(
                () =>
                    validateGeminiDecision({
                        analysis: 'Test',
                        actions: [{ type: 'BUY', reason: 'Buy' }],
                    }),
                'missing required "type" or "symbol"',
            )
        })

        it('Should throw when action missing reason', () => {
            assertThrows(
                () =>
                    validateGeminiDecision({
                        analysis: 'Test',
                        actions: [{ type: 'BUY', symbol: 'TSLA' }],
                    }),
                'missing required "reason"',
            )
        })

        it('Should throw when BUY action missing instrumentId', () => {
            assertThrows(
                () =>
                    validateGeminiDecision({
                        analysis: 'Test',
                        actions: [
                            {
                                type: 'BUY',
                                symbol: 'TSLA',
                                amount: 500,
                                stopLossRate: 480,
                                takeProfitRate: 520,
                                reason: 'Buy',
                            },
                        ],
                    }),
                'missing numeric "instrumentId"',
            )
        })

        it('Should throw when BUY action missing amount', () => {
            assertThrows(
                () =>
                    validateGeminiDecision({
                        analysis: 'Test',
                        actions: [
                            {
                                type: 'BUY',
                                symbol: 'TSLA',
                                instrumentId: 100,
                                stopLossRate: 480,
                                takeProfitRate: 520,
                                reason: 'Buy',
                            },
                        ],
                    }),
                'missing valid "amount"',
            )
        })

        it('Should throw when BUY action has zero amount', () => {
            assertThrows(
                () =>
                    validateGeminiDecision({
                        analysis: 'Test',
                        actions: [
                            {
                                type: 'BUY',
                                symbol: 'TSLA',
                                instrumentId: 100,
                                amount: 0,
                                stopLossRate: 480,
                                takeProfitRate: 520,
                                reason: 'Buy',
                            },
                        ],
                    }),
                'missing valid "amount"',
            )
        })

        it('Should throw when BUY action has negative amount', () => {
            assertThrows(
                () =>
                    validateGeminiDecision({
                        analysis: 'Test',
                        actions: [
                            {
                                type: 'BUY',
                                symbol: 'TSLA',
                                instrumentId: 100,
                                amount: -50,
                                stopLossRate: 480,
                                takeProfitRate: 520,
                                reason: 'Buy',
                            },
                        ],
                    }),
                'missing valid "amount"',
            )
        })

        it('Should throw when BUY action missing stopLossRate', () => {
            assertThrows(
                () =>
                    validateGeminiDecision({
                        analysis: 'Test',
                        actions: [
                            {
                                type: 'BUY',
                                symbol: 'TSLA',
                                instrumentId: 100,
                                amount: 500,
                                takeProfitRate: 520,
                                reason: 'Buy',
                            },
                        ],
                    }),
                'missing valid "stopLossRate"',
            )
        })

        it('Should throw when BUY action missing takeProfitRate', () => {
            assertThrows(
                () =>
                    validateGeminiDecision({
                        analysis: 'Test',
                        actions: [
                            {
                                type: 'BUY',
                                symbol: 'TSLA',
                                instrumentId: 100,
                                amount: 500,
                                stopLossRate: 480,
                                reason: 'Buy',
                            },
                        ],
                    }),
                'missing valid "takeProfitRate"',
            )
        })

        it('Should accept SELL_CLOSE action without positionId', () => {
            validateGeminiDecision({
                analysis: 'Test',
                actions: [{ type: 'SELL_CLOSE', symbol: 'TSLA', reason: 'Sell' }],
            })
        })

        it('Should accept SELL_CLOSE action even with extra positionId field', () => {
            validateGeminiDecision({
                analysis: 'Test',
                actions: [
                    {
                        type: 'SELL_CLOSE',
                        symbol: 'TSLA',
                        positionId: 100,
                        reason: 'Sell',
                    },
                ],
            })
        })

        it('Should include action index in error message', () => {
            assertThrows(
                () =>
                    validateGeminiDecision({
                        analysis: 'Test',
                        actions: [
                            { type: 'SELL_CLOSE', symbol: 'AAPL', reason: 'OK' },
                            { type: 'BUY', symbol: 'TSLA', reason: 'Bad — missing fields' },
                        ],
                    }),
                'action[1]',
            )
        })
    })

    // ── normalizePosition ──────────────────────────────────────────────────

    describe('normalizePosition — camelCase input', () => {
        it('Should pass through already-normalized positions', () => {
            var result = normalizePosition({
                positionId: 1,
                instrumentId: 100,
                isBuy: true,
                openRate: 50,
                amount: 500,
                units: 10,
                leverage: 1,
                pnL: 25,
                stopLossRate: 45,
                takeProfitRate: 55,
            })
            assertEqual(result.positionId, 1)
            assertEqual(result.instrumentId, 100)
            assertEqual(result.pnL, 25)
        })
    })

    describe('normalizePosition — eToro casing (uppercase ID)', () => {
        it('Should normalize positionID to positionId', () => {
            var result = normalizePosition({
                positionID: 999,
                instrumentID: 200,
                isBuy: false,
                openRate: 100,
                amount: 1000,
                units: 5,
                leverage: 2,
                stopLossRate: 90,
                takeProfitRate: 110,
            })
            assertEqual(result.positionId, 999)
            assertEqual(result.instrumentId, 200)
        })

        it('Should extract pnL from nested unrealizedPnL.pnL', () => {
            var result = normalizePosition({
                positionID: 1,
                instrumentID: 100,
                isBuy: true,
                openRate: 50,
                amount: 500,
                units: 10,
                leverage: 1,
                unrealizedPnL: { pnL: 42.5 },
                stopLossRate: 45,
                takeProfitRate: 55,
            })
            assertEqual(result.pnL, 42.5)
        })

        it('Should default pnL to 0 when missing entirely', () => {
            var result = normalizePosition({
                positionID: 1,
                instrumentID: 100,
                isBuy: true,
                openRate: 50,
                amount: 500,
                units: 10,
                leverage: 1,
                stopLossRate: 45,
                takeProfitRate: 55,
            })
            assertEqual(result.pnL, 0)
        })
    })

    describe('normalizePosition — preserves all fields', () => {
        it('Should copy isBuy, openRate, amount, units, leverage, SL, TP', () => {
            var result = normalizePosition({
                positionId: 1,
                instrumentId: 100,
                isBuy: false,
                openRate: 75.5,
                amount: 250,
                units: 3.33,
                leverage: 5,
                pnL: -10,
                stopLossRate: 80,
                takeProfitRate: 70,
            })
            assertEqual(result.isBuy, false)
            assertEqual(result.openRate, 75.5)
            assertEqual(result.amount, 250)
            assertEqual(result.units, 3.33)
            assertEqual(result.leverage, 5)
            assertEqual(result.stopLossRate, 80)
            assertEqual(result.takeProfitRate, 70)
            assertEqual(result.pnL, -10)
        })
    })

    return printSummary()
}

runTests()
