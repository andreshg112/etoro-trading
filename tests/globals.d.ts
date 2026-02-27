// ===========================================================================
// Global declarations for eval-loaded source functions in tests
// ===========================================================================
// Source files (Config.js, EtoroApi.js, GeminiApi.js, Code.js) are loaded
// into the global scope via eval() by loadSourceFiles() in testUtils.js.
// The TS language server can't infer these globals statically, so we
// declare them here for IntelliSense and type-checking in test files.
// ===========================================================================

// ── Config.js globals ──────────────────────────────────────────────────────

declare const ETORO_BASE_URL: string
declare const GEMINI_BASE_URL: string
declare const WATCHLIST: string[]

declare function getScriptProperty(key: string): string
declare function getEtoroHeaders(): EtoroHeaders
declare function etoroFetch(
    endpoint: string,
    method?: string,
    payload?: Record<string, unknown>,
): any

// ── EtoroApi.js globals ────────────────────────────────────────────────────

declare function searchInstrument(symbol: string): EtoroSearchResult
declare function getInstrumentId(symbol: string): number
declare function getMarketRates(instrumentIds: number[]): EtoroRatesResponse
declare function getHistoricalCandles(
    instrumentId: number,
    interval?: string,
    count?: number,
): EtoroCandleResponse
declare function getDemoPortfolio(): EtoroPortfolioResponse
declare function isMarketOpen(): boolean

declare function openDemoPosition(
    instrumentId: number,
    amount: number,
    isBuy?: boolean,
    leverage?: number,
    stopLossRate?: number,
    takeProfitRate?: number,
): EtoroOrderResult
declare function closeDemoPosition(
    positionId: number,
    unitsToDeduct?: number | null,
): EtoroCloseResult

// ── GeminiApi.js globals ───────────────────────────────────────────────────

declare function askGemini(prompt: string): GeminiDecision
declare function buildGeminiPrompt(
    instrumentMap: InstrumentMap,
    ratesData: EtoroRatesResponse,
    candlesMap: CandlesMap,
    portfolio: EtoroPortfolioResponse,
    availableCash: number,
): string

// ── Code.js globals ────────────────────────────────────────────────────────

declare function executeDecision(
    decision: GeminiDecision,
    currentPositions: EtoroPosition[],
    instrumentMap: InstrumentMap,
): void
declare function main(): void
declare function testEtoroConnection(): void
declare function testGetPortfolio(): void
declare function testGeminiConnection(): void
