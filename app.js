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
// ============================================================
// MAPAVIDA - BLOQUE 3: MAPA, FILTROS, MOSTRAR PUNTOS CON PRIORIDAD
// ============================================================

// ============================================================
// DEFINICIONES DE TIPOS (completas)
// ============================================================
const DEFINICIONES = {
  edificio_caido: 'Estructura que ya colapsó total o parcialmente. No ingresar. Necesita maquinaria y personal especializado para remover escombros.',
  peligro_derrumbe: 'Estructura con daños estructurales visibles (grietas, inclinación, etc.) que podría colapsar en cualquier momento. Manténgase alejado.',
  sin_inspeccionar: 'Estructura que aún no ha sido revisada por personal técnico. No se sabe si es segura o no. Evitar el ingreso hasta evaluación oficial.',
  refugio: 'Espacio habilitado para albergar personas damnificadas. Puede tener cupo limitado y necesidades específicas.',
  centro_acopio: 'Lugar donde se recolectan y distribuyen insumos (comida, agua, medicinas, ropa, etc.) para los afectados. Puede gestionar envíos de suministros.',
  hospital: 'Centro de atención médica. Puede necesitar medicamentos, sangre o personal voluntario.',
  veterinaria: 'Centro de atención para animales heridos o abandonados. Puede necesitar insumos o voluntarios.',
  ayuda_psicologica: 'Punto de apoyo emocional y contención psicológica para afectados y rescatistas.',
  vacuna_tetanos: 'Punto de vacunación contra el tétano (enfermedad grave por heridas con objetos contaminados).'
};

