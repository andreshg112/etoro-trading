/**
 * Unit tests for Code.js — executeDecision and main pipeline logic
 *
 * To run this file alone: node tests/Code.test.js
 */

import {
    describe,
    it,
    assert,
    assertEqual,
    assertContains,
    printSummary,
    loadSourceFiles,
    installGasMocks,
} from './testUtils.js'

const { capturedRequests, logOutput, getLogText, resetMocks, registerMockResponse } =
    installGasMocks({ captureLog: true })

loadSourceFiles('Config.js', 'Validator.js', 'EtoroApi.js', 'GeminiApi.js', 'Code.js')

// ── Tests ──────────────────────────────────────────────────────────────────

function runTests() {
    describe('executeDecision — no actions', () => {
        resetMocks()

        it('Should log holding message when actions is empty', () => {
            executeDecision({ analysis: 'Markets stable', actions: [] }, [], {})
            var log = getLogText()
            assertContains(log, 'No actions recommended')
        })

        it('Should log analysis when provided', () => {
            logOutput.length = 0
            executeDecision({ analysis: 'Sideways market', actions: [] }, [], {})
            var log = getLogText()
            assertContains(log, 'Sideways market')
        })

        it('Should handle null decision gracefully', () => {
            logOutput.length = 0
            executeDecision(null, [], {})
            var log = getLogText()
            assertContains(log, 'No actions recommended')
        })

        it('Should handle undefined decision gracefully', () => {
            logOutput.length = 0
            executeDecision(undefined, [], {})
            var log = getLogText()
            assertContains(log, 'No actions recommended')
        })

        it('Should handle decision with missing actions', () => {
            logOutput.length = 0
            executeDecision({ analysis: 'Test' }, [], {})
            var log = getLogText()
            assertContains(log, 'No actions recommended')
        })
    })

    describe('executeDecision — BUY action', () => {
        resetMocks()
        registerMockResponse('demo/market-open-orders', 200, { orderId: 12345 })

        it('Should log BUY action details', () => {
            executeDecision(
                {
                    analysis: 'Bullish trend on VOO',
                    actions: [
                        {
                            type: 'BUY',
                            symbol: 'VOO',
                            instrumentId: 1234,
                            amount: 500,
                            stopLossRate: 480,
                            takeProfitRate: 520,
                            reason: 'Strong uptrend',
                        },
                    ],
                },
                [],
                {},
            )
            var log = getLogText()
            assertContains(log, 'BUY')
            assertContains(log, 'VOO')
            assertContains(log, 'Strong uptrend')
        })

        it('Should call open position endpoint', () => {
            var openReqs = capturedRequests.filter(function (r) {
                return r.url.includes('market-open-orders')
            })
            assert(openReqs.length > 0, 'Should have called open orders endpoint')
        })

        it('Should pass stopLossRate and takeProfitRate to open position', () => {
            var openReqs = capturedRequests.filter(function (r) {
                return r.url.includes('market-open-orders')
            })
            var payload = JSON.parse(openReqs[0].options.payload)
            assertEqual(payload.StopLossRate, 480)
            assertEqual(payload.TakeProfitRate, 520)
        })

        it('Should log the analysis', () => {
            var log = getLogText()
            assertContains(log, 'Bullish trend on VOO')
        })
    })

    describe('executeDecision — SELL_CLOSE action', () => {
        resetMocks()
        registerMockResponse('market-close-orders/positions/9001', 200, { closed: true })

        it('Should log SELL_CLOSE action details', () => {
            executeDecision(
                {
                    analysis: 'Take profit on JNJ',
                    actions: [
                        {
                            type: 'SELL_CLOSE',
                            symbol: 'JNJ',
                            positionId: 9001,
                            reason: 'Target reached',
                        },
                    ],
                },
                [{ positionId: 9001 }],
                {},
            )
            var log = getLogText()
            assertContains(log, 'SELL_CLOSE')
            assertContains(log, 'JNJ')
            assertContains(log, 'Target reached')
        })

        it('Should call close position endpoint with positionId', () => {
            var closeReqs = capturedRequests.filter(function (r) {
                return r.url.includes('market-close-orders/positions/9001')
            })
            assert(closeReqs.length > 0, 'Should have called close orders endpoint with positionId')
        })
    })

    describe('executeDecision — unknown action type', () => {
        resetMocks()

        it('Should log unknown action type', () => {
            executeDecision(
                {
                    analysis: 'Test',
                    actions: [
                        {
                            type: 'SHORT',
                            symbol: 'AAPL',
                            reason: 'Test',
                        },
                    ],
                },
                [],
                {},
            )
            var log = getLogText()
            assertContains(log, 'Unknown action type')
        })
    })

    describe('executeDecision — multiple actions', () => {
        resetMocks()
        registerMockResponse('demo/market-open-orders', 200, { orderId: 111 })
        registerMockResponse('market-close-orders/positions/9001', 200, { closed: true })

        it('Should process all actions in sequence', () => {
            executeDecision(
                {
                    analysis: 'Rebalancing',
                    actions: [
                        {
                            type: 'SELL_CLOSE',
                            symbol: 'JNJ',
                            positionId: 9001,
                            reason: 'Sell',
                        },
                        {
                            type: 'BUY',
                            symbol: 'VOO',
                            instrumentId: 1234,
                            amount: 200,
                            reason: 'Buy the dip',
                        },
                    ],
                },
                [{ positionId: 9001 }],
                {},
            )
            var log = getLogText()
            assertContains(log, 'SELL_CLOSE')
            assertContains(log, 'BUY')
        })

        it('Should make requests for both actions', () => {
            var closeReqs = capturedRequests.filter(function (r) {
                return r.url.includes('market-close-orders')
            })
            var openReqs = capturedRequests.filter(function (r) {
                return r.url.includes('market-open-orders')
            })
            assert(closeReqs.length > 0, 'Should have close request')
            assert(openReqs.length > 0, 'Should have open request')
        })
    })

    describe('executeDecision — execution error handling', () => {
        resetMocks()
        registerMockResponse('demo/market-open-orders', 400, '{"error": "Insufficient funds"}')

        it('Should log execution error without crashing', () => {
            executeDecision(
                {
                    analysis: 'Test error handling',
                    actions: [
                        {
                            type: 'BUY',
                            symbol: 'VOO',
                            instrumentId: 1234,
                            amount: 999999,
                            reason: 'Should fail',
                        },
                    ],
                },
                [],
                {},
            )
            var log = getLogText()
            assertContains(log, 'EXECUTION ERROR')
        })
    })

    describe('executeDecision — auto-healing hallucinated positionId', () => {
        resetMocks()
        registerMockResponse('market-close-orders/positions/123456789', 200, { closed: true })

        it('Should auto-correct when single position matches symbol', () => {
            executeDecision(
                {
                    analysis: 'Sell recommendation',
                    actions: [
                        {
                            type: 'SELL_CLOSE',
                            symbol: 'TSLA',
                            positionId: 2,
                            reason: 'Take profit',
                        },
                    ],
                },
                [{ positionId: 123456789, instrumentId: 5000 }],
                { TSLA: 5000 },
            )
            var log = getLogText()
            assertContains(log, 'AI hallucinated positionId: 2')
            assertContains(log, 'Auto-corrected positionId to: 123456789')
            assertContains(log, 'Position closed')
        })

        it('Should call close endpoint with corrected positionId', () => {
            var closeReqs = capturedRequests.filter(function (r) {
                return r.url.includes('market-close-orders/positions/123456789')
            })
            assert(closeReqs.length > 0, 'Should have called close endpoint with corrected ID')
        })

        it('Should NOT auto-correct when positionId is already valid', () => {
            resetMocks()
            registerMockResponse('market-close-orders/positions/123456789', 200, { closed: true })
            executeDecision(
                {
                    analysis: 'Sell recommendation',
                    actions: [
                        {
                            type: 'SELL_CLOSE',
                            symbol: 'TSLA',
                            positionId: 123456789,
                            reason: 'Take profit',
                        },
                    ],
                },
                [{ positionId: 123456789, instrumentId: 5000 }],
                { TSLA: 5000 },
            )
            var log = getLogText()
            assert(!log.includes('Auto-corrected'), 'Should not auto-correct a valid positionId')
            assertContains(log, 'Position closed')
        })

        it('Should fail when multiple positions match the symbol', () => {
            resetMocks()
            executeDecision(
                {
                    analysis: 'Sell recommendation',
                    actions: [
                        {
                            type: 'SELL_CLOSE',
                            symbol: 'TSLA',
                            positionId: 2,
                            reason: 'Take profit',
                        },
                    ],
                },
                [
                    { positionId: 111111111, instrumentId: 5000 },
                    { positionId: 222222222, instrumentId: 5000 },
                ],
                { TSLA: 5000 },
            )
            var log = getLogText()
            assertContains(log, 'Multiple open positions for TSLA')
        })

        it('Should fail when no positions match the symbol', () => {
            resetMocks()
            executeDecision(
                {
                    analysis: 'Sell recommendation',
                    actions: [
                        {
                            type: 'SELL_CLOSE',
                            symbol: 'TSLA',
                            positionId: 2,
                            reason: 'Take profit',
                        },
                    ],
                },
                [{ positionId: 123456789, instrumentId: 9999 }],
                { TSLA: 5000 },
            )
            var log = getLogText()
            assertContains(log, 'No open positions found for symbol: TSLA')
        })

        it('Should fail when symbol is not in instrumentMap', () => {
            resetMocks()
            executeDecision(
                {
                    analysis: 'Sell recommendation',
                    actions: [
                        {
                            type: 'SELL_CLOSE',
                            symbol: 'UNKNOWN',
                            positionId: 2,
                            reason: 'Take profit',
                        },
                    ],
                },
                [{ positionId: 123456789, instrumentId: 5000 }],
                { TSLA: 5000 },
            )
            var log = getLogText()
            assertContains(log, 'No open positions found for symbol: UNKNOWN')
        })
    })

    describe('main — skips when market is closed', () => {
        resetMocks()

        it('Should skip execution when market is closed', () => {
            global.Utilities.formatDate = () => 'Sat,12,00'
            main()
            var log = getLogText()
            assertContains(log, 'markets are currently closed')
            assertContains(log, 'Execution Complete')
        })

        it('Should not call any API endpoints when market is closed', () => {
            resetMocks()
            global.Utilities.formatDate = () => 'Sun,10,00'
            main()
            assertEqual(capturedRequests.length, 0)
        })
    })

    describe('main — full pipeline (integration)', () => {
        resetMocks()
        // Mock Utilities.formatDate to return a weekday during market hours
        global.Utilities.formatDate = () => 'Mon,10,00'

        // Mock searchInstrument for each watchlist symbol
        registerMockResponse('market-data/search', 200, {
            items: [{ instrumentId: 1234, internalSymbolFull: 'VOO' }],
            totalItems: 1,
        })

        // Mock market rates
        registerMockResponse('instruments/rates', 200, {
            rates: [{ instrumentID: 1234, ask: 500, bid: 499.5, lastExecution: 499.8 }],
        })

        // Mock historical candles
        registerMockResponse('history/candles', 200, {
            interval: 'OneDay',
            candles: [
                {
                    instrumentId: 1234,
                    candles: [
                        {
                            fromDate: '2026-02-20T00:00:00Z',
                            open: 498,
                            high: 502,
                            low: 497,
                            close: 500,
                        },
                    ],
                },
            ],
        })

        // Mock portfolio (includes bot-managed + non-bot positions)
        registerMockResponse('trading/info/demo/pnl', 200, {
            clientPortfolio: {
                credit: 10000,
                positions: [
                    {
                        positionId: 1,
                        instrumentId: 1234,
                        isBuy: true,
                        openRate: 498,
                        amount: 500,
                        units: 1,
                        leverage: 1,
                        pnL: 50,
                        stopLossRate: 480,
                        takeProfitRate: 520,
                    },
                    {
                        positionId: 2,
                        instrumentId: 9999,
                        isBuy: true,
                        openRate: 100,
                        amount: 200,
                        units: 2,
                        leverage: 1,
                        pnL: -20,
                        stopLossRate: 90,
                        takeProfitRate: 110,
                    },
                ],
                ordersForOpen: [],
            },
        })

        // Mock Gemini response
        registerMockResponse('generativelanguage.googleapis.com', 200, {
            candidates: [
                {
                    content: {
                        parts: [
                            {
                                text: JSON.stringify({
                                    analysis: 'Market looks promising',
                                    actions: [],
                                }),
                            },
                        ],
                    },
                },
            ],
        })

        it('Should run the full pipeline without errors', () => {
            main()
            var log = getLogText()
            assertContains(log, 'Execution Started')
            assertContains(log, 'Execution Complete')
        })

        it('Should log all 6 pipeline steps', () => {
            var log = getLogText()
            assertContains(log, 'Step 1/6')
            assertContains(log, 'Step 2/6')
            assertContains(log, 'Step 3/6')
            assertContains(log, 'Step 4/6')
            assertContains(log, 'Step 5/6')
            assertContains(log, 'Step 6/6')
        })

        it('Should not log CRITICAL ERROR', () => {
            var log = getLogText()
            assert(!log.includes('CRITICAL ERROR'), 'Should not have critical errors')
        })

        it('Should resolve instrument IDs', () => {
            var log = getLogText()
            assertContains(log, 'Resolving instrument IDs')
        })

        it('Should fetch portfolio data', () => {
            var log = getLogText()
            assertContains(log, 'Credit: $')
        })

        it('Should log total account positions vs bot-managed positions', () => {
            var log = getLogText()
            assertContains(log, 'Total open positions (Account): 2')
            assertContains(log, 'Open positions managed by Bot: 1')
        })

        it('Should request OneHour candles', () => {
            var candleReqs = capturedRequests.filter(function (r) {
                return r.url.includes('history/candles')
            })
            assert(candleReqs.length > 0, 'Should have candle requests')
            assertContains(candleReqs[0].url, 'OneHour')
        })
    })

    describe('main — handles API errors gracefully', () => {
        resetMocks()
        // Mock market as open so pipeline runs
        global.Utilities.formatDate = () => 'Mon,10,00'
        // Make all API calls fail
        registerMockResponse('market-data/search', 500, 'Server error')

        it('Should catch and log critical error', () => {
            main()
            var log = getLogText()
            // main() should not throw — it catches and logs
            assertContains(log, 'Execution Started')
        })
    })

    return printSummary()
}

runTests()
