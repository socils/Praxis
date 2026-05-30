/**
 * =========================================================================
 * PRAXIS CORE ASSISTANT SYSTEM - ENGINE v3.1 (EDICIÓN ULTRA BLINDADA)
 * Desarrollado para: Praxis Platform
 * Autor original: Alonso (Fundador de Alonixz-Group)
 * Infraestructura: Firebase Realtime Database, Auth & Google Generative AI
 * =========================================================================
 */
import { marked } from "https://cdn.jsdelivr.net/npm/marked/lib/marked.esm.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase, ref, set, get, push, remove } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
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

// Memoria y persistencia de sesiones de chat (Límite: 3)
let idChatActual = null; 
let listaChatsActivos = {}; 

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

// Historiales de conversación
let chatHistory = []; 
let searchChatHistory = []; 

// El array plano unificado que alimenta tu buscador interactivo
let tasksList = [];

// ==========================================
// REFERENCIAS AUTOMÁTICAS DE LA INTERFAZ UI
// ==========================================
const chatBox = document.getElementById('chatBox');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
const modelSelect = document.getElementById('modelSelect');
const middlePlaceholder = document.getElementById('middlePlaceholder');
const chatScrollContainer = chatBox ? chatBox.parentElement : null;

const authModal = document.getElementById('authModal');
const googleAuthBtn = document.getElementById('googleAuthBtn');
const creditsModal = document.getElementById('creditsModal');
const openCreditsBtn = document.getElementById('openCreditsBtn');
const closeCreditsBtn = document.getElementById('closeCreditsBtn');

const searchModal = document.getElementById("search-modal");
const searchInput = document.getElementById("search-input");
const searchResults = document.getElementById("search-results");
const btnResumirIA = document.getElementById("btn-resumir-ia");
const searchIAEngine = document.getElementById("search-ia-engine");
const searchIAStatus = document.getElementById("search-ia-status");
const searchIAResponseBox = document.getElementById("search-ia-response-box");

// Elementos de la barra lateral para su control
const toggleSidebarBtn = document.getElementById("toggleSidebarBtn");
const chatSidebar = document.getElementById("chatSidebar");
const sidebarOverlay = document.getElementById("sidebarOverlay");

function toggleSidebar() {
    if (chatSidebar) {
        chatSidebar.classList.toggle("expanded");
    }
}

if (toggleSidebarBtn) {
    toggleSidebarBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        toggleSidebar();
    });
}

if (sidebarOverlay) {
    sidebarOverlay.addEventListener("click", toggleSidebar);
}

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
    
    // Forzar conversión a string por seguridad y limpiar basura del búfer
    let cleanText = String(text).replace(/\[object Object\]/g, "").replace(/undefined/g, "").trim();

    if (middlePlaceholder && middlePlaceholder.style.opacity !== '0') {
        middlePlaceholder.style.opacity = '0';
        setTimeout(() => middlePlaceholder.style.display = 'none', 500);
    }

    const msgDiv = document.createElement('div');
    msgDiv.classList.add('message', sender);
    
    // Si el remitente es la IA, renderiza el Markdown y las tablas como HTML real
    if (sender === 'model' || sender === 'assistant') {
        msgDiv.innerHTML = typeof formatearTextoIACompleto === "function" 
            ? formatearTextoIACompleto(cleanText) 
            : cleanText;
    } else {
        // Para el usuario, texto plano seguro
        msgDiv.innerText = cleanText;
    }
    
    chatBox.appendChild(msgDiv);
    
    if (chatScrollContainer) {
        chatScrollContainer.scrollTop = chatScrollContainer.scrollHeight;
    }
    return msgDiv;
}
// ==========================================
// 3. ENLACE DE FIREBASE AUTH Y SCONEO
// ==========================================
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUid = String(user.uid); 
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

