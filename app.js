// ============================================================
// MAPAVIDA - BLOQUE 1: CONFIGURACIÓN, VARIABLES, DEFINICIONES Y TIPOS
// ============================================================

// ============================================================
// MAPA (SIEMPRE CARGA)
// ============================================================
const map = L.map('map').setView([10.4806, -66.9036], 12);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: 'MapaVida'
}).addTo(map);

document.getElementById('cargando').style.display = 'none';

// ============================================================
// VARIABLES GLOBALES
// ============================================================
const ADMIN_PASSWORD = 'MapaVida2026';

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
// DEFINICIONES
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

// ============================================================
// TIPOS DE PUNTOS (CON SANITIZACIÓN Y ESTADO PENDIENTE)
// ============================================================
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
// BLOQUE 2: CARGA, GUARDADO, ADMIN Y GESTIÓN DE PENDIENTES
// ============================================================

// --- CARGAR PUNTOS DESDE LOCALSTORAGE ---
function cargarPuntos() {
  const stored = localStorage.getItem('puntosMapaVida');
  if (stored) {
    try {
      todosLosPuntos = JSON.parse(stored);
      aplicarFiltros();
      console.log('✅ Datos cargados desde localStorage');
    } catch (e) {
      todosLosPuntos = [];
      aplicarFiltros();
    }
  } else {
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
    aplicarFiltros();
  }
}

// --- GUARDAR PUNTOS EN LOCALSTORAGE ---
function guardarPuntos() {
  localStorage.setItem('puntosMapaVida', JSON.stringify(todosLosPuntos));
  console.log('✅ Datos guardados en localStorage');
}

// --- ELIMINAR PUNTO ---
function eliminarPunto(id) {
  if (!modoAdmin) {
    alert('🔐 Solo los administradores pueden eliminar puntos.');
    return;
  }
  if (!confirm('¿Seguro que quieres eliminar este punto de forma permanente?')) return;
  todosLosPuntos = todosLosPuntos.filter(p => p.id !== id);
  guardarPuntos();
  aplicarFiltros();
  alert('🗑️ Punto eliminado.');
}

// --- MARCAR EDIFICIO COMO RECOGIDO ---
function marcarRecogido(id) {
  if (!modoAdmin) {
    alert('🔐 Solo los administradores pueden marcar como recogido.');
    return;
  }
  const punto = todosLosPuntos.find(p => p.id === id);
  if (!punto || punto.tipo !== 'edificio_caido' || punto.informacion.recogido) return;
  punto.informacion.recogido = true;
  punto.informacion.fecha_edicion = new Date().toLocaleString();
  guardarPuntos();
  aplicarFiltros();
  alert('✅ Edificio marcado como recogido y limpiado. ¡Gracias!');
}

// --- AUTENTICACIÓN ---
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

// --- EVENTOS DE AUTENTICACIÓN ---
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

// --- GESTIÓN DE PENDIENTES ---
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

