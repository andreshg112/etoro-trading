/**
 * Unit tests for Code.js — executeDecision and main pipeline logic
 *
 * To run this file alone: node tests/Code.test.js
 */

import { describe, it, assert, assertContains, printSummary } from './testUtils.js'
import { readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// ── Mock Google Apps Script globals ────────────────────────────────────────

let logOutput = []

global.Logger = {
    log: function (msg) {
        logOutput.push(msg)
    },
}

global.PropertiesService = {
    getScriptProperties: function () {
        return {
            getProperty: function (key) {
                const props = {
                    ETORO_API_KEY: 'test-api-key',
                    ETORO_USER_KEY: 'test-user-key',
                    GEMINI_API_KEY: 'test-gemini-key',
                }
                return props[key] || null
            },
        }
    },
}

global.Utilities = {
    getUuid: function () {
        return 'mock-uuid'
    },
}

// ── Request tracking for mock UrlFetchApp ──────────────────────────────────

let capturedRequests = []
let mockResponses = {}

/**
 * Register a mock response for a URL pattern.
 * @param {string} urlPattern - Substring to match in the URL
 * @param {number} code - HTTP status code
 * @param {Object|string} body - Response body
 */
function registerMockResponse(urlPattern, code, body) {
    mockResponses[urlPattern] = {
        getResponseCode: function () {
            return code
        },
        getContentText: function () {
            return typeof body === 'string' ? body : JSON.stringify(body)
        },
    }
}

global.UrlFetchApp = {
    fetch: function (url, options) {
        capturedRequests.push({ url, options })
        // Find matching mock response
        for (var pattern in mockResponses) {
            if (url.includes(pattern)) {
                return mockResponses[pattern]
            }
        }
        // Default: 200 with empty JSON
        return {
            getResponseCode: function () {
                return 200
            },
            getContentText: function () {
                return '{}'
            },
        }
    },
}

// ── Load source files in dependency order ──────────────────────────────────

const globalEval = eval
globalEval(readFileSync(join(__dirname, '../Config.js'), 'utf8'))
globalEval(readFileSync(join(__dirname, '../EtoroApi.js'), 'utf8'))
globalEval(readFileSync(join(__dirname, '../GeminiApi.js'), 'utf8'))
globalEval(readFileSync(join(__dirname, '../Code.js'), 'utf8'))

// ── Helpers ────────────────────────────────────────────────────────────────

function resetMocks() {
    capturedRequests = []
    logOutput = []
    mockResponses = {}
}

function getLogText() {
    return logOutput.join('\n')
}

// ── Tests ──────────────────────────────────────────────────────────────────

function runTests() {
    describe('executeDecision — no actions', () => {
        resetMocks()

        it('Should log holding message when actions is empty', () => {
            executeDecision({ analysis: 'Markets stable', actions: [] })
            var log = getLogText()
            assertContains(log, 'No actions recommended')
        })

        it('Should log analysis when provided', () => {
            logOutput = []
            executeDecision({ analysis: 'Sideways market', actions: [] })
            var log = getLogText()
            assertContains(log, 'Sideways market')
        })

        it('Should handle null decision gracefully', () => {
            logOutput = []
            executeDecision(null)
            var log = getLogText()
            assertContains(log, 'No actions recommended')
        })

        it('Should handle undefined decision gracefully', () => {
            logOutput = []
            executeDecision(undefined)
            var log = getLogText()
            assertContains(log, 'No actions recommended')
        })

        it('Should handle decision with missing actions', () => {
            logOutput = []
            executeDecision({ analysis: 'Test' })
            var log = getLogText()
            assertContains(log, 'No actions recommended')
        })
    })

    describe('executeDecision — BUY action', () => {
        resetMocks()
        registerMockResponse('demo/market-open-orders', 200, { orderId: 12345 })

        it('Should log BUY action details', () => {
            executeDecision({
                analysis: 'Bullish trend on VOO',
                actions: [
                    {
                        type: 'BUY',
                        symbol: 'VOO',
                        instrumentId: 1234,
                        amount: 500,
                        reason: 'Strong uptrend',
                    },
                ],
            })
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

        it('Should log the analysis', () => {
            var log = getLogText()
            assertContains(log, 'Bullish trend on VOO')
        })
    })

    describe('executeDecision — SELL_CLOSE action', () => {
        resetMocks()
        registerMockResponse('market-close-orders/positions/9001', 200, { closed: true })

        it('Should log SELL_CLOSE action details', () => {
            executeDecision({
                analysis: 'Take profit on JNJ',
                actions: [
                    {
                        type: 'SELL_CLOSE',
                        symbol: 'JNJ',
                        positionId: 9001,
                        reason: 'Target reached',
                    },
                ],
            })
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
            executeDecision({
                analysis: 'Test',
                actions: [
                    {
                        type: 'SHORT',
                        symbol: 'AAPL',
                        reason: 'Test',
                    },
                ],
            })
            var log = getLogText()
            assertContains(log, 'Unknown action type')
        })
    })

    describe('executeDecision — multiple actions', () => {
        resetMocks()
        registerMockResponse('demo/market-open-orders', 200, { orderId: 111 })
        registerMockResponse('market-close-orders/positions/9001', 200, { closed: true })

        it('Should process all actions in sequence', () => {
            executeDecision({
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
            })
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
            executeDecision({
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
            })
            var log = getLogText()
            assertContains(log, 'EXECUTION ERROR')
        })
    })

    describe('main — full pipeline (integration)', () => {
        resetMocks()

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

        // Mock portfolio
        registerMockResponse('trading/info/demo/pnl', 200, {
            clientPortfolio: {
                credit: 10000,
                positions: [],
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
    })

    describe('main — handles API errors gracefully', () => {
        resetMocks()
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
