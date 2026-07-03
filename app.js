// ============================================================
// MAPAVIDA - BLOQUE 1: CONFIGURACIÓN Y MAPA (FUNCIONAL)
// ============================================================

// ============================================================
// MAPA (SIEMPRE CARGA)
// ============================================================
const map = L.map('map').setView([10.4806, -66.9036], 12);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: 'MapaVida'
}).addTo(map);

// OCULTAR LOADER INMEDIATAMENTE
document.getElementById('cargando').style.display = 'none';

console.log('✅ Mapa creado');

// ============================================================
// VARIABLES GLOBALES (MÍNIMAS)
// ============================================================
let todosLosPuntos = [];
let markersLayer = L.layerGroup().addTo(map);
let ubicacionUsuario = null;
let markerUsuario = null;
let ubicacionSeleccionada = null;
let markerSeleccion = null;
let tipoSeleccionado = null;
let filtroActivo = 'todos';
let modoAdmin = false;
let puntoEnEdicion = null;
let controlRuta = null;
let modoNavegacion = false;
let filtroLista = 'todos';
let busquedaNecesidad = '';

// ============================================================
// SANITIZACIÓN (DOMPurify)
// ============================================================
function sanitizar(texto) {
  if (!texto) return '';
  return DOMPurify.sanitize(texto);
}

function sanitizarArray(arr) {
  if (!arr || !Array.isArray(arr)) return [];
  return arr.map(item => sanitizar(item));
}

// ============================================================
// FUNCIONES BÁSICAS DE CARGA/GUARDADO
// ============================================================
function cargarPuntos() {
  const stored = localStorage.getItem('puntosMapaVida');
  if (stored) {
    try {
      todosLosPuntos = JSON.parse(stored);
      console.log('✅ Datos cargados desde localStorage');
    } catch (e) {
      todosLosPuntos = [];
    }
  } else {
    // Datos de ejemplo para que haya algo
    todosLosPuntos = [
      {
        id: '1', tipo: 'refugio', nombre: 'Refugio Los Rosales',
        lat: 10.4910, lng: -66.8730,
        informacion: {
          direccion: 'Av. Principal',
          cupo: 150,
          urgente: true,
          necesidad_infantil: true,
          necesidades: ['Agua', 'Comida', 'Colchonetas'],
          nombre_registrador: 'Juan Pérez',
          rol_registrador: 'Coordinador',
          voluntarios_infantiles: [],
          estado: 'aprobado',
          fecha_creacion: new Date().toLocaleString(),
          fecha_edicion: new Date().toLocaleString()
        },
        user_id: null
      }
    ];
    localStorage.setItem('puntosMapaVida', JSON.stringify(todosLosPuntos));
  }
  aplicarFiltros();
}

function guardarPuntos() {
  localStorage.setItem('puntosMapaVida', JSON.stringify(todosLosPuntos));
  console.log('✅ Datos guardados en localStorage');
}

// ============================================================
// FUNCIONES BÁSICAS DE FILTRO Y MOSTRAR (VACÍAS POR AHORA)
// ============================================================
function aplicarFiltros() {
  // Por ahora solo limpiamos los marcadores
  markersLayer.clearLayers();
  // Mostrar puntos (implementación simple para que no haya error)
  mostrarPuntos(todosLosPuntos);
}

function mostrarPuntos(puntos) {
  markersLayer.clearLayers();
  puntos.forEach(p => {
    // Crear marcador simple
    const marker = L.marker([p.lat, p.lng])
      .bindPopup(`<strong>${p.nombre}</strong><br>${p.informacion?.direccion || ''}`);
    markersLayer.addLayer(marker);
  });
  console.log('✅ Marcadores mostrados:', puntos.length);
}

// ============================================================
// EVENTO DEL BOTÓN AGREGAR (PARA PROBAR)
// ============================================================
document.getElementById('btnAgregar').addEventListener('click', function() {
  alert('✅ Botón Agregar funcionando');
});

// ============================================================
// INICIALIZACIÓN
// ============================================================
cargarPuntos();
obtenerUbicacion();

