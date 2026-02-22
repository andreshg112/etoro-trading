/**
 * Unit tests for Config.js — constants, getScriptProperty, getEtoroHeaders, etoroFetch
 *
 * To run this file alone: node tests/Config.test.js
 */

import { describe, it, assert, assertEqual, assertThrows, printSummary } from './testUtils.js'
import { readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// ── Mock Google Apps Script globals ────────────────────────────────────────

let mockProperties = {}

global.Logger = { log: function () {} }

global.PropertiesService = {
    getScriptProperties: function () {
        return {
            getProperty: function (key) {
                return mockProperties[key] || null
            },
        }
    },
}

global.Utilities = {
    getUuid: function () {
        return 'mock-uuid-1234-5678'
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

// ── Load Config.js into global scope ───────────────────────────────────────

const configCode = readFileSync(join(__dirname, '../Config.js'), 'utf8')
const globalEval = eval
globalEval(configCode)

// ── Helper ─────────────────────────────────────────────────────────────────

function resetMocks() {
    mockProperties = {
        ETORO_API_KEY: 'test-api-key',
        ETORO_USER_KEY: 'test-user-key',
        GEMINI_API_KEY: 'test-gemini-key',
    }
    capturedRequests = []
    mockHttpResponse = {
        getResponseCode: function () {
            return 200
        },
        getContentText: function () {
            return '{"ok": true}'
        },
    }
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

        it('WATCHLIST should contain 7 symbols', () => {
            assertEqual(WATCHLIST.length, 7)
        })

        it('WATCHLIST should include VOO', () => {
            assert(WATCHLIST.includes('VOO'), 'WATCHLIST should include VOO')
        })

        it('WATCHLIST should include GLDM', () => {
            assert(WATCHLIST.includes('GLDM'), 'WATCHLIST should include GLDM')
        })
    })

    describe('getScriptProperty', () => {
        resetMocks()

        it('Should return value when property exists', () => {
            assertEqual(getScriptProperty('ETORO_API_KEY'), 'test-api-key')
        })

        it('Should throw when property is missing', () => {
            assertThrows(() => getScriptProperty('NON_EXISTENT_KEY'), 'Missing script property: NON_EXISTENT_KEY')
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
            capturedRequests = []
            etoroFetch('/api/v1/test')
            assertEqual(capturedRequests[0].options.method, 'get')
        })

        it('Should include auth headers', () => {
            capturedRequests = []
            etoroFetch('/api/v1/test')
            var headers = capturedRequests[0].options.headers
            assert(headers['x-api-key'] === 'test-api-key', 'Should have x-api-key')
            assert(headers['x-user-key'] === 'test-user-key', 'Should have x-user-key')
        })

        it('Should set muteHttpExceptions to true', () => {
            capturedRequests = []
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
            capturedRequests = []
            etoroFetch('/api/v1/trade', 'post', { Amount: 100, IsBuy: true })
            var payload = JSON.parse(capturedRequests[0].options.payload)
            assertEqual(payload.Amount, 100)
            assertEqual(payload.IsBuy, true)
        })

        it('Should not include payload for GET requests', () => {
            capturedRequests = []
            etoroFetch('/api/v1/data')
            assertEqual(capturedRequests[0].options.payload, undefined)
        })
    })

    describe('etoroFetch — error handling', () => {
        it('Should throw on HTTP 404', () => {
            mockHttpResponse = {
                getResponseCode: function () {
                    return 404
                },
                getContentText: function () {
                    return '{"message": "Not found"}'
                },
            }
            assertThrows(() => etoroFetch('/api/v1/missing'), 'eToro API error (HTTP 404)')
        })

        it('Should throw on HTTP 401', () => {
            mockHttpResponse = {
                getResponseCode: function () {
                    return 401
                },
                getContentText: function () {
                    return '{"message": "Unauthorized"}'
                },
            }
            assertThrows(() => etoroFetch('/api/v1/secret'), 'eToro API error (HTTP 401)')
        })

        it('Should accept HTTP 201 as success', () => {
            mockHttpResponse = {
                getResponseCode: function () {
                    return 201
                },
                getContentText: function () {
                    return '{"created": true}'
                },
            }
            var result = etoroFetch('/api/v1/create', 'post', {})
            assertEqual(result.created, true)
        })

        it('Should include response body in error message', () => {
            mockHttpResponse = {
                getResponseCode: function () {
                    return 500
                },
                getContentText: function () {
                    return 'Server broke'
                },
            }
            assertThrows(() => etoroFetch('/api/v1/broken'), 'Server broke')
        })
    })

    return printSummary()
}

runTests()
