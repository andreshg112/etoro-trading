/**
 * Shared test utilities for all test files
 * Provides a vitest-like API with describe() and it()
 */

let currentSuite = null
let suiteResults = []

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

    console.log(`\n=== ${name} ===`)
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
        console.log('✓ ' + name)
    } catch (error) {
        currentSuite.failed++
        console.log('✗ ' + name)
        if (error.message) {
            console.log('  ' + error.message)
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

    console.log('\n=== Test Summary ===')
    console.log(`Passed: ${totalPassed}`)
    console.log(`Failed: ${totalFailed}`)
    console.log(`Total: ${total}`)

    return { passed: totalPassed, failed: totalFailed, total }
}

/**
 * Resets test state (useful for running tests programmatically)
 */
export function resetTestState() {
    currentSuite = null
    suiteResults = []
}