// Función de geolocalización (simple para no dar error)
function obtenerUbicacion() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        ubicacionUsuario = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        console.log('📍 Ubicación obtenida');
      },
      () => { console.log('⚠️ No se pudo obtener ubicación'); }
    );
  }
}

console.log('✅ BLOQUE 1 cargado correctamente');
// ============================================================
// MAPAVIDA - BLOQUE 2: AUTENTICACIÓN Y GESTIÓN DE PENDIENTES
// ============================================================

// ============================================================
// CONTRASEÑA DE ADMINISTRADOR
// ============================================================
const ADMIN_PASSWORD = 'MapaVida2026';

// ============================================================
// AUTENTICACIÓN
// ============================================================
function loginAdmin(password) {
  if (password === ADMIN_PASSWORD) {
    modoAdmin = true;
    document.getElementById('btnAdmin').textContent = '🔓 Administrador activo';
    document.getElementById('btnAdmin').style.background = '#2e7d32';
    document.getElementById('btnPendientes').style.display = 'block';
    document.getElementById('btnEliminar').style.display = 'block';
    aplicarFiltros();
    alert('✅ Modo administrador activado.');
    return true;
  } else {
    alert('❌ Contraseña incorrecta.');
    return false;
  }
}

function logoutAdmin() {
  modoAdmin = false;
  document.getElementById('btnAdmin').textContent = '🔐 Administrar (desbloquear)';
  document.getElementById('btnAdmin').style.background = '#1a237e';
  document.getElementById('btnPendientes').style.display = 'none';
  document.getElementById('btnEliminar').style.display = 'none';
  aplicarFiltros();
  alert('🔓 Sesión cerrada.');
}

// ============================================================
// EVENTOS DE AUTENTICACIÓN
// ============================================================
document.getElementById('btnAuth').addEventListener('click', function() {
  if (modoAdmin) {
    logoutAdmin();
  } else {
    const pass = prompt('🔐 Ingresa la contraseña de administrador:');
    if (pass !== null) loginAdmin(pass);
  }
});

document.getElementById('btnAdmin').addEventListener('click', function() {
  if (modoAdmin) {
    alert('🔓 Ya estás en modo administrador.');
    return;
  }
  const pass = prompt('🔐 Ingresa la contraseña de administrador:');
  if (pass !== null) loginAdmin(pass);
});

// ============================================================
// GESTIÓN DE PENDIENTES (APROBAR, RECHAZAR, VALIDAR)
// ============================================================
function aprobarPunto(id) {
  if (!modoAdmin) {
    alert('🔐 Solo administradores pueden aprobar puntos.');
    return;
  }
  const punto = todosLosPuntos.find(p => p.id === id);
  if (!punto) return;
  if (punto.informacion.estado === 'aprobado') {
    alert('Este punto ya está aprobado.');
    return;
  }
  punto.informacion.estado = 'aprobado';
  punto.informacion.fecha_edicion = new Date().toLocaleString();
  guardarPuntos();
  aplicarFiltros();
  document.getElementById('panelPendientes').style.display = 'none';
  mostrarPendientes();
  alert('✅ Punto aprobado y visible para todos.');
}

function rechazarPunto(id) {
  if (!modoAdmin) {
    alert('🔐 Solo administradores pueden rechazar puntos.');
    return;
  }
  if (!confirm('¿Seguro que quieres rechazar este punto?')) return;
  const punto = todosLosPuntos.find(p => p.id === id);
  if (!punto) return;
  punto.informacion.estado = 'rechazado';
  punto.informacion.fecha_edicion = new Date().toLocaleString();
  guardarPuntos();
  aplicarFiltros();
  document.getElementById('panelPendientes').style.display = 'none';
  mostrarPendientes();
  alert('❌ Punto rechazado.');
}

function validarPunto(id) {
  if (!modoAdmin) {
    alert('🔐 Solo administradores pueden validar puntos.');
    return;
  }
  const punto = todosLosPuntos.find(p => p.id === id);
  if (!punto) return;
  if (punto.informacion.estado === 'aprobado') {
    alert('Este punto ya está validado.');
    return;
  }
  punto.informacion.estado = 'aprobado';
  punto.informacion.fecha_edicion = new Date().toLocaleString();
  guardarPuntos();
  aplicarFiltros();
  alert('✅ Punto validado y visible para todos.');
}