// --- MOSTRAR PANEL DE PENDIENTES ---
function mostrarPendientes() {
  if (!modoAdmin) {
    alert('🔐 Solo los administradores pueden ver puntos pendientes.');
    return;
  }
  const pendientes = todosLosPuntos.filter(p => p.informacion?.estado === 'pendiente');
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
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
      <h2 style="margin:0;">⏳ Puntos pendientes de aprobación</h2>
      <button id="btnCerrarPendientes" style="background:#d32f2f;color:white;border:none;padding:8px 16px;border-radius:8px;cursor:pointer;font-weight:bold;">✖ Cerrar</button>
    </div>
  `;
  if (pendientes.length === 0) {
    html += `<p style="text-align:center;color:#666;padding:40px;">No hay puntos pendientes de aprobación.</p>`;
  } else {
    pendientes.forEach(p => {
      const tipo = TIPOS[p.tipo];
      if (!tipo) return;
      html += `
        <div style="background:#fffde7;border-left:4px solid #f57f17;padding:12px;margin-bottom:12px;border-radius:8px;box-shadow:0 2px 4px rgba(0,0,0,0.1);">
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
            <div>
              <strong>${sanitizar(p.nombre)}</strong>
              <span style="font-size:13px;color:#555;margin-left:8px;">${tipo.label}</span>
              <span style="font-size:12px;background:#f57f17;color:white;padding:2px 8px;border-radius:12px;margin-left:8px;">⏳ Pendiente</span>
            </div>
            <div>
              <button class="btn-aprobar" data-id="${p.id}" style="background:#2e7d32;color:white;border:none;padding:6px 12px;border-radius:6px;cursor:pointer;font-weight:bold;margin-right:4px;">✅ Aprobar</button>
              <button class="btn-rechazar" data-id="${p.id}" style="background:#d32f2f;color:white;border:none;padding:6px 12px;border-radius:6px;cursor:pointer;font-weight:bold;">❌ Rechazar</button>
            </div>
          </div>
          <div style="margin-top:6px;font-size:13px;color:#555;">
            📍 Coordenadas: ${p.lat}, ${p.lng}
            ${p.informacion?.direccion ? ` | 📌 ${sanitizar(p.informacion.direccion)}` : ''}
            <div style="font-size:12px;color:#777;margin-top:4px;">
              👤 Registrado por: ${sanitizar(p.informacion?.nombre_registrador || 'Anónimo')} (${sanitizar(p.informacion?.rol_registrador || 'Sin rol')})
            </div>
            ${p.informacion?.necesidades?.length ? `<div style="margin-top:4px;"><strong>Necesidades:</strong> ${p.informacion.necesidades.map(n => sanitizar(n)).join(', ')}</div>` : ''}
          </div>
        </div>
      `;
    });
  }
  panel.innerHTML = html;
  document.getElementById('btnCerrarPendientes').addEventListener('click', function() { panel.style.display = 'none'; });
  document.querySelectorAll('.btn-aprobar').forEach(btn => {
    btn.addEventListener('click', function() { aprobarPunto(this.dataset.id); });
  });
  document.querySelectorAll('.btn-rechazar').forEach(btn => {
    btn.addEventListener('click', function() { rechazarPunto(this.dataset.id); });
  });
}
// ============================================================
// BLOQUE 3: MAPA, FILTROS Y MOSTRAR PUNTOS
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

    // Botones de acción
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

    if (p.tipo === 'centro_acopio') {
      popupContent += `
        <button class="btn-crear-envio" data-id="${p.id}" style="margin-top:8px;background:#F57C00;color:white;border:none;padding:6px 12px;border-radius:6px;cursor:pointer;font-weight:bold;width:100%;">
          📦 Crear envío de suministros
        </button>
      `;
      if (p.informacion?.envios && p.informacion.envios.length > 0) {
        popupContent += `<div class="popup-seccion" style="background:#e3f2fd;padding:8px;border-radius:6px;margin-top:6px;">
          <strong style="color:#0d47a1;">🚚 Transporte de insumos</strong>
          <ul class="popup-lista">`;
        p.informacion.envios.forEach(e => {
          const estadoColor = e.estado === 'entregado' ? '#2e7d32' : e.estado === 'incidencia' ? '#d32f2f' : '#F57C00';
          const aprobaciones = `O:${e.aprobacionOrigen ? '✅' : '⏳'} C:${e.aprobacionConductor ? '✅' : '⏳'} D:${e.aprobacionDestino ? '✅' : '⏳'}`;
          popupContent += `<li style="margin-bottom:6px;padding:4px;border-bottom:1px solid #eee;">
            <strong>${sanitizar(e.contenido)}</strong><br>
            ➜ ${sanitizar(e.destinoNombre)}<br>
            <span style="color:${estadoColor};">${sanitizar(e.estado)}</span> | ${aprobaciones}
            ${e.conductor ? `| 👤 ${sanitizar(e.conductor.nombre)}` : ''}
            ${e.estado === 'pendiente' || e.estado === 'origen_aprobado' ? `<br><span style="font-size:12px;color:#1a73e8;">🔗 <a href="${sanitizar(e.enlace)}" target="_blank">${sanitizar(e.enlace)}</a></span>` : ''}
          </li>`;
        });
        popupContent += `</ul></div>`;
      }
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
      const btnCrearEnvio = document.querySelector(`.btn-crear-envio[data-id="${p.id}"]`);
      if (btnCrearEnvio) {
        btnCrearEnvio.addEventListener('click', function(e) {
          e.stopPropagation();
          mostrarFormularioCrearEnvio(p.id);
        });
      }
    });

    markersLayer.addLayer(marker);
  });
}
// ============================================================
// BLOQUE 4: GEOLOCALIZACIÓN, SELECCIÓN Y GESTIÓN DE PENDIENTES
// ============================================================

// --- GEOLOCALIZACIÓN ---
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

// --- SELECCIÓN EN EL MAPA ---
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
// ============================================================
// BLOQUE 5: MENÚ, FORMULARIOS, GUARDAR Y CANCELAR
// ============================================================

const menuOpciones = document.getElementById('menuOpciones');
const btnAgregar = document.getElementById('btnAgregar');
const btnAdmin = document.getElementById('btnAdmin');
const btnPendientes = document.getElementById('btnPendientes');
const formulario = document.getElementById('formulario');
const formTitulo = document.getElementById('formTitulo');
const camposDinamicos = document.getElementById('camposDinamicos');
const fLatDisplay = document.getElementById('fLatDisplay');
const fLngDisplay = document.getElementById('fLngDisplay');
const btnGuardar = document.getElementById('btnGuardar');
const btnEliminar = document.getElementById('btnEliminar');
const btnCancelar = document.getElementById('btnCancelar');

btnAgregar.addEventListener('click', function(e) {
  e.stopPropagation();
  menuOpciones.style.display = (menuOpciones.style.display === 'flex') ? 'none' : 'flex';
});
document.addEventListener('click', function() { menuOpciones.style.display = 'none'; });

document.querySelectorAll('#menuOpciones button').forEach(btn => {
  btn.addEventListener('click', function(e) {
    e.stopPropagation();
    const tipo = this.dataset.tipo;
    const config = TIPOS[tipo];
    if (config.requiereAdmin && !modoAdmin) {
      alert('🔐 Este tipo de punto solo puede ser agregado por el administrador. Inicia sesión como administrador.');
      return;
    }
    tipoSeleccionado = tipo;
    menuOpciones.style.display = 'none';
    activarSeleccion();
    const msg = `Toca el mapa para ubicar el ${config.label.toLowerCase()}`;
    alert(msg);
  });
});

function mostrarFormulario(tipo) {
  const config = TIPOS[tipo];
  if (!config) return;
  formTitulo.innerHTML = `${config.icono} ${config.label}`;
  let html = '';
  config.campos.forEach(campo => {
    let input = '';
    if (campo.type === 'textarea') {
      input = `<textarea id="campo_${campo.id}" ${campo.required ? 'required' : ''}></textarea>`;
    } else if (campo.type === 'select') {
      input = `<select id="campo_${campo.id}">`;
      campo.options.forEach(opt => input += `<option value="${opt}">${opt}</option>`);
      input += `</select>`;
    } else {
      input = `<input type="${campo.type}" id="campo_${campo.id}" ${campo.required ? 'required' : ''}>`;
    }
    html += `<label>${campo.label}</label>${input}`;
  });
  camposDinamicos.innerHTML = html;
  formulario.style.display = 'block';
  btnEliminar.style.display = 'none';
  puntoEnEdicion = null;
  if (ubicacionSeleccionada) {
    obtenerDireccionDesdeCoordenadas(ubicacionSeleccionada.lat, ubicacionSeleccionada.lng);
  }
}

btnGuardar.addEventListener('click', function() {
  if (!tipoSeleccionado) { alert('Selecciona un tipo primero'); return; }
  if (!ubicacionSeleccionada) { alert('Toca el mapa para seleccionar ubicación'); return; }
  const config = TIPOS[tipoSeleccionado];
  const datos = {};
  let valido = true;
  config.campos.forEach(campo => {
    const el = document.getElementById(`campo_${campo.id}`);
    if (!el) return;
    const valor = el.value.trim();
    if (campo.required && !valor) { alert(`El campo "${campo.label}" es obligatorio`); valido = false; return; }
    datos[campo.id] = valor;
  });
  if (!valido) return;
  const informacion = config.procesar(datos);
  informacion.direccion = datos.direccion || '';
  informacion.fecha_creacion = new Date().toLocaleString();
  informacion.fecha_edicion = informacion.fecha_creacion;
  // Si es admin, el punto se aprueba automáticamente
  if (modoAdmin) {
    informacion.estado = 'aprobado';
  } else {
    informacion.estado = 'pendiente';
  }
  const nuevoPunto = {
    id: Date.now().toString(),
    tipo: tipoSeleccionado,
    nombre: datos.nombre,
    lat: ubicacionSeleccionada.lat,
    lng: ubicacionSeleccionada.lng,
    informacion: informacion
  };
  todosLosPuntos.push(nuevoPunto);
  guardarPuntos();
  alert(modoAdmin ? '✅ Punto guardado y visible en el mapa' : '✅ Punto enviado para aprobación.');
  formulario.style.display = 'none';
  desactivarSeleccion();
  ubicacionSeleccionada = null;
  aplicarFiltros();
});

btnCancelar.addEventListener('click', function() {
  const btnRegistro = document.getElementById('btnRegistrarVoluntario');
  if (btnRegistro) { document.getElementById('btnCancelarVoluntario').click(); return; }
  const btnEdicion = document.getElementById('btnGuardarEdicion');
  if (btnEdicion) { document.getElementById('btnCancelarEdicion').click(); return; }
  const btnEnvio = document.getElementById('btnCrearEnvio');
  if (btnEnvio) { document.getElementById('btnCancelarEnvio').click(); return; }
  const btnIncidencia = document.getElementById('btnGuardarIncidencia');
  if (btnIncidencia) { document.getElementById('btnCancelarIncidencia').click(); return; }
  formulario.style.display = 'none';
  desactivarSeleccion();
  ubicacionSeleccionada = null;
});

document.getElementById('btnBuscar').addEventListener('click', async function() {
  const query = document.getElementById('buscador').value.trim();
  if (!query) return;
  try {
    const resp = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&countrycodes=ve`);
    const data = await resp.json();
    if (data.length === 0) { alert('No se encontraron resultados'); return; }
    const r = data[0];
    const lat = parseFloat(r.lat);
    const lon = parseFloat(r.lon);
    map.setView([lat, lon], 15);
    L.marker([lat, lon]).addTo(map).bindPopup(`📍 ${r.display_name}`).openPopup();
  } catch (e) {
    alert('Error al buscar: ' + e.message);
  }
});
document.getElementById('buscador').addEventListener('keypress', function(e) {
  if (e.key === 'Enter') document.getElementById('btnBuscar').click();
});

