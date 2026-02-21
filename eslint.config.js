import js from '@eslint/js'

export default [
    {
        ignores: ['node_modules/**', 'tests/**', 'eslint.config.js'],
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
            },
        },
        rules: {
            'no-unused-vars': [
                'warn',
                {
                    varsIgnorePattern: '^(consultarPrecioVOO)$',
                },
            ],
            'no-undef': [
                'error',
                {
                    // Allow Utils.js functions to be used globally (Apps Script behavior)
                    typeof: true,
                },
            ],
        },
    },
    {
        // Utils.js exports functions used by other files
        files: ['Utils.js'],
        rules: {
            'no-unused-vars': [
                'warn',
                {
                    // varsIgnorePattern:
                    //     '^(createBirthdayEvent|toTitleCase|parseBirthdayDate|generateEventDescription|generateBirthdayEventTitle|isValidPhoneNumber|sendSMS|getCalendarId|updateCalendarEvent|updateOrCreateBackupSheet)$',
                },
            ],
        },
    },
    {
        // Allow Utils.js functions as globals in files that use them
        files: ['Code.js'],
        languageOptions: {
            globals: {
                // createBirthdayEvent: 'readonly',
                // toTitleCase: 'readonly',
                // generateEventDescription: 'readonly',
                // generateBirthdayEventTitle: 'readonly',
                // parseBirthdayDate: 'readonly',
                // isValidPhoneNumber: 'readonly',
                // sendSMS: 'readonly',
                // getCalendarId: 'readonly',
                // updateCalendarEvent: 'readonly',
                // updateOrCreateBackupSheet: 'readonly',
            },
        },
    },
    {
        // Allow Code.js functions as globals in files that use them
        // files: ['RecrearEventosCumple.js'],
        // languageOptions: {
        //     globals: {
        //         updateOrCreateBackupSheet: 'readonly',
        //     },
        // },
    },
]
