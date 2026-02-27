// ===========================================================================
// Type Definitions for eToro & Gemini AI Trading Bot
// ===========================================================================
// Provides precise types for all API responses, shared data structures,
// and function signatures. Used by the TypeScript language service (via
// jsconfig.json with checkJs) for IntelliSense and strict type-checking.
//
// This file is NOT deployed to Apps Script (clasp only pushes .js/.gs).
// ===========================================================================

// ── eToro Authentication ───────────────────────────────────────────────────

interface EtoroHeaders {
    'x-api-key': string
    'x-user-key': string
    'x-request-id': string
    'Content-Type': string
}

// ── eToro Search ───────────────────────────────────────────────────────────

interface EtoroSearchItem {
    instrumentId: number
    internalSymbolFull: string
    displayname: string
}

interface EtoroSearchResult {
    items: EtoroSearchItem[]
    totalItems: number
}

// ── eToro Market Rates ─────────────────────────────────────────────────────

interface EtoroRate {
    instrumentID: number
    ask: number
    bid: number
    lastExecution: number
}

interface EtoroRatesResponse {
    rates: EtoroRate[]
}

// ── eToro Historical Candles ───────────────────────────────────────────────

interface EtoroCandle {
    fromDate: string
    open: number
    high: number
    low: number
    close: number
}

interface EtoroCandleInstrument {
    instrumentId: number
    candles: EtoroCandle[]
}

interface EtoroCandleResponse {
    candles: EtoroCandleInstrument[]
}

// ── eToro Portfolio ────────────────────────────────────────────────────────

/**
 * Raw position shape returned by the eToro API.
 * Field names use inconsistent casing (positionID, instrumentID)
 * and PnL is nested under unrealizedPnL.pnL.
 * Normalized to EtoroPosition in getBotPortfolio().
 */
interface RawEtoroPosition {
    positionId?: number
    positionID?: number
    instrumentId?: number
    instrumentID?: number
    isBuy: boolean
    openRate: number
    amount: number
    units: number
    leverage: number
    pnL?: number
    unrealizedPnL?: { pnL: number }
    stopLossRate: number
    takeProfitRate: number
}

interface EtoroPosition {
    positionId: number
    instrumentId: number
    isBuy: boolean
    openRate: number
    amount: number
    units: number
    leverage: number
    pnL: number
    stopLossRate: number
    takeProfitRate: number
}

interface EtoroPendingOrder {
    amount?: number
}

interface EtoroClientPortfolio {
    credit: number
    positions?: EtoroPosition[]
    ordersForOpen?: EtoroPendingOrder[]
}

interface RawEtoroClientPortfolio {
    credit: number
    positions?: RawEtoroPosition[]
    ordersForOpen?: EtoroPendingOrder[]
}

interface EtoroPortfolioResponse {
    clientPortfolio: EtoroClientPortfolio
}

interface RawEtoroPortfolioResponse {
    clientPortfolio: RawEtoroClientPortfolio
}

// ── eToro Order Results ────────────────────────────────────────────────────

interface EtoroOrderResult {
    orderId: number
}

interface EtoroCloseResult {
    positionId: number
}

// ── Gemini AI ──────────────────────────────────────────────────────────────

interface GeminiAction {
    type: string
    symbol: string
    instrumentId?: number
    amount?: number
    positionId?: number
    stopLossRate?: number
    takeProfitRate?: number
    reason: string
}

interface GeminiDecision {
    analysis: string
    actions?: GeminiAction[]
}

// ── Shared Maps & Summaries ────────────────────────────────────────────────

/** Maps ticker symbols to eToro instrument IDs (e.g. { VOO: 1234 }) */
interface InstrumentMap {
    [symbol: string]: number
}

/** Maps ticker symbols to candle response data */
interface CandlesMap {
    [symbol: string]: EtoroCandleResponse | undefined
}

/** Summarized rate info keyed by symbol, used in prompt construction */
interface RatesSummary {
    [symbol: string]: { ask: number; bid: number; last: number }
}

/** Summarized OHLC candles keyed by symbol, used in prompt construction */
interface CandlesSummary {
    [symbol: string]: { date: string; open: number; high: number; low: number; close: number }[]
}

/** Position info enriched with resolved symbol, used in prompt construction */
interface PositionSummary {
    positionId: number
    symbol: string
    instrumentId: number
    isBuy: boolean
    openRate: number
    amount: number
    units: number
    leverage: number
    pnL: number
    stopLossRate: number
    takeProfitRate: number
}
