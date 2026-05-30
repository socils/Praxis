/**
 * =========================================================================
 * PRAXIS CORE ASSISTANT SYSTEM - ENGINE v3.0 (EDICIÓN INTEGRADA)
 * Desarrollado para: Praxis Platform
 * Autor original: Alonso (Fundador de Alonixz-Group)
 * Infraestructura: Firebase Realtime Database, Auth & Google Generative AI
 * =========================================================================
 */
import { marked } from "https://cdn.jsdelivr.net/npm/marked/lib/marked.esm.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase, ref, set, get } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

// ==========================================
// CONFIGURACIÓN E INICIALIZACIÓN DEL SISTEMA
// ==========================================
const firebaseConfig = {
    apiKey: "AIzaSyAUopIjgNXXAzDNhnp_E9krHVwPiwD0WQ8",
    authDomain: "praxis-79b9a.firebaseapp.com",
    projectId: "praxis-79b9a",
    databaseURL: "https://praxis-79b9a-default-rtdb.firebaseio.com",
    storageBucket: "praxis-79b9a.firebasestorage.app",
    messagingSenderId: "596083977949",
    appId: "1:596083977949:web:71064f89a23f8d9738f534"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const storage = getStorage(app);
const auth = getAuth(app);

// Exposición global para interoperabilidad con el ecosistema web de Praxis
window.praxisDb = db;
window.praxisStorage = storage;
window.praxisAuth = auth;

// ==========================================
// VARIABLES DE ESTADO Y MEMORIA ACTIVA
// ==========================================
let currentUserData = null;
let currentUid = null;
let misAgendasData = {}; 
let allowDataContext = true; 

// Historiales de conversación (Conversación fluida independiente)
let chatHistory = []; 
let searchChatHistory = []; // Memoria persistente para re-preguntas en la ventana de búsqueda

// El array plano unificado que alimenta tu buscador interactivo
let tasksList = [];

// ==========================================
// REFERENCIAS AUTOMÁTICAS DE LA INTERFAZ UI
// ==========================================
// Panel Principal del Chat
const chatBox = document.getElementById('chatBox');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
const modelSelect = document.getElementById('modelSelect');
const middlePlaceholder = document.getElementById('middlePlaceholder');
const chatScrollContainer = chatBox ? chatBox.parentElement : null;

// Modales y Controles de Autenticación / Créditos
const authModal = document.getElementById('authModal');
const googleAuthBtn = document.getElementById('googleAuthBtn');
const creditsModal = document.getElementById('creditsModal');
const openCreditsBtn = document.getElementById('openCreditsBtn');
const closeCreditsBtn = document.getElementById('closeCreditsBtn');

// Modal de Búsqueda Global Integrada (Atajos de tu código nativo)
const searchModal = document.getElementById("search-modal");
const searchInput = document.getElementById("search-input");
const searchResults = document.getElementById("search-results");
const btnResumirIA = document.getElementById("btn-resumir-ia");
const searchIAEngine = document.getElementById("search-ia-engine");
const searchIAStatus = document.getElementById("search-ia-status");
const searchIAResponseBox = document.getElementById("search-ia-response-box");

// ==========================================
// 1. RECONSTRUCCIÓN CRIPTOGRÁFICA DEL TOKEN SEGURO
// ==========================================
function getSecureKey() {
    const _d = {    
        "45": "-", "46": ".", "47": "/", "61": "=", "95": "_",
        "48": "0", "49": "1", "50": "2", "51": "3", "52": "4", "53": "5", "54": "6", "55": "7", "56": "8", "57": "9",    
        "65": "A", "66": "B", "67": "C", "68": "D", "69": "E", "70": "F", "71": "G", "72": "H", "73": "I", "74": "J",    
        "75": "K", "76": "L", "77": "M", "78": "N", "79": "O", "80": "P", "81": "Q", "82": "R", "83": "S", "84": "T",    
        "85": "U", "86": "V", "87": "W", "88": "X", "89": "Y", "90": "Z",    
        "97": "a", "98": "b", "99": "c", "100": "d", "101": "e", "102": "f", "103": "g", "104": "h", "105": "i", "106": "j",    
        "107": "k", "108": "l", "109": "m", "110": "n", "111": "o", "112": "p", "113": "q", "114": "r", "115": "s", "116": "t",    
        "117": "u", "118": "v", "119": "w", "120": "x", "121": "y", "122": "z"
    };
    const _s = [
        65, 81, 46, 65, 98, 56, 82, 78, 54, 73, 76, 85, 105, 70, 121, 65,
        83, 45, 110, 101, 51, 83, 108, 122, 82, 49, 49, 120, 77, 55, 83, 100,
        83, 83, 72, 66, 90, 90, 76, 69, 104, 106, 78, 110, 111, 110, 79, 80,
        82, 72, 99, 48, 81
    ];
    return _s.map(code => _d[code]).join('');
}

// ==========================================
// 2. COMPORTAMIENTO Y LÓGICA DE INTERFAZ UI
// ==========================================
if (openCreditsBtn && creditsModal) {
    openCreditsBtn.addEventListener('click', () => creditsModal.style.display = 'flex');
}
if (closeCreditsBtn && creditsModal) {
    closeCreditsBtn.addEventListener('click', () => creditsModal.style.display = 'none');
}

function appendMessage(text, sender) {
    if (!chatBox) return null;
    
    if (middlePlaceholder && middlePlaceholder.style.opacity !== '0') {
        middlePlaceholder.style.opacity = '0';
        setTimeout(() => middlePlaceholder.style.display = 'none', 500);
    }

    const msgDiv = document.createElement('div');
    msgDiv.classList.add('message', sender);
    msgDiv.innerText = text;
    chatBox.appendChild(msgDiv);
    
    if (chatScrollContainer) {
        chatScrollContainer.scrollTop = chatScrollContainer.scrollHeight;
    }
    return msgDiv;
}

// ==========================================
// 3. ENLACE DE FIREBASE AUTH Y ESCANEO EN TIEMPO REAL
// ==========================================
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUid = user.uid;
        if (authModal) authModal.style.display = 'none';
        console.log("UID Verificado en Praxis:", currentUid);

        const userRef = ref(db, `usuarios/${currentUid}`);
        
        try {
            const snapshot = await get(userRef);
            if (snapshot.exists()) {
                currentUserData = snapshot.val();
            } else {
                currentUserData = {
                    email: user.email,
                    displayName: user.displayName || "Estudiante Praxis",
                    createdAt: new Date().toISOString(),
                    rol: "alumno"
                };
                await set(userRef, currentUserData);
            }

            // Llamar a la carga síncrona transversal de tareas
            fetchAllUserTasks();

        } catch (error) {
            console.error("Error en el escaneo profundo de Praxis DB:", error);
        }
    } else {
        currentUid = null;
        currentUserData = null;
        misAgendasData = {};
        chatHistory = []; 
        searchChatHistory = [];
        tasksList = [];
        if (authModal) authModal.style.display = 'flex';
    }
});

