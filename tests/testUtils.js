/**
 * Shared test utilities for all test files
 * Provides a vitest-like API with describe() and it(), plus mock setup helpers.
 */

import { readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

let currentSuite = null
let suiteResults = []

// Save a reference to the real console before any mocks can overwrite it.
// Test framework output (describe, it, printSummary) always uses this.
const _realLog = console.log.bind(console)

/**
 * Test suite (like vitest's describe)
 * @param {string} name - Suite name
 * @param {Function} fn - Suite function containing tests
 */
export function describe(name, fn) {
    currentSuite = {
        name,
        tests: [],
        passed: 0,
        failed: 0,
    }
    suiteResults.push(currentSuite)

    _realLog(`\n=== ${name} ===`)
    fn()
}

/**
 * Individual test (like vitest's it/test)
 * @param {string} name - Test name
 * @param {Function} fn - Test function
 */
export function it(name, fn) {
    try {
        fn()
        currentSuite.passed++
        _realLog('✓ ' + name)
    } catch (error) {
        currentSuite.failed++
        _realLog('✗ ' + name)
        if (error.message) {
            _realLog('  ' + error.message)
        }
    }
}

/**
 * Assertion helper
 * @param {boolean} condition - Condition to check
 * @param {string} message - Error message if assertion fails
 */
export function assert(condition, message = 'Assertion failed') {
    if (!condition) {
        throw new Error(message)
    }
}

/**
 * Deep equality assertion
 * @param {any} actual - Actual value
 * @param {any} expected - Expected value
 * @param {string} message - Error message if assertion fails
 */
export function assertEqual(actual, expected, message = 'Values are not equal') {
    const actualStr = JSON.stringify(actual)
    const expectedStr = JSON.stringify(expected)

    if (actualStr !== expectedStr) {
        throw new Error(`${message}\n  Expected: ${expectedStr}\n  Actual: ${actualStr}`)
    }
}

/**
 * String contains assertion
 * @param {string} haystack - String to search in
 * @param {string} needle - String to search for
 * @param {string} message - Error message if assertion fails
 */
export function assertContains(
    haystack,
    needle,
    message = 'String does not contain expected value',
) {
    if (!haystack.includes(needle)) {
        throw new Error(`${message}\n  Expected "${haystack}" to contain "${needle}"`)
    }
}

/**
 * Assertion that a function throws an error
 * @param {Function} fn - Function that should throw
 * @param {string|RegExp} [errorMatch] - Optional pattern to match in error message
 * @param {string} message - Error message if assertion fails
 */
export function assertThrows(fn, errorMatch = null, message = 'Function did not throw') {
    let thrown = false
    let error = null

    try {
        fn()
    } catch (e) {
        thrown = true
        error = e
    }

    if (!thrown) {
        throw new Error(message)
    }

    if (errorMatch) {
        const errorMessage = error.message || String(error)
        const matches =
            typeof errorMatch === 'string'
                ? errorMessage.includes(errorMatch)
                : errorMatch.test(errorMessage)

        if (!matches) {
            throw new Error(
                `Error was thrown but message doesn't match\n  Expected pattern: ${errorMatch}\n  Actual: ${errorMessage}`,
            )
        }
    }
}

/**
 * Prints test summary and returns results
 * @returns {{passed: number, failed: number, total: number}}
 */
export function printSummary() {
    const totalPassed = suiteResults.reduce((sum, suite) => sum + suite.passed, 0)
    const totalFailed = suiteResults.reduce((sum, suite) => sum + suite.failed, 0)
    const total = totalPassed + totalFailed

    _realLog('\n=== Test Summary ===')
    _realLog(`Passed: ${totalPassed}`)
    _realLog(`Failed: ${totalFailed}`)
    _realLog(`Total: ${total}`)

    return { passed: totalPassed, failed: totalFailed, total }
}

/**
 * Resets test state (useful for running tests programmatically)
 */
export function resetTestState() {
    currentSuite = null
    suiteResults = []
}

// ── Mock & Setup Helpers ───────────────────────────────────────────────────

const __testDir = dirname(fileURLToPath(import.meta.url))
const __projectDir = join(__testDir, '..')

/**
 * Loads source files into the global scope via eval, simulating
 * Google Apps Script's shared global namespace.
 * @param {...string} fileNames - Source file names relative to project root
 */
export function loadSourceFiles(...fileNames) {
    const globalEval = eval
    for (const name of fileNames) {
        globalEval(readFileSync(join(__projectDir, name), 'utf8'))
    }
}

/**
 * Creates a mock HTTP response object matching UrlFetchApp.HTTPResponse.
 * @param {number} code - HTTP status code
 * @param {string | Record<string, unknown>} body - Response body (objects are JSON-stringified)
 * @returns {{ getResponseCode: () => number, getContentText: () => string }}
 */
export function createMockResponse(code, body) {
    return {
        getResponseCode: () => code,
        getContentText: () => (typeof body === 'string' ? body : JSON.stringify(body)),
    }
}

/**
 * @typedef {object} MockEnvironment
 * @property {Array<{url: string, options: any}>} capturedRequests - All captured UrlFetchApp.fetch calls
 * @property {string[]} logOutput - All captured Logger.log messages (only when captureLog is true)
 * @property {() => string} getLogText - Returns all log messages joined by newline
 * @property {(code: number, body: string | Record<string, unknown>) => void} setMockResponse - Sets the default mock HTTP response
 * @property {(urlPattern: string, code: number, body: string | Record<string, unknown>) => void} registerMockResponse - Registers a URL-pattern-matched mock response
 * @property {(newProps: Record<string, string>) => void} setProperties - Replaces all script properties
 * @property {() => void} resetMocks - Clears all mock state (requests, logs, responses — not properties)
 */

/**
 * Installs mock Google Apps Script globals (Logger, PropertiesService, Utilities,
 * UrlFetchApp) and returns a control object for managing mock state in tests.
 *
 * @param {object} [options]
 * @param {Record<string, string>} [options.properties] - Initial script properties
 * @param {boolean} [options.captureLog] - If true, Logger.log records to logOutput
 * @param {string} [options.uuid] - Mock UUID value (default: 'mock-uuid')
 * @returns {MockEnvironment}
 */
export function installGasMocks(options = {}) {
    const defaultProps = {
        ETORO_API_KEY: 'test-api-key',
        ETORO_USER_KEY: 'test-user-key',
        GEMINI_API_KEY: 'test-gemini-key',
        WATCHLIST: 'TSLA,NVDA,AMD,AAPL,META,TQQQ,BTC,ETH',
        ACCOUNT_MODE: 'DEMO',
    }
    let properties = { ...(options.properties || defaultProps) }
    const uuid = options.uuid || 'mock-uuid'

    /** @type {Array<{url: string, options: any}>} */
    const capturedRequests = []
    /** @type {string[]} */
    const logOutput = []
    /** @type {Record<string, ReturnType<typeof createMockResponse>>} */
    const mockResponses = {}
    /** @type {{ response: ReturnType<typeof createMockResponse> | null }} */
    const state = { response: null }

    // Install globals
    // Overwrite global.console so eval'd source-file calls are captured/silenced.
    // The test framework uses _realLog (saved before mocks) so it's unaffected.
    global.console = /** @type {any} */ ({
        log: (/** @type {string} */ msg) => {
            if (options.captureLog) logOutput.push(String(msg))
        },
        warn: (/** @type {string} */ msg) => {
            if (options.captureLog) logOutput.push(String(msg))
        },
        error: (/** @type {string} */ msg) => {
            if (options.captureLog) logOutput.push(String(msg))
        },
    })

    global.PropertiesService = {
        getScriptProperties: () => ({
            getProperty: (/** @type {string} */ key) => properties[key] || null,
            setProperty: (/** @type {string} */ key, /** @type {string} */ value) => {
                properties[key] = value
            },
        }),
    }

    global.Utilities = {
        getUuid: () => uuid,
        formatDate: (
            // eslint-disable-next-line no-unused-vars
            /** @type {Date} */ _date,
            // eslint-disable-next-line no-unused-vars
            /** @type {string} */ _tz,
            // eslint-disable-next-line no-unused-vars
            /** @type {string} */ _fmt,
        ) => 'Mon,10,00',
    }

    global.Session = {
        getEffectiveUser: () => ({ getEmail: () => 'test@example.com' }),
    }

    global.MailApp = {
        sendEmail: () => {},
    }

    global.UrlFetchApp = {
        fetch: (/** @type {string} */ url, /** @type {any} */ opts) => {
            capturedRequests.push({ url, options: opts })
            for (const pattern in mockResponses) {
                if (url.includes(pattern)) return mockResponses[pattern]
            }
            if (state.response) return state.response
            return createMockResponse(200, '{}')
        },
    }

    return {
        capturedRequests,
        logOutput,
        getLogText: () => logOutput.join('\n'),

        setMockResponse(code, body) {
            state.response = createMockResponse(code, body)
        },

        registerMockResponse(urlPattern, code, body) {
            mockResponses[urlPattern] = createMockResponse(code, body)
        },

        setProperties(newProps) {
            properties = { ...newProps }
        },

        resetMocks() {
            capturedRequests.length = 0
            logOutput.length = 0
            state.response = null
            for (const key in mockResponses) delete mockResponses[key]
        },
    }
}
