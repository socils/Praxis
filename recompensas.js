// =========================================================================
// RECOMPENSA.JS - PROCESADOR INTEGRADO CON GLOBAL SCOPE (FIREBASE V10)
// =========================================================================

// 1. MANEJO DE FECHAS FORMATO PRAXIS
function formatearFechaPraxis(dateObj) {
    const dia = String(dateObj.getDate()).padStart(2, '0');
    const mes = String(dateObj.getMonth() + 1).padStart(2, '0');
    const anio = dateObj.getFullYear();
    const hora = String(dateObj.getHours()).padStart(2, '0');
    const minutos = String(dateObj.getMinutes()).padStart(2, '0');
    return `${dia}/${mes}/${anio} ${hora}:${minutos}`;
}

function parsearFechaPraxis(str) {
    if (!str) return 0;
    const parts = str.split(' ');
    if (parts.length < 2) return 0;
    const [dia, mes, anio] = parts[0].split('/');
    const [hh, mm] = parts[1].split(':');
    let fullYear = parseInt(anio, 10);
    if (fullYear < 100) fullYear += 2000;
    return new Date(fullYear, parseInt(mes, 10) - 1, parseInt(dia, 10), parseInt(hh, 10), parseInt(mm, 10)).getTime();
}

// 2. MOTOR DE INTELIGENCIA ARTIFICIAL CON KEY GLOBAL
async function procesarTextoConIA(nombrePremioSurgido, printLogFn) {
    // Captura directa del scope global del navegador
    const keyGlobal = window.myKey;

    if (!keyGlobal) {
        printLogFn("❌ ERROR CRÍTICO: La API Key global no se ha inicializado en el navegador.", "#ff3366");
        return "ERROR_KEY_VACIA";
    }

    const promptIA = `Actúa como el motor de comandos del inventario de Praxis. Tu único objetivo es traducir un texto crudo de premio en una instrucción limpia.
Analiza el premio: "${nombrePremioSurgido}"

Reglas:
1. Si se refiere a puntos/monedas/coins: Extrae el número -> PUNTOS:[número] (Ej: "30 pts" -> PUNTOS:30)
2. Si se refiere a cuenta Plus/Premium/VIP: Extrae los días. Si no hay número usa 7 -> PLUS:[días]
3. Si es basura/inválido -> DESCONOCIDO

⚠️ Salida estricta: NO uses bloques de código markdown (\`\`\`). Responde SOLO el comando.`;

    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${keyGlobal}`;

        const respuesta = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: [{ parts: [{ text: promptIA }] }] })
        });
        
        const data = await respuesta.json();
        if (data.error || !data.candidates?.[0]?.content?.parts?.[0]?.text) return "DESCONOCIDO";
        
        let respuestaCrudaIA = data.candidates[0].content.parts[0].text;
        respuestaCrudaIA = respuestaCrudaIA.replace(/[\`\n\r\'\t]/g, '').trim();
        
        const patronPuntos = respuestaCrudaIA.match(/PUNTOS:\d+/i);
        const patronPlus = respuestaCrudaIA.match(/PLUS:\d+/i);
        
        if (patronPuntos) return patronPuntos[0].toUpperCase();
        if (patronPlus) return patronPlus[0].toUpperCase();
        
        return "DESCONOCIDO";
    } catch (e) {
        return "DESCONOCIDO";
    }
}

// 3. EJECUTOR DE COMANDOS EN EL ALMACÉN DE FIREBASE
async function ejecutarComandoPremio(uid, comandoIA, db, refFn, getFn, setFn, printLogFn) {
    if (comandoIA.startsWith("PUNTOS:")) {
        const puntosASumar = parseInt(comandoIA.split(":")[1], 10) || 10;
        const refPuntos = refFn(db, `usuarios/${uid}/stats/puntos`);
        const snapPuntos = await getFn(refPuntos);
        const puntosActuales = snapPuntos.val() || 0;
        
        await setFn(refPuntos, puntosActuales + puntosASumar);
        printLogFn(`🪙 [Almacén]: +${puntosASumar} puntos acreditados con éxito.`, "#00ff88");
        return true;
    } 
    else if (comandoIA.startsWith("PLUS:")) {
        const diasAGanar = parseInt(comandoIA.split(":")[1], 10) || 7;
        const refInplus = refFn(db, `usuarios/${uid}/inplus`);
        const refPlusExpira = refFn(db, `usuarios/${uid}/plusExpira`);
        
        const snapExpira = await getFn(refPlusExpira);
        const expireStr = snapExpira.val();
        const ahoraMs = new Date().getTime();
        let nuevaFechaBaseMs = ahoraMs;

        if (expireStr) {
            const expireTimeMs = parsearFechaPraxis(expireStr);
            if (expireTimeMs > ahoraMs) {
                printLogFn("🎟️ [Almacén]: Extendiendo vigencia Plus activa...", "#ffeb3b");
                nuevaFechaBaseMs = expireTimeMs;
            }
        }

        const msGanados = diasAGanar * 86400000;
        const nuevoStringFormateado = formatearFechaPraxis(new Date(nuevaFechaBaseMs + msGanados));

        await setFn(refInplus, true);
        await setFn(refPlusExpira, nuevoStringFormateado);
        printLogFn(`🎟️ [Almacén]: Beneficio Plus asignado por ${diasAGanar} días.`, "#00ff88");
        return true;
    }
    return false;
}

// 4. FUNCIÓN CENTRALIZADA EN CASCADA
async function ejecutarFlujoEntregaRecompensa(uid, codigoClean, nombrePremioDelCodigo, db, refFn, getFn, setFn, printLog) {
    const printLogFn = typeof printLog === 'function' ? printLog : console.log;
    printLogFn("⏳ Cargando tu recompensa...", "#ffeb3b");
    await new Promise(res => setTimeout(res, 400));

    try {
        let textoLimpio = nombrePremioDelCodigo ? nombrePremioDelCodigo.toString() : "";
        textoLimpio = textoLimpio.replace(/['"\[\]]/g, '').trim();

        printLogFn(`🤖 Analizando "${textoLimpio}" con Gemini IA...`, "#00b0ff");
        const comandoGenerado = await procesarTextoConIA(textoLimpio, printLogFn);

        if (comandoGenerado === "ERROR_KEY_VACIA" || comandoGenerado === "DESCONOCIDO") {
            printLogFn("❌ ERROR: No se pudo verificar el premio con el motor IA.", "#ff3366");
            return;
        }

        const exitoEntrega = await ejecutarComandoPremio(uid, comandoGenerado, db, refFn, getFn, setFn, printLogFn);
        if (exitoEntrega) {
            printLogFn(`🎉 ¡CÓDIGO PROCESADO E INYECTADO CORRECTAMENTE!`, "#00ff88");
        } else {
            printLogFn("❌ ERROR: Estructura rechazada en el almacén.", "#ff3366");
        }
    } catch (error) {
        printLogFn("❌ ERROR INTERNO: Fallo en el flujo guiado por IA.", "#ff3366");
    }
}