const TIPOS = {
  refugio: {
    label: 'Refugio', color: '#2E7D32', icono: '🏠', requiereAdmin: false,
    definicion: DEFINICIONES.refugio,
    campos: [
      { id: 'nombre', label: 'Nombre del refugio *', type: 'text', required: true },
      { id: 'direccion', label: 'Dirección', type: 'text', required: false },
      { id: 'cupo', label: 'Cupo disponible (personas)', type: 'number', required: false },
      { id: 'nombre_registrador', label: 'Tu nombre completo *', type: 'text', required: true },
      { id: 'rol_registrador', label: 'Tu rol *', type: 'select', options: ['Voluntario', 'Coordinador', 'Líder comunitario', 'Rescatista', 'Personal de salud', 'Otro'], required: true },
      { id: 'necesidad_infantil', label: '¿Necesitan actividades recreativas o cuidado para niños?', type: 'select', options: ['No', 'Sí'], required: false },
      { id: 'urgente', label: '¿Es urgente?', type: 'select', options: ['No', 'Sí'], required: false },
      { id: 'necesidades', label: 'Necesidades detalladas (una por línea)', type: 'textarea', required: false }
    ],
    procesar: (d) => ({
      cupo: parseInt(d.cupo) || 0,
      nombre_registrador: sanitizar(d.nombre_registrador || ''),
      rol_registrador: sanitizar(d.rol_registrador || 'Voluntario'),
      urgente: d.urgente === 'Sí',
      necesidad_infantil: d.necesidad_infantil === 'Sí',
      necesidades: sanitizarArray(d.necesidades ? d.necesidades.split('\n').filter(s => s.trim()) : []),
      voluntarios_infantiles: [],
      estado: 'pendiente',
      fecha_creacion: new Date().toLocaleString(),
      fecha_edicion: new Date().toLocaleString()
    }),
    popupDetalle: (info) => {
      let html = `<div class="popup-info">👥 Cupo: ${sanitizar(info.cupo || 'N/E')}</div>`;
      if (info.necesidad_infantil) {
        html += `<div class="popup-info" style="color:#FF6F00;">🧸 Necesitan recreación/cuidado para niños</div>`;
      }
      return html;
    }
  },
  centro_acopio: {
    label: 'Centro de acopio', color: '#F57C00', icono: '📦', requiereAdmin: false,
    definicion: DEFINICIONES.centro_acopio,
    campos: [
      { id: 'nombre', label: 'Nombre del centro *', type: 'text', required: true },
      { id: 'direccion', label: 'Dirección', type: 'text', required: false },
      { id: 'necesarios', label: 'Insumos necesarios (separados por comas)', type: 'textarea', required: false },
      { id: 'suficientes', label: 'Insumos que YA NO necesitan (separados por comas)', type: 'textarea', required: false },
      { id: 'nombre_registrador', label: 'Tu nombre completo *', type: 'text', required: true },
      { id: 'rol_registrador', label: 'Tu rol *', type: 'select', options: ['Voluntario', 'Coordinador', 'Líder comunitario', 'Rescatista', 'Personal de salud', 'Otro'], required: true },
      { id: 'necesidad_infantil', label: '¿Necesitan actividades recreativas o cuidado para niños?', type: 'select', options: ['No', 'Sí'], required: false },
      { id: 'urgente', label: '¿Es urgente?', type: 'select', options: ['No', 'Sí'], required: false },
      { id: 'necesidades', label: 'Necesidades detalladas (una por línea)', type: 'textarea', required: false }
    ],
    procesar: (d) => ({
      necesita: sanitizarArray(d.necesarios ? d.necesarios.split(',').map(s => s.trim()).filter(Boolean) : []),
      suficientes: sanitizarArray(d.suficientes ? d.suficientes.split(',').map(s => s.trim()).filter(Boolean) : []),
      nombre_registrador: sanitizar(d.nombre_registrador || ''),
      rol_registrador: sanitizar(d.rol_registrador || 'Voluntario'),
      urgente: d.urgente === 'Sí',
      necesidad_infantil: d.necesidad_infantil === 'Sí',
      necesidades: sanitizarArray(d.necesidades ? d.necesidades.split('\n').filter(s => s.trim()) : []),
      voluntarios_infantiles: [],
      envios: [],
      estado: 'pendiente',
      fecha_creacion: new Date().toLocaleString(),
      fecha_edicion: new Date().toLocaleString()
    }),
    popupDetalle: (info) => {
      let html = '';
      if (info.suficientes?.length) html += `<div class="popup-info" style="color:#2e7d32;">✅ Ya no necesitan: ${sanitizar(info.suficientes.join(', '))}</div>`;
      if (info.necesidad_infantil) {
        html += `<div class="popup-info" style="color:#FF6F00;">🧸 Necesitan recreación/cuidado para niños</div>`;
      }
      return html;
    }
  },
  hospital: {
    label: 'Hospital', color: '#1976D2', icono: '🏥', requiereAdmin: false,
    definicion: DEFINICIONES.hospital,
    campos: [
      { id: 'nombre', label: 'Nombre del hospital *', type: 'text', required: true },
      { id: 'direccion', label: 'Dirección', type: 'text', required: false },
      { id: 'medicamentos', label: 'Medicamentos necesarios (separados por comas)', type: 'textarea', required: false },
      { id: 'sangre', label: '¿Necesitan donaciones de sangre?', type: 'select', options: ['No', 'Sí'], required: false },
      { id: 'nombre_registrador', label: 'Tu nombre completo *', type: 'text', required: true },
      { id: 'rol_registrador', label: 'Tu rol *', type: 'select', options: ['Voluntario', 'Coordinador', 'Líder comunitario', 'Rescatista', 'Personal de salud', 'Otro'], required: true },
      { id: 'urgente', label: '¿Es urgente?', type: 'select', options: ['No', 'Sí'], required: false },
      { id: 'necesidades', label: 'Necesidades detalladas (una por línea)', type: 'textarea', required: false }
    ],
    procesar: (d) => ({
      medicamentos: sanitizarArray(d.medicamentos ? d.medicamentos.split(',').map(s => s.trim()).filter(Boolean) : []),
      necesita_sangre: d.sangre === 'Sí',
      nombre_registrador: sanitizar(d.nombre_registrador || ''),
      rol_registrador: sanitizar(d.rol_registrador || 'Voluntario'),
      urgente: d.urgente === 'Sí',
      necesidades: sanitizarArray(d.necesidades ? d.necesidades.split('\n').filter(s => s.trim()) : []),
      estado: 'pendiente',
      fecha_creacion: new Date().toLocaleString(),
      fecha_edicion: new Date().toLocaleString()
    }),
    popupDetalle: (info) => {
      let html = '';
      if (info.medicamentos?.length) html += `<div class="popup-info">💊 Medicamentos: ${sanitizar(info.medicamentos.join(', '))}</div>`;
      if (info.necesita_sangre) html += `<div class="popup-info" style="color:#d32f2f;">🩸 ¡Urgen donaciones de sangre!</div>`;
      return html;
    }
  },
  edificio_caido: {
    label: 'Edificio caído', color: '#C62828', icono: '💥', requiereAdmin: false,
    definicion: DEFINICIONES.edificio_caido,
    campos: [
      { id: 'nombre', label: 'Ubicación / referencia *', type: 'text', required: true },
      { id: 'apoyo', label: '¿Qué apoyo necesitan? (ej: agua, comida, escombros)', type: 'textarea', required: false },
      { id: 'nombre_registrador', label: 'Tu nombre completo *', type: 'text', required: true },
      { id: 'rol_registrador', label: 'Tu rol *', type: 'select', options: ['Voluntario', 'Coordinador', 'Líder comunitario', 'Rescatista', 'Personal de salud', 'Otro'], required: true },
      { id: 'urgente', label: '¿Es urgente?', type: 'select', options: ['No', 'Sí'], required: false },
      { id: 'necesidades', label: 'Necesidades detalladas (una por línea)', type: 'textarea', required: false }
    ],
    procesar: (d) => ({
      apoyo: sanitizarArray(d.apoyo ? d.apoyo.split(',').map(s => s.trim()).filter(Boolean) : []),
      nombre_registrador: sanitizar(d.nombre_registrador || ''),
      rol_registrador: sanitizar(d.rol_registrador || 'Voluntario'),
      urgente: d.urgente === 'Sí',
      recogido: false,
      necesidades: sanitizarArray(d.necesidades ? d.necesidades.split('\n').filter(s => s.trim()) : []),
      estado: 'pendiente',
      fecha_creacion: new Date().toLocaleString(),
      fecha_edicion: new Date().toLocaleString()
    }),
    popupDetalle: (info) => {
      let html = `<div class="popup-info" style="color:#C62828;">⚠️ Edificio colapsado</div>`;
      if (info.recogido) html += `<div class="popup-info" style="color:#2e7d32;">✅ Ya recogido y limpiado</div>`;
      return html;
    }
  },
  peligro_derrumbe: {
    label: 'Peligro de derrumbe', color: '#E65100', icono: '⚠️', requiereAdmin: false,
    definicion: DEFINICIONES.peligro_derrumbe,
    campos: [
      { id: 'nombre', label: 'Ubicación / referencia *', type: 'text', required: true },
      { id: 'advertencia', label: 'Advertencia adicional (opcional)', type: 'textarea', required: false },
      { id: 'nombre_registrador', label: 'Tu nombre completo *', type: 'text', required: true },
      { id: 'rol_registrador', label: 'Tu rol *', type: 'select', options: ['Voluntario', 'Coordinador', 'Líder comunitario', 'Rescatista', 'Personal de salud', 'Otro'], required: true },
      { id: 'urgente', label: '¿Es urgente?', type: 'select', options: ['No', 'Sí'], required: false },
      { id: 'necesidades', label: 'Necesidades detalladas (una por línea)', type: 'textarea', required: false }
    ],
    procesar: (d) => ({
      advertencia: sanitizar(d.advertencia || 'Manténgase alejado, estructura inestable'),
      nombre_registrador: sanitizar(d.nombre_registrador || ''),
      rol_registrador: sanitizar(d.rol_registrador || 'Voluntario'),
      urgente: d.urgente === 'Sí',
      necesidades: sanitizarArray(d.necesidades ? d.necesidades.split('\n').filter(s => s.trim()) : []),
      estado: 'pendiente',
      fecha_creacion: new Date().toLocaleString(),
      fecha_edicion: new Date().toLocaleString()
    }),
    popupDetalle: (info) => `<div class="popup-advertencia">⚠️ ${sanitizar(info.advertencia)}</div>`
  },
  sin_inspeccionar: {
    label: 'Sin inspeccionar', color: '#6A1B9A', icono: '❓', requiereAdmin: false,
    definicion: DEFINICIONES.sin_inspeccionar,
    campos: [
      { id: 'nombre', label: 'Ubicación / referencia *', type: 'text', required: true },
      { id: 'nota', label: 'Nota adicional (opcional)', type: 'textarea', required: false },
      { id: 'nombre_registrador', label: 'Tu nombre completo *', type: 'text', required: true },
      { id: 'rol_registrador', label: 'Tu rol *', type: 'select', options: ['Voluntario', 'Coordinador', 'Líder comunitario', 'Rescatista', 'Personal de salud', 'Otro'], required: true },
      { id: 'urgente', label: '¿Es urgente?', type: 'select', options: ['No', 'Sí'], required: false },
      { id: 'necesidades', label: 'Necesidades detalladas (una por línea)', type: 'textarea', required: false }
    ],
    procesar: (d) => ({
      mensaje: sanitizar(d.nota || 'Estructura no ha sido inspeccionada por personal autorizado'),
      nombre_registrador: sanitizar(d.nombre_registrador || ''),
      rol_registrador: sanitizar(d.rol_registrador || 'Voluntario'),
      urgente: d.urgente === 'Sí',
      necesidades: sanitizarArray(d.necesidades ? d.necesidades.split('\n').filter(s => s.trim()) : []),
      estado: 'pendiente',
      fecha_creacion: new Date().toLocaleString(),
      fecha_edicion: new Date().toLocaleString()
    }),
    popupDetalle: (info) => `<div class="popup-info" style="color:#6A1B9A;">❓ ${sanitizar(info.mensaje)}</div>`
  },
  veterinaria: {
    label: 'Atención veterinaria', color: '#00897B', icono: '🐾', requiereAdmin: false,
    definicion: DEFINICIONES.veterinaria,
    campos: [
      { id: 'nombre', label: 'Nombre del centro veterinario *', type: 'text', required: true },
      { id: 'direccion', label: 'Dirección', type: 'text', required: false },
      { id: 'servicios', label: 'Servicios que ofrecen (separados por comas)', type: 'textarea', required: false },
      { id: 'emergencia', label: '¿Atienden emergencias 24h?', type: 'select', options: ['No', 'Sí'], required: false },
      { id: 'nombre_registrador', label: 'Tu nombre completo *', type: 'text', required: true },
      { id: 'rol_registrador', label: 'Tu rol *', type: 'select', options: ['Voluntario', 'Coordinador', 'Líder comunitario', 'Rescatista', 'Personal de salud', 'Otro'], required: true },
      { id: 'urgente', label: '¿Es urgente?', type: 'select', options: ['No', 'Sí'], required: false },
      { id: 'necesidades', label: 'Necesidades detalladas (una por línea)', type: 'textarea', required: false }
    ],
    procesar: (d) => ({
      servicios: sanitizarArray(d.servicios ? d.servicios.split(',').map(s => s.trim()).filter(Boolean) : []),
      emergencia_24h: d.emergencia === 'Sí',
      nombre_registrador: sanitizar(d.nombre_registrador || ''),
      rol_registrador: sanitizar(d.rol_registrador || 'Voluntario'),
      urgente: d.urgente === 'Sí',
      necesidades: sanitizarArray(d.necesidades ? d.necesidades.split('\n').filter(s => s.trim()) : []),
      estado: 'pendiente',
      fecha_creacion: new Date().toLocaleString(),
      fecha_edicion: new Date().toLocaleString()
    }),
    popupDetalle: (info) => {
      let html = '';
      if (info.servicios?.length) html += `<div class="popup-info">🩺 Servicios: ${sanitizar(info.servicios.join(', '))}</div>`;
      if (info.emergencia_24h) html += `<div class="popup-info" style="color:#00897B;">🕐 Atención 24h</div>`;
      return html;
    }
  },
  ayuda_psicologica: {
    label: 'Ayuda psicológica', color: '#8E24AA', icono: '🧠', requiereAdmin: true,
    definicion: DEFINICIONES.ayuda_psicologica,
    campos: [
      { id: 'nombre', label: 'Nombre del centro / profesional *', type: 'text', required: true },
      { id: 'direccion', label: 'Dirección', type: 'text', required: false },
      { id: 'horario', label: 'Horario de atención', type: 'text', required: false },
      { id: 'contacto', label: 'Teléfono de contacto', type: 'text', required: false },
      { id: 'nombre_registrador', label: 'Tu nombre completo *', type: 'text', required: true },
      { id: 'rol_registrador', label: 'Tu rol *', type: 'select', options: ['Voluntario', 'Coordinador', 'Líder comunitario', 'Rescatista', 'Personal de salud', 'Otro'], required: true },
      { id: 'urgente', label: '¿Es urgente?', type: 'select', options: ['No', 'Sí'], required: false },
      { id: 'necesidades', label: 'Información adicional (una por línea)', type: 'textarea', required: false }
    ],
    procesar: (d) => ({
      horario: sanitizar(d.horario || ''),
      contacto: sanitizar(d.contacto || ''),
      nombre_registrador: sanitizar(d.nombre_registrador || ''),
      rol_registrador: sanitizar(d.rol_registrador || 'Voluntario'),
      urgente: d.urgente === 'Sí',
      necesidades: sanitizarArray(d.necesidades ? d.necesidades.split('\n').filter(s => s.trim()) : []),
      estado: 'pendiente',
      fecha_creacion: new Date().toLocaleString(),
      fecha_edicion: new Date().toLocaleString()
    }),
    popupDetalle: (info) => {
      let html = '';
      if (info.horario) html += `<div class="popup-info">🕐 Horario: ${sanitizar(info.horario)}</div>`;
      if (info.contacto) html += `<div class="popup-info">📞 Contacto: ${sanitizar(info.contacto)}</div>`;
      return html;
    }
  },
  vacuna_tetanos: {
    label: 'Vacunación antitetánica', color: '#0D47A1', icono: '💉', requiereAdmin: true,
    definicion: DEFINICIONES.vacuna_tetanos,
    campos: [
      { id: 'nombre', label: 'Nombre del punto de vacunación *', type: 'text', required: true },
      { id: 'direccion', label: 'Dirección', type: 'text', required: false },
      { id: 'horario', label: 'Horario de aplicación', type: 'text', required: false },
      { id: 'contacto', label: 'Teléfono de contacto', type: 'text', required: false },
      { id: 'nombre_registrador', label: 'Tu nombre completo *', type: 'text', required: true },
      { id: 'rol_registrador', label: 'Tu rol *', type: 'select', options: ['Voluntario', 'Coordinador', 'Líder comunitario', 'Rescatista', 'Personal de salud', 'Otro'], required: true },
      { id: 'urgente', label: '¿Es urgente?', type: 'select', options: ['No', 'Sí'], required: false },
      { id: 'necesidades', label: 'Información adicional (una por línea)', type: 'textarea', required: false }
    ],
    procesar: (d) => ({
      horario: sanitizar(d.horario || ''),
      contacto: sanitizar(d.contacto || ''),
      nombre_registrador: sanitizar(d.nombre_registrador || ''),
      rol_registrador: sanitizar(d.rol_registrador || 'Voluntario'),
      urgente: d.urgente === 'Sí',
      necesidades: sanitizarArray(d.necesidades ? d.necesidades.split('\n').filter(s => s.trim()) : []),
      estado: 'pendiente',
      fecha_creacion: new Date().toLocaleString(),
      fecha_edicion: new Date().toLocaleString()
    }),
    popupDetalle: (info) => {
      let html = '';
      if (info.horario) html += `<div class="popup-info">🕐 Horario: ${sanitizar(info.horario)}</div>`;
      if (info.contacto) html += `<div class="popup-info">📞 Contacto: ${sanitizar(info.contacto)}</div>`;
      return html;
    }
  }
};
// ============================================================
// FUNCIONES DE GEOLOCALIZACIÓN Y SELECCIÓN
// ============================================================
function obtenerUbicacion() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        ubicacionUsuario = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        if (markerUsuario) map.removeLayer(markerUsuario);
        markerUsuario = L.marker([ubicacionUsuario.lat, ubicacionUsuario.lng], {
          icon: L.divIcon({
            html: '<div style="background:#1a73e8;border-radius:50%;width:18px;height:18px;border:3px solid white;box-shadow:0 0 10px rgba(26,115,232,0.6);"></div>',
            iconSize: [18, 18]
          })
        }).addTo(map).bindPopup('📍 Tu ubicación').openPopup();
        map.setView([ubicacionUsuario.lat, ubicacionUsuario.lng], 14);
        aplicarFiltros();
      },
      () => { console.log('No se pudo obtener ubicación'); },
      { enableHighAccuracy: true }
    );
  }
}

