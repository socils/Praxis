import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, push, set, onValue, get, update, remove } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

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
const auth = getAuth(app);

let modoActual = '';
const STAFF = ["ajuliuszch@gmail.com", "alonsobot080@gmail.com", "francosantosch@gmail.com"];

// SEGURIDAD DE AUTENTICACIÓN
onAuthStateChanged(auth, (user) => {
    if (user && STAFF.includes(user.email)) {
        cargarTodo();
    } else {
        alert("Acceso Restringido - Personal Autorizado");
        window.location.href = "menu.html";
    }
});

// CONTROLADORES DE MODALES DE CREACIÓN
window.abrirModal = (tipo) => {
    modoActual = tipo;
    const modal = document.getElementById('modal-editor');
    if (!modal) return;
    
    modal.style.display = 'flex';
    document.getElementById('modal-titulo').innerText = tipo === 'comunicado' ? 'Nuevo Comunicado' : 'Nueva Encuesta';
    document.getElementById('form-comunicado').style.display = tipo === 'comunicado' ? 'block' : 'none';
    document.getElementById('form-encuesta').style.display = tipo === 'encuesta' ? 'block' : 'none';
    
    if(tipo === 'encuesta') {
        document.getElementById('ops-container').innerHTML = '';
        addOp(); addOp(); 
    }
};

window.cerrarModal = () => {
    const modal = document.getElementById('modal-editor');
    if (modal) modal.style.display = 'none';
};

window.addOp = () => {
    const cont = document.getElementById('ops-container');
    if (!cont) return;
    const i = document.createElement('input');
    i.className = 'op-input';
    i.placeholder = `Opción ${cont.children.length + 1}`;
    i.style = "width: 100%; margin-bottom: 8px; padding: 12px; border-radius: 8px; border: 2px solid #000; box-sizing: border-box; font-weight:700;";
    cont.appendChild(i);
};