document.querySelectorAll('#filtros .filtro-btn').forEach(btn => {
  btn.addEventListener('click', function() {
    document.querySelectorAll('#filtros .filtro-btn').forEach(b => b.classList.remove('activo'));
    this.classList.add('activo');
    filtroActivo = this.dataset.tipo;
    aplicarFiltros();
  });
});

document.getElementById('btnPendientes').addEventListener('click', function() {
  mostrarPendientes();
});
// ============================================================
// BLOQUE 6: LISTA, CONTADORES, DETALLE, URGENCIAS Y BUSCADOR POR NECESIDAD
// ============================================================

function actualizarContadores() {
  const contenedor = document.getElementById('contenedorContadores');
  if (!contenedor) return;
  const tipos = {
    'refugio': { label: '🏠 Refugios', count: 0 },
    'centro_acopio': { label: '📦 Acopios', count: 0 },
    'hospital': { label: '🏥 Hospitales', count: 0 },
    'edificio_caido': { label: '💥 Caídos', count: 0 },
    'edificio_recogido': { label: '✅ Recogidos', count: 0 },
    'peligro_derrumbe': { label: '⚠️ Derrumbe', count: 0 },
    'sin_inspeccionar': { label: '❓ Sin insp.', count: 0 },
    'veterinaria': { label: '🐾 Veterinaria', count: 0 },
    'ayuda_psicologica': { label: '🧠 Psicología', count: 0 },
    'vacuna_tetanos': { label: '💉 Vacuna', count: 0 }
  };
  todosLosPuntos.forEach(p => {
    let tipo = p.tipo;
    if (tipo === 'edificio_caido' && p.informacion?.recogido) { tipo = 'edificio_recogido'; }
    if (tipos[tipo]) tipos[tipo].count++;
  });
  let html = '';
  for (const [key, val] of Object.entries(tipos)) {
    if (val.count > 0 || key === 'edificio_caido' || key === 'edificio_recogido') {
      html += `<span style="background:#f0f0f0;padding:4px 10px;border-radius:16px;font-size:12px;font-weight:bold;">${val.label}: ${val.count}</span>`;
    }
  }
  contenedor.innerHTML = html;
}

