/**
 * Unit tests for EtoroApi.js — searchInstrument, getInstrumentId, getMarketRates,
 * getHistoricalCandles, getPortfolio, openPosition, closePosition
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
    loadSourceFiles,
    installGasMocks,
} from './testUtils.js'

const {
    capturedRequests,
    resetMocks,
    setMockResponse: mockResponse,
    setProperties,
} = installGasMocks({
    properties: {
        ETORO_API_KEY: 'test-api-key',
        ETORO_USER_KEY: 'test-user-key',
        WATCHLIST: 'TSLA,NVDA',
        ACCOUNT_MODE: 'DEMO',
    },
})

loadSourceFiles('Config.js', 'EtoroApi.js')

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
            setProperties({
                ETORO_API_KEY: 'test-api-key',
                ETORO_USER_KEY: 'test-user-key',
                WATCHLIST: 'TSLA',
                ACCOUNT_MODE: 'DEMO',
            })
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
            setProperties({
                ETORO_API_KEY: 'test-api-key',
                ETORO_USER_KEY: 'test-user-key',
                WATCHLIST: 'TSLA',
                ACCOUNT_MODE: 'DEMO',
            })
            mockResponse(200, {
                items: [{ instrumentId: 5555, internalSymbolFull: 'VOO.L' }],
                totalItems: 1,
            })
            var id = getInstrumentId('VOO')
            assertEqual(id, 5555)
        })

        it('Should throw when no items returned', () => {
            resetMocks()
            setProperties({
                ETORO_API_KEY: 'test-api-key',
                ETORO_USER_KEY: 'test-user-key',
                WATCHLIST: 'TSLA',
                ACCOUNT_MODE: 'DEMO',
            })
            mockResponse(200, { items: [], totalItems: 0 })
            assertThrows(() => getInstrumentId('FAKE'), 'Instrument not found: FAKE')
        })

        it('Should throw when items is missing', () => {
            resetMocks()
            setProperties({
                ETORO_API_KEY: 'test-api-key',
                ETORO_USER_KEY: 'test-user-key',
                WATCHLIST: 'TSLA',
                ACCOUNT_MODE: 'DEMO',
            })
            mockResponse(200, { totalItems: 0 })
            assertThrows(() => getInstrumentId('MISSING'), 'Instrument not found')
        })

        it('Should cache resolved ID in Script Properties', () => {
            resetMocks()
            setProperties({
                ETORO_API_KEY: 'test-api-key',
                ETORO_USER_KEY: 'test-user-key',
                WATCHLIST: 'TSLA',
                ACCOUNT_MODE: 'DEMO',
            })
            mockResponse(200, {
                items: [{ instrumentId: 7777, internalSymbolFull: 'CACHE_TEST' }],
                totalItems: 1,
            })
            getInstrumentId('CACHE_TEST')
            var cached = global.PropertiesService.getScriptProperties().getProperty(
                'INSTRUMENT_ID_CACHE_TEST',
            )
            assertEqual(cached, '7777')
        })

        it('Should return cached ID without calling search API', () => {
            resetMocks()
            setProperties({
                ETORO_API_KEY: 'test-api-key',
                ETORO_USER_KEY: 'test-user-key',
                WATCHLIST: 'TSLA',
                ACCOUNT_MODE: 'DEMO',
                INSTRUMENT_ID_CACHED_SYM: '4242',
            })
            var id = getInstrumentId('CACHED_SYM')
            assertEqual(id, 4242)
            assertEqual(capturedRequests.length, 0)
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

    describe('getPortfolio — DEMO mode', () => {
        it('Should call the demo PnL endpoint', () => {
            resetMocks()
            setProperties({
                ETORO_API_KEY: 'test-api-key',
                ETORO_USER_KEY: 'test-user-key',
                WATCHLIST: 'TSLA',
                ACCOUNT_MODE: 'DEMO',
            })
            mockResponse(200, { clientPortfolio: { credit: 10000 } })
            getPortfolio()
            assertContains(capturedRequests[0].url, '/api/v1/trading/info/demo/pnl')
        })

        it('Should use demo endpoint (not real)', () => {
            resetMocks()
            setProperties({
                ETORO_API_KEY: 'test-api-key',
                ETORO_USER_KEY: 'test-user-key',
                WATCHLIST: 'TSLA',
                ACCOUNT_MODE: 'DEMO',
            })
            mockResponse(200, { clientPortfolio: { credit: 10000 } })
            getPortfolio()
            assertContains(capturedRequests[0].url, '/demo/')
        })

        it('Should return portfolio data', () => {
            resetMocks()
            setProperties({
                ETORO_API_KEY: 'test-api-key',
                ETORO_USER_KEY: 'test-user-key',
                WATCHLIST: 'TSLA',
                ACCOUNT_MODE: 'DEMO',
            })
            mockResponse(200, {
                clientPortfolio: { credit: 50000, positions: [{ positionId: 1 }] },
            })
            var result = getPortfolio()
            assertEqual(result.clientPortfolio.credit, 50000)
            assertEqual(result.clientPortfolio.positions.length, 1)
        })
    })

    describe('getPortfolio — REAL mode', () => {
        it('Should call the real PnL endpoint without demo segment', () => {
            resetMocks()
            setProperties({
                ETORO_API_KEY: 'test-api-key',
                ETORO_USER_KEY: 'test-user-key',
                WATCHLIST: 'TSLA',
                ACCOUNT_MODE: 'REAL',
            })
            global.ACCOUNT_MODE = 'REAL'
            try {
                mockResponse(200, { clientPortfolio: { credit: 10000 } })
                getPortfolio()
                assertContains(capturedRequests[0].url, '/api/v1/trading/info/pnl')
                assert(
                    !capturedRequests[0].url.includes('/demo/'),
                    'Should NOT include /demo/ in URL',
                )
            } finally {
                global.ACCOUNT_MODE = 'DEMO'
            }
        })
    })

    describe('openPosition — DEMO mode', () => {
        it('Should POST to demo open orders endpoint', () => {
            resetMocks()
            setProperties({
                ETORO_API_KEY: 'test-api-key',
                ETORO_USER_KEY: 'test-user-key',
                WATCHLIST: 'TSLA',
                ACCOUNT_MODE: 'DEMO',
            })
            mockResponse(200, { orderId: 999 })
            openPosition(1234, 100, true, 1)
            assertContains(
                capturedRequests[0].url,
                '/api/v1/trading/execution/demo/market-open-orders/by-amount',
            )
            assertEqual(capturedRequests[0].options.method, 'post')
        })

        it('Should send correct payload for BUY', () => {
            resetMocks()
            setProperties({
                ETORO_API_KEY: 'test-api-key',
                ETORO_USER_KEY: 'test-user-key',
                WATCHLIST: 'TSLA',
                ACCOUNT_MODE: 'DEMO',
            })
            mockResponse(200, { orderId: 999 })
            openPosition(1234, 500, true, 2)
            var payload = JSON.parse(capturedRequests[0].options.payload)
            assertEqual(payload.InstrumentId, 1234)
            assertEqual(payload.Amount, 500)
            assertEqual(payload.IsBuy, true)
            assertEqual(payload.Leverage, 2)
        })

        it('Should default isBuy to true', () => {
            resetMocks()
            setProperties({
                ETORO_API_KEY: 'test-api-key',
                ETORO_USER_KEY: 'test-user-key',
                WATCHLIST: 'TSLA',
                ACCOUNT_MODE: 'DEMO',
            })
            mockResponse(200, { orderId: 999 })
            openPosition(1234, 100)
            var payload = JSON.parse(capturedRequests[0].options.payload)
            assertEqual(payload.IsBuy, true)
        })

        it('Should default leverage to 1', () => {
            resetMocks()
            setProperties({
                ETORO_API_KEY: 'test-api-key',
                ETORO_USER_KEY: 'test-user-key',
                WATCHLIST: 'TSLA',
                ACCOUNT_MODE: 'DEMO',
            })
            mockResponse(200, { orderId: 999 })
            openPosition(1234, 100)
            var payload = JSON.parse(capturedRequests[0].options.payload)
            assertEqual(payload.Leverage, 1)
        })

        it('Should support SELL (isBuy=false)', () => {
            resetMocks()
            setProperties({
                ETORO_API_KEY: 'test-api-key',
                ETORO_USER_KEY: 'test-user-key',
                WATCHLIST: 'TSLA',
                ACCOUNT_MODE: 'DEMO',
            })
            mockResponse(200, { orderId: 999 })
            openPosition(1234, 100, false, 1)
            var payload = JSON.parse(capturedRequests[0].options.payload)
            assertEqual(payload.IsBuy, false)
        })

        it('Should use demo endpoint (not real)', () => {
            resetMocks()
            setProperties({
                ETORO_API_KEY: 'test-api-key',
                ETORO_USER_KEY: 'test-user-key',
                WATCHLIST: 'TSLA',
                ACCOUNT_MODE: 'DEMO',
            })
            mockResponse(200, { orderId: 999 })
            openPosition(1234, 100, true, 1)
            assertContains(capturedRequests[0].url, '/demo/')
        })

        it('Should include StopLossRate in payload when provided', () => {
            resetMocks()
            setProperties({
                ETORO_API_KEY: 'test-api-key',
                ETORO_USER_KEY: 'test-user-key',
                WATCHLIST: 'TSLA',
                ACCOUNT_MODE: 'DEMO',
            })
            mockResponse(200, { orderId: 999 })
            openPosition(1234, 500, true, 1, 480, 0)
            var payload = JSON.parse(capturedRequests[0].options.payload)
            assertEqual(payload.StopLossRate, 480)
        })

        it('Should include TakeProfitRate in payload when provided', () => {
            resetMocks()
            setProperties({
                ETORO_API_KEY: 'test-api-key',
                ETORO_USER_KEY: 'test-user-key',
                WATCHLIST: 'TSLA',
                ACCOUNT_MODE: 'DEMO',
            })
            mockResponse(200, { orderId: 999 })
            openPosition(1234, 500, true, 1, 0, 520)
            var payload = JSON.parse(capturedRequests[0].options.payload)
            assertEqual(payload.TakeProfitRate, 520)
        })

        it('Should include both SL and TP in payload when provided', () => {
            resetMocks()
            setProperties({
                ETORO_API_KEY: 'test-api-key',
                ETORO_USER_KEY: 'test-user-key',
                WATCHLIST: 'TSLA',
                ACCOUNT_MODE: 'DEMO',
            })
            mockResponse(200, { orderId: 999 })
            openPosition(1234, 500, true, 1, 480, 520)
            var payload = JSON.parse(capturedRequests[0].options.payload)
            assertEqual(payload.StopLossRate, 480)
            assertEqual(payload.TakeProfitRate, 520)
        })

        it('Should omit StopLossRate from payload when 0', () => {
            resetMocks()
            setProperties({
                ETORO_API_KEY: 'test-api-key',
                ETORO_USER_KEY: 'test-user-key',
                WATCHLIST: 'TSLA',
                ACCOUNT_MODE: 'DEMO',
            })
            mockResponse(200, { orderId: 999 })
            openPosition(1234, 500, true, 1, 0, 0)
            var payload = JSON.parse(capturedRequests[0].options.payload)
            assertEqual(payload.StopLossRate, undefined)
        })

        it('Should omit TakeProfitRate from payload when not provided', () => {
            resetMocks()
            setProperties({
                ETORO_API_KEY: 'test-api-key',
                ETORO_USER_KEY: 'test-user-key',
                WATCHLIST: 'TSLA',
                ACCOUNT_MODE: 'DEMO',
            })
            mockResponse(200, { orderId: 999 })
            openPosition(1234, 500, true, 1)
            var payload = JSON.parse(capturedRequests[0].options.payload)
            assertEqual(payload.TakeProfitRate, undefined)
        })
    })

    describe('openPosition — REAL mode', () => {
        it('Should POST to real open orders endpoint without demo segment', () => {
            resetMocks()
            setProperties({
                ETORO_API_KEY: 'test-api-key',
                ETORO_USER_KEY: 'test-user-key',
                WATCHLIST: 'TSLA',
                ACCOUNT_MODE: 'REAL',
            })
            global.ACCOUNT_MODE = 'REAL'
            try {
                mockResponse(200, { orderId: 999 })
                openPosition(1234, 100, true, 1)
                assertContains(
                    capturedRequests[0].url,
                    '/api/v1/trading/execution/market-open-orders/by-amount',
                )
                assert(
                    !capturedRequests[0].url.includes('/demo/'),
                    'Should NOT include /demo/ in URL',
                )
            } finally {
                global.ACCOUNT_MODE = 'DEMO'
            }
        })
    })

    describe('closePosition — DEMO mode', () => {
        it('Should POST to demo close position endpoint with positionId', () => {
            resetMocks()
            setProperties({
                ETORO_API_KEY: 'test-api-key',
                ETORO_USER_KEY: 'test-user-key',
                WATCHLIST: 'TSLA',
                ACCOUNT_MODE: 'DEMO',
            })
            mockResponse(200, { closed: true })
            closePosition(98765)
            assertContains(
                capturedRequests[0].url,
                '/api/v1/trading/execution/demo/market-close-orders/positions/98765',
            )
            assertEqual(capturedRequests[0].options.method, 'post')
        })

        it('Should send null UnitsToDeduct for full close by default', () => {
            resetMocks()
            setProperties({
                ETORO_API_KEY: 'test-api-key',
                ETORO_USER_KEY: 'test-user-key',
                WATCHLIST: 'TSLA',
                ACCOUNT_MODE: 'DEMO',
            })
            mockResponse(200, { closed: true })
            closePosition(98765)
            var payload = JSON.parse(capturedRequests[0].options.payload)
            assertEqual(payload.UnitsToDeduct, null)
        })

        it('Should use demo endpoint (not real)', () => {
            resetMocks()
            setProperties({
                ETORO_API_KEY: 'test-api-key',
                ETORO_USER_KEY: 'test-user-key',
                WATCHLIST: 'TSLA',
                ACCOUNT_MODE: 'DEMO',
            })
            mockResponse(200, { closed: true })
            closePosition(98765)
            assertContains(capturedRequests[0].url, '/demo/')
        })
    })

    describe('closePosition — REAL mode', () => {
        it('Should POST to real close endpoint without demo segment', () => {
            resetMocks()
            setProperties({
                ETORO_API_KEY: 'test-api-key',
                ETORO_USER_KEY: 'test-user-key',
                WATCHLIST: 'TSLA',
                ACCOUNT_MODE: 'REAL',
            })
            global.ACCOUNT_MODE = 'REAL'
            try {
                mockResponse(200, { closed: true })
                closePosition(98765)
                assertContains(
                    capturedRequests[0].url,
                    '/api/v1/trading/execution/market-close-orders/positions/98765',
                )
                assert(
                    !capturedRequests[0].url.includes('/demo/'),
                    'Should NOT include /demo/ in URL',
                )
            } finally {
                global.ACCOUNT_MODE = 'DEMO'
            }
        })
    })

    return printSummary()
}

runTests()