function fetchAllUserTasks() {
    if (!currentUid) return;

    tasksList = [];
    const userAgendasRef = ref(db, `usuarios/${currentUid}/mis_agendas`);

    get(userAgendasRef).then((snapshot) => {
        if (snapshot.exists()) {
            const promises = [];
            misAgendasData = {}; 

            snapshot.forEach((agendaSnapshot) => {
                const agendaId = agendaSnapshot.key;
                const agendaName = agendaSnapshot.child("nombre").val() || agendaId;
                const tasksRef = ref(db, `agendas/${agendaId}/tareas`);
                
                const promise = get(tasksRef).then((tasksSnapshot) => {
                    if (tasksSnapshot.exists()) {
                        const tareasBD = tasksSnapshot.val();
                        
                        misAgendasData[agendaId] = {
                            detalles: { nombre: String(agendaName) },
                            tareas: tareasBD
                        };

                        tasksSnapshot.forEach((taskSnapshot) => {
                            // Validar que no procese el nodo de control 'inicio' en el buscador global
                            if (taskSnapshot.key !== 'inicio') {
                                tasksList.push({
                                    id: taskSnapshot.key,
                                    agendaId: agendaId,
                                    agendaNombre: String(agendaName),
                                    ...taskSnapshot.val()
                                });
                            }
                        });
                    } else {
                        misAgendasData[agendaId] = {
                            detalles: { nombre: String(agendaName) },
                            tareas: "Sin tareas registradas"
                        };
                    }
                });
                promises.push(promise);
            });

            return Promise.all(promises).then(() => {
                console.log("Sincronización completa. Buscador indexado:", tasksList);
                console.log("Árbol mapeado de agendas:", misAgendasData);
                cargarEstructuraChats();
            });
        } else {
            cargarEstructuraChats();
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
};// Auxiliar: Transformador de tareas para blindar la estructura interna de Firebase en el chat
function serializarTareasParaIA(agendasObjeto) {
    if (!agendasObjeto || typeof agendasObjeto !== 'object' || Object.keys(agendasObjeto).length === 0) {
        return "No tienes tareas registradas en el sistema actualmente.";
    }

    let textoEstructurado = "";
    
    for (const codigoAgenda in agendasObjeto) {
        if (!Object.prototype.hasOwnProperty.call(agendasObjeto, codigoAgenda)) continue;
        
        const nodoAgenda = agendasObjeto[codigoAgenda];
        if (!nodoAgenda || typeof nodoAgenda !== 'object') continue;

        const nombreAgenda = nodoAgenda.detalles?.nombre || codigoAgenda;
        const tareas = nodoAgenda.tareas;
        
        if (!tareas || tareas === "Sin tareas registradas" || typeof tareas !== 'object' || Object.keys(tareas).length === 0) {
            continue;
        }

        let textoTareasAgenda = "";
        let contador = 1;
        
        for (const idTarea in tareas) {
            if (!Object.prototype.hasOwnProperty.call(tareas, idTarea)) continue;
            
            // Exclusión de nodos inicializadores automáticos del sistema
            if (idTarea === 'inicio' || idTarea === 'detalles' || idTarea === 'config') continue;

            const t = tareas[idTarea];
            
            // Aseguramos que el nodo de la tarea sea un objeto puro con sus campos definidos
            if (t && typeof t === 'object' && !Array.isArray(t)) {
                const titulo = t.titulo || t.name || t.nombre || '';
                const materia = t.materia || 'General';
                const fecha = t.fecha || t.fechaEntrega || 'No especificada';
                const descripcion = t.descripcion || t.desc || 'Sin detalles';
                const estado = (t.estado || 'Pendiente').toUpperCase();

                // Conversión forzada a String plano e higienizado
                const strTitulo = String(titulo).trim();
                const strMateria = String(materia).trim();
                const strFecha = String(fecha).trim();
                const strDesc = String(descripcion).trim();

                if (strTitulo === "" || strTitulo === "[object Object]") continue;

                textoTareasAgenda += `  ${contador}. [${estado}] Título: ${strTitulo} | Materia: ${strMateria}\n`;
                textoTareasAgenda += `     - Entrega: ${strFecha}\n`;
                textoTareasAgenda += `     - Indicaciones: ${strDesc}\n`;
                contador++;
            }
        }

        if (contador > 1) {
            textoEstructurado += `\n--- AGENDA: ${nombreAgenda} ---\n` + textoTareasAgenda;
        }
    }
    
    return textoEstructurado.trim() === "" ? "No tienes tareas académicas pendientes." : textoEstructurado;
}
// ==========================================
// 4. CHAT PRINCIPAL: CONTROL INTERACTIVO (VERSIÓN ULTRA-BLINDADA)
// ==========================================
// ==========================================
// 4. CHAT PRINCIPAL: CONTROL INTERACTIVO (VERSIÓN INTEGRAL BLINDADA)
// ==========================================
async function handleSend() {
    const queryText = userInput.value.trim();
    if (!queryText) return;

    if (!currentUid) {
        alert("Debes iniciar sesión para interactuar con Praxis Assistant.");
        return;
    }

    const cantidadChats = Object.keys(listaChatsActivos || {}).length;
    
    if (cantidadChats >= 3 && !idChatActual) {
        const memoryAlert = document.getElementById("memoryAlert");
        if (memoryAlert) memoryAlert.style.display = "block";
        
        const errorMsg = appendMessage("⚠️ Al parecer la memoria está llena. Elimina un chat en el panel para continuar.", "assistant");
        if (errorMsg) {
            errorMsg.style.color = "#ff007f";
            errorMsg.style.fontWeight = "bold";
        }
        return;
    }

    // Mostrar el mensaje limpio en la UI
    appendMessage(queryText, 'user');
    userInput.value = '';

    const loadingMsg = appendMessage('Praxis Assist está memorizando y procesando...', 'assistant');

    const key = getSecureKey();
    const selectedModel = modelSelect ? modelSelect.value : "gemini-1.5-flash-8b"; 
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${key}`;

    // AÑADIR PREGUNTA LIMPIA AL HISTORIAL REAL (Esto evita que se guarde basura en Firebase)
    chatHistory.push({
        role: "user",
        parts: [{ text: queryText }]
    });

    // CLONACIÓN PROFUNDA EXCLUSIVA PARA LA API (Aísla la memoria RAM)
    let historialParaEnviarAPI = JSON.parse(JSON.stringify(chatHistory));

    // Si está permitido, inyectamos el contexto académico SOLO al final del clon efímero
    if (allowDataContext && misAgendasData) {
        const listadoTareasTexto = serializarTareasParaIA(misAgendasData);
        
        let contextMessage = "\n\n[INFORMACIÓN CRÍTICA DEL ALUMNO - DATOS EXTRAÍDOS DE PRAXIS]:\n";
        contextMessage += `ID Estudiante: ${String(currentUid)}\n`;
        contextMessage += `TAREAS REALES ENCONTRADAS:\n${listadoTareasTexto}\n\n`;
        contextMessage += "REGLA DE RESPUESTA BINDANTE: No ignores los datos de arriba. Queda estrictamente prohibido inventar tareas o usar la palabra o marcador '[object Object]'. Si el alumno te pregunta qué tareas tiene, lee la lista anterior, extrae sus nombres reales de las materias y muéstraselas detalladamente de forma muy limpia. Si la lista está vacía, indícaselo con honestidad.";
        
        historialParaEnviarAPI[historialParaEnviarAPI.length - 1].parts[0].text += contextMessage;
    }

   try {
        // REGLAS ESTRICTAS DE RESPUESTA PARA EL COMPORTAMIENTO DE GEMINI
        const instruccionesDelSistema = 
            "Eres Praxis Assist, la IA oficial de la plataforma educativa Praxis, desarrollada por Alonso (fundador de Alonixz-Group) sobre la infraestructura de Firebase. Tu rol es el de un asesor académico avanzado, directo y eficiente. Mantienes un tono profesional, fresco y colaborativo.\n\n" +
            "REGLAS DE FORMATO OBLIGATORIAS QUE DEBES SEGUIR BAJO CUALQUIER CIRCUNSTANCIA:\n" +
            "1. PROHIBICIÓN ABSOLUTA DE LATEX: Queda terminantemente prohibido usar delimitadores de dólar '$' o '$$' para encerrar variables, fórmulas o ecuaciones matemáticas. Tampoco utilices estructuras con barra invertida como \\frac, \\sum o \\bar.\n" +
            "2. FORMATO MATEMÁTICO PERMITIDO: Escribe los símbolos y las variables en texto plano legible o usando caracteres Unicode estándar directamente en la línea de texto. Ejemplo:\n" +
            "   - Media Aritmética: x̄ = (Σ (Xi * fi)) / N\n" +
            "   - Mediana: Me = Li + [ ((N/2) - Fi-1) / fi ] * A\n" +
            "   - Moda: Mo = Li + [ d1 / (d1 + d2) ] * A\n" +
            "3. FORMATO DE TABLAS ESTRICTO: Cuando presentes distribuciones de frecuencias, datos estadísticos o clasificaciones por intervalos, utiliza ÚNICAMENTE el formato de tablas nativo de Markdown mediante barras verticales '|' y guiones divisores. Es OBLIGATORIO que dejes un salto de línea en blanco antes y un salto de línea en blanco después de toda la estructura de la tabla para que no se corrompa el renderizado en la interfaz. Ejemplo:\n" +
            "   | Intervalo | Xi | fi | Fi |\n" +
            "   | :--- | :---: | :---: | :---: |\n" +
            "   | [10 - 20) | 15 | 4 | 4 |\n" +
            "4. CONTROL DE ENTRADA: Queda estrictamente prohibido imprimir la cadena '[object Object]' o 'undefined'. Si detectas que un dato extraído del contexto del alumno no es legible o viene vacío, omítelo por completo.";

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: historialParaEnviarAPI.map(h => ({
                    role: h.role,
                    parts: h.parts.map(p => ({ text: String(p.text) }))
                })), 
                systemInstruction: {
                    parts: [{ text: instruccionesDelSistema }]
                },
                generationConfig: {
                    temperature: 0.3, // Una temperatura baja reduce la variabilidad y asegura el cumplimiento estricto de las reglas
                    topP: 0.95
                }
            })
        });

        const data = await response.json();
        
        if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) {
            const botResponse = data.candidates[0].content.parts[0].text;
            
            loadingMsg.remove(); // Eliminamos el "procesando..."
            appendMessage(botResponse, 'model'); // Renderizamos el nuevo mensaje de forma limpia a través de marked

            // Almacenar respuesta purificada en memoria de sesión
            chatHistory.push({
                role: "model",
                parts: [{ text: botResponse }]
            });

            if (!idChatActual) {
                const chatsRef = ref(db, `usuarios/${currentUid}/chats_guardados`);
                const nuevoChatRef = push(chatsRef); 
                idChatActual = nuevoChatRef.key;
            }
            
            // Guardar en Firebase el historial PURO sin inyecciones pesadas de contexto
            const chatEspecificoRef = ref(db, `usuarios/${currentUid}/chats_guardados/${idChatActual}`);
            await set(chatEspecificoRef, {
                ultimaModificacion: new Date().toISOString(),
                historial: chatHistory
            });

            if (typeof cargarEstructuraChats === "function") {
                cargarEstructuraChats();
            }

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
}function formatearTextoIACompleto(texto) {
    if (!texto) return "";

    // 1. LIMPIEZA DE SEGURIDAD: Convertimos todo a string y eliminamos basura
    let textoLimpio = String(texto)
        .replace(/\[object Object\]/g, "")
        .replace(/undefined/g, "")
        .trim();

    try {
        const renderer = new marked.Renderer();

        // 2. CONFIGURACIÓN DE MARCADO: Habilitamos las tablas explícitamente
        marked.setOptions({
            renderer: renderer,
            breaks: true,
            gfm: true,
            tables: true // <--- ¡ESTA ES LA CLAVE QUE FALTABA!
        });

        // 3. RENDERIZADO: Usamos marked.parse en lugar de marked.parse(textoLimpio) directamente
        return marked.parse(textoLimpio);

    } catch (error) {
        console.error("Error en renderizado:", error);
        return textoLimpio;
    }
}
window.formatearTextoIACompleto = formatearTextoIACompleto;
// ==========================================
// 7. PERSISTENCIA DE CHATS (MÁXIMO 3)
// ==========================================
async function cargarEstructuraChats() {
    if (!currentUid) return;
    
    const chatsRef = ref(db, `usuarios/${currentUid}/chats_guardados`);
    try {
        const snapshot = await get(chatsRef);
        const listaChatsGuardados = document.getElementById("listaChatsGuardados");
        const memoryAlert = document.getElementById("memoryAlert");
        
        if (!listaChatsGuardados) return;
        listaChatsGuardados.innerHTML = ""; 
        
        let cantidadChats = 0;

        if (snapshot.exists()) {
            listaChatsActivos = snapshot.val();
            cantidadChats = Object.keys(listaChatsActivos).length;
            
            if (cantidadChats >= 3 && !idChatActual) {
                if (memoryAlert) memoryAlert.style.display = "block";
                if (userInput) {
                    userInput.disabled = true;
                    userInput.placeholder = "Memoria llena. Elimina un chat para continuar...";
                }
                if (sendBtn) sendBtn.disabled = true;
            } else {
                if (memoryAlert) memoryAlert.style.display = "none";
                if (userInput) {
                    userInput.disabled = false;
                    userInput.placeholder = "Pregúntale a la IA de Praxis...";
                }
                if (sendBtn) sendBtn.disabled = false;
            }

            for (const chatId in listaChatsActivos) {
                if (!Object.prototype.hasOwnProperty.call(listaChatsActivos, chatId)) continue;
                const infoChat = listaChatsActivos[chatId];
                
                let tituloPestana = "Conversación vacía";
                if (infoChat.historial && infoChat.historial[0] && infoChat.historial[0].parts && infoChat.historial[0].parts[0]) {
                    const textoSucio = String(infoChat.historial[0].parts[0].text);
                    tituloPestana = textoSucio.split("[INFORMACIÓN CRÍTICA")[0].trim().substring(0, 22) + "...";
                }
                
                const esActivo = idChatActual === chatId;
                
                const itemChat = document.createElement("div");
                itemChat.style.cssText = `display: flex; justify-content: space-between; align-items: center; background: ${esActivo ? 'rgba(0, 255, 102, 0.05)' : '#0f0f0f'}; border: 1px solid ${esActivo ? '#00ff66' : '#1a1a1a'}; padding: 10px; border-radius: 8px; margin-bottom: 8px; transition: all 0.2s ease;`;
                
                const btnCargar = document.createElement("div");
                btnCargar.innerText = tituloPestana;
                btnCargar.style.cssText = `color: ${esActivo ? '#00ff66' : '#ccc'}; cursor: pointer; font-size: 0.8rem; flex-grow: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: ${esActivo ? 'bold' : 'normal'};`;
                btnCargar.onclick = () => {
                    switchChatSession(chatId);
                    if (window.innerWidth <= 768) toggleSidebar(); 
                };
                
                const btnEliminar = document.createElement("button");
                btnEliminar.innerText = "✕";
                btnEliminar.style.cssText = "background: transparent; border: none; color: #ff007f; cursor: pointer; font-weight: bold; font-size: 0.8rem; padding: 0 4px; opacity: 0.6; transition: opacity 0.2s;";
                btnEliminar.onmouseover = () => btnEliminar.style.opacity = "1";
                btnEliminar.onmouseout = () => btnEliminar.style.opacity = "0.6";
                btnEliminar.onclick = (e) => {
                    e.stopPropagation(); 
                    eliminarChatSession(chatId);
                };
                
                itemChat.appendChild(btnCargar);
                itemChat.appendChild(btnEliminar);
                listaChatsGuardados.appendChild(itemChat);
            }
        } else {
            listaChatsActivos = {};
            if (memoryAlert) memoryAlert.style.display = "none";
            
            const emptyNotice = document.createElement("div");
            emptyNotice.innerText = "No hay chats guardados.";
            emptyNotice.style.cssText = "color: #444; font-size: 0.75rem; text-align: center; margin-top: 15px; font-style: italic;";
            listaChatsGuardados.appendChild(emptyNotice);
        }
    } catch (error) {
        console.error("Fallo al procesar el menú lateral de Praxis:", error);
    }
}
// Función B: Alternar e inyectar el historial cargado en el chatBox principal
function switchChatSession(chatId) {
    idChatActual = chatId;
    
    // Rompemos la referencia de memoria RAM clonando el objeto a fondo
    if (listaChatsActivos[chatId] && listaChatsActivos[chatId].historial) {
        chatHistory = JSON.parse(JSON.stringify(listaChatsActivos[chatId].historial));
    } else {
        chatHistory = [];
    }
    
    if (chatBox) {
        chatBox.innerHTML = "";
        if (middlePlaceholder) middlePlaceholder.style.display = "none";

       chatHistory.forEach(msg => {
            if (!msg.parts || !msg.parts[0]) return;
            
            let cleanText = String(msg.parts[0].text).split("[INFORMACIÓN CRÍTICA DEL ALUMNO")[0].trim();
            // Filtro de seguridad fulminante
            cleanText = cleanText.replace(/\[object Object\]/g, "").replace(/undefined/g, "").trim();
            
            if (cleanText) {
                const msgDiv = document.createElement('div');
                msgDiv.classList.add('message', msg.role === 'user' ? 'user' : 'assistant');
                msgDiv.innerHTML = (msg.role === 'model' || msg.role === 'assistant') 
                    ? formatearTextoIACompleto(cleanText) 
                    : cleanText;
                chatBox.appendChild(msgDiv);
            }
        });
        
        if (chatScrollContainer) {
            chatScrollContainer.scrollTop = chatScrollContainer.scrollHeight;
        }
    }
    cargarEstructuraChats();
}

async function eliminarChatSession(chatId) {
    if (!currentUid) return;
    const chatRef = ref(db, `usuarios/${currentUid}/chats_guardados/${chatId}`);
    await remove(chatRef);
    
    if (idChatActual === chatId) {
        idChatActual = null;
        chatHistory = [];
        if (chatBox) chatBox.innerHTML = "";
        if (middlePlaceholder) {
            middlePlaceholder.style.display = "block";
            middlePlaceholder.style.opacity = "1";
        }
    }
    cargarEstructuraChats();
}

const btnNuevoChat = document.getElementById("btnNuevoChat");
if (btnNuevoChat) {
    btnNuevoChat.addEventListener("click", () => {
        const cantidadChats = Object.keys(listaChatsActivos || {}).length;
        
        if (cantidadChats >= 3) {
            alert("No puedes crear un nuevo chat. Has alcanzado el límite máximo de 3 ranuras de memoria.");
            return;
        }
        
        idChatActual = null;
        chatHistory = [];
        if (chatBox) chatBox.innerHTML = "";
        if (middlePlaceholder) {
            middlePlaceholder.style.display = "block";
            middlePlaceholder.style.opacity = "1";
        }
        cargarEstructuraChats();
        if (window.innerWidth <= 768) toggleSidebar();
    });
}

window.cargarEstructuraChats = cargarEstructuraChats;