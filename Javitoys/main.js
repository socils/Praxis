// 1. TU CONFIGURACIÓN (Pega aquí tu clave completa la que termina en ZZmA)
const API_KEY = "TU_API_KEY_AQUÍ"; 

// 2. ELEMENTOS DE LA UI
const generateBtn = document.getElementById('generateBtn');
const topicInput = document.getElementById('topicInput');
const difficulty = document.getElementById('difficulty');
const cardsGrid = document.getElementById('cardsGrid');
const statusBanner = document.getElementById('statusBanner');
const statusText = document.getElementById('statusText');

// 3. FUNCIÓN DE GENERACIÓN
generateBtn.addEventListener('click', async () => {
    const topic = topicInput.value.trim();
    if (!topic) return alert("Escribe un tema");

    actualizarUI('alerta', 'Generando tarjetas con IA...');

    // Prompt optimizado
    const prompt = `Genera un JSON con 6 flashcards sobre "${topic}". 
    Nivel: ${difficulty.value}. 
    Formato: [{"q": "pregunta", "a": "respuesta"}]. 
    No escribas nada más, solo el JSON puro.`;

    try {
        // LA URL QUE FUNCIONA PARA TU NIVEL GRATUITO
        const URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

        const response = await fetch(URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        const data = await response.json();

        // Validamos si la respuesta tiene contenido
        if (data.candidates && data.candidates[0].content) {
            let rawText = data.candidates[0].content.parts[0].text;
            
            // Limpiamos posibles marcas de Markdown (```json)
            const jsonStr = rawText.replace(/```json|```/g, "").trim();
            const flashcards = JSON.parse(jsonStr);

            renderCards(flashcards);
            actualizarUI('tranquilo', '¡Tarjetas generadas con éxito!');
        } else {
            throw new Error(data.error ? data.error.message : "La IA no respondió.");
        }

    } catch (error) {
        console.error("Detalle:", error);
        actualizarUI('critico', 'Error: ' + error.message);
    }
});

// 4. FUNCIONES EXTRA
function renderCards(cards) {
    cardsGrid.innerHTML = cards.map(c => `
        <div class="flashcard" onclick="this.classList.toggle('is-flipped')">
            <div class="card-inner">
                <div class="card-front"><p>${c.q}</p></div>
                <div class="card-back"><p>${c.a}</p></div>
            </div>
        </div>
    `).join('');
}

function actualizarUI(tipo, msg) {
    statusBanner.className = `status-banner status-${tipo}`;
    statusText.innerText = msg;
}