// PERSISTENCIA HACIA FIREBASE
window.guardar = async () => {
    const nodoPrincipal = modoActual === 'comunicado' ? 'comunicados' : 'encuestas';
    const nuevaRef = push(ref(db, nodoPrincipal));
    
    let data = { 
        fecha: new Date().toISOString(), 
        autor: auth.currentUser ? auth.currentUser.email : "Anónimo" 
    };

    if(modoActual === 'comunicado') {
        data.titulo = document.getElementById('com-tit').value.trim();
        data.msg = document.getElementById('com-msg').value.trim();
        if(!data.titulo || !data.msg) return alert("Completa todos los campos");
    } else {
        data.pre = document.getElementById('enc-pre').value.trim();
        const opcionesNodo = {}; 
        const inputs = document.querySelectorAll('.op-input');
        let contador = 0;

        inputs.forEach(input => {
            const nombreOpcion = input.value.trim();
            if(nombreOpcion !== "") {
                const claveSegura = nombreOpcion.replace(/[.#$[\]]/g, ""); 
                opcionesNodo[claveSegura] = 0; 
                contador++;
            }
        });

        data.ops = opcionesNodo;
        if(!data.pre || contador < 2) return alert("La encuesta requiere una pregunta y al menos 2 opciones.");
    }

    try {
        await set(nuevaRef, data);
        cerrarModal();
        if(document.getElementById('com-tit')) document.getElementById('com-tit').value = "";
        if(document.getElementById('com-msg')) document.getElementById('com-msg').value = "";
        if(document.getElementById('enc-pre')) document.getElementById('enc-pre').value = "";
    } catch (error) {
        alert("No se pudo conectar con Firebase");
    }
};

// ACCIÓN COMPLEMENTARIA: ELIMINAR ELEMENTOS EN TIEMPO REAL
window.eliminarElemento = async (nodo, id) => {
    if(confirm(`¿Estás seguro de que deseas eliminar de forma permanente este ítem del servidor?`)) {
        try {
            await remove(ref(db, `${nodo}/${id}`));
            alert("Ítem revocado correctamente.");
        } catch (e) {
            alert("Error al intentar remover el recurso.");
        }
    }
};

// MANEJO DE CRÉDITOS INDIVIDUALES
window.puntosPraxis = async (sumar) => {
    const uid = document.getElementById('praxis-uid').value.trim();
    const val = parseInt(document.getElementById('praxis-amt').value, 10);
    if(!uid || isNaN(val)) return alert("Campos vacíos o datos inválidos");

    const userRef = ref(db, `usuarios/${uid}`);
    try {
        const snap = await get(userRef);
        const user = snap.val();
        if(!user) return alert("El UID ingresado no corresponde a ningún estudiante");
        
        const actual = user.stats?.puntos || 0;
        const nuevo = sumar ? actual + val : Math.max(0, actual - val);
        const nombre = user.nombre || "Estudiante";

        await update(ref(db, `usuarios/${uid}/stats`), { puntos: nuevo });
        
        await push(ref(db, 'comunicados'), {
            titulo: "🏆 Premiación",
            msg: `${sumar ? 'Otorgados' : 'Retirados'} ${val} puntos de mérito a ${nombre}.`,
            fecha: new Date().toISOString(),
            autor: auth.currentUser ? auth.currentUser.email : "Sistema"
        });
        
        alert("Transacción en base de datos completada con éxito.");
        document.getElementById('praxis-uid').value = "";
        document.getElementById('praxis-amt').value = "";
    } catch (e) {
        alert("Error crítico al actualizar puntos");
    }
};

// MANEJO DE AGENDAS
window.puntosAgenda = async (sumar) => {
    const codigo = document.getElementById('agenda-cod').value.trim().toUpperCase();
    const cantidad = parseInt(document.getElementById('agenda-amt').value, 10);
    if(!codigo || isNaN(cantidad)) return alert("Datos de agenda inválidos");

    const agendaRef = ref(db, `agendas/${codigo}`);
    try {
        const snap = await get(agendaRef);
        if(!snap.exists()) return alert("El código de agenda ingresado no existe");
        
        const saldoActual = snap.val().bancoPuntos || 0;
        const nuevoSaldo = sumar ? saldoActual + cantidad : Math.max(0, saldoActual - cantidad);
        
        await update(agendaRef, { bancoPuntos: nuevoSaldo });
        alert("Saldo de Agenda sincronizado correctamente.");
        document.getElementById('agenda-cod').value = "";
        document.getElementById('agenda-amt').value = "";
    } catch (e) { 
        alert("Error de comunicación en nodo agendas"); 
    }
};

// SUBIR PRODUCTO
window.subirProducto = async () => {
    const nombre = document.getElementById('prod-nombre').value.trim();
    const descripcion = document.getElementById('prod-desc').value.trim();
    const costo = parseInt(document.getElementById('prod-precio').value, 10);
    const stock = parseInt(document.getElementById('prod-stock').value, 10);

    if(!nombre || isNaN(costo) || isNaN(stock)) return alert("Verifica los parámetros del ítem.");
    try {
        await push(ref(db, 'marketplace/productos'), {
            nombre, descripcion, costo, stock, 
            fechaRegistro: new Date().toISOString(),
            autor: auth.currentUser ? auth.currentUser.email : "Sistema",
            estado: "disponible"
        });
        alert("¡Producto inyectado en el Marketplace!");
        document.getElementById('prod-nombre').value = "";
        document.getElementById('prod-desc').value = "";
        document.getElementById('prod-precio').value = "";
        document.getElementById('prod-stock').value = "";
    } catch (e) { 
        alert("Error de publicación en almacén"); 
    }
};

// PROCESADOR PLUS
window.activarPlusDefinitivo = async function(uidUsuario = null) {
    let finalUID = uidUsuario;
    if (!finalUID) {
        const inputPlus = document.getElementById('plus-uid');
        finalUID = inputPlus ? inputPlus.value.trim() : null;
    }
    if (!finalUID) {
        alert("ERROR: Proporciona un UID válido.");
        return;
    }

    const refInPlus = ref(db, `usuarios/${finalUID}/inPlus`);
    const refPlusExpira = ref(db, `usuarios/${finalUID}/plusExpira`);
    const refRango = ref(db, `usuarios/${finalUID}/stats/rango`);

    try {
        let fechaFormateadaPraxis = "";
        const inputCustomFecha = document.getElementById('plus-expira');
        
        if (inputCustomFecha && inputCustomFecha.value) {
            const d = new Date(inputCustomFecha.value);
            fechaFormateadaPraxis = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
        } else {
            const d = new Date();
            d.setDate(d.getDate() + 30);
            fechaFormateadaPraxis = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
        }

        await set(refInPlus, true);
        await set(refPlusExpira, fechaFormateadaPraxis);
        await set(refRango, "Estudiante Plus");

        alert(`Suscripción Plus activada en servidor para: ${finalUID}`);
        if(document.getElementById('plus-uid')) document.getElementById('plus-uid').value = "";
        if(document.getElementById('plus-expira')) document.getElementById('plus-expira').value = "";
    } catch (e) {
        alert("Error en el mapeo del rango premium.");
    }
};

window.actualizarPlaceholderPremio = function() {
    const tipo = document.getElementById("promo-tipo").value;
    const inputPremio = document.getElementById("promo-premio");
    if (!inputPremio) return;
    inputPremio.placeholder = (tipo === "PUNTOS") ? "Ej: 30 pts o 30 puntos" : "Ej: plus por 4 dias o plus por 2 meses";
};

window.registrarCodigoSistema = async function() {
    const inputId = document.getElementById("promo-id");
    const inputTipo = document.getElementById("promo-tipo");
    const inputPremio = document.getElementById("promo-premio");
    const inputStock = document.getElementById("promo-stock");

    const idCodigo = inputId.value.trim().replace(/[\s\[\]]/g, ""); 
    const tipoBeneficio = inputTipo.value;
    let textoPremio = inputPremio.value.trim();
    const cantidadStock = parseInt(inputStock.value, 10);

    if (!idCodigo || !textoPremio || isNaN(cantidadStock) || cantidadStock <= 0) {
        alert("ERROR: Faltan campos esenciales del generador.");
        return;
    }

    textoPremio = textoPremio.replace(/[\[\]]/g, ""); 
    const formatoNormalizado = textoPremio.toLowerCase();

    if (tipoBeneficio === "PLUS" && !formatoNormalizado.includes("plus")) {
        textoPremio = `Plus por ${textoPremio}`;
    }

    const valorEstructuradoDB = `${textoPremio} [${cantidadStock}]`;

    try {
        await set(ref(db, `config/codigos_promocionales/${idCodigo}`), valorEstructuradoDB);
        alert("Código promocional inyectado correctamente.");
        inputId.value = "";
        inputPremio.value = "";
        inputStock.value = "10";
    } catch (error) {
        alert("Fallo de subida de configuración.");
    }
};

// ESCUCHAS GENERALES DE RENDERIZADO EN TIEMPO REAL
function cargarDirectorio() {
    onValue(ref(db, 'usuarios'), (snap) => {
        const tbody = document.getElementById('tabla-usuarios-body');
        const countUsers = document.getElementById('count-users');
        if(!tbody) return;
        tbody.innerHTML = "";
        
        if(!snap.exists()) {
            tbody.innerHTML = `<tr><td colspan="3" class="table-loading">No hay usuarios registrados.</td></tr>`;
            return;
        }
        
        const usersData = snap.val();
        if(countUsers) countUsers.innerText = `${Object.keys(usersData).length} Usuarios`;
        
        Object.entries(usersData).forEach(([uid, u]) => {
            const nombre = u.nombre || "Usuario Praxis";
            const foto = u.foto || "https://www.gstatic.com/images/branding/product/2x/avatar_square_blue_120dp.png";
            const puntos = u.stats?.puntos || 0;
            const racha = u.stats?.racha || 0;
            
            const fila = document.createElement('tr');
            fila.style.borderBottom = "1px solid #e2e8f0";
            fila.innerHTML = `
                <td style="padding: 12px 15px; display: flex; align-items: center; gap: 12px;">
                    <img src="${foto}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover; border: 2px solid #000;">
                    <div>
                        <div style="font-weight: 800; font-size: 14px;">${nombre}</div>
                        <div class="user-row-id-click" data-uid="${uid}" style="font-size: 10px; color: #1a73e8; cursor: pointer; font-weight:700;">ID: ${uid.substring(0, 10)}... 📋</div>
                    </div>
                </td>
                <td style="padding: 15px; font-size: 12px; font-weight:700;">${racha} 🔥</td>
                <td style="padding: 15px; text-align: right;">
                    <span style="background: #f0fdf4; color: #166534; padding: 6px 12px; border-radius: 8px; font-weight: 900; border: 2px solid #166534;">${puntos} PTS</span>
                    <button class="btn-plus-row-trigger" data-uid="${uid}">+PLUS</button>
                </td>
            `;
            
            fila.querySelector('.user-row-id-click').onclick = () => window.copyID(uid);
            fila.querySelector('.btn-plus-row-trigger').onclick = () => window.activarPlusDefinitivo(uid);
            tbody.appendChild(fila);
        });
    });
}

// CORRECCIÓN RADICAL: SEPARACIÓN DE ESCUCHAS PARA CONTADORES Y ELIMINACIÓN FIABLE
function cargarActividad() {
    // Listener independiente para Comunicados
    onValue(ref(db, 'comunicados'), (snap) => {
        const container = document.getElementById('lista-comunicados-activos');
        const countCom = document.getElementById('count-com');
        if(!container) return;
        container.innerHTML = "";
        
        if(!snap.exists()) {
            if(countCom) countCom.innerText = "0";
            container.innerHTML = `<p class="loading-text-small">No hay comunicados activos en el servidor.</p>`;
            return;
        }

        const data = snap.val();
        const entries = Object.entries(data);
        if(countCom) countCom.innerText = entries.length;

        // Renderizar de más reciente a más antiguo
        entries.reverse().forEach(([id, item]) => {
            const card = document.createElement('div');
            card.className = 'item-card visual-panel-card';
            card.style = "margin-bottom:12px; display:flex; justify-content:space-between; align-items:center; background:#fff; border:3px solid #000; padding:12px; border-radius:12px; box-shadow: 4px 4px 0px #000;";
            card.innerHTML = `
                <div style="flex:1; padding-right:10px;">
                    <h4 style="margin:0 0 4px 0; font-weight:900;">📢 ${item.titulo || "Sin Título"}</h4>
                    <p style="margin:0 0 6px 0; font-size:13px; font-weight:600; color:#333;">${item.msg || ""}</p>
                    <small style="font-size:10px; color:#777; font-weight:700;">Autor: ${item.autor || "Sistema"}</small>
                </div>
                <button onclick="eliminarElemento('comunicados', '${id}')" style="background:#ff4b4b; color:#fff; border:2.5px solid #000; border-radius:8px; padding:6px 10px; font-weight:900; cursor:pointer; box-shadow:2px 2px 0px #000;">ELIMINAR</button>
            `;
            container.appendChild(card);
        });
    });

  // Listener independiente para Encuestas con Porcentajes y Ganador en Tiempo Real
    onValue(ref(db, 'encuestas'), (snap) => {
        const container = document.getElementById('resultados-encuestas');
        const countEnc = document.getElementById('count-enc');
        if(!container) return;
        container.innerHTML = "";
        
        if(!snap.exists()) {
            if(countEnc) countEnc.innerText = "0";
            container.innerHTML = `<p class="loading-text-small">No se registran encuestas creadas.</p>`;
            return;
        }

        const data = snap.val();
        const entries = Object.entries(data);
        if(countEnc) countEnc.innerText = entries.length;

        // Renderizar de más reciente a más antiguo
        entries.reverse().forEach(([id, enc]) => {
            const card = document.createElement('div');
            card.className = 'item-card visual-panel-card';
            card.style = "margin-bottom: 20px; display: flex; flex-direction: column; background: #fff; border: 4px solid #000; padding: 20px; border-radius: 16px; box-shadow: 6px 6px 0px #000; position: relative;";
            
            // 1. Procesar votos del nodo
            const todosLosVotos = enc.votos ? Object.values(enc.votos) : [];
            const totalVotos = todosLosVotos.length;

            // 2. Mapear y contabilizar opciones válidas
            const conteoOpciones = {};
            if (enc.ops) {
                Object.keys(enc.ops).forEach(opc => {
                    conteoOpciones[opc] = 0; // Inicializar en cero cada opción configurada
                });
            }

            // Sumar los votos reales depositados por los estudiantes
            todosLosVotos.forEach(voto => {
                if (conteoOpciones.hasOwnProperty(voto)) {
                    conteoOpciones[voto]++;
                }
            });

            // 3. Determinar cuál es la opción con mayor puntaje (Ganador)
            let maxVotos = -1;
            let opcionGanadora = null;

            if (totalVotos > 0) {
                Object.entries(conteoOpciones).forEach(([opc, cant]) => {
                    if (cant > maxVotos) {
                        maxVotos = cant;
                        opcionGanadora = opc;
                    } else if (cant === maxVotos && cant > 0) {
                        // En caso de empate técnico momentáneo
                        opcionGanadora = "Empate";
                    }
                });
            }

            // 4. Construir HTML base de la tarjeta informativa
            let HTMLCard = `
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; border-bottom: 3px dashed #000; padding-bottom: 10px;">
                    <div style="flex: 1; padding-right: 15px;">
                        <h4 style="margin: 0 0 4px 0; font-size: 1.15rem; font-weight: 900;">📊 Consulta: ${enc.pre || "Sin Pregunta"}</h4>
                        <small style="font-size: 11px; color: #555; font-weight: 700; display: block;">Autor: ${enc.autor || "Sistema"}</small>
                    </div>
                    <button onclick="eliminarElemento('encuestas', '${id}')" style="background: #ff4b4b; color: #fff; border: 3px solid #000; border-radius: 8px; padding: 6px 12px; font-weight: 900; cursor: pointer; box-shadow: 2px 2px 0px #000; font-size: 0.8rem; transition: transform 0.1s;">ELIMINAR</button>
                </div>
                
                <div style="display: flex; gap: 10px; margin-bottom: 16px;">
                    <span style="background: #e0f2fe; color: #0369a1; padding: 4px 8px; border-radius: 6px; font-size: 12px; font-weight: 800; border: 2px solid #0369a1;">
                        👥 Total Votos: ${totalVotos} alumnos
                    </span>
                    ${totalVotos > 0 && opcionGanadora && opcionGanadora !== "Empate" ? `
                        <span style="background: #fef08a; color: #854d0e; padding: 4px 8px; border-radius: 6px; font-size: 12px; font-weight: 800; border: 2px solid #854d0e; animation: pulseBrutal 1.5s infinite;">
                            🏆 Ganando: ${opcionGanadora}
                        </span>
                    ` : ''}
                    ${opcionGanadora === "Empate" ? `
                        <span style="background: #f3f4f6; color: #374151; padding: 4px 8px; border-radius: 6px; font-size: 12px; font-weight: 800; border: 2px solid #374151;">
                            ⚖️ Empate Técnico
                        </span>
                    ` : ''}
                </div>

                <div style="display: flex; flex-direction: column; gap: 12px;">
            `;

            // 5. Iterar e inyectar las barras estadísticas de las opciones
            Object.entries(conteoOpciones).forEach(([opcion, cantidad]) => {
                // Cálculo matemático del porcentaje exacto de participación estudiantil
                const porcentaje = totalVotos > 0 ? Math.round((cantidad / totalVotos) * 100) : 0;
                const esFrenteGanador = totalVotos > 0 && opcion === opcionGanadora;

                HTMLCard += `
                    <div style="position: relative;">
                        <div style="display: flex; justify-content: space-between; font-size: 13px; font-weight: 800; margin-bottom: 4px; color: #000;">
                            <span>${esFrenteGanador ? '👑 ' : ''}${opcion}</span>
                            <span>${cantidad} votos (${porcentaje}%)</span>
                        </div>
                        <div style="width: 100%; background: #fff; border: 3px solid #000; height: 24px; border-radius: 8px; overflow: hidden; position: relative; box-shadow: 2px 2px 0px #000;">
                            <div style="width: ${porcentaje}%; background: ${esFrenteGanador ? '#00ff88' : '#e2e8f0'}; height: 100%; border-right: ${porcentaje > 0 ? '3px' : '0px'} solid #000; transition: width 0.5s cubic-bezier(0.19, 1, 0.22, 1);"></div>
                        </div>
                    </div>
                `;
            });

            HTMLCard += `</div>`; // Cierre del contenedor de opciones
            
            card.innerHTML = HTMLCard;
            container.appendChild(card);
        });
    });
}

function cargarAgendas() {
    onValue(ref(db, 'agendas'), (snapshot) => {
        const container = document.getElementById('lista-agendas');
        if(!container) return;
        container.innerHTML = "";
        
        if(!snapshot.exists()){
            container.innerHTML = `<p class="loading-text-small">No hay agendas vinculadas.</p>`;
            return;
        }

        snapshot.forEach((child) => {
            const data = child.val();
            const card = document.createElement('div');
            card.className = 'agenda-card';
            card.innerHTML = `<span style="font-size:11px; font-weight:800; background:#000; color:#fff; padding:2px 6px; border-radius:4px;">${child.key}</span><h4 style="margin-top:6px;">${data.nombre}</h4><div class="point-badge">${data.bancoPuntos || 0} PTS</div>`;
            container.appendChild(card);
        });
    });
}

window.copyID = (id) => {
    const inputId = document.getElementById('praxis-uid');
    if(inputId) inputId.value = id;
    navigator.clipboard.writeText(id);
    alert("UID Estudiantil copiado al portapapeles.");
};

window.cerrarSeguridad = () => {
    const banner = document.getElementById('modal-seguridad');
    if(banner) banner.style.display = 'none';
};

function cargarTodo() {
    cargarDirectorio();
    cargarActividad();
    cargarAgendas();
}

window.onload = () => {
    if (sessionStorage.getItem('avisoVisto')) {
        const banner = document.getElementById('modal-seguridad');
        if(banner) banner.style.display = 'none';
    } else {
        sessionStorage.setItem('avisoVisto', 'true');
    }
};