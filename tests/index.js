#!/usr/bin/env node
/**
 * Main test runner - executes all test files and aggregates results
 *
 * Usage: node tests/index.js
 * Or with npm: npm test
 */

import { readdir } from 'fs/promises'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { spawn } from 'child_process'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// ANSI color codes for pretty output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    cyan: '\x1b[36m',
}

/**
 * Runs a single test file and captures output
 * @param {string} testFile - Path to test file
 * @returns {Promise<{file: string, passed: boolean, output: string}>}
 */
function runTestFile(testFile) {
    return new Promise((resolve) => {
        const testProcess = spawn('node', [testFile], {
            cwd: dirname(testFile),
        })

        let output = ''
        let errorOutput = ''

        testProcess.stdout.on('data', (data) => {
            output += data.toString()
        })

        testProcess.stderr.on('data', (data) => {
            errorOutput += data.toString()
        })

        testProcess.on('close', (code) => {
            const passed = code === 0 && !errorOutput
            resolve({
                file: testFile,
                passed,
                output: output + errorOutput,
            })
        })
    })
}

/**
 * Extracts test summary from test output
 * @param {string} output - Test output text
 * @returns {{passed: number, failed: number, total: number}}
 */
function extractSummary(output) {
    const passedMatch = output.match(/Passed: (\d+)/)
    const failedMatch = output.match(/Failed: (\d+)/)
    const totalMatch = output.match(/Total: (\d+)/)

    return {
        passed: passedMatch ? parseInt(passedMatch[1]) : 0,
        failed: failedMatch ? parseInt(failedMatch[1]) : 0,
        total: totalMatch ? parseInt(totalMatch[1]) : 0,
    }
}

/**
 * Main test runner
 */
async function runAllTests() {
    console.log(
        `${colors.bright}${colors.cyan}╔═══════════════════════════════════════╗${colors.reset}`,
    )
    console.log(
        `${colors.bright}${colors.cyan}║              Test Suite               ║${colors.reset}`,
    )
    console.log(
        `${colors.bright}${colors.cyan}╚═══════════════════════════════════════╝${colors.reset}\n`,
    )

    try {
        // Find all .test.js files in tests directory
        const files = await readdir(__dirname)
        const testFiles = files
            .filter((file) => file.endsWith('.test.js'))
            .map((file) => join(__dirname, file))
            .sort()

        if (testFiles.length === 0) {
            console.log(`${colors.yellow}No test files found!${colors.reset}`)
            process.exit(1)
        }

        console.log(`Found ${testFiles.length} test file(s):\n`)

        // Run all test files
        const results = []
        for (const testFile of testFiles) {
            const fileName = testFile.split('/').pop()
            console.log(`${colors.bright}Running ${fileName}...${colors.reset}`)
            const result = await runTestFile(testFile)
            results.push(result)

            // Show output from this test
            console.log(result.output)

            if (!result.passed) {
                console.log(`${colors.red}✗ ${fileName} FAILED${colors.reset}\n`)
            } else {
                console.log(`${colors.green}✓ ${fileName} PASSED${colors.reset}\n`)
            }
        }

        // Aggregate results
        console.log(
            `${colors.bright}${colors.cyan}═══════════════════════════════════════${colors.reset}`,
        )
        console.log(
            `${colors.bright}${colors.cyan}         AGGREGATE TEST RESULTS        ${colors.reset}`,
        )
        console.log(
            `${colors.bright}${colors.cyan}═══════════════════════════════════════${colors.reset}\n`,
        )

        let totalPassed = 0
        let totalFailed = 0
        let totalTests = 0
        let allPassed = true

        results.forEach((result) => {
            const summary = extractSummary(result.output)
            totalPassed += summary.passed
            totalFailed += summary.failed
            totalTests += summary.total

            if (!result.passed) {
                allPassed = false
            }
        })

        console.log(`Test Files:    ${results.length}`)
        console.log(
            `${colors.green}Passed Tests:  ${totalPassed}${colors.reset}${totalFailed > 0 ? ` / ${totalTests}` : ''}`,
        )
        if (totalFailed > 0) {
            console.log(`${colors.red}Failed Tests:  ${totalFailed}${colors.reset}`)
        }
        console.log(`Total Tests:   ${totalTests}`)

        console.log()

        if (allPassed && totalFailed === 0) {
            console.log(`${colors.bright}${colors.green}✓ All tests passed! 🎉${colors.reset}\n`)
            process.exit(0)
        } else {
            console.log(`${colors.bright}${colors.red}✗ Some tests failed${colors.reset}\n`)
            process.exit(1)
        }
    } catch (error) {
        console.error(`${colors.red}Error running tests:${colors.reset}`, error)
        process.exit(1)
    }
}

// Run tests
runAllTests()