function mostrarListaPuntos() {
  const panel = document.getElementById('panelLista');
  if (!panel) { alert('⚠️ Panel de lista no encontrado'); return; }
  panel.style.display = 'flex';
  actualizarContadores();
  const contenedor = document.getElementById('contenedorLista');
  if (!contenedor) { alert('⚠️ Contenedor de lista no encontrado'); return; }
  
  let puntosFiltrados = [...todosLosPuntos];
  
  // BÚSQUEDA POR NECESIDAD (prioridad)
  if (busquedaNecesidad.trim() !== '') {
    const texto = busquedaNecesidad.toLowerCase().trim();
    puntosFiltrados = puntosFiltrados.filter(p => {
      const necesidades = p.informacion?.necesidades || [];
      return necesidades.some(n => n.toLowerCase().includes(texto));
    });
    // Actualizar título
    const header = document.querySelector('#panelLista .header-lista h2');
    if (header) {
      header.innerHTML = `🔍 Resultados para: "${busquedaNecesidad}"`;
    }
  } else {
    // FILTROS DE LISTA (si no hay búsqueda)
    if (filtroLista && filtroLista !== 'todos') {
      switch (filtroLista) {
        case 'urgentes':
          puntosFiltrados = puntosFiltrados.filter(p => p.informacion?.urgente === true);
          break;
        case 'recogidos':
          puntosFiltrados = puntosFiltrados.filter(p => p.tipo === 'edificio_caido' && p.informacion?.recogido === true);
          break;
        case 'no_recogidos':
          puntosFiltrados = puntosFiltrados.filter(p => p.tipo === 'edificio_caido' && p.informacion?.recogido !== true);
          break;
        default:
          puntosFiltrados = puntosFiltrados.filter(p => p.tipo === filtroLista);
          break;
      }
    }
    // Restaurar título
    const header = document.querySelector('#panelLista .header-lista h2');
    if (header) {
      header.innerHTML = '📋 Todos los puntos';
    }
  }
  
  // Si no es admin, solo mostrar aprobados
  if (!modoAdmin) {
    puntosFiltrados = puntosFiltrados.filter(p => p.informacion?.estado === 'aprobado');
  }
  
  puntosFiltrados.reverse();
  let html = '';
  if (puntosFiltrados.length === 0) {
    html = '<p style="text-align:center;color:#666;padding:40px;">No hay puntos que coincidan con la búsqueda o filtro.</p>';
  } else {
    puntosFiltrados.forEach(p => {
      const tipo = TIPOS[p.tipo];
      if (!tipo) return;
      const esUrgente = p.informacion?.urgente || false;
      const recogido = p.tipo === 'edificio_caido' && p.informacion?.recogido;
      const estado = recogido ? '✅ Recogido' : (esUrgente ? '🚨 Urgente' : '');
      
      let necesidadesHtml = '';
      if (busquedaNecesidad.trim() !== '') {
        const necesidades = p.informacion?.necesidades || [];
        const texto = busquedaNecesidad.toLowerCase().trim();
        necesidadesHtml = necesidades.map(n => {
          const idx = n.toLowerCase().indexOf(texto);
          if (idx !== -1) {
            const before = n.substring(0, idx);
            const match = n.substring(idx, idx + texto.length);
            const after = n.substring(idx + texto.length);
            return before + '<span style="background:#ffeb3b;font-weight:bold;">' + match + '</span>' + after;
          }
          return n;
        }).join(', ');
        necesidadesHtml = `<div style="font-size:12px;color:#555;margin-top:4px;"><strong>Necesidad encontrada:</strong> ${necesidadesHtml}</div>`;
      }
      
      html += `
        <div class="item-lista" data-id="${p.id}" style="display:flex;justify-content:space-between;align-items:center;padding:10px 12px;border-bottom:1px solid #eee;cursor:pointer;background:${recogido ? '#f0f0f0' : 'white'};border-left:4px solid ${recogido ? '#757575' : tipo.color};margin-bottom:4px;border-radius:4px;">
          <div style="flex:1;">
            <strong>${sanitizar(p.nombre)}</strong>
            <span style="font-size:13px;color:#555;margin-left:8px;">${tipo.label}</span>
            ${estado ? `<span style="font-size:12px;background:${esUrgente ? '#d32f2f' : '#2e7d32'};color:white;padding:2px 8px;border-radius:12px;margin-left:8px;">${estado}</span>` : ''}
            ${necesidadesHtml}
          </div>
          <span style="color:#1a73e8;font-size:12px;">👁️ Ver</span>
        </div>
      `;
    });
  }
  contenedor.innerHTML = html;
  document.querySelectorAll('.item-lista').forEach(el => {
    el.addEventListener('click', function() {
      const id = this.dataset.id;
      mostrarDetallePunto(id);
    });
  });
}

// --- BUSCADOR POR NECESIDAD ---
function buscarPorNecesidad() {
  const input = document.getElementById('buscadorNecesidades');
  const texto = input.value.trim();
  busquedaNecesidad = texto;
  if (texto !== '') {
    document.getElementById('panelLista').style.display = 'flex';
    mostrarListaPuntos();
    // Mostrar botón de limpiar búsqueda
    const limpiarBtn = document.getElementById('btnLimpiarBusqueda');
    if (limpiarBtn) limpiarBtn.style.display = 'inline-block';
  } else {
    busquedaNecesidad = '';
    const limpiarBtn = document.getElementById('btnLimpiarBusqueda');
    if (limpiarBtn) limpiarBtn.style.display = 'none';
    // Si la lista está abierta, refrescar
    if (document.getElementById('panelLista').style.display === 'flex') {
      mostrarListaPuntos();
    }
  }
}

function limpiarBusquedaNecesidad() {
  document.getElementById('buscadorNecesidades').value = '';
  busquedaNecesidad = '';
  const limpiarBtn = document.getElementById('btnLimpiarBusqueda');
  if (limpiarBtn) limpiarBtn.style.display = 'none';
  const header = document.querySelector('#panelLista .header-lista h2');
  if (header) {
    header.innerHTML = '📋 Todos los puntos';
  }
  if (document.getElementById('panelLista').style.display === 'flex') {
    mostrarListaPuntos();
  }
}

// --- EVENTOS DE BUSCADOR POR NECESIDAD ---
document.getElementById('btnBuscarNecesidad').addEventListener('click', function() {
  buscarPorNecesidad();
});
document.getElementById('buscadorNecesidades').addEventListener('keypress', function(e) {
  if (e.key === 'Enter') {
    buscarPorNecesidad();
  }
});

// --- EVENTOS DE FILTROS DE LISTA ---
document.addEventListener('DOMContentLoaded', function() {
  const filtrosLista = document.querySelectorAll('#filtrosLista button');
  filtrosLista.forEach(btn => {
    btn.addEventListener('click', function() {
      filtrosLista.forEach(b => b.classList.remove('activo'));
      this.classList.add('activo');
      filtroLista = this.dataset.tipo;
      mostrarListaPuntos();
    });
  });
});

// --- RESTO DEL BLOQUE 6 (mostrarUrgencias, mostrarDetallePunto, cerrarLista, obtenerDireccionDesdeCoordenadas) ---
function mostrarUrgencias() {
  const panel = document.getElementById('panelUrgencias');
  if (!panel) { alert('⚠️ Panel de urgencias no encontrado'); return; }
  panel.style.display = 'flex';
  const contenedor = document.getElementById('contenedorUrgencias');
  if (!contenedor) { alert('⚠️ Contenedor de urgencias no encontrado'); return; }
  const urgentes = todosLosPuntos.filter(p => p.informacion?.urgente && p.informacion?.necesidades?.length > 0);
  if (urgentes.length === 0) {
    contenedor.innerHTML = '<p style="text-align:center;color:#666;padding:40px;">No hay urgencias reportadas en este momento.</p>';
    return;
  }
  let html = '';
  urgentes.forEach(p => {
    const tipo = TIPOS[p.tipo];
    if (!tipo) return;
    html += `
      <div style="background:#fff5f5;border-left:4px solid #d32f2f;padding:12px;margin-bottom:12px;border-radius:8px;box-shadow:0 2px 4px rgba(0,0,0,0.1);">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
          <div>
            <strong style="color:#d32f2f;">${tipo.icono} ${sanitizar(p.nombre)}</strong>
            <span style="font-size:13px;color:#555;margin-left:8px;">${tipo.label}</span>
            ${p.informacion?.direccion ? `<span style="font-size:13px;color:#555;margin-left:8px;">📍 ${sanitizar(p.informacion.direccion)}</span>` : ''}
          </div>
          <span style="font-size:12px;background:#d32f2f;color:white;padding:2px 10px;border-radius:12px;">🚨 URGENTE</span>
        </div>
        <div style="margin-top:6px;font-size:14px;">
          <strong>Necesidades urgentes:</strong>
          <ul style="margin:4px 0 0 18px;">
            ${p.informacion.necesidades.map(n => `<li>${sanitizar(n)}</li>`).join('')}
          </ul>
        </div>
        <div style="margin-top:6px;font-size:13px;color:#555;">
          📍 Coordenadas: ${p.lat}, ${p.lng}
          <button class="btn-navegar-urgente" data-id="${p.id}" style="margin-left:12px;background:#1a73e8;color:white;border:none;padding:4px 12px;border-radius:12px;cursor:pointer;font-weight:bold;">🧭 Navegar</button>
        </div>
        ${modoAdmin ? `<div style="margin-top:6px;font-size:12px;color:#777;">👤 Registrado por: ${sanitizar(p.informacion?.nombre_registrador || 'Anónimo')} (${sanitizar(p.informacion?.rol_registrador || 'Sin rol')})</div>` : ''}
      </div>
    `;
  });
  contenedor.innerHTML = html;
  document.querySelectorAll('.btn-navegar-urgente').forEach(btn => {
    btn.addEventListener('click', function() {
      const id = this.dataset.id;
      document.getElementById('panelUrgencias').style.display = 'none';
      iniciarNavegacion(id);
    });
  });
}

