/**
 * Unit tests for GeminiApi.js — askGemini and buildGeminiPrompt
 *
 * To run this file alone: node tests/GeminiApi.test.js
 */

import {
    describe,
    it,
    assertEqual,
    assertContains,
    assertThrows,
    printSummary,
    loadSourceFiles,
    installGasMocks,
} from './testUtils.js'

const { capturedRequests, resetMocks, setMockResponse } = installGasMocks()

loadSourceFiles('Config.js', 'Validator.js', 'GeminiApi.js')

// ── Helpers ────────────────────────────────────────────────────────────────

function mockGeminiResponse(jsonObj) {
    setMockResponse(200, {
        candidates: [
            {
                content: {
                    parts: [{ text: JSON.stringify(jsonObj) }],
                },
            },
        ],
    })
}

// ── Sample test data ───────────────────────────────────────────────────────

function samplePortfolio() {
    return {
        clientPortfolio: {
            credit: 10000.5,
            positions: [
                {
                    positionId: 9001,
                    instrumentId: 1234,
                    isBuy: true,
                    openRate: 500.25,
                    amount: 1000,
                    units: 2,
                    leverage: 1,
                    pnL: 50.75,
                    stopLossRate: 450,
                    takeProfitRate: 550,
                },
            ],
            ordersForOpen: [],
        },
    }
}

function sampleRatesData() {
    return {
        rates: [
            { instrumentID: 1234, ask: 510.5, bid: 510.2, lastExecution: 510.35 },
            { instrumentID: 5678, ask: 25.1, bid: 25.0, lastExecution: 25.05 },
        ],
    }
}

function sampleCandlesMap() {
    return {
        VOO: {
            candles: [
                {
                    instrumentId: 1234,
                    candles: [
                        {
                            fromDate: '2026-02-20T00:00:00Z',
                            open: 505,
                            high: 512,
                            low: 503,
                            close: 510,
                        },
                        {
                            fromDate: '2026-02-19T00:00:00Z',
                            open: 500,
                            high: 507,
                            low: 498,
                            close: 505,
                        },
                    ],
                },
            ],
        },
    }
}

// ── Tests ──────────────────────────────────────────────────────────────────

