// ===========================================================================
// Configuration & Shared Utilities
// ===========================================================================
// Constants, authentication helpers, and the generic eToro fetch wrapper.
// All functions are available globally in Google Apps Script.
// ===========================================================================

// ── Constants ──────────────────────────────────────────────────────────────

var ETORO_BASE_URL = 'https://public-api.etoro.com'
var GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta'

/** Assets to monitor for trading opportunities (read from Script Properties) */
var WATCHLIST = getScriptProperty('WATCHLIST')
    .split(',')
    .map(function (s) {
        return s.trim()
    })

/** Account mode: 'DEMO' or 'REAL' (read from Script Properties) */
var ACCOUNT_MODE = getScriptProperty('ACCOUNT_MODE')

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
    /** @type {GoogleAppsScript.URL_Fetch.URLFetchRequestOptions} */
    var options = {
        method: /** @type {GoogleAppsScript.URL_Fetch.HttpMethod} */ (method || 'get'),
        headers: /** @type {any} */ (getEtoroHeaders()),
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

/**
 * Logs an error and sends an email notification to the script owner.
 * @param {string} context - Where the error happened
 * @param {any} error - The error object or message
 */
function logAndNotifyError(context, error) {
    var errorMessage = String(error)
    console.error(context + ': ' + errorMessage)
    try {
        var email = Session.getEffectiveUser().getEmail()
        var subject = '\uD83D\uDEA8 eToro Bot Alert (' + ACCOUNT_MODE + ')'
        var body =
            'An error occurred in your eToro Trading Bot.\n\n' +
            'Context: ' +
            context +
            '\n' +
            'Error: ' +
            errorMessage +
            '\n\n' +
            'Please check the Apps Script executions dashboard for more details.'
        MailApp.sendEmail(email, subject, body)
    } catch (e) {
        console.error('Failed to send notification email: ' + String(e))
    }
}