// Función centralizada encargada de mapear los dos universos de datos
function fetchAllUserTasks() {
    if (!currentUid) return;

    tasksList = [];
    const userAgendasRef = ref(db, `usuarios/${currentUid}/mis_agendas`);

    get(userAgendasRef).then((snapshot) => {
        if (snapshot.exists()) {
            const promises = [];
            misAgendasData = {}; // Reset estructurado

            snapshot.forEach((agendaSnapshot) => {
                const agendaId = agendaSnapshot.key;
                const agendaName = agendaSnapshot.child("nombre").val() || agendaId;
                const tasksRef = ref(db, `agendas/${agendaId}/tareas`);
                
                const promise = get(tasksRef).then((tasksSnapshot) => {
                    if (tasksSnapshot.exists()) {
                        const tareasBD = tasksSnapshot.val();
                        
                        // Guardar datos en el formato estructurado de árbol para el chat principal
                        misAgendasData[agendaId] = {
                            detalles: { nombre: agendaName },
                            tareas: tareasBD
                        };

                        // Guardar en la matriz plana para el buscador instantáneo
                        tasksSnapshot.forEach((taskSnapshot) => {
                            tasksList.push({
                                id: taskSnapshot.key,
                                agendaId: agendaId,
                                agendaNombre: agendaName,
                                ...taskSnapshot.val()
                            });
                        });
                    } else {
                        misAgendasData[agendaId] = {
                            detalles: { nombre: agendaName },
                            tareas: "Sin tareas registradas"
                        };
                    }
                });
                promises.push(promise);
            });

            return Promise.all(promises).then(() => {
                console.log("Sincronización completa. Buscador indexado:", tasksList);
                console.log("Árbol mapeado de agendas:", misAgendasData);
            });
        }
    }).catch((error) => {
        console.error("Fallo de mapeo asíncrono en Praxis Core:", error);
    });
}