function calcularDistancia(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function activarSeleccion() {
  map.getContainer().style.cursor = 'crosshair';
  map.on('click', onMapClick);
}

function desactivarSeleccion() {
  map.getContainer().style.cursor = '';
  map.off('click', onMapClick);
  if (markerSeleccion) { map.removeLayer(markerSeleccion); markerSeleccion = null; }
  ubicacionSeleccionada = null;
  puntoEnEdicion = null;
}

function onMapClick(e) {
  const lat = e.latlng.lat;
  const lng = e.latlng.lng;
  ubicacionSeleccionada = { lat, lng };
  fLatDisplay.textContent = lat.toFixed(6);
  fLngDisplay.textContent = lng.toFixed(6);
  if (markerSeleccion) map.removeLayer(markerSeleccion);
  markerSeleccion = L.marker([lat, lng], {
    icon: L.divIcon({
      html: '<div style="background:#E53935;border-radius:50%;width:20px;height:20px;border:3px solid white;box-shadow:0 0 10px rgba(229,57,53,0.6);"></div>',
      iconSize: [20, 20]
    })
  }).addTo(map);
  map.off('click', onMapClick);
  map.getContainer().style.cursor = '';
  mostrarFormulario(tipoSeleccionado);
  obtenerDireccionDesdeCoordenadas(lat, lng);
}

function obtenerDireccionDesdeCoordenadas(lat, lng) {
  const campoDireccion = document.getElementById('campo_direccion');
  if (!campoDireccion) return;
  campoDireccion.placeholder = '🔄 Obteniendo dirección...';
  campoDireccion.value = '';
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&countrycodes=ve`;
    fetch(url).then(res => res.json()).then(data => {
      if (data && data.display_name) {
        const address = data.address || {};
        const partes = [];
        if (address.road) partes.push(address.road);
        else if (address.pedestrian) partes.push(address.pedestrian);
        if (address.neighbourhood) partes.push(address.neighbourhood);
        else if (address.suburb) partes.push(address.suburb);
        if (address.city || address.town || address.village) partes.push(address.city || address.town || address.village);
        if (address.state) partes.push(address.state);
        const direccionCompleta = partes.length > 0 ? partes.join(', ') : data.display_name;
        campoDireccion.value = sanitizar(direccionCompleta);
        campoDireccion.placeholder = 'Dirección (automática)';
      } else {
        campoDireccion.placeholder = 'No se pudo obtener dirección';
      }
    }).catch(() => { campoDireccion.placeholder = 'Error al obtener dirección (escribe manual)'; });
  } catch (e) { campoDireccion.placeholder = 'Error al obtener dirección (escribe manual)'; }
}

// ============================================================
// FUNCIÓN PARA DESPLEGAR MENSAJE DE ATENCIÓN
// ============================================================
function toggleMensaje(id) {
  const contenido = document.getElementById(id);
  const icono = document.getElementById(id + '_icon');
  if (!contenido) return;
  if (contenido.style.display === 'none' || contenido.style.display === '') {
    contenido.style.display = 'block';
    if (icono) icono.textContent = '▲';
  } else {
    contenido.style.display = 'none';
    if (icono) icono.textContent = '▼';
  }
}

// ============================================================
// APLICAR FILTROS Y MOSTRAR PUNTOS (VERSIÓN MEJORADA)
// ============================================================
function aplicarFiltros() {
  let filtrados;
  if (filtroActivo === 'todos') {
    filtrados = todosLosPuntos;
  } else if (filtroActivo === 'edificio_recogido') {
    filtrados = todosLosPuntos.filter(p => p.tipo === 'edificio_caido' && p.informacion?.recogido === true);
  } else {
    filtrados = todosLosPuntos.filter(p => p.tipo === filtroActivo);
  }
  mostrarPuntos(filtrados);
  if (ubicacionUsuario && filtrados.length > 0) {
    const conDistancia = filtrados.map(p => ({
      ...p,
      distancia: calcularDistancia(ubicacionUsuario.lat, ubicacionUsuario.lng, p.lat, p.lng)
    }));
    conDistancia.sort((a, b) => a.distancia - b.distancia);
    const cercanos = conDistancia.slice(0, 5);
    console.log('📍 Más cercanos:', cercanos.map(p => `${p.nombre} (${p.distancia.toFixed(2)} km)`));
  }
}

function mostrarPuntos(puntos) {
  let puntosAMostrar = puntos;
  if (!modoAdmin) {
    puntosAMostrar = puntos.filter(p => p.informacion?.estado === 'aprobado');
  }
  markersLayer.clearLayers();
  puntosAMostrar.forEach(p => {
    const tipo = TIPOS[p.tipo];
    if (!tipo) return;

    let recogido = false;
    let color = tipo.color;
    let icono = tipo.icono;
    if (p.tipo === 'edificio_caido' && p.informacion?.recogido) {
      recogido = true;
      color = '#757575';
      icono = '✅';
    }

    const icon = L.divIcon({
      html: `<div style="background:${color};color:white;border-radius:50%;width:34px;height:34px;display:flex;align-items:center;justify-content:center;font-size:18px;border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);">${icono}</div>`,
      iconSize: [34, 34],
      className: ''
    });

    const definicionTexto = tipo.definicion ? `<div class="popup-definicion">ℹ️ ${sanitizar(tipo.definicion)}</div>` : '';
    const nombreSanitizado = sanitizar(p.nombre);
    const direccionSanitizada = sanitizar(p.informacion?.direccion || '');

    let popupContent = `
      <div class="popup-tipo">${tipo.icono} ${tipo.label}</div>
      ${definicionTexto}
      <strong>${nombreSanitizado}</strong><br>
      ${direccionSanitizada ? direccionSanitizada + '<br>' : ''}
      ${tipo.popupDetalle(p.informacion || {})}
    `;

    const fechaCreacion = p.informacion?.fecha_creacion || 'Sin fecha';
    const fechaEdicion = p.informacion?.fecha_edicion || fechaCreacion;
    popupContent += `<div class="popup-info" style="font-size:11px;color:#777;margin-top:4px;">🕒 Creado: ${sanitizar(fechaCreacion)}</div>`;
    if (fechaEdicion !== fechaCreacion) {
      popupContent += `<div class="popup-info" style="font-size:11px;color:#777;">✏️ Editado: ${sanitizar(fechaEdicion)}</div>`;
    }

    if (modoAdmin) {
      const nombreReg = sanitizar(p.informacion?.nombre_registrador || 'No especificado');
      const rolReg = sanitizar(p.informacion?.rol_registrador || 'Sin rol');
      popupContent += `<div class="popup-registrador">👤 Registrado por: ${nombreReg} (${rolReg})</div>`;
      if (p.informacion?.estado === 'pendiente') {
        popupContent += `<div style="color:#f57f17;font-size:12px;font-weight:bold;margin-top:4px;">⏳ Pendiente de aprobación</div>`;
      }
    }

    const necesidades = p.informacion?.necesidades || [];
    const esUrgente = p.informacion?.urgente || false;
    if (necesidades.length > 0) {
      const estiloFondo = esUrgente
        ? 'background:#ffebee;border-left:4px solid #d32f2f;padding:6px 10px;border-radius:4px;margin-top:8px;'
        : 'background:#fff3e0;border-left:4px solid #E53935;padding:6px 10px;border-radius:4px;margin-top:8px;';
      const tituloUrgencia = esUrgente
        ? '<span style="background:#d32f2f;color:white;padding:2px 8px;border-radius:4px;font-size:12px;">🚨 URGENTE</span> '
        : '';
      popupContent += `<div class="popup-seccion" style="${estiloFondo}">
        <strong style="color:${esUrgente ? '#d32f2f' : '#E53935'};font-size:15px;">🔥 Prioridad ${tituloUrgencia}</strong>
        <ul class="popup-lista">`;
      necesidades.forEach(n => popupContent += `<li>${sanitizar(n)}</li>`);
      popupContent += `</ul></div>`;
    }

    if (p.informacion?.necesidad_infantil && p.informacion?.voluntarios_infantiles !== undefined) {
      const mensajeId = 'mensaje_' + p.id;
      popupContent += `
        <div style="margin-top:6px;padding:6px 10px;background:#ffebee;border-left:3px solid #d32f2f;border-radius:4px;font-size:12px;color:#d32f2f;">
          <div style="display:flex;justify-content:space-between;align-items:center;cursor:pointer;font-weight:bold;" onclick="toggleMensaje('${mensajeId}')">
            <span>🛡️ ¡ATENCIÓN! (toca para leer)</span>
            <span id="${mensajeId}_icon">▼</span>
          </div>
          <div id="${mensajeId}" style="display:none;margin-top:4px;font-weight:normal;font-size:12px;color:#333;line-height:1.4;">
            Los niños y niñas son nuestra prioridad. Por su seguridad, <strong>ninguna persona podrá acercarse a ellos</strong> sin haber completado su <strong>información completa</strong> (nombre, cédula, fotos y contacto) y sin que <strong>los administradores hayan verificado su identidad</strong>.<br>
            Si ves a alguien sin estos requisitos, <strong>no permitas que se acerque</strong> a los menores y reporta la situación a un administrador.
          </div>
        </div>
      `;
      popupContent += `
        <button class="btn-ofrecerse-infantil" data-id="${p.id}" style="margin-top:6px;background:#FF6F00;color:white;border:none;padding:6px 12px;border-radius:6px;cursor:pointer;font-weight:bold;width:100%;font-size:13px;">
          🧸 Ofrecerse como voluntario para niños
        </button>
      `;
      if (modoAdmin && p.informacion.voluntarios_infantiles && p.informacion.voluntarios_infantiles.length > 0) {
        popupContent += `<div class="popup-seccion"><strong style="color:#1a237e;">👥 Voluntarios registrados (solo administradores):</strong><ul class="popup-lista">`;
        p.informacion.voluntarios_infantiles.forEach(v => {
          popupContent += `<li><strong>${sanitizar(v.nombre)}</strong> (${sanitizar(v.rol || 'Voluntario')})<br>📞 ${sanitizar(v.telefono || 'Sin teléfono')}<br>🪪 Cédula: ${sanitizar(v.cedula || 'No especificada')}</li>`;
        });
        popupContent += `</ul></div>`;
      } else if (p.informacion.voluntarios_infantiles && p.informacion.voluntarios_infantiles.length > 0) {
        popupContent += `<div style="font-size:13px;color:#777;margin-top:6px;text-align:center;">👥 ${p.informacion.voluntarios_infantiles.length} voluntario(s) registrado(s) (contacta a un administrador para ver los detalles)</div>`;
      }
    }

    // Botones de acción (solo los esenciales por ahora)
    if (p.tipo === 'edificio_caido' && !recogido) {
      popupContent += `
        <button class="btn-recoger" data-id="${p.id}" style="margin-top:8px;background:#4CAF50;color:white;border:none;padding:6px 12px;border-radius:6px;cursor:pointer;font-weight:bold;width:100%;">
          ✅ Marcar como recogido
        </button>
      `;
    } else if (p.tipo === 'edificio_caido' && recogido) {
      popupContent += `<div style="margin-top:8px;background:#e0e0e0;padding:6px;border-radius:6px;text-align:center;color:#333;">✅ Ya recogido y limpiado</div>`;
    }

    if (modoAdmin && p.informacion?.estado === 'pendiente') {
      popupContent += `
        <button class="btn-validar" data-id="${p.id}" style="margin-top:8px;background:#2e7d32;color:white;border:none;padding:6px 12px;border-radius:6px;cursor:pointer;font-weight:bold;width:100%;">
          ✅ Validar punto
        </button>
      `;
    }

    popupContent += `
      <button class="btn-navegar" data-id="${p.id}" style="margin-top:6px;background:#1a73e8;color:white;border:none;padding:6px 12px;border-radius:6px;cursor:pointer;font-weight:bold;width:100%;">
        🧭 Cómo llegar
      </button>
    `;

    if (modoAdmin) {
      popupContent += `
        <button class="btn-eliminar-admin" data-id="${p.id}" style="margin-top:6px;background:#d32f2f;color:white;border:none;padding:6px 12px;border-radius:6px;cursor:pointer;font-weight:bold;width:100%;">
          🗑️ Eliminar punto
        </button>
      `;
      popupContent += `
        <button class="btn-editar-punto" data-id="${p.id}" style="margin-top:6px;background:#1a237e;color:white;border:none;padding:6px 12px;border-radius:6px;cursor:pointer;font-weight:bold;width:100%;">
          ✏️ Editar punto
        </button>
      `;
    }

    if (ubicacionUsuario) {
      const dist = calcularDistancia(ubicacionUsuario.lat, ubicacionUsuario.lng, p.lat, p.lng);
      popupContent += `<div class="popup-distancia">📍 ${dist.toFixed(2)} km de ti</div>`;
    }

    const marker = L.marker([p.lat, p.lng], { icon })
      .bindPopup(popupContent, { maxWidth: 350, className: 'popup-detalle' });

    marker.on('popupopen', function() {
      const btnRecoger = document.querySelector(`.btn-recoger[data-id="${p.id}"]`);
      if (btnRecoger) btnRecoger.addEventListener('click', (e) => { e.stopPropagation(); marcarRecogido(p.id); });
      const btnEliminar = document.querySelector(`.btn-eliminar-admin[data-id="${p.id}"]`);
      if (btnEliminar) btnEliminar.addEventListener('click', (e) => { e.stopPropagation(); eliminarPunto(p.id); });
      const btnEditar = document.querySelector(`.btn-editar-punto[data-id="${p.id}"]`);
      if (btnEditar) btnEditar.addEventListener('click', (e) => { e.stopPropagation(); mostrarFormularioEdicionPunto(p.id); });
      const btnValidar = document.querySelector(`.btn-validar[data-id="${p.id}"]`);
      if (btnValidar) {
        btnValidar.addEventListener('click', function(e) {
          e.stopPropagation();
          validarPunto(p.id);
        });
      }
      const btnOfrecerse = document.querySelector(`.btn-ofrecerse-infantil[data-id="${p.id}"]`);
      if (btnOfrecerse) {
        btnOfrecerse.addEventListener('click', function(e) {
          e.stopPropagation();
          mostrarFormularioVoluntarioInfantil(p.id);
        });
      }
      const btnNavegar = document.querySelector(`.btn-navegar[data-id="${p.id}"]`);
      if (btnNavegar) {
        btnNavegar.addEventListener('click', function(e) {
          e.stopPropagation();
          iniciarNavegacion(p.id);
        });
      }
    });

    markersLayer.addLayer(marker);
  });
}

console.log('✅ BLOQUE 3 cargado correctamente');