function mostrarDetallePunto(id) {
  const punto = todosLosPuntos.find(p => p.id === id);
  if (!punto) { alert('Punto no encontrado'); return; }
  const panel = document.getElementById('panelDetalle');
  if (!panel) { alert('⚠️ Panel de detalle no encontrado'); return; }
  panel.style.display = 'flex';
  document.getElementById('detalleTitulo').textContent = `📌 ${sanitizar(punto.nombre)}`;
  const tipo = TIPOS[punto.tipo];
  if (!tipo) return;
  let html = `
    <div style="margin-bottom:12px;"><span style="font-weight:bold;">Tipo:</span> ${tipo.icono} ${tipo.label}</div>
    <div style="margin-bottom:12px;"><span style="font-weight:bold;">Dirección:</span> ${sanitizar(punto.informacion?.direccion || 'No especificada')}</div>
    <div style="margin-bottom:12px;"><span style="font-weight:bold;">Coordenadas:</span> ${punto.lat}, ${punto.lng}</div>
    <div style="margin-bottom:12px;"><span style="font-weight:bold;">Creado:</span> ${sanitizar(punto.informacion?.fecha_creacion || 'Sin fecha')}</div>
  `;
  if (modoAdmin) {
    const nombreReg = sanitizar(punto.informacion?.nombre_registrador || 'No especificado');
    const rolReg = sanitizar(punto.informacion?.rol_registrador || 'Sin rol');
    html += `<div style="margin-bottom:12px;background:#f0f0f0;padding:8px;border-radius:4px;"><strong>👤 Registrado por:</strong> ${nombreReg} (${rolReg})</div>`;
  }
  const necesidades = punto.informacion?.necesidades || [];
  const esUrgente = punto.informacion?.urgente || false;
  if (necesidades.length > 0) {
    html += `<div style="margin-bottom:12px;background:${esUrgente ? '#ffebee' : '#fff3e0'};padding:8px;border-radius:4px;border-left:4px solid ${esUrgente ? '#d32f2f' : '#E53935'};">
      <strong style="color:${esUrgente ? '#d32f2f' : '#E53935'};">🔥 Prioridad ${esUrgente ? '🚨 URGENTE' : ''}</strong>
      <ul style="margin:4px 0 0 18px;">`;
    necesidades.forEach(n => html += `<li>${sanitizar(n)}</li>`);
    html += `</ul></div>`;
  }
  for (const [key, val] of Object.entries(punto.informacion || {})) {
    if (key === 'direccion' || key === 'necesidades' || key === 'urgente' || key === 'voluntarios_infantiles' || key === 'envios' || key === 'nombre_registrador' || key === 'rol_registrador' || key === 'fecha_creacion' || key === 'fecha_edicion' || key === 'estado') continue;
    if (val && val.length > 0) {
      html += `<div style="margin-bottom:8px;"><strong>${sanitizar(key)}:</strong> ${typeof val === 'string' ? sanitizar(val) : JSON.stringify(sanitizarArray(val))}</div>`;
    }
  }
  if (punto.informacion?.voluntarios_infantiles && punto.informacion.voluntarios_infantiles.length > 0) {
    html += `<div style="margin-bottom:12px;"><strong>👥 Voluntarios registrados:</strong><ul style="margin:4px 0 0 18px;">`;
    punto.informacion.voluntarios_infantiles.forEach(v => {
      html += `<li>${sanitizar(v.nombre)} (${sanitizar(v.rol || 'Voluntario')}) - ${sanitizar(v.telefono || 'Sin teléfono')}</li>`;
    });
    html += `</ul></div>`;
  }
  if (punto.tipo === 'centro_acopio' && punto.informacion?.envios && punto.informacion.envios.length > 0) {
    html += `<div style="margin-bottom:12px;"><strong>🚚 Envíos activos:</strong><ul style="margin:4px 0 0 18px;">`;
    punto.informacion.envios.forEach(e => {
      const estadoColor = e.estado === 'entregado' ? '#2e7d32' : e.estado === 'incidencia' ? '#d32f2f' : '#F57C00';
      html += `<li>${sanitizar(e.contenido)} → ${sanitizar(e.destinoNombre)} (<span style="color:${estadoColor};">${sanitizar(e.estado)}</span>)</li>`;
    });
    html += `</ul></div>`;
  }
  if (modoAdmin) {
    html += `
      <button id="btnEditarDesdeDetalle" data-id="${punto.id}" style="margin-top:12px;background:#1a237e;color:white;border:none;padding:10px;border-radius:8px;font-weight:bold;cursor:pointer;width:100%;">✏️ Editar este punto</button>
      <button id="btnEliminarDesdeDetalle" data-id="${punto.id}" style="margin-top:6px;background:#d32f2f;color:white;border:none;padding:10px;border-radius:8px;font-weight:bold;cursor:pointer;width:100%;">🗑️ Eliminar punto</button>
    `;
  }
  if (punto.tipo === 'edificio_caido' && !punto.informacion?.recogido) {
    html += `<button id="btnRecogerDesdeDetalle" data-id="${punto.id}" style="margin-top:6px;background:#4CAF50;color:white;border:none;padding:10px;border-radius:8px;font-weight:bold;cursor:pointer;width:100%;">✅ Marcar como recogido</button>`;
  }
  if (punto.tipo === 'edificio_caido' && punto.informacion?.recogido) {
    html += `<div style="margin-top:8px;background:#e0e0e0;padding:10px;border-radius:8px;text-align:center;color:#333;">✅ Este edificio ya fue recogido y limpiado</div>`;
  }
  document.getElementById('contenidoDetalle').innerHTML = html;
  if (modoAdmin) {
    const btnEditar = document.getElementById('btnEditarDesdeDetalle');
    if (btnEditar) btnEditar.addEventListener('click', function() {
      const id = this.dataset.id;
      document.getElementById('panelDetalle').style.display = 'none';
      mostrarFormularioEdicionPunto(id);
    });
    const btnEliminar = document.getElementById('btnEliminarDesdeDetalle');
    if (btnEliminar) btnEliminar.addEventListener('click', function() {
      const id = this.dataset.id;
      if (confirm('¿Eliminar este punto?')) {
        eliminarPunto(id);
        document.getElementById('panelDetalle').style.display = 'none';
        cerrarLista();
      }
    });
  }
  const btnRecoger = document.getElementById('btnRecogerDesdeDetalle');
  if (btnRecoger) btnRecoger.addEventListener('click', function() {
    const id = this.dataset.id;
    marcarRecogido(id);
    document.getElementById('panelDetalle').style.display = 'none';
    cerrarLista();
  });
}