if (googleAuthBtn) {
    googleAuthBtn.addEventListener('click', async () => {
        const provider = new GoogleAuthProvider();
        try {
            googleAuthBtn.innerText = "Sincronizando...";
            await signInWithPopup(auth, provider);
        } catch (error) {
            console.error(error);
            alert("Acceso denegado.");
            googleAuthBtn.innerText = "Continuar con Google";
        }
    });
}

window.toggleDataContext = function(checkbox) {
    allowDataContext = checkbox.checked;
    console.log("Permiso de transferencia de contexto:", allowDataContext);
};

// Auxiliar: Transformador de tareas para blindar la estructura interna de Firebase en el chat
function serializarTareasParaIA(agendasObjeto) {
    if (!agendasObjeto || Object.keys(agendasObjeto).length === 0) {
        return "No hay tareas registradas en el sistema actualmente.";
    }

    let textoEstructurado = "";
    for (const codigoAgenda in agendasObjeto) {
        const nodoAgenda = agendasObjeto[codigoAgenda];
        textoEstructurado += `\n--- AGENDA: ${nodoAgenda.detalles?.nombre || codigoAgenda} ---\n`;
        
        const tareas = nodoAgenda.tareas;
        if (!tareas || tareas === "Sin tareas registradas" || Object.keys(tareas).length === 0) {
            textoEstructurado += "  (Esta agenda no tiene tareas pendientes registradas)\n";
            continue;
        }

        let contador = 1;
        for (const idTarea in tareas) {
            const t = tareas[idTarea];
            textoEstructurado += `  ${contador}. [${(t.estado || 'Pendiente').toUpperCase()}] Título: ${t.titulo || t.name || 'Sin título'} | Materia: ${t.materia || 'General'}\n`;
            textoEstructurado += `     - Entrega: ${t.fecha || t.fechaEntrega || 'No especificada'}\n`;
            textoEstructurado += `     - Indicaciones: ${t.descripcion || t.desc || 'Sin detalles'}\n`;
            contador++;
        }
    }
    return textoEstructurado;
}