function runTests() {
    describe('askGemini', () => {
        it('Should call Gemini API with correct URL', () => {
            resetMocks()
            mockGeminiResponse({ analysis: 'OK', actions: [] })
            askGemini('Test prompt')
            assertContains(capturedRequests[0].url, 'generativelanguage.googleapis.com')
            assertContains(capturedRequests[0].url, 'gemini-2.5-flash')
            assertContains(capturedRequests[0].url, 'key=test-gemini-key')
        })

        it('Should use POST method', () => {
            resetMocks()
            mockGeminiResponse({ analysis: 'OK', actions: [] })
            askGemini('Test')
            assertEqual(capturedRequests[0].options.method, 'post')
        })

        it('Should set content type to JSON', () => {
            resetMocks()
            mockGeminiResponse({ analysis: 'OK', actions: [] })
            askGemini('Test')
            assertEqual(capturedRequests[0].options.contentType, 'application/json')
        })

        it('Should include prompt text in payload', () => {
            resetMocks()
            mockGeminiResponse({ analysis: 'OK', actions: [] })
            askGemini('Analyze market trends')
            var payload = JSON.parse(capturedRequests[0].options.payload)
            assertEqual(payload.contents[0].parts[0].text, 'Analyze market trends')
        })

        it('Should request JSON response format', () => {
            resetMocks()
            mockGeminiResponse({ analysis: 'OK', actions: [] })
            askGemini('Test')
            var payload = JSON.parse(capturedRequests[0].options.payload)
            assertEqual(payload.generationConfig.responseMimeType, 'application/json')
        })

        it('Should set temperature to 0.2', () => {
            resetMocks()
            mockGeminiResponse({ analysis: 'OK', actions: [] })
            askGemini('Test')
            var payload = JSON.parse(capturedRequests[0].options.payload)
            assertEqual(payload.generationConfig.temperature, 0.2)
        })

        it('Should parse Gemini JSON response correctly', () => {
            resetMocks()
            mockGeminiResponse({ analysis: 'Bullish', actions: [] })
            var result = askGemini('Test')
            assertEqual(result.analysis, 'Bullish')
            assertEqual(result.actions.length, 0)
        })

        it('Should throw on non-200 response', () => {
            resetMocks()
            setMockResponse(429, 'Rate limited')
            assertThrows(() => askGemini('Test'), 'Gemini API error (HTTP 429)')
        })

        it('Should set muteHttpExceptions to true', () => {
            resetMocks()
            mockGeminiResponse({ analysis: 'OK', actions: [] })
            askGemini('Test')
            assertEqual(capturedRequests[0].options.muteHttpExceptions, true)
        })
    })

    describe('buildGeminiPrompt — structure', () => {
        var instrumentMap = { VOO: 1234, SLV: 5678 }
        var prompt = buildGeminiPrompt(
            instrumentMap,
            sampleRatesData(),
            sampleCandlesMap(),
            samplePortfolio(),
            9500.5,
        )

        it('Should mention DEMO/VIRTUAL account', () => {
            assertContains(prompt, 'DEMO/VIRTUAL')
        })

        it('Should include available cash amount', () => {
            assertContains(prompt, '9500.50')
        })

        it('Should include total credit', () => {
            assertContains(prompt, '10000.50')
        })

        it('Should include ACCOUNT STATUS section', () => {
            assertContains(prompt, '## ACCOUNT STATUS')
        })

        it('Should include CURRENT OPEN POSITIONS section', () => {
            assertContains(prompt, '## CURRENT OPEN POSITIONS')
        })

        it('Should include CURRENT MARKET RATES section', () => {
            assertContains(prompt, '## CURRENT MARKET RATES')
        })

        it('Should include HISTORICAL PRICE DATA section', () => {
            assertContains(prompt, '## HISTORICAL PRICE DATA')
        })

        it('Should include INSTRUMENT ID MAP section', () => {
            assertContains(prompt, '## INSTRUMENT ID MAP')
        })

        it('Should include RESPONSE FORMAT section', () => {
            assertContains(prompt, '## RESPONSE FORMAT')
        })

        it('Should request BUY and SELL_CLOSE action types', () => {
            assertContains(prompt, 'BUY')
            assertContains(prompt, 'SELL_CLOSE')
        })

        it('Should include 10% capital limit rule', () => {
            assertContains(prompt, '10%')
            assertContains(prompt, 'NEVER invest more than 10%')
        })

        it('Should include stopLossRate in response format', () => {
            assertContains(prompt, 'stopLossRate')
        })

        it('Should include takeProfitRate in response format', () => {
            assertContains(prompt, 'takeProfitRate')
        })

        it('Should reference Hourly candles in header', () => {
            assertContains(prompt, 'Hourly Candles')
        })

        it('Should instruct to always set SL/TP on BUY orders', () => {
            assertContains(prompt, 'stopLossRate and takeProfitRate')
        })

        it('Should enforce instrumentId for BUY actions', () => {
            assertContains(prompt, 'CRITICAL: For BUY actions, you MUST use the instrumentId')
        })

        it('Should enforce symbol-based SELL_CLOSE with close-all behavior', () => {
            assertContains(prompt, 'CRITICAL: For SELL_CLOSE actions, you MUST use the symbol')
            assertContains(prompt, 'close ALL open positions for that symbol')
        })

        it('Should show separate BUY and SELL_CLOSE examples in response format', () => {
            assertContains(prompt, '"type": "BUY"')
            assertContains(prompt, '"type": "SELL_CLOSE"')
        })
    })

    describe('buildGeminiPrompt — rate mapping', () => {
        var instrumentMap = { VOO: 1234, SLV: 5678 }
        var prompt = buildGeminiPrompt(
            instrumentMap,
            sampleRatesData(),
            sampleCandlesMap(),
            samplePortfolio(),
            9500,
        )

        it('Should include VOO rate data', () => {
            assertContains(prompt, '"ask": 510.5')
        })

        it('Should include SLV rate data', () => {
            assertContains(prompt, '"ask": 25.1')
        })
    })

    describe('buildGeminiPrompt — position mapping', () => {
        var instrumentMap = { VOO: 1234 }
        var prompt = buildGeminiPrompt(
            instrumentMap,
            sampleRatesData(),
            sampleCandlesMap(),
            samplePortfolio(),
            9500,
        )

        it('Should resolve position symbol from instrumentMap', () => {
            assertContains(prompt, '"symbol": "VOO"')
        })

        it('Should include aggregated positionCount', () => {
            assertContains(prompt, '"positionCount": 1')
        })

        it('Should include aggregated totalPnL', () => {
            assertContains(prompt, '"totalPnL": 50.75')
        })

        it('Should include aggregated totalAmount', () => {
            assertContains(prompt, '"totalAmount": 1000')
        })
    })

    describe('buildGeminiPrompt — unknown positions', () => {
        /** @type {InstrumentMap} */
        var instrumentMap = {} // Empty map: position IDs won't match
        /** @type {CandlesMap} */
        var emptyCandlesMap = {}
        var prompt = buildGeminiPrompt(
            instrumentMap,
            { rates: [] },
            emptyCandlesMap,
            samplePortfolio(),
            9500,
        )

        it('Should label unknown instruments with ID', () => {
            assertContains(prompt, 'Unknown(ID:1234)')
        })
    })

    describe('buildGeminiPrompt — candle summarization', () => {
        var instrumentMap = { VOO: 1234 }
        var prompt = buildGeminiPrompt(
            instrumentMap,
            sampleRatesData(),
            sampleCandlesMap(),
            samplePortfolio(),
            9500,
        )

        it('Should include candle open price', () => {
            assertContains(prompt, '"open": 505')
        })

        it('Should include candle close price', () => {
            assertContains(prompt, '"close": 510')
        })

        it('Should include candle date', () => {
            assertContains(prompt, '2026-02-20')
        })
    })

    describe('buildGeminiPrompt — empty portfolio', () => {
        var emptyPortfolio = {
            clientPortfolio: {
                credit: 100000,
                positions: [],
                ordersForOpen: [],
            },
        }

        it('Should handle portfolio with no positions', () => {
            var prompt = buildGeminiPrompt(
                { VOO: 1234 },
                sampleRatesData(),
                {},
                emptyPortfolio,
                100000,
            )
            assertContains(prompt, '[]')
            assertContains(prompt, '100000.00')
        })
    })

    return printSummary()
}

runTests()