// ============================================================
// MOSTRAR PANEL DE PENDIENTES
// ============================================================
function mostrarPendientes() {
  if (!modoAdmin) {
    alert('🔐 Solo los administradores pueden ver puntos pendientes.');
    return;
  }
  const pendientes = todosLosPuntos.filter(p => p.informacion?.estado === 'pendiente');
  
  // Crear panel si no existe
  let panel = document.getElementById('panelPendientes');
  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'panelPendientes';
    panel.style.cssText = `
      display: none;
      position: fixed;
      top: 80px;
      left: 10px;
      right: 10px;
      bottom: 10px;
      z-index: 9200;
      background: white;
      border-radius: 12px;
      padding: 16px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.5);
      overflow-y: auto;
      flex-direction: column;
    `;
    document.body.appendChild(panel);
  }
  
  panel.style.display = 'flex';
  
  let html = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
      <h2 style="margin:0;">⏳ Puntos pendientes de aprobación</h2>
      <button id="btnCerrarPendientes" style="background:#d32f2f; color:white; border:none; padding:8px 16px; border-radius:8px; cursor:pointer; font-weight:bold;">✖ Cerrar</button>
    </div>
  `;
  
  if (pendientes.length === 0) {
    html += `<p style="text-align:center; color:#666; padding:40px;">No hay puntos pendientes de aprobación.</p>`;
  } else {
    pendientes.forEach(p => {
      const tipo = TIPOS[p.tipo];
      if (!tipo) return;
      html += `
        <div style="background:#fffde7; border-left:4px solid #f57f17; padding:12px; margin-bottom:12px; border-radius:8px; box-shadow:0 2px 4px rgba(0,0,0,0.1);">
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
            <div>
              <strong>${sanitizar(p.nombre)}</strong>
              <span style="font-size:13px; color:#555; margin-left:8px;">${tipo.label}</span>
              <span style="font-size:12px; background:#f57f17; color:white; padding:2px 8px; border-radius:12px; margin-left:8px;">⏳ Pendiente</span>
            </div>
            <div>
              <button class="btn-aprobar" data-id="${p.id}" style="background:#2e7d32; color:white; border:none; padding:6px 12px; border-radius:6px; cursor:pointer; font-weight:bold; margin-right:4px;">✅ Aprobar</button>
              <button class="btn-rechazar" data-id="${p.id}" style="background:#d32f2f; color:white; border:none; padding:6px 12px; border-radius:6px; cursor:pointer; font-weight:bold;">❌ Rechazar</button>
            </div>
          </div>
          <div style="margin-top:6px; font-size:13px; color:#555;">
            📍 Coordenadas: ${p.lat}, ${p.lng}
            ${p.informacion?.direccion ? ` | 📌 ${sanitizar(p.informacion.direccion)}` : ''}
            <div style="font-size:12px; color:#777; margin-top:4px;">
              👤 Registrado por: ${sanitizar(p.informacion?.nombre_registrador || 'Anónimo')} (${sanitizar(p.informacion?.rol_registrador || 'Sin rol')})
            </div>
            ${p.informacion?.necesidades?.length ? `<div style="margin-top:4px;"><strong>Necesidades:</strong> ${p.informacion.necesidades.map(n => sanitizar(n)).join(', ')}</div>` : ''}
          </div>
        </div>
      `;
    });
  }
  
  panel.innerHTML = html;
  
  // Eventos del panel
  document.getElementById('btnCerrarPendientes').addEventListener('click', function() {
    panel.style.display = 'none';
  });
  
  document.querySelectorAll('.btn-aprobar').forEach(btn => {
    btn.addEventListener('click', function() {
      aprobarPunto(this.dataset.id);
    });
  });
  
  document.querySelectorAll('.btn-rechazar').forEach(btn => {
    btn.addEventListener('click', function() {
      rechazarPunto(this.dataset.id);
    });
  });
}

console.log('✅ BLOQUE 2 cargado correctamente');
