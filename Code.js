function consultarPrecioVOO() {
    // 1. Configuración del Endpoint
    // Nota: Revisa en api-portal.etoro.com el endpoint exacto para precios/instrumentos.
    // Suele ser algo parecido a esto:
    var url = 'https://api.etoro.com/v1/instruments/VOO/quote'

    // 2. Tu Clave de Seguridad (API Key)

    // 3. Preparamos la petición
    var opciones = {
        method: 'get',
        headers: {
            // El portal de eToro usa Azure API Management, por lo que este suele ser el header requerido:
            'Ocp-Apim-Subscription-Key':
                PropertiesService.getScriptProperties().getProperty('ETORO_API_KEY'),
            'Content-Type': 'application/json',
        },
        // Esto evita que el script colapse si eToro devuelve un error 400 o 401
        muteHttpExceptions: true,
    }

    try {
        // 4. Ejecutamos la llamada a eToro
        var respuesta = UrlFetchApp.fetch(url, opciones)
        var codigoHTTP = respuesta.getResponseCode()
        var contenido = respuesta.getContentText()

        // 5. Evaluamos la respuesta
        if (codigoHTTP === 200) {
            var datosJSON = JSON.parse(contenido)
            Logger.log('✅ Conexión exitosa a eToro.')

            // Imprimimos el JSON completo para que veas qué estructura te devuelve
            Logger.log(datosJSON)

            // Si la API te devuelve un campo "price" directo, podrías llamarlo así:
            // Logger.log('El precio actual de VOO es: $' + datosJSON.price);
        } else {
            Logger.log('❌ Error de conexión. Código HTTP: ' + codigoHTTP)
            Logger.log('Detalle del error: ' + contenido)
        }
    } catch (error) {
        Logger.log('🚨 Fallo crítico en el script: ' + error.toString())
    }
}
