navItems.forEach(item => {
    item.onclick = (e) => {
        if (item.id === 'btn-logout' || item.classList.contains('logout')) return;

        navItems.forEach(nav => nav.classList.remove('active'));
        item.classList.add('active');

        const texto = item.innerText.toLowerCase();
        const container = document.getElementById('task-container');
        const bannerTitle = document.getElementById('banner-title');
        const displayCode = document.getElementById('display-code');
        const adminControls = document.getElementById('admin-controls');
        const statusMessage = document.getElementById('status-message');

        if (adminControls) adminControls.innerHTML = "";
        const oldAdminBtn = document.getElementById('admin-publish-btn');
        if (oldAdminBtn) oldAdminBtn.remove();

        if (container) {
            container.innerHTML = "";
            container.style.animation = "none";
            void container.offsetWidth;
            container.style.animation = "slideUp 0.4s ease-out forwards";
        }
        if (displayCode) displayCode.innerText = "";
        if (statusMessage) statusMessage.innerHTML = "";

        if (texto.includes("inicio")) {
            bannerTitle.innerText = "Gestión Académica Praxis";
            displayCode.innerText = "HOME";
            const params = new URLSearchParams(window.location.search);
            const code = params.get('code');
            if (code) {
                cargarAgenda(auth.currentUser.uid);
            } else {
                mostrarEstadoVacio("Ingresa un código para ver tu agenda.");
            }
        } 
        else if (texto.includes("calendario")) {
            bannerTitle.innerText = "Calendario Académico";
            displayCode.innerText = "CALENDARIO";
            navegarA("Calendario Académico", "VISTA_CALENDARIO");
            container.innerHTML = "<div style='display:flex;flex-direction:column;align-items:center;justify-content:center;height:200px;'><div class='spinner'></div><p style='font-family:\"JetBrains Mono\";margin-top:15px;'>Sincronizando fechas...</p></div>";
            
            obtenerTodasLasTareas((todasLasTareas) => {
                container.innerHTML = "";
                todasLasTareas.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
                renderizarVistaLista(todasLasTareas, "calendario");
            });
        }
        else if (texto.includes("rankings") || texto.includes("top") || texto.includes("ranking")) {
            bannerTitle.innerText = "Ranking Global Praxis";
            displayCode.innerText = "RANKINGS";
            navegarA("Ranking Global Praxis", "VISTA_RANKINGS");
            container.innerHTML = `
                <div id="podium-area" style="display: flex; align-items: flex-end; justify-content: center; gap: 15px; margin-bottom: 40px; height: 250px; padding-top: 20px;"></div>
                <div id="ranking-list" style="background: #ffffff; border: 4px solid #000; border-radius: 24px; padding: 20px; box-shadow: 8px 8px 0px #000;">
                    <p style='text-align:center; padding:20px; font-family: "JetBrains Mono";'>Estableciendo conexión con Alonixz Cloud...</p>
                </div>
            `;

            const obtenerInfoRango = (racha, email) => {
                if (racha >= 1000) return { nombre: "ROOT_HACKER", clase: "rango-hacker" };
                if (email === "ajuliuszch@gmail.com") return { nombre: "FUNDADOR", clase: "rango-admin" };
                if (racha >= 100) return { nombre: "ADMIN", clase: "rango-admin" };
                if (racha >= 80) return { nombre: "OBSIDIANA", clase: "rango-obsidiana" };
                if (racha >= 60) return { nombre: "DIAMANTE", clase: "rango-diamante" };
                if (racha >= 30) return { nombre: "ORO", clase: "rango-oro" };
                if (racha >= 15) return { nombre: "PLATA", clase: "rango-plata" };
                if (racha >= 7) return { nombre: "BRONCE", clase: "rango-bronce" };
                return { nombre: "ASPIRANTE", clase: "rango-aspirante" };
            };

            const usuariosRef = ref(db, 'usuarios');
            onValue(usuariosRef, (snapshot) => {
                const data = snapshot.val();
                const currentPodium = document.getElementById('podium-area');
                if (!data || !currentPodium) return;

                const arr = Object.keys(data).map(uid => ({
                    nombre: data[uid].nombre || "Estudiante",
                    foto: data[uid].foto || "https://www.gstatic.com/images/branding/product/2x/avatar_square_blue_120dp.png",
                    racha: (data[uid].stats && data[uid].stats.racha) ? parseInt(data[uid].stats.racha) : 0,
                    correo: data[uid].correo || ""
                })).sort((a, b) => b.racha - a.racha);

                const top3 = arr.slice(0, 3);
                const renderPodiumItem = (user, pos, height, colorBg, border, shadow) => {
                    const info = obtenerInfoRango(user?.racha || 0, user?.correo || "");
                    return `
                    <div style="display: flex; flex-direction: column; align-items: center; flex: 1; max-width: 120px;">
                        <div style="position:relative;">
                            <img src="${user?.foto}" style="width: ${pos===1? '90px' : '70px'}; height: ${pos===1? '90px' : '70px'}; border-radius: 50%; border: ${border}; object-fit: cover; background: white; box-shadow: ${shadow};">
                            <div style="position:absolute; top:-10px; right:-5px; background:#000; color:#fff; width:24px; height:24px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:900; border:2px solid #fff;">${pos}</div>
                        </div>
                        <div style="height: ${height}px; background: ${colorBg}; width: 100%; border: 3px solid #000; border-radius: 15px 15px 5px 5px; display: flex; align-items: center; justify-content: center; flex-direction: column; margin-top:10px; box-shadow: 4px 4px 0px #000;">
                            <strong style="font-size: 22px; font-weight:900;">${user?.racha || 0}</strong>
                            <span class="rango-tag ${info.clase}" style="font-size: 8px; padding: 3px 6px; margin-top: 5px; border: 1px solid #000; text-transform:uppercase;">${info.nombre}</span>
                        </div>
                    </div>`;
                };
                currentPodium.innerHTML = `
                    ${renderPodiumItem(top3[1], 2, 120, "#e0e0e0", "3px solid #000", "4px 4px 0px #000")}
                    ${renderPodiumItem(top3[0], 1, 160, "#00ff88", "4px solid #000", "6px 6px 0px #000")}
                    ${renderPodiumItem(top3[2], 3, 100, "#ffb74d", "3px solid #000", "4px 4px 0px #000")}
                `;

                const rankingList = document.getElementById('ranking-list');
                const rest = arr.slice(3, 20);
                if (rankingList) {
                    rankingList.innerHTML = rest.map((u, i) => {
                        const info = obtenerInfoRango(u.racha, u.correo);
                        return `
                        <div class="ranking-row" style="display: flex; align-items: center; padding: 16px; border-bottom: 2px solid #f0f0f0; gap: 15px; transition: 0.2s;">
                            <span style="font-weight: 900; width: 30px; font-size: 16px; color: #000;">${i + 4}</span>
                            <img src="${u.foto}" style="width: 45px; height: 45px; border-radius: 50%; border: 2px solid #000; object-fit: cover;">
                            <div style="flex-grow: 1;">
                                <div style="display: flex; align-items: center; gap: 10px;">
                                    <span style="font-weight: 800; font-size: 15px;">${u.nombre}</span>
                                    <span class="rango-tag ${info.clase}" style="font-size: 9px; border: 1px solid #000;">${info.nombre}</span>
                                </div>
                            </div>
                            <div style="background: #000; color: #fff; padding: 6px 14px; border-radius: 10px; display: flex; align-items: center; gap: 6px; font-weight: 900;">
                                <span>${u.racha}</span>
                                <span style="font-size: 14px;">🔥</span>
                            </div>
                        </div>`;
                    }).join('');
                }
            });
        }
        else if (texto.includes("pendientes")) {
            bannerTitle.innerText = "Tareas Pendientes";
            displayCode.innerText = "PENDIENTES";
            navegarA("Tareas Pendientes", "VISTA_PENDIENTES");
            container.innerHTML = "<div style='text-align:center; padding:40px;'><div class='spinner'></div><p>Buscando tareas pendientes...</p></div>";
            
            obtenerTodasLasTareas((todasLasTareas) => {
                container.innerHTML = "";
                const hoy = new Date().setHours(0,0,0,0);
                const pendientes = todasLasTareas.filter(t => new Date(t.fecha) >= hoy);
                renderizarVistaLista(pendientes, "pendientes");
            });
        }
        else if (texto.includes("cuenta de google") || texto.includes("perfil")) {
            const user = auth.currentUser;
            bannerTitle.innerText = "Información de Perfil";
            displayCode.innerText = "PERFIL";
            navegarA("Información de Perfil", "VISTA_PERFIL");
            container.innerHTML = `
                <div class="card" style="max-width: 500px; margin: 30px auto; text-align: center; padding: 40px; border: 4px solid #000; border-radius: 30px; box-shadow: 12px 12px 0px #000; background:#fff;">
                    <div style="position: relative; display: inline-block; margin-bottom: 20px;">
                        <img src="${user.photoURL}" style="border-radius: 50%; width: 140px; border: 4px solid #000; box-shadow: 6px 6px 0px #000;">
                        <div style="position: absolute; bottom: 10px; right: 10px; background: #00ff88; width: 28px; height: 28px; border-radius: 50%; border: 3px solid #000;"></div>
                    </div>
                    <h2 style="font-size: 28px; font-weight: 900; margin-bottom: 5px;">${user.displayName}</h2>
                    <p style="font-family: 'JetBrains Mono'; font-size: 14px; color: #555;">${user.email}</p>
                    <div style="margin: 25px 0; height: 4px; background: #000; border-radius: 2px;"></div>
                    <div style="display: flex; justify-content: center; align-items: center; gap: 10px; background: #f1f3f4; padding: 12px; border-radius: 15px; border: 2px solid #000;">
                        <img src="https://www.gstatic.com/images/branding/product/1x/avatar_circle_blue_512dp.png" width="20">
                        <span style="font-weight: 800; font-size: 14px;">CONECTADO A ALONIXZ-GROUP</span>
                    </div>
                </div>`;
        }
        else if (texto.includes("sincronizar drive") || texto.includes("biblioteca")) {
            bannerTitle.innerText = "Mi Biblioteca Digital";
            displayCode.innerText = "RECURSOS_NUBE";
            navegarA("Mi Biblioteca Digital", "VISTA_DRIVE");
            container.innerHTML = `
                <div class="drive-explorer" style="max-width: 900px; margin: 0 auto; padding: 20px;">
                    <div style="background: #fff; padding: 30px; border-radius: 25px; border: 4px solid #000; margin-bottom: 25px; display: flex; justify-content: space-between; align-items: center; box-shadow: 8px 8px 0px #000;">
                        <div>
                            <h2 style="margin: 0; font-weight: 900; font-size: 24px;">Cloud Explorer</h2>
                            <p style="margin: 5px 0 0 0; color: #555; font-family: 'JetBrains Mono'; font-size: 13px;">Accede a tus recursos académicos en tiempo real.</p>
                        </div>
                        <button id="btn-auth-drive" style="background: #1a73e8; color: white; border: 3px solid #000; padding: 12px 25px; border-radius: 15px; cursor: pointer; font-weight: 900; box-shadow: 4px 4px 0px #000; transition: 0.2s;">
                            SINCRONIZAR
                        </button>
                    </div>
                    <div id="drive-content" style="display: none;">
                        <div style="display: flex; gap: 12px; margin-bottom: 25px;">
                            <input type="text" id="drive-search" placeholder="Buscar fichas, tareas, PDFs..." style="flex: 1; padding: 15px 25px; border-radius: 18px; border: 3px solid #000; outline: none; font-size: 15px; font-weight: 600; box-shadow: 4px 4px 0px #000;">
                            <button id="btn-search" style="background: #00ff88; border: 3px solid #000; padding: 0 25px; border-radius: 18px; cursor: pointer; box-shadow: 4px 4px 0px #000;">🔍</button>
                        </div>
                        <div id="files-list" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 20px;"></div>
                    </div>
                </div>
            `;
            const btnAuth = document.getElementById('btn-auth-drive');
            const driveContent = document.getElementById('drive-content');
            const filesList = document.getElementById('files-list');

            btnAuth.onclick = () => {
                tokenClient.callback = async (resp) => {
                    if (resp.error) throw resp;
                    btnAuth.innerText = "SINC_OK";
                    btnAuth.style.background = "#00ff88";
                    btnAuth.style.color = "#000";
                    driveContent.style.display = "block";
                    const listarArchivos = async (query = "") => {
                        filesList.innerHTML = "<p style='text-align:center; grid-column: 1/-1;'>Escaneando nube...</p>";
                        const q = query ? `name contains '${query}' and mimeType != 'application/vnd.google-apps.folder'` : "mimeType = 'application/pdf'";
                        const response = await gapi.client.drive.files.list({ q: q, pageSize: 12, fields: 'files(id, name, thumbnailLink, webViewLink)' });
                        const files = response.result.files;
                        filesList.innerHTML = "";
                        if (files && files.length > 0) {
                            files.forEach(file => {
                                filesList.innerHTML += `
                                    <div onclick="window.open('${file.webViewLink}', '_blank')" style="background: #fff; padding: 20px; border-radius: 20px; border: 3px solid #000; text-align: center; cursor: pointer; transition: 0.2s; box-shadow: 4px 4px 0px #000;" onmouseover="this.style.transform='translateY(-5px)'" onmouseout="this.style.transform='translateY(0)'">
                                        <div style="font-size: 40px; margin-bottom: 10px;">📄</div>
                                        <div style="font-size: 13px; font-weight: 800; color: #000; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${file.name}</div>
                                        <div style="font-size: 10px; color: #1a73e8; margin-top: 8px; font-weight: 900; text-transform:uppercase;">Abrir Recurso</div>
                                    </div>`;
                            });
                        } else {
                            filesList.innerHTML = "<p style='font-family:\"JetBrains Mono\"; grid-column: 1/-1; text-align:center;'>No se encontraron materiales en el servidor.</p>";
                        }
                    };
                    listarArchivos();
                    document.getElementById('btn-search').onclick = () => { listarArchivos(document.getElementById('drive-search').value); };
                };
                tokenClient.requestAccessToken({prompt: 'consent'});
            };
        }
        else if (texto.includes("soporte y ayuda")) {
            bannerTitle.innerText = "Consola de Diagnóstico Praxis";
            displayCode.innerText = "SOPORTE_SISTEMA";
            navegarA("Consola de Soporte", "VISTA_SOPORTE");
            container.innerHTML = `
                <div class="diag-container" style="max-width: 800px; margin: 0 auto;">
                    <div class="card" style="border-radius: 35px; padding: 50px; text-align: center; border: 4px solid #000; background: white; box-shadow: 12px 12px 0px #000;">
                        <div style="background: #000; color: #fff; width: 80px; height: 80px; border-radius: 22px; display: flex; align-items: center; justify-content: center; margin: 0 auto 25px; font-size: 35px; box-shadow: 4px 4px 0px #00ff88;">🛠️</div>
                        <h2 style="font-weight: 900; font-size: 30px; margin-bottom: 15px;">Analizador de Integridad</h2>
                        <p style="color: #555; font-size: 16px; margin-bottom: 35px; font-family: 'JetBrains Mono';">Escaneo profundo de Alonixz-Cloud para detectar errores de punteros.</p>
                        <div id="pantalla-consola" style="display: none; background: #000; color: #00ff88; padding: 30px; border-radius: 20px; text-align: left; font-family: 'JetBrains Mono', monospace; font-size: 13px; margin-bottom: 30px; border: 3px solid #333; line-height: 1.8; box-shadow: inset 0 0 10px rgba(0,255,136,0.2);">
                            <div style="color: #666; border-bottom: 1px solid #333; padding-bottom: 12px; margin-bottom: 12px; display: flex; justify-content: space-between; font-weight: 900;">
                                <span>ALONIXZ_RECOVERY_CORE</span>
                                <span>v1.0.4-STABLE</span>
                            </div>
                            <div id="output-log">> Iniciando análisis de punteros...</div>
                        </div>
                        <div style="display: flex; flex-direction: column; gap: 15px; align-items: center;">
                            <button onclick="ejecutarAnalisis()" id="btn-investigar" style="background: #000; color: #fff; border: 3px solid #00ff88; padding: 20px 45px; border-radius: 18px; font-weight: 900; cursor: pointer; width: 100%; max-width: 400px; transition: 0.3s; font-family: 'JetBrains Mono';">
                                INICIAR ESCANEO DE SISTEMA
                            </button>
                            <a id="btn-correo-error" style="display: none; background: #ff5252; color: #fff; padding: 18px 35px; border-radius: 18px; text-decoration: none; font-weight: 900; font-size: 15px; border: 3px solid #000; box-shadow: 4px 4px 0px #000;">
                                REPORTAR FALLO CRÍTICO
                            </a>
                        </div>
                    </div>
                </div>
            `;
        }

        if (window.innerWidth <= 768) {
            const sidebar = document.getElementById('sidebar');
            const overlay = document.getElementById('overlay');
            if (sidebar) sidebar.classList.remove('active');
            if (overlay) overlay.style.display = 'none';
        }
    };
});

function generarCodigoAleatorio(longitud = 6) {
    const caracteres = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let resultado = '';
    for (let i = 0; i < longitud; i++) {
        resultado += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
    }
    return `PX-${resultado}`;
}