function cerrarLista() {
  document.getElementById('panelLista').style.display = 'none';
  document.getElementById('panelDetalle').style.display = 'none';
  // Limpiar búsqueda al cerrar
  busquedaNecesidad = '';
  document.getElementById('buscadorNecesidades').value = '';
  const limpiarBtn = document.getElementById('btnLimpiarBusqueda');
  if (limpiarBtn) limpiarBtn.style.display = 'none';
  const header = document.querySelector('#panelLista .header-lista h2');
  if (header) {
    header.innerHTML = '📋 Todos los puntos';
  }
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

// --- EVENTOS DE LISTA Y URGENCIAS ---
document.getElementById('btnVerLista').addEventListener('click', function() { 
  if (busquedaNecesidad.trim() !== '') {
    mostrarListaPuntos();
  } else {
    const header = document.querySelector('#panelLista .header-lista h2');
    if (header) header.innerHTML = '📋 Todos los puntos';
    mostrarListaPuntos();
  }
});
document.getElementById('btnCerrarLista').addEventListener('click', function() { cerrarLista(); });
document.getElementById('btnCerrarDetalle').addEventListener('click', function() { document.getElementById('panelDetalle').style.display = 'none'; });
document.getElementById('btnUrgencias').addEventListener('click', function() { mostrarUrgencias(); });
document.getElementById('btnCerrarUrgencias').addEventListener('click', function() { document.getElementById('panelUrgencias').style.display = 'none'; });
// ============================================================
// BLOQUE 7: VOLUNTARIADO INFANTIL, NAVEGACIÓN Y EDICIÓN
// ============================================================

function mostrarFormularioVoluntarioInfantil(puntoId) {
  const punto = todosLosPuntos.find(p => p.id === puntoId);
  if (!punto) return;
  const html = `
    <h3 style="color:#FF6F00;">🧸 Ofrecerse como voluntario</h3>
    <div style="background:#ffebee;padding:12px;border-radius:8px;border-left:4px solid #d32f2f;margin-bottom:12px;color:#d32f2f;font-weight:bold;font-size:14px;">
      🛡️ ¡ATENCIÓN!<br>
      Los niños y niñas son lo más importante. Para garantizar su bienestar, todos los voluntarios deben <strong>completar todos los campos obligatorios</strong> con información verídica.<br>
      <strong>Tu identidad será verificada por los administradores</strong> antes de que puedas interactuar con los menores.<br>
      Si no completas todos los datos, <strong>no podrás ser aceptado</strong> como voluntario.
    </div>
    <p style="font-size:14px;color:#555;margin-bottom:12px;">Para garantizar la seguridad de los niños, completa todos los campos obligatorios.</p>
    <label>Primer nombre *</label><input type="text" id="v_nombre1" placeholder="Ej: Juan" required />
    <label>Segundo nombre</label><input type="text" id="v_nombre2" placeholder="Ej: Carlos" />
    <label>Primer apellido *</label><input type="text" id="v_apellido1" placeholder="Ej: Pérez" required />
    <label>Segundo apellido</label><input type="text" id="v_apellido2" placeholder="Ej: García" />
    <label>Número de cédula *</label><input type="text" id="v_cedula" required />
    <label>Foto de la cédula (toca para cargar)</label><input type="file" id="v_foto_cedula" accept="image/*" capture="environment" />
    <label>Foto actualizada (toca para cargar)</label><input type="file" id="v_foto_personal" accept="image/*" capture="environment" />
    <label>Teléfono de contacto</label><input type="text" id="v_telefono" />
    <label>Rol (recreador, cuidador, voluntario, etc.)</label><input type="text" id="v_rol" placeholder="Voluntario" />
    <label>Mensaje de seguridad para los niños (opcional)</label><textarea id="v_mensaje" rows="3">Estamos aquí para cuidarte y protegerte. Tu bienestar es lo más importante.</textarea>
    <button id="btnRegistrarVoluntario" data-id="${puntoId}" style="margin-top:12px;background:#FF6F00;color:white;border:none;padding:10px;border-radius:8px;font-weight:bold;cursor:pointer;width:100%;">✅ Registrar voluntario</button>
    <button id="btnCancelarVoluntario" style="margin-top:6px;background:#666;color:white;border:none;padding:10px;border-radius:8px;font-weight:bold;cursor:pointer;width:100%;">❌ Cancelar</button>
  `;
  formTitulo.innerHTML = '🧸 Registro de voluntario infantil';
  camposDinamicos.innerHTML = html;
  formulario.style.display = 'block';
  btnGuardar.style.display = 'none';
  btnEliminar.style.display = 'none';
  btnCancelar.style.display = 'none';
  document.getElementById('btnRegistrarVoluntario').addEventListener('click', function() {
    const nombre1 = document.getElementById('v_nombre1').value.trim();
    const nombre2 = document.getElementById('v_nombre2').value.trim();
    const apellido1 = document.getElementById('v_apellido1').value.trim();
    const apellido2 = document.getElementById('v_apellido2').value.trim();
    const cedula = document.getElementById('v_cedula').value.trim();
    const telefono = document.getElementById('v_telefono').value.trim();
    const rol = document.getElementById('v_rol').value.trim() || 'Voluntario';
    const mensaje = document.getElementById('v_mensaje').value.trim() || 'Estamos aquí para cuidarte y protegerte.';
    const fotoCedulaInput = document.getElementById('v_foto_cedula');
    const fotoPersonalInput = document.getElementById('v_foto_personal');
    const fotoCedula = fotoCedulaInput.files && fotoCedulaInput.files.length > 0 ? URL.createObjectURL(fotoCedulaInput.files[0]) : '';
    const fotoPersonal = fotoPersonalInput.files && fotoPersonalInput.files.length > 0 ? URL.createObjectURL(fotoPersonalInput.files[0]) : '';
    if (!nombre1 || !apellido1 || !cedula) {
      alert('❌ Los campos con * son obligatorios');
      return;
    }
    const nombreCompleto = [nombre1, nombre2, apellido1, apellido2].filter(Boolean).join(' ');
    const punto = todosLosPuntos.find(p => p.id === puntoId);
    if (!punto) return;
    if (!punto.informacion.voluntarios_infantiles) punto.informacion.voluntarios_infantiles = [];
    punto.informacion.voluntarios_infantiles.push({
      nombre: sanitizar(nombreCompleto),
      cedula: sanitizar(cedula),
      foto_cedula: sanitizar(fotoCedula),
      foto_personal: sanitizar(fotoPersonal),
      telefono: sanitizar(telefono),
      rol: sanitizar(rol),
      mensaje: sanitizar(mensaje)
    });
    punto.informacion.fecha_edicion = new Date().toLocaleString();
    guardarPuntos();
    alert('✅ Te has registrado como voluntario para actividades infantiles. ¡Gracias por tu ayuda!');
    formulario.style.display = 'none';
    btnGuardar.style.display = 'block';
    btnCancelar.style.display = 'block';
    aplicarFiltros();
  });
  document.getElementById('btnCancelarVoluntario').addEventListener('click', function() {
    formulario.style.display = 'none';
    btnGuardar.style.display = 'block';
    btnCancelar.style.display = 'block';
  });
}

// --- NAVEGACIÓN ---
function iniciarNavegacion(puntoId) {
  const punto = todosLosPuntos.find(p => p.id === puntoId);
  if (!punto) return alert('Punto no encontrado');
  if (!ubicacionUsuario) {
    alert('🔍 Toca en el mapa para marcar tu ubicación de origen (o espera a que el GPS te localice)');
    map.once('click', function(e) {
      const origen = e.latlng;
      trazarRuta(origen, { lat: punto.lat, lng: punto.lng }, punto.nombre);
    });
    return;
  }
  trazarRuta(
    { lat: ubicacionUsuario.lat, lng: ubicacionUsuario.lng },
    { lat: punto.lat, lng: punto.lng },
    punto.nombre
  );
}

function trazarRuta(origen, destino, nombreDestino) {
  if (controlRuta) { map.removeControl(controlRuta); controlRuta = null; }
  controlRuta = L.Routing.control({
    waypoints: [L.latLng(origen.lat, origen.lng), L.latLng(destino.lat, destino.lng)],
    routeWhileDragging: true,
    showAlternatives: false,
    lineOptions: { styles: [{ color: '#E53935', weight: 5, opacity: 0.8 }], extendToWaypoints: false, missingRouteTolerance: 0 },
    altLineOptions: { styles: [{ color: '#1976D2', weight: 3, opacity: 0.4 }] },
    router: L.Routing.osrmv1({ serviceUrl: 'https://router.project-osrm.org/route/v1' }),
    plan: L.Routing.plan([L.latLng(origen.lat, origen.lng), L.latLng(destino.lat, destino.lng)], {
      createMarker: function(i, wp) {
        if (i === 0) {
          return L.marker(wp.latLng, {
            icon: L.divIcon({ html: '<div style="background:#1a73e8;border-radius:50%;width:16px;height:16px;border:3px solid white;box-shadow:0 0 10px rgba(26,115,232,0.6);"></div>', iconSize: [16, 16] })
          }).bindPopup('📍 Origen');
        } else {
          return L.marker(wp.latLng, {
            icon: L.divIcon({ html: `<div style="background:#E53935;border-radius:50%;width:20px;height:20px;border:3px solid white;box-shadow:0 0 10px rgba(229,57,53,0.6);display:flex;align-items:center;justify-content:center;font-size:12px;color:white;font-weight:bold;">🏁</div>`, iconSize: [20, 20] })
          }).bindPopup(`📍 ${sanitizar(nombreDestino)}`);
        }
      }
    }),
    createMarker: function() { return null; },
    fitSelectedRoutes: true,
    show: false,
    collapsible: true
  }).addTo(map);
  controlRuta.on('routesfound', function(e) {
    const bounds = L.latLngBounds(e.routes[0].coordinates);
    map.fitBounds(bounds, { padding: [50, 50] });
    modoNavegacion = true;
    document.getElementById('btnCancelarNavegacion').style.display = 'block';
  });
  document.getElementById('btnCancelarNavegacion').addEventListener('click', function() {
    cancelarNavegacion();
  });
}

function cancelarNavegacion() {
  if (controlRuta) { map.removeControl(controlRuta); controlRuta = null; }
  modoNavegacion = false;
  document.getElementById('btnCancelarNavegacion').style.display = 'none';
  alert('🧭 Navegación cancelada');
}

// --- EDICIÓN DE PUNTOS (con datos precargados) ---
function mostrarFormularioEdicionPunto(puntoId) {
  const punto = todosLosPuntos.find(p => p.id === puntoId);
  if (!punto) { alert('❌ Punto no encontrado'); return; }
  if (!modoAdmin) { alert('🔐 Solo el administrador puede editar puntos.'); return; }
  const tipo = TIPOS[punto.tipo];
  if (!tipo) return;
  const direccion = punto.informacion.direccion || '';
  let html = `
    <h3 style="color:#1a237e;">✏️ Editar ${tipo.label}</h3>
    <p style="font-size:13px;color:#555;margin-bottom:10px;">Modifica los campos y guarda los cambios.</p>
  `;
  tipo.campos.forEach(campo => {
    const valor = punto.informacion[campo.id] || '';
    let input = '';
    if (campo.type === 'textarea') {
      input = `<textarea id="edit_${campo.id}" ${campo.required ? 'required' : ''}>${sanitizar(valor)}</textarea>`;
    } else if (campo.type === 'select') {
      input = `<select id="edit_${campo.id}">`;
      campo.options.forEach(opt => {
        const selected = opt === valor ? 'selected' : '';
        input += `<option value="${opt}" ${selected}>${opt}</option>`;
      });
      input += `</select>`;
    } else {
      input = `<input type="${campo.type}" id="edit_${campo.id}" value="${sanitizar(valor)}" ${campo.required ? 'required' : ''}>`;
    }
    html += `<label>${campo.label}</label>${input}`;
  });
  if (!tipo.campos.find(c => c.id === 'direccion')) {
    html += `<label>Dirección</label><input type="text" id="edit_direccion" value="${sanitizar(direccion)}" />`;
  }
  html += `
    <button id="btnGuardarEdicion" data-id="${puntoId}" style="margin-top:12px;background:#1a237e;color:white;border:none;padding:10px;border-radius:8px;font-weight:bold;cursor:pointer;width:100%;">💾 Guardar cambios</button>
    <button id="btnCancelarEdicion" style="margin-top:6px;background:#666;color:white;border:none;padding:10px;border-radius:8px;font-weight:bold;cursor:pointer;width:100%;">❌ Cancelar</button>
  `;
  formTitulo.innerHTML = `✏️ Editando: ${sanitizar(punto.nombre)}`;
  camposDinamicos.innerHTML = html;
  formulario.style.display = 'block';
  btnGuardar.style.display = 'none';
  btnEliminar.style.display = 'none';
  btnCancelar.style.display = 'none';
  document.getElementById('btnGuardarEdicion').addEventListener('click', function() {
    const datosEditados = {};
    let valido = true;
    tipo.campos.forEach(campo => {
      const el = document.getElementById(`edit_${campo.id}`);
      if (!el) return;
      const valor = el.value.trim();
      if (campo.required && !valor) {
        alert(`El campo "${campo.label}" es obligatorio`);
        valido = false;
        return;
      }
      datosEditados[campo.id] = valor;
    });
    if (!valido) return;
    const nuevaInformacion = tipo.procesar(datosEditados);
    if (punto.informacion.voluntarios_infantiles) {
      nuevaInformacion.voluntarios_infantiles = punto.informacion.voluntarios_infantiles;
    }
    if (punto.informacion.envios) {
      nuevaInformacion.envios = punto.informacion.envios;
    }
    if (punto.informacion.recogido !== undefined) {
      nuevaInformacion.recogido = punto.informacion.recogido;
    }
    if (punto.informacion.estado !== undefined) {
      nuevaInformacion.estado = punto.informacion.estado;
    }
    const dirEl = document.getElementById('edit_direccion');
    nuevaInformacion.direccion = dirEl ? dirEl.value.trim() : datosEditados.direccion || '';
    punto.informacion = nuevaInformacion;
    if (datosEditados.nombre) {
      punto.nombre = datosEditados.nombre;
    }
    punto.informacion.fecha_edicion = new Date().toLocaleString();
    guardarPuntos();
    alert('✅ Punto actualizado exitosamente');
    formulario.style.display = 'none';
    btnGuardar.style.display = 'block';
    btnCancelar.style.display = 'block';
    aplicarFiltros();
  });
  document.getElementById('btnCancelarEdicion').addEventListener('click', function() {
    formulario.style.display = 'none';
    btnGuardar.style.display = 'block';
    btnCancelar.style.display = 'block';
  });
}
// ============================================================
// BLOQUE 8: TOGGLE DE FILTROS, LIMPIAR BÚSQUEDA E INICIALIZACIÓN
// ============================================================

// --- FUNCIÓN PARA DESPLEGAR MENSAJE DE ATENCIÓN ---
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
// TOGGLE DE FILTROS SUPERIORES (RESPONSIVE)
// ============================================================
document.addEventListener('DOMContentLoaded', function() {
  const filtrosContainer = document.getElementById('filtrosContainer');
  const btnToggle = document.getElementById('btnToggleFiltros');
  
  if (filtrosContainer && btnToggle) {
    // Cargar estado guardado
    const filtrosOcultos = localStorage.getItem('filtrosOcultos') === 'true';
    
    // Aplicar estado inicial
    if (filtrosOcultos) {
      filtrosContainer.style.maxHeight = '0px';
      btnToggle.textContent = '🔼 Filtros';
    } else {
      filtrosContainer.style.maxHeight = '80px';
      btnToggle.textContent = '🔽 Filtros';
    }
    
    // Evento toggle
    btnToggle.addEventListener('click', function() {
      const isHidden = filtrosContainer.style.maxHeight === '0px';
      if (isHidden) {
        filtrosContainer.style.maxHeight = '80px';
        btnToggle.textContent = '🔽 Filtros';
        localStorage.setItem('filtrosOcultos', 'false');
      } else {
        filtrosContainer.style.maxHeight = '0px';
        btnToggle.textContent = '🔼 Filtros';
        localStorage.setItem('filtrosOcultos', 'true');
      }
    });
  }
  
  // Agregar botón de limpiar búsqueda en el panel de lista
  const headerLista = document.querySelector('#panelLista .header-lista');
  if (headerLista) {
    const limpiarBtn = document.createElement('button');
    limpiarBtn.id = 'btnLimpiarBusqueda';
    limpiarBtn.textContent = '✖ Limpiar búsqueda';
    limpiarBtn.style.display = 'none';
    limpiarBtn.style.background = '#666';
    limpiarBtn.style.color = 'white';
    limpiarBtn.style.border = 'none';
    limpiarBtn.style.padding = '4px 12px';
    limpiarBtn.style.borderRadius = '8px';
    limpiarBtn.style.cursor = 'pointer';
    limpiarBtn.style.fontWeight = 'bold';
    limpiarBtn.style.fontSize = '12px';
    headerLista.appendChild(limpiarBtn);
    
    limpiarBtn.addEventListener('click', function() {
      limpiarBusquedaNecesidad();
      this.style.display = 'none';
      if (document.getElementById('panelLista').style.display === 'flex') {
        const header = document.querySelector('#panelLista .header-lista h2');
        if (header) header.innerHTML = '📋 Todos los puntos';
        mostrarListaPuntos();
      }
    });
  }
});

// --- INICIALIZACIÓN ---
cargarPuntos();
obtenerUbicacion();

console.log('✅ App responsiva con buscador por necesidades, lista, urgencias y aprobación de puntos.');
