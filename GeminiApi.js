// ===========================================================================
// Gemini AI Functions
// ===========================================================================
// Communication with Google AI Studio (Gemini) and prompt construction.
// Depends on Config.js (getScriptProperty, GEMINI_BASE_URL).
// ===========================================================================

/**
 * Sends a prompt to Gemini and returns the parsed JSON response.
 * @param {string} prompt - Full prompt text
 * @returns {GeminiDecision}
 */
function askGemini(prompt) {
    var apiKey = getScriptProperty('GEMINI_API_KEY')
    var url = GEMINI_BASE_URL + '/models/gemini-2.5-flash:generateContent?key=' + apiKey

    /** @type {GoogleAppsScript.URL_Fetch.URLFetchRequestOptions} */
    var options = {
        method: /** @type {GoogleAppsScript.URL_Fetch.HttpMethod} */ ('post'),
        contentType: 'application/json',
        payload: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
                responseMimeType: 'application/json',
                temperature: 0.2,
            },
        }),
        muteHttpExceptions: true,
    }

    var response = UrlFetchApp.fetch(url, options)
    var code = response.getResponseCode()
    var body = response.getContentText()

    if (code !== 200) {
        throw new Error('Gemini API error (HTTP ' + code + '): ' + body)
    }

    var data = JSON.parse(body)
    var text = data.candidates[0].content.parts[0].text
    return JSON.parse(text)
}

/**
 * Constructs the full Gemini prompt with market data and portfolio context.
 * @param {InstrumentMap} instrumentMap - Symbol-to-ID mapping
 * @param {EtoroRatesResponse} ratesData - Market rates response
 * @param {CandlesMap} candlesMap - Symbol-to-candles mapping
 * @param {EtoroPortfolioResponse} portfolio - Demo portfolio response
 * @param {number} availableCash - Calculated available cash
 * @returns {string} Complete prompt text
 */
function buildGeminiPrompt(instrumentMap, ratesData, candlesMap, portfolio, availableCash) {
    // Map rates by symbol
    /** @type {RatesSummary} */
    var ratesSummary = {}
    for (var symbol in instrumentMap) {
        var id = instrumentMap[symbol]
        var rate = ratesData.rates.find(function (r) {
            return r.instrumentID === id
        })
        if (rate) {
            ratesSummary[symbol] = { ask: rate.ask, bid: rate.bid, last: rate.lastExecution }
        }
    }

    // Summarize candles
    /** @type {CandlesSummary} */
    var candlesSummary = {}
    for (var sym in candlesMap) {
        var data = candlesMap[sym]
        if (data && data.candles && data.candles[0]) {
            candlesSummary[sym] = data.candles[0].candles.map(function (c) {
                return {
                    date: c.fromDate,
                    open: c.open,
                    high: c.high,
                    low: c.low,
                    close: c.close,
                }
            })
        }
    }

    // Summarize open positions
    var positionsSummary = (portfolio.clientPortfolio.positions || []).map(function (p) {
        var posSymbol = 'Unknown(ID:' + p.instrumentId + ')'
        for (var s in instrumentMap) {
            if (instrumentMap[s] === p.instrumentId) {
                posSymbol = s
                break
            }
        }
        return {
            positionId: p.positionId,
            symbol: posSymbol,
            instrumentId: p.instrumentId,
            isBuy: p.isBuy,
            openRate: p.openRate,
            amount: p.amount,
            units: p.units,
            leverage: p.leverage,
            pnL: p.pnL,
            stopLossRate: p.stopLossRate,
            takeProfitRate: p.takeProfitRate,
        }
    })

    return (
        'You are an autonomous day-trading AI bot operating on a DEMO/VIRTUAL eToro account. ' +
        'Your goal is to actively analyze market volatility, short-term trends, and price action ' +
        'to execute trades and compound short-term gains.\n\n' +
        '## ACCOUNT STATUS\n' +
        '- Available Cash: $' +
        availableCash.toFixed(2) +
        '\n' +
        '- Total Credit: $' +
        portfolio.clientPortfolio.credit.toFixed(2) +
        '\n\n' +
        '## CURRENT OPEN POSITIONS\n' +
        JSON.stringify(positionsSummary, null, 2) +
        '\n\n' +
        '## CURRENT MARKET RATES (real-time)\n' +
        JSON.stringify(ratesSummary, null, 2) +
        '\n\n' +
        '## HISTORICAL PRICE DATA (Last 20 Hourly Candles, newest first)\n' +
        JSON.stringify(candlesSummary, null, 2) +
        '\n\n' +
        '## INSTRUMENT ID MAP\n' +
        JSON.stringify(instrumentMap, null, 2) +
        '\n\n' +
        '## INSTRUCTIONS\n' +
        '1. Analyze the price action, trends, and volatility for each asset.\n' +
        '2. Review open positions — decide if any should be closed (take profit or cut losses).\n' +
        '3. Identify new entry opportunities based on short-term signals.\n' +
        '4. Consider available cash when sizing new positions.\n' +
        '5. NEVER invest more than 10% of available cash in a single BUY trade.\n' +
        '6. Always set a stopLossRate and takeProfitRate on every BUY order for risk management.\n' +
        '7. Be aggressive but calculated — this is a demo account for testing strategies.\n\n' +
        '## RESPONSE FORMAT\n' +
        'Respond with ONLY a JSON object:\n' +
        '{\n' +
        '  "analysis": "Brief overall market analysis",\n' +
        '  "actions": [\n' +
        '    // BUY example — uses instrumentId from INSTRUMENT ID MAP:\n' +
        '    {\n' +
        '      "type": "BUY",\n' +
        '      "symbol": "TICKER",\n' +
        '      "instrumentId": <number from INSTRUMENT ID MAP>,\n' +
        '      "amount": <USD amount>,\n' +
        '      "stopLossRate": <price to cut loss>,\n' +
        '      "takeProfitRate": <price to take profit>,\n' +
        '      "reason": "Brief reason"\n' +
        '    },\n' +
        '    // SELL_CLOSE example — uses positionId from CURRENT OPEN POSITIONS:\n' +
        '    {\n' +
        '      "type": "SELL_CLOSE",\n' +
        '      "symbol": "TICKER",\n' +
        '      "positionId": <number from CURRENT OPEN POSITIONS>,\n' +
        '      "reason": "Brief reason"\n' +
        '    }\n' +
        '  ]\n' +
        '}\n\n' +
        'Rules:\n' +
        '- CRITICAL: For BUY actions, you MUST use the instrumentId from the INSTRUMENT ID MAP.\n' +
        '- CRITICAL: For SELL_CLOSE actions, you MUST use the positionId from CURRENT OPEN POSITIONS. NEVER use the instrumentId for a SELL_CLOSE action.\n' +
        '- For BUY, specify USD amount (must not exceed available cash collectively).\n' +
        '- For BUY, always include stopLossRate and takeProfitRate.\n' +
        '- NEVER invest more than 10% of available cash in a single BUY trade.\n' +
        '- If no action is warranted, return an empty actions array with your analysis.'
    )
}