// ==========================================
// 4. CHAT PRINCIPAL: CONTROL INTERACTIVO
// ==========================================
async function handleSend() {
    const queryText = userInput.value.trim();
    if (!queryText) return;

    appendMessage(queryText, 'user');
    userInput.value = '';

    const loadingMsg = appendMessage('Praxis Assist está memorizando y procesando...', 'assistant');

    const key = getSecureKey();
    const selectedModel = modelSelect ? modelSelect.value : "gemini-1.5-flash"; 
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${key}`;

    let promptFinal = queryText;
    
    if (allowDataContext && currentUid) {
        const listadoTareasTexto = serializarTareasParaIA(misAgendasData);
        
        let contextMessage = "\n\n[INFORMACIÓN CRÍTICA DEL ALUMNO - DATOS EXTRAÍDOS DE PRAXIS]:\n";
        contextMessage += `ID Estudiante: ${currentUid}\n`;
        contextMessage += `TAREAS REALES ENCONTRADAS:\n${listadoTareasTexto}\n\n`;
        contextMessage += "REGLA DE RESPUESTA BINDANTE: No ignores los datos de arriba. Está estrictamente prohibido inventar o asumir tareas de bienvenida o inducción. Si el alumno te pregunta qué tareas tiene, lee la lista anterior, extrae sus nombres reales, y muéstraselas detalladamente. Si la lista dice que no hay tareas, indícale con honestidad que no registra deberes escolares pendientes.";
        
        promptFinal += contextMessage;
    }

    chatHistory.push({
        role: "user",
        parts: [{ text: promptFinal }]
    });

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: chatHistory, 
                systemInstruction: {
                    parts: [{ text: "Eres Praxis Assist, la IA oficial de la plataforma educativa Praxis, desarrollada por Alonso (fundador de Alonixz-Group) sobre la infraestructura de Firebase. Tu rol es el de un asesor académico avanzado, directo y eficiente. No eres frío ni robótico; mantienes un tono intermedio, profesional, fresco y colaborativo. Tu prioridad absoluta es explicar conceptos complejos de forma sumamente sencilla y estructurada, usando los datos de sus agendas cuando sea necesario." }]
                }
            })
        });

        const data = await response.json();
        
        if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) {
            const botResponse = data.candidates[0].content.parts[0].text;
            loadingMsg.innerText = botResponse;

            chatHistory.push({
                role: "model",
                parts: [{ text: botResponse }]
            });
        } else {
            loadingMsg.innerText = "Error. El sistema no pudo procesar esta estructura de datos.";
            chatHistory.pop();
        }
    } catch (error) {
        console.error(error);
        loadingMsg.innerText = "Error crítico de red al enlazar con el Core de Praxis.";
        chatHistory.pop();
    }
}

if (sendBtn) sendBtn.addEventListener('click', handleSend);
if (userInput) {
    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSend();
    });
}

// ==========================================
// 5. MODAL DE BÚSQUEDA GLOBAL (SISTEMA INTEGRADO DESDE INTERRUPCIÓN)
// ==========================================

// Atrapada de Control de Atajos de Teclado (Ctrl + K) con Limpieza de Interfaz nativa de tu script
window.addEventListener("keydown", (e) => {
    if (e.ctrlKey && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (searchModal) {
            const isHidden = searchModal.classList.toggle("hidden");
            if (!isHidden) {
                if (searchInput) searchInput.value = "";
                if (searchResults) searchResults.innerHTML = "";
                
                if (searchIAResponseBox) {
                    searchIAResponseBox.style.display = "none";
                    searchIAResponseBox.innerText = "";
                }
                if (searchIAEngine) searchIAEngine.style.display = "none";
                
                searchChatHistory = []; // Reset de memoria de análisis
                if (searchInput) searchInput.focus();
                fetchAllUserTasks(); // Recarga de contingencia instantánea
            }
        }
    }
});

// Evento de filtrado nativo en el input por Título o Asignatura
if (searchInput && searchResults) {
    searchInput.addEventListener("input", (e) => {
        const queryStr = e.target.value.toLowerCase().trim();
        searchResults.innerHTML = "";

        if (queryStr === "") return;

        const filtered = tasksList.filter(task => {
            const title = (task.titulo || "").toLowerCase();
            const subject = (task.materia || "").toLowerCase();
            return title.includes(queryStr) || subject.includes(queryStr);
        });

        if (filtered.length === 0) {
            const noResults = document.createElement("div");
            noResults.style.padding = "20px";
            noResults.style.textAlign = "center";
            noResults.style.color = "#a0aec0";
            noResults.style.fontSize = "0.9rem";
            noResults.textContent = "No se encontraron tareas con ese nombre";
            searchResults.appendChild(noResults);
            return;
        }

        filtered.forEach(task => {
            const item = document.createElement("div");
            item.classList.add("search-item");
            item.innerHTML = `
                <div class="search-item-header">
                    <span class="search-item-title">${task.titulo || 'Sin título'}</span>
                    <span class="search-item-subject">${task.materia || 'General'}</span>
                </div>
                <div class="search-item-desc">${task.descripcion || 'Sin descripción'}</div>
                <div style="font-size: 0.75rem; color: #a0aec0; margin-top: 2px;">Agenda: ${task.agendaNombre}</div>
            `;

            item.addEventListener("click", () => {
                if (searchModal) searchModal.classList.add("hidden");
                if (typeof window.onTaskSelected === "function") {
                    window.onTaskSelected(task);
                }
            });

            searchResults.appendChild(item);
        });
    });
}

// Botón de Resumen con IA del Buscador con tu Plantilla Estricta Obligatoria
if (btnResumirIA) {
    btnResumirIA.addEventListener("click", async () => {
        if (tasksList.length === 0) {
            if (searchIAResponseBox) {
                searchIAResponseBox.innerText = "No tienes tareas registradas en tus agendas actuales para poder generar un resumen.";
                searchIAResponseBox.style.display = "block";
            }
            return;
        }

        // Bloqueos visuales nativos de tu UI
        btnResumirIA.disabled = true;
        if (searchIAResponseBox) searchIAResponseBox.style.display = "none";
        if (searchIAEngine) searchIAEngine.style.display = "flex";

        // Animación simulada de sincronización tal cual la definiste
        if (searchIAStatus) searchIAStatus.innerText = "Sincronizando hilos de tareas...";
        await new Promise(r => setTimeout(r, 600));
        if (searchIAStatus) searchIAStatus.innerText = "Estructurando resumen con Gemini...";

        // Formatear mapeado limpio lineal de tareas
        const tareasTexto = tasksList.map((t, idx) => {
            return `${idx + 1}. [${t.materia || 'General'}] ${t.titulo || 'Sin título'}: ${t.descripcion || 'Sin descripción'} (Agenda: ${t.agendaNombre})`;
        }).join("\n");

        const key = getSecureKey();
        const urlEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`;

        // Obtener entrada de usuario para permitir chat interactivo continuo sobre el resumen
        const consultaUsuario = (searchInput && searchInput.value.trim()) || "Genera mi reporte de actividades pendientes.";

        let promptActual = `${consultaUsuario}\n\n[LISTADO DE ACTIVIDADES A EVALUAR]:\n${tareasTexto}`;

        // Empaquetar mensaje en el historial del buscador
        searchChatHistory.push({
            role: "user",
            parts: [{ text: promptActual }]
        });

        try {
            const respuesta = await fetch(urlEndpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: searchChatHistory, // Enviamos el array completo para habilitar memoria de re-preguntas
                    systemInstruction: {
                        parts: [{ text: `Actúa como el asistente de optimización académica de Praxis, desarrollado por Alonso. Tu respuesta inicial debe comenzar obligatoriamente con la frase exacta: "Hola, soy el asistente de Praxis impulsado por Gemini. Esta es una función beta, aquí tienes un resumen de tus tareas y de cómo puedes realizarlas."

Analiza el listado de actividades provisto por el usuario y genera el reporte estructurándolo estrictamente bajo el siguiente esquema limpio, sin añadir comentarios de soporte ni advertencias técnicas:

Hola, soy el asistente de Praxis impulsado por Gemini. Esta es una función beta, aquí tienes un resumen de tus tareas y de cómo puedes realizarlas.

He detectado tareas en: [Lista concisa de materias encontradas].
Por: [Breve resumen ejecutivo de las temáticas o entregas principales].

Pasos para solucionarlas:
1. [Consejo de organización o por cuál actividad prioritaria comenzar].
2. [Estrategia lógica para avanzar con las materias restantes].
3. [Tip técnico para optimizar tu tiempo de estudio].

Puedes revisar el estado completo de tus actividades en la plataforma principal visitando: socils.github.io/Praxis/menu` }]
                    }
                })
            });

            const data = await respuesta.json();

            if (data.error) {
                if (searchIAResponseBox) {
                    searchIAResponseBox.innerHTML = `<b>[ERROR DE SISTEMA]:</b> No se pudo procesar el resumen.`;
                    searchIAResponseBox.style.display = "block";
                }
                searchChatHistory.pop();
                return;
            }
