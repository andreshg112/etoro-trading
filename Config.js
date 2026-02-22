// ===========================================================================
// Configuration & Shared Utilities
// ===========================================================================
// Constants, authentication helpers, and the generic eToro fetch wrapper.
// All functions are available globally in Google Apps Script.
// ===========================================================================

// ── Constants ──────────────────────────────────────────────────────────────

var ETORO_BASE_URL = 'https://public-api.etoro.com'
var GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta'

/** Assets to monitor for trading opportunities */
var WATCHLIST = ['VOO', 'SCHD', 'JNJ', 'KO', 'PG', 'SLV', 'GLDM']

// ── Utility Functions ──────────────────────────────────────────────────────

/**
 * Retrieves a required script property or throws.
 * @param {string} key - Property name
 * @returns {string}
 */
function getScriptProperty(key) {
    var value = PropertiesService.getScriptProperties().getProperty(key)
    if (!value) {
        throw new Error('Missing script property: ' + key)
    }
    return value
}

/**
 * Builds the standard eToro authentication headers.
 * @returns {EtoroHeaders}
 */
function getEtoroHeaders() {
    return {
        'x-api-key': getScriptProperty('ETORO_API_KEY'),
        'x-user-key': getScriptProperty('ETORO_USER_KEY'),
        'x-request-id': Utilities.getUuid(),
        'Content-Type': 'application/json',
    }
}

/**
 * Checks whether US stock markets are currently open.
 * Markets are open Monday–Friday, 09:30–16:00 Eastern Time.
 * @returns {boolean}
 */
function isMarketOpen() {
    var now = new Date()
    var nyTime = Utilities.formatDate(now, 'America/New_York', 'EEE,HH,mm')
    var parts = nyTime.split(',')
    var day = parts[0]
    var hour = parseInt(parts[1], 10)
    var minute = parseInt(parts[2], 10)

    // Weekend check (Sat/Sun)
    if (day === 'Sat' || day === 'Sun') {
        return false
    }

    // Convert to minutes since midnight for easy range comparison
    var timeInMinutes = hour * 60 + minute
    var marketOpen = 9 * 60 + 30 // 09:30
    var marketClose = 16 * 60 // 16:00

    return timeInMinutes >= marketOpen && timeInMinutes < marketClose
}

/**
 * Makes an authenticated request to the eToro Public API.
 * @param {string} endpoint - API path (e.g. '/api/v1/market-data/search')
 * @param {string} [method='get'] - HTTP method
 * @param {Record<string, unknown>} [payload] - JSON body for POST requests
 * @returns {any} Parsed JSON response — callers provide specific return types
 */
function etoroFetch(endpoint, method, payload) {
    var options = {
        method: method || 'get',
        headers: getEtoroHeaders(),
        muteHttpExceptions: true,
    }
    if (payload) {
        options.payload = JSON.stringify(payload)
    }

    var response = UrlFetchApp.fetch(ETORO_BASE_URL + endpoint, options)
    var code = response.getResponseCode()
    var body = response.getContentText()

    if (code !== 200 && code !== 201) {
        throw new Error('eToro API error (HTTP ' + code + '): ' + body)
    }

    return JSON.parse(body)
}
