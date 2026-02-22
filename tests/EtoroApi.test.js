/**
 * Unit tests for EtoroApi.js — searchInstrument, getInstrumentId, getMarketRates,
 * getHistoricalCandles, getDemoPortfolio, openDemoPosition, closeDemoPosition
 *
 * To run this file alone: node tests/EtoroApi.test.js
 */

import {
    describe,
    it,
    assert,
    assertEqual,
    assertThrows,
    assertContains,
    printSummary,
} from './testUtils.js'
import { readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// ── Mock Google Apps Script globals ────────────────────────────────────────

global.Logger = { log: function () {} }

global.PropertiesService = {
    getScriptProperties: function () {
        return {
            getProperty: function (key) {
                const props = {
                    ETORO_API_KEY: 'test-api-key',
                    ETORO_USER_KEY: 'test-user-key',
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

let capturedRequests = []
let mockHttpResponse = null

global.UrlFetchApp = {
    fetch: function (url, options) {
        capturedRequests.push({ url, options })
        return mockHttpResponse
    },
}

// ── Load source files in dependency order ──────────────────────────────────

const globalEval = eval
globalEval(readFileSync(join(__dirname, '../Config.js'), 'utf8'))
globalEval(readFileSync(join(__dirname, '../EtoroApi.js'), 'utf8'))

// ── Helpers ────────────────────────────────────────────────────────────────

function resetMocks() {
    capturedRequests = []
    mockHttpResponse = null
}

function mockResponse(code, body) {
    mockHttpResponse = {
        getResponseCode: function () {
            return code
        },
        getContentText: function () {
            return typeof body === 'string' ? body : JSON.stringify(body)
        },
    }
}

// ── Tests ──────────────────────────────────────────────────────────────────

function runTests() {
    describe('searchInstrument', () => {
        resetMocks()

        it('Should call the search endpoint with symbol', () => {
            mockResponse(200, { items: [], totalItems: 0 })
            searchInstrument('AAPL')
            assertContains(capturedRequests[0].url, '/api/v1/market-data/search')
            assertContains(capturedRequests[0].url, 'internalSymbolFull=AAPL')
        })

        it('Should URL-encode special characters in symbols', () => {
            resetMocks()
            mockResponse(200, { items: [], totalItems: 0 })
            searchInstrument('BRK.B')
            assertContains(capturedRequests[0].url, 'internalSymbolFull=BRK.B')
        })

        it('Should return parsed JSON response', () => {
            resetMocks()
            mockResponse(200, {
                items: [{ instrumentId: 1234, internalSymbolFull: 'VOO' }],
                totalItems: 1,
            })
            var result = searchInstrument('VOO')
            assertEqual(result.totalItems, 1)
            assertEqual(result.items[0].instrumentId, 1234)
        })
    })

    describe('getInstrumentId', () => {
        it('Should return instrumentId for exact match', () => {
            resetMocks()
            mockResponse(200, {
                items: [
                    { instrumentId: 9999, internalSymbolFull: 'VOO_OTHER' },
                    { instrumentId: 1234, internalSymbolFull: 'VOO' },
                ],
                totalItems: 2,
            })
            var id = getInstrumentId('VOO')
            assertEqual(id, 1234)
        })

        it('Should fallback to first item if no exact match', () => {
            resetMocks()
            mockResponse(200, {
                items: [{ instrumentId: 5555, internalSymbolFull: 'VOO.L' }],
                totalItems: 1,
            })
            var id = getInstrumentId('VOO')
            assertEqual(id, 5555)
        })

        it('Should throw when no items returned', () => {
            resetMocks()
            mockResponse(200, { items: [], totalItems: 0 })
            assertThrows(() => getInstrumentId('FAKE'), 'Instrument not found: FAKE')
        })

        it('Should throw when items is missing', () => {
            resetMocks()
            mockResponse(200, { totalItems: 0 })
            assertThrows(() => getInstrumentId('MISSING'), 'Instrument not found')
        })
    })

    describe('getMarketRates', () => {
        resetMocks()

        it('Should call rates endpoint with comma-separated IDs', () => {
            mockResponse(200, { rates: [] })
            getMarketRates([100, 200, 300])
            assertContains(capturedRequests[0].url, '/api/v1/market-data/instruments/rates')
            assertContains(capturedRequests[0].url, 'instrumentIds=100,200,300')
        })

        it('Should return rates data', () => {
            resetMocks()
            mockResponse(200, {
                rates: [{ instrumentID: 100, ask: 500.5, bid: 500.2 }],
            })
            var result = getMarketRates([100])
            assertEqual(result.rates.length, 1)
            assertEqual(result.rates[0].ask, 500.5)
        })
    })

    describe('getHistoricalCandles', () => {
        it('Should use default interval OneDay and count 20', () => {
            resetMocks()
            mockResponse(200, { interval: 'OneDay', candles: [] })
            getHistoricalCandles(1234)
            assertContains(capturedRequests[0].url, '/history/candles/desc/OneDay/20')
        })

        it('Should use custom interval and count', () => {
            resetMocks()
            mockResponse(200, { interval: 'OneHour', candles: [] })
            getHistoricalCandles(1234, 'OneHour', 50)
            assertContains(capturedRequests[0].url, '/history/candles/desc/OneHour/50')
        })

        it('Should include instrumentId in URL', () => {
            resetMocks()
            mockResponse(200, { interval: 'OneDay', candles: [] })
            getHistoricalCandles(5678)
            assertContains(capturedRequests[0].url, '/instruments/5678/history')
        })
    })

    describe('getDemoPortfolio', () => {
        it('Should call the demo PnL endpoint', () => {
            resetMocks()
            mockResponse(200, { clientPortfolio: { credit: 10000 } })
            getDemoPortfolio()
            assertContains(capturedRequests[0].url, '/api/v1/trading/info/demo/pnl')
        })

        it('Should use demo endpoint (not real)', () => {
            resetMocks()
            mockResponse(200, { clientPortfolio: { credit: 10000 } })
            getDemoPortfolio()
            assertContains(capturedRequests[0].url, '/demo/')
        })

        it('Should return portfolio data', () => {
            resetMocks()
            mockResponse(200, {
                clientPortfolio: { credit: 50000, positions: [{ positionId: 1 }] },
            })
            var result = getDemoPortfolio()
            assertEqual(result.clientPortfolio.credit, 50000)
            assertEqual(result.clientPortfolio.positions.length, 1)
        })
    })

    describe('openDemoPosition', () => {
        it('Should POST to demo open orders endpoint', () => {
            resetMocks()
            mockResponse(200, { orderId: 999 })
            openDemoPosition(1234, 100, true, 1)
            assertContains(
                capturedRequests[0].url,
                '/api/v1/trading/execution/demo/market-open-orders/by-amount',
            )
            assertEqual(capturedRequests[0].options.method, 'post')
        })

        it('Should send correct payload for BUY', () => {
            resetMocks()
            mockResponse(200, { orderId: 999 })
            openDemoPosition(1234, 500, true, 2)
            var payload = JSON.parse(capturedRequests[0].options.payload)
            assertEqual(payload.InstrumentId, 1234)
            assertEqual(payload.Amount, 500)
            assertEqual(payload.IsBuy, true)
            assertEqual(payload.Leverage, 2)
        })

        it('Should default isBuy to true', () => {
            resetMocks()
            mockResponse(200, { orderId: 999 })
            openDemoPosition(1234, 100)
            var payload = JSON.parse(capturedRequests[0].options.payload)
            assertEqual(payload.IsBuy, true)
        })

        it('Should default leverage to 1', () => {
            resetMocks()
            mockResponse(200, { orderId: 999 })
            openDemoPosition(1234, 100)
            var payload = JSON.parse(capturedRequests[0].options.payload)
            assertEqual(payload.Leverage, 1)
        })

        it('Should support SELL (isBuy=false)', () => {
            resetMocks()
            mockResponse(200, { orderId: 999 })
            openDemoPosition(1234, 100, false, 1)
            var payload = JSON.parse(capturedRequests[0].options.payload)
            assertEqual(payload.IsBuy, false)
        })

        it('Should use demo endpoint (not real)', () => {
            resetMocks()
            mockResponse(200, { orderId: 999 })
            openDemoPosition(1234, 100, true, 1)
            assertContains(capturedRequests[0].url, '/demo/')
        })
    })

    describe('closeDemoPosition', () => {
        it('Should POST to demo close position endpoint with positionId', () => {
            resetMocks()
            mockResponse(200, { closed: true })
            closeDemoPosition(98765)
            assertContains(
                capturedRequests[0].url,
                '/api/v1/trading/execution/demo/market-close-orders/positions/98765',
            )
            assertEqual(capturedRequests[0].options.method, 'post')
        })

        it('Should send null UnitsToDeduct for full close by default', () => {
            resetMocks()
            mockResponse(200, { closed: true })
            closeDemoPosition(98765)
            var payload = JSON.parse(capturedRequests[0].options.payload)
            assertEqual(payload.UnitsToDeduct, null)
        })

        it('Should use demo endpoint (not real)', () => {
            resetMocks()
            mockResponse(200, { closed: true })
            closeDemoPosition(98765)
            assertContains(capturedRequests[0].url, '/demo/')
        })
    })

    return printSummary()
}

runTests()