if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts[0]) {
    const resultadoIA = data.candidates[0].content.parts[0].text;
    
    if (searchIAResponseBox) {
        // Renderizado con el formateador completo de Markdown
    searchIAResponseBox.innerHTML = marked.parse(resultadoIA);
        searchIAResponseBox.style.display = "block";
    }
    if (searchIAEngine) searchIAEngine.style.display = "none";

    searchChatHistory.push({
        role: "model",
        parts: [{ text: resultadoIA }]
    });
}

        } catch (err) {
            console.error(err);
            if (searchIAEngine) searchIAEngine.style.display = "none";
            if (searchIAResponseBox) {
                searchIAResponseBox.innerText = "Error de red al intentar conectar con el módulo de análisis.";
                searchIAResponseBox.style.display = "block";
            }
            searchChatHistory.pop();
        } finally {
            btnResumirIA.disabled = false;
        }
    });
}

// Interceptación de la tecla Enter en el input para re-preguntar de forma fluida a la IA del buscador
if (searchInput) {
    searchInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
            if ((searchIAResponseBox && searchIAResponseBox.style.display === "block") || searchInput.value.startsWith("/")) {
                e.preventDefault(); 
                if (btnResumirIA) btnResumirIA.click();
            }
        }
    });
}function formatearTextoIACompleto(texto) {
    if (!texto) return "";

    // 1. Escapar HTML para evitar que el código se rompa o haya inyecciones
    let html = texto
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

    // 2. Líneas divisorias (---) -> Convertir en etiquetas <hr>
    html = html.replace(/^---$/gm, "<hr class='praxis-hr'>");

    // 3. Encabezados principales (## Título) -> Convertir en <h2>
    html = html.replace(/^##\s+(.+)$/gm, "<h2 class='praxis-h2'>$1</h2>");

    // 4. Encabezados secundarios (### Título) -> Convertir en <h3>
    html = html.replace(/^###\s+(.+)$/gm, "<h3 class='praxis-h3'>$1</h3></h3>");

    // 5. Negrita + Itálica de tres asteriscos (***texto***) -> <b><i>texto</i></b>
    html = html.replace(/\*\*\*([\s\S]*?)\*\*\*/g, "<b><i>$1</i></b>");

    // 6. Negritas normales de dos asteriscos (**texto**) -> <b>texto</b>
    html = html.replace(/\*\*([\s\S]*?)\*\*/g, "<b>$1</b>");

    // 7. Listas con viñetas (Líneas que inician con * o -)
    html = html.replace(/^\s*[\-\*]\s+(.+)$/gm, "<li class='praxis-li'>$1</li>");

    // 8. Envolver bloques de líneas <li> consecutivas en un <ul> para mantener orden
    // (Opcional, pero ayuda a que los estilos de lista no se rompan)
    html = html.replace(/(<li class='praxis-li'>.*<\/li>)/g, "<ul class='praxis-ul'>$1</ul>");
    // Limpieza de etiquetas ul duplicadas consecutivas
    html = html.replace(/<\/ul>\s*<ul class='praxis-ul'>/g, "");

    // 9. Preservar los saltos de línea convirtiendo los \n restantes en <br>
    html = html.replace(/\n/g, "<br>");

    // Limpieza de saltos de línea dobles innecesarios alrededor de bloques estructurales
    html = html.replace(/(<\/h2>|<\/h3>|<\/hr>|<\/ul>)<br>/g, "$1");

    return html;
}