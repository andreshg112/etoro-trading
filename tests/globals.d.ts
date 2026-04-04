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
declare const ACCOUNT_MODE: string

declare function getScriptProperty(key: string): string
declare function getEtoroHeaders(): EtoroHeaders
declare function etoroFetch(
    endpoint: string,
    method?: string,
    payload?: Record<string, unknown>,
): any
declare function logAndNotify(type: string, context: string, message: any): void
declare function logAndNotifyError(context: string, error: any): void
declare function logAndNotifyWarning(context: string, message: any): void

// ── EtoroApi.js globals ────────────────────────────────────────────────────

declare function searchInstrument(symbol: string): EtoroSearchResult
declare function getInstrumentId(symbol: string): number
declare function getMarketRates(instrumentIds: number[]): EtoroRatesResponse
declare function getHistoricalCandles(
    instrumentId: number,
    interval?: string,
    count?: number,
): EtoroCandleResponse
declare function getPortfolio(): EtoroPortfolioResponse
declare function isMarketOpen(): boolean

declare function openPosition(
    instrumentId: number,
    amount: number,
    isBuy?: boolean,
    leverage?: number,
    stopLossRate?: number,
    takeProfitRate?: number,
): EtoroOrderResult
declare function closePosition(
    positionId: number,
    instrumentId: string,
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

declare function main(): void
declare function executeDecision(
    decision: GeminiDecision,
    botPositions: EtoroPosition[],
    instrumentMap: InstrumentMap,
): void
declare function executeBuy(action: GeminiAction): void
declare function executeSellClose(
    action: GeminiAction,
    botPositions: EtoroPosition[],
    instrumentMap: InstrumentMap,
): void
declare function buildInstrumentMap(): InstrumentMap
declare function fetchCandlesMap(instrumentMap: InstrumentMap): CandlesMap
declare function getBotPortfolio(instrumentMap: InstrumentMap): {
    botPortfolio: EtoroPortfolioResponse
    availableCash: number
}
declare function testEtoroConnection(): void
declare function testGetPortfolio(): void
declare function testGeminiConnection(): void

// ── Validator.js globals ───────────────────────────────────────────────────

declare function validateEtoroSearch(data: any): void
declare function validateEtoroRates(data: any): void
declare function validateEtoroCandles(data: any): void
declare function validateEtoroPortfolio(data: any): void
declare function validateEtoroPositions(rawPositions: any[]): void
declare function validateEtoroOpenOrder(data: any): void
declare function validateEtoroCloseOrder(data: any): void
declare function validateGeminiDecision(decision: any): void
declare function normalizePosition(p: RawEtoroPosition): EtoroPosition
