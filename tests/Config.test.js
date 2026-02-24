/**
 * Unit tests for Config.js — constants, getScriptProperty, getEtoroHeaders, etoroFetch
 *
 * To run this file alone: node tests/Config.test.js
 */

import {
    describe,
    it,
    assert,
    assertEqual,
    assertThrows,
    printSummary,
    loadSourceFiles,
    installGasMocks,
} from './testUtils.js'

const {
    capturedRequests,
    resetMocks: resetEnv,
    setMockResponse,
    setProperties,
} = installGasMocks({ uuid: 'mock-uuid-1234-5678' })

loadSourceFiles('Config.js')

// ── Helper ─────────────────────────────────────────────────────────────────

function resetMocks() {
    resetEnv()
    setProperties({
        ETORO_API_KEY: 'test-api-key',
        ETORO_USER_KEY: 'test-user-key',
        GEMINI_API_KEY: 'test-gemini-key',
    })
    setMockResponse(200, { ok: true })
}

// ── Tests ──────────────────────────────────────────────────────────────────

function runTests() {
    describe('Constants', () => {
        it('ETORO_BASE_URL should be the public API', () => {
            assertEqual(ETORO_BASE_URL, 'https://public-api.etoro.com')
        })

        it('GEMINI_BASE_URL should be the generativelanguage API', () => {
            assertEqual(GEMINI_BASE_URL, 'https://generativelanguage.googleapis.com/v1beta')
        })

        it('WATCHLIST should contain 8 symbols', () => {
            assertEqual(WATCHLIST.length, 8)
        })

        it('WATCHLIST should include TSLA', () => {
            assert(WATCHLIST.includes('TSLA'), 'WATCHLIST should include TSLA')
        })

        it('WATCHLIST should include BTC', () => {
            assert(WATCHLIST.includes('BTC'), 'WATCHLIST should include BTC')
        })
    })

    describe('getScriptProperty', () => {
        resetMocks()

        it('Should return value when property exists', () => {
            assertEqual(getScriptProperty('ETORO_API_KEY'), 'test-api-key')
        })

        it('Should throw when property is missing', () => {
            assertThrows(
                () => getScriptProperty('NON_EXISTENT_KEY'),
                'Missing script property: NON_EXISTENT_KEY',
            )
        })
    })

    describe('getEtoroHeaders', () => {
        resetMocks()

        it('Should contain exactly 4 headers', () => {
            var headers = getEtoroHeaders()
            assertEqual(headers['x-api-key'], 'test-api-key')
            assertEqual(headers['x-user-key'], 'test-user-key')
            assertEqual(headers['x-request-id'], 'mock-uuid-1234-5678')
            assertEqual(headers['Content-Type'], 'application/json')
            assertEqual(Object.keys(headers).length, 4)
        })
    })

    describe('etoroFetch — successful GET', () => {
        resetMocks()

        it('Should call UrlFetchApp.fetch with correct URL', () => {
            etoroFetch('/api/v1/test-endpoint')
            assert(
                capturedRequests[0].url === 'https://public-api.etoro.com/api/v1/test-endpoint',
                'URL should be base + endpoint',
            )
        })

        it('Should default to GET method', () => {
            capturedRequests.length = 0
            etoroFetch('/api/v1/test')
            assertEqual(capturedRequests[0].options.method, 'get')
        })

        it('Should include auth headers', () => {
            capturedRequests.length = 0
            etoroFetch('/api/v1/test')
            var headers = capturedRequests[0].options.headers
            assert(headers['x-api-key'] === 'test-api-key', 'Should have x-api-key')
            assert(headers['x-user-key'] === 'test-user-key', 'Should have x-user-key')
        })

        it('Should set muteHttpExceptions to true', () => {
            capturedRequests.length = 0
            etoroFetch('/api/v1/test')
            assertEqual(capturedRequests[0].options.muteHttpExceptions, true)
        })

        it('Should parse JSON response', () => {
            var result = etoroFetch('/api/v1/test')
            assertEqual(result.ok, true)
        })
    })

    describe('etoroFetch — POST with payload', () => {
        resetMocks()

        it('Should use POST method when specified', () => {
            etoroFetch('/api/v1/trade', 'post', { Amount: 100 })
            assertEqual(capturedRequests[0].options.method, 'post')
        })

        it('Should stringify payload', () => {
            capturedRequests.length = 0
            etoroFetch('/api/v1/trade', 'post', { Amount: 100, IsBuy: true })
            var payload = JSON.parse(capturedRequests[0].options.payload)
            assertEqual(payload.Amount, 100)
            assertEqual(payload.IsBuy, true)
        })

        it('Should not include payload for GET requests', () => {
            capturedRequests.length = 0
            etoroFetch('/api/v1/data')
            assertEqual(capturedRequests[0].options.payload, undefined)
        })
    })

    describe('etoroFetch — error handling', () => {
        it('Should throw on HTTP 404', () => {
            setMockResponse(404, '{"message": "Not found"}')
            assertThrows(() => etoroFetch('/api/v1/missing'), 'eToro API error (HTTP 404)')
        })

        it('Should throw on HTTP 401', () => {
            setMockResponse(401, '{"message": "Unauthorized"}')
            assertThrows(() => etoroFetch('/api/v1/secret'), 'eToro API error (HTTP 401)')
        })

        it('Should accept HTTP 201 as success', () => {
            setMockResponse(201, { created: true })
            var result = etoroFetch('/api/v1/create', 'post', {})
            assertEqual(result.created, true)
        })

        it('Should include response body in error message', () => {
            setMockResponse(500, 'Server broke')
            assertThrows(() => etoroFetch('/api/v1/broken'), 'Server broke')
        })
    })

    describe('isMarketOpen — weekday during market hours', () => {
        it('Should return true on Monday at 10:00 ET', () => {
            global.Utilities.formatDate = () => 'Mon,10,00'
            assertEqual(isMarketOpen(), true)
        })

        it('Should return true on Wednesday at 09:30 ET (market open)', () => {
            global.Utilities.formatDate = () => 'Wed,09,30'
            assertEqual(isMarketOpen(), true)
        })

        it('Should return true on Friday at 15:59 ET (1 min before close)', () => {
            global.Utilities.formatDate = () => 'Fri,15,59'
            assertEqual(isMarketOpen(), true)
        })
    })

    describe('isMarketOpen — weekday outside market hours', () => {
        it('Should return false on Monday at 09:29 ET (1 min before open)', () => {
            global.Utilities.formatDate = () => 'Mon,09,29'
            assertEqual(isMarketOpen(), false)
        })

        it('Should return false on Tuesday at 16:00 ET (market close)', () => {
            global.Utilities.formatDate = () => 'Tue,16,00'
            assertEqual(isMarketOpen(), false)
        })

        it('Should return false on Thursday at 20:00 ET (evening)', () => {
            global.Utilities.formatDate = () => 'Thu,20,00'
            assertEqual(isMarketOpen(), false)
        })

        it('Should return false on Friday at 04:00 ET (pre-market)', () => {
            global.Utilities.formatDate = () => 'Fri,04,00'
            assertEqual(isMarketOpen(), false)
        })
    })

    describe('isMarketOpen — weekends', () => {
        it('Should return false on Saturday at 12:00 ET', () => {
            global.Utilities.formatDate = () => 'Sat,12,00'
            assertEqual(isMarketOpen(), false)
        })

        it('Should return false on Sunday at 10:00 ET', () => {
            global.Utilities.formatDate = () => 'Sun,10,00'
            assertEqual(isMarketOpen(), false)
        })
    })

    describe('isMarketOpen — uses America/New_York timezone', () => {
        it('Should pass America/New_York as timezone arg', () => {
            var capturedTz = null
            // eslint-disable-next-line no-unused-vars
            global.Utilities.formatDate = (_date, tz, _fmt) => {
                capturedTz = tz
                return 'Mon,10,00'
            }
            isMarketOpen()
            assertEqual(capturedTz, 'America/New_York')
        })
    })

    return printSummary()
}

runTests()
