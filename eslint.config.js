import js from '@eslint/js'
import globals from 'globals'

export default [
    {
        ignores: ['node_modules/**', 'eslint.config.js'],
    },
    js.configs.recommended,
    {
        files: ['*.js'],
        languageOptions: {
            ecmaVersion: 2020,
            sourceType: 'script',
            globals: {
                // Google Apps Script global API objects
                CalendarApp: 'readonly',
                SpreadsheetApp: 'readonly',
                Logger: 'readonly',
                Session: 'readonly',
                UrlFetchApp: 'readonly',
                PropertiesService: 'readonly',
                Utilities: 'readonly',
            },
        },
        rules: {
            'no-unused-vars': [
                'warn',
                {
                    varsIgnorePattern:
                        '^(main|testEtoroConnection|testGetPortfolio|testGeminiConnection)$',
                },
            ],
            'no-undef': [
                'error',
                {
                    typeof: true,
                },
            ],
        },
    },
    {
        // Config.js exports shared constants and functions used by all other files
        files: ['Config.js'],
        rules: {
            'no-unused-vars': [
                'warn',
                {
                    varsIgnorePattern:
                        '^(ETORO_BASE_URL|GEMINI_BASE_URL|WATCHLIST|getScriptProperty|getEtoroHeaders|etoroFetch|isMarketOpen)$',
                },
            ],
        },
    },
    {
        // EtoroApi.js exports eToro API functions used by Code.js
        files: ['EtoroApi.js'],
        languageOptions: {
            globals: {
                etoroFetch: 'readonly',
            },
        },
        rules: {
            'no-unused-vars': [
                'warn',
                {
                    varsIgnorePattern:
                        '^(searchInstrument|getInstrumentId|getMarketRates|getHistoricalCandles|getDemoPortfolio|openDemoPosition|closeDemoPosition)$',
                },
            ],
        },
    },
    {
        // GeminiApi.js exports Gemini functions used by Code.js
        files: ['GeminiApi.js'],
        languageOptions: {
            globals: {
                getScriptProperty: 'readonly',
                GEMINI_BASE_URL: 'readonly',
            },
        },
        rules: {
            'no-unused-vars': [
                'warn',
                {
                    varsIgnorePattern: '^(askGemini|buildGeminiPrompt)$',
                },
            ],
        },
    },
    {
        // Code.js uses functions from all other files
        files: ['Code.js'],
        languageOptions: {
            globals: {
                WATCHLIST: 'readonly',
                getInstrumentId: 'readonly',
                getMarketRates: 'readonly',
                getHistoricalCandles: 'readonly',
                getDemoPortfolio: 'readonly',
                openDemoPosition: 'readonly',
                closeDemoPosition: 'readonly',
                searchInstrument: 'readonly',
                askGemini: 'readonly',
                buildGeminiPrompt: 'readonly',
                isMarketOpen: 'readonly',
            },
        },
    },
    {
        // Test files use ESM and Node.js APIs; source globals are loaded via eval
        files: ['tests/**/*.js'],
        languageOptions: {
            ecmaVersion: 2020,
            sourceType: 'module',
            globals: {
                ...globals.node,
            },
        },
        rules: {
            'no-undef': 'off',
            'no-unused-vars': ['warn', { varsIgnorePattern: '^(runTests)$' }],
        },
    },
]
