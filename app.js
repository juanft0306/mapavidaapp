// ============================================================
// MAPAVIDA - BLOQUE 1: CONFIGURACIÓN, DEFINICIONES Y TIPOS
// ============================================================

const ADMIN_PASSWORD = 'MapaVida2026';
const MASTER_PASSWORD = 'SeguridadMapa2026'; // Cambia esto por tu contraseña maestra

const map = L.map('map').setView([10.4806, -66.9036], 12);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: 'MapaVida'
}).addTo(map);

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

document.getElementById('cargando').style.display = 'none';

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
      nombre_registrador: d.nombre_registrador || '',
      rol_registrador: d.rol_registrador || 'Voluntario',
      urgente: d.urgente === 'Sí',
      necesidad_infantil: d.necesidad_infantil === 'Sí',
      necesidades: d.necesidades ? d.necesidades.split('\n').filter(s => s.trim()) : [],
      voluntarios_infantiles: [],
      fecha_creacion: new Date().toLocaleString(),
      fecha_edicion: new Date().toLocaleString()
    }),
    popupDetalle: (info) => {
      let html = `<div class="popup-info">👥 Cupo: ${info.cupo || 'N/E'}</div>`;
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
      necesita: d.necesarios ? d.necesarios.split(',').map(s => s.trim()).filter(Boolean) : [],
      suficientes: d.suficientes ? d.suficientes.split(',').map(s => s.trim()).filter(Boolean) : [],
      nombre_registrador: d.nombre_registrador || '',
      rol_registrador: d.rol_registrador || 'Voluntario',
      urgente: d.urgente === 'Sí',
      necesidad_infantil: d.necesidad_infantil === 'Sí',
      necesidades: d.necesidades ? d.necesidades.split('\n').filter(s => s.trim()) : [],
      voluntarios_infantiles: [],
      envios: [],
      fecha_creacion: new Date().toLocaleString(),
      fecha_edicion: new Date().toLocaleString()
    }),
    popupDetalle: (info) => {
      let html = '';
      if (info.suficientes?.length) html += `<div class="popup-info" style="color:#2e7d32;">✅ Ya no necesitan: ${info.suficientes.join(', ')}</div>`;
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
      medicamentos: d.medicamentos ? d.medicamentos.split(',').map(s => s.trim()).filter(Boolean) : [],
      necesita_sangre: d.sangre === 'Sí',
      nombre_registrador: d.nombre_registrador || '',
      rol_registrador: d.rol_registrador || 'Voluntario',
      urgente: d.urgente === 'Sí',
      necesidades: d.necesidades ? d.necesidades.split('\n').filter(s => s.trim()) : [],
      fecha_creacion: new Date().toLocaleString(),
      fecha_edicion: new Date().toLocaleString()
    }),
    popupDetalle: (info) => {
      let html = '';
      if (info.medicamentos?.length) html += `<div class="popup-info">💊 Medicamentos: ${info.medicamentos.join(', ')}</div>`;
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
      apoyo: d.apoyo ? d.apoyo.split(',').map(s => s.trim()).filter(Boolean) : [],
      nombre_registrador: d.nombre_registrador || '',
      rol_registrador: d.rol_registrador || 'Voluntario',
      urgente: d.urgente === 'Sí',
      recogido: false,
      necesidades: d.necesidades ? d.necesidades.split('\n').filter(s => s.trim()) : [],
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
      advertencia: d.advertencia || 'Manténgase alejado, estructura inestable',
      nombre_registrador: d.nombre_registrador || '',
      rol_registrador: d.rol_registrador || 'Voluntario',
      urgente: d.urgente === 'Sí',
      necesidades: d.necesidades ? d.necesidades.split('\n').filter(s => s.trim()) : [],
      fecha_creacion: new Date().toLocaleString(),
      fecha_edicion: new Date().toLocaleString()
    }),
    popupDetalle: (info) => `<div class="popup-advertencia">⚠️ ${info.advertencia}</div>`
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
      mensaje: d.nota || 'Estructura no ha sido inspeccionada por personal autorizado',
      nombre_registrador: d.nombre_registrador || '',
      rol_registrador: d.rol_registrador || 'Voluntario',
      urgente: d.urgente === 'Sí',
      necesidades: d.necesidades ? d.necesidades.split('\n').filter(s => s.trim()) : [],
      fecha_creacion: new Date().toLocaleString(),
      fecha_edicion: new Date().toLocaleString()
    }),
    popupDetalle: (info) => `<div class="popup-info" style="color:#6A1B9A;">❓ ${info.mensaje}</div>`
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
      servicios: d.servicios ? d.servicios.split(',').map(s => s.trim()).filter(Boolean) : [],
      emergencia_24h: d.emergencia === 'Sí',
      nombre_registrador: d.nombre_registrador || '',
      rol_registrador: d.rol_registrador || 'Voluntario',
      urgente: d.urgente === 'Sí',
      necesidades: d.necesidades ? d.necesidades.split('\n').filter(s => s.trim()) : [],
      fecha_creacion: new Date().toLocaleString(),
      fecha_edicion: new Date().toLocaleString()
    }),
    popupDetalle: (info) => {
      let html = '';
      if (info.servicios?.length) html += `<div class="popup-info">🩺 Servicios: ${info.servicios.join(', ')}</div>`;
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
      horario: d.horario || '',
      contacto: d.contacto || '',
      nombre_registrador: d.nombre_registrador || '',
      rol_registrador: d.rol_registrador || 'Voluntario',
      urgente: d.urgente === 'Sí',
      necesidades: d.necesidades ? d.necesidades.split('\n').filter(s => s.trim()) : [],
      fecha_creacion: new Date().toLocaleString(),
      fecha_edicion: new Date().toLocaleString()
    }),
    popupDetalle: (info) => {
      let html = '';
      if (info.horario) html += `<div class="popup-info">🕐 Horario: ${info.horario}</div>`;
      if (info.contacto) html += `<div class="popup-info">📞 Contacto: ${info.contacto}</div>`;
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
      horario: d.horario || '',
      contacto: d.contacto || '',
      nombre_registrador: d.nombre_registrador || '',
      rol_registrador: d.rol_registrador || 'Voluntario',
      urgente: d.urgente === 'Sí',
      necesidades: d.necesidades ? d.necesidades.split('\n').filter(s => s.trim()) : [],
      fecha_creacion: new Date().toLocaleString(),
      fecha_edicion: new Date().toLocaleString()
    }),
    popupDetalle: (info) => {
      let html = '';
      if (info.horario) html += `<div class="popup-info">🕐 Horario: ${info.horario}</div>`;
      if (info.contacto) html += `<div class="popup-info">📞 Contacto: ${info.contacto}</div>`;
      return html;
    }
  }
};
// ============================================================
// BLOQUE 2A: CARGA, GUARDADO, FILTROS Y MOSTRAR PUNTOS
// ============================================================

function cargarPuntos() {
  const stored = localStorage.getItem('puntosMapaVida');
  if (stored) {
    try {
      todosLosPuntos = JSON.parse(stored);
    } catch (e) {
      todosLosPuntos = [];
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
          fecha_creacion: new Date().toLocaleString(),
          fecha_edicion: new Date().toLocaleString()
        }
      }
    ];
    localStorage.setItem('puntosMapaVida', JSON.stringify(todosLosPuntos));
  }
  aplicarFiltros();
}

function guardarPuntos() {
  localStorage.setItem('puntosMapaVida', JSON.stringify(todosLosPuntos));
}

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
  markersLayer.clearLayers();
  puntos.forEach(p => {
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

    const definicionTexto = tipo.definicion ? `<div class="popup-definicion">ℹ️ ${tipo.definicion}</div>` : '';

    let popupContent = `
      <div class="popup-tipo">${tipo.icono} ${tipo.label}</div>
      ${definicionTexto}
      <strong>${p.nombre}</strong><br>
      ${p.informacion?.direccion ? p.informacion.direccion + '<br>' : ''}
      ${tipo.popupDetalle(p.informacion || {})}
    `;

    // Fecha y hora (visible para todos)
    const fechaCreacion = p.informacion?.fecha_creacion || 'Sin fecha';
    const fechaEdicion = p.informacion?.fecha_edicion || fechaCreacion;
    popupContent += `<div class="popup-info" style="font-size:11px;color:#777;margin-top:4px;">🕒 Creado: ${fechaCreacion}</div>`;
    if (fechaEdicion !== fechaCreacion) {
      popupContent += `<div class="popup-info" style="font-size:11px;color:#777;">✏️ Editado: ${fechaEdicion}</div>`;
    }

    // Datos del registrador (solo admin)
    if (modoAdmin) {
      const nombreReg = p.informacion?.nombre_registrador || 'No especificado';
      const rolReg = p.informacion?.rol_registrador || 'Sin rol';
      popupContent += `<div class="popup-registrador">👤 Registrado por: ${nombreReg} (${rolReg})</div>`;
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
      necesidades.forEach(n => popupContent += `<li>${n}</li>`);
      popupContent += `</ul></div>`;
    }

    // --- SECCIÓN PROTECCIÓN INFANTIL ---
    if (p.informacion?.necesidad_infantil && p.informacion?.voluntarios_infantiles !== undefined) {
      popupContent += `
        <div style="margin-top:8px;padding:10px;background:#ffebee;border-left:4px solid #d32f2f;border-radius:6px;color:#d32f2f;font-weight:bold;font-size:14px;">
          🛡️ ¡ATENCIÓN!<br>
          Los niños y niñas son nuestra prioridad. Por su seguridad, <strong>ninguna persona podrá acercarse a ellos</strong> sin haber completado su <strong>información completa</strong> (nombre, cédula, fotos y contacto) y sin que <strong>los administradores hayan verificado su identidad</strong>.<br>
          Si ves a alguien sin estos requisitos, <strong>no permitas que se acerque</strong> a los menores y reporta la situación a un administrador.
        </div>
      `;
      popupContent += `
        <button class="btn-ofrecerse-infantil" data-id="${p.id}" style="margin-top:8px;background:#FF6F00;color:white;border:none;padding:6px 12px;border-radius:6px;cursor:pointer;font-weight:bold;width:100%;">
          🧸 Ofrecerse como voluntario para niños
        </button>
      `;
      if (modoAdmin && p.informacion.voluntarios_infantiles && p.informacion.voluntarios_infantiles.length > 0) {
        popupContent += `<div class="popup-seccion"><strong style="color:#1a237e;">👥 Voluntarios registrados (solo administradores):</strong><ul class="popup-lista">`;
        p.informacion.voluntarios_infantiles.forEach(v => {
          popupContent += `<li><strong>${v.nombre}</strong> (${v.rol || 'Voluntario'})<br>📞 ${v.telefono || 'Sin teléfono'}<br>🪪 Cédula: ${v.cedula || 'No especificada'}</li>`;
        });
        popupContent += `</ul></div>`;
      } else if (p.informacion.voluntarios_infantiles && p.informacion.voluntarios_infantiles.length > 0) {
        popupContent += `<div style="font-size:13px;color:#777;margin-top:6px;text-align:center;">👥 ${p.informacion.voluntarios_infantiles.length} voluntario(s) registrado(s) (contacta a un administrador para ver los detalles)</div>`;
      }
    }

    // --- BOTONES DE ACCIÓN ---
    if (p.tipo === 'edificio_caido' && !recogido) {
      popupContent += `
        <button class="btn-recoger" data-id="${p.id}" style="margin-top:8px;background:#4CAF50;color:white;border:none;padding:6px 12px;border-radius:6px;cursor:pointer;font-weight:bold;width:100%;">
          ✅ Marcar como recogido
        </button>
      `;
    } else if (p.tipo === 'edificio_caido' && recogido) {
      popupContent += `<div style="margin-top:8px;background:#e0e0e0;padding:6px;border-radius:6px;text-align:center;color:#333;">✅ Ya recogido y limpiado</div>`;
    }

    // --- CENTRO DE ACOPIO: envíos ---
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
            <strong>${e.contenido}</strong><br>
            ➜ ${e.destinoNombre}<br>
            <span style="color:${estadoColor};">${e.estado}</span> | ${aprobaciones}
            ${e.conductor ? `| 👤 ${e.conductor.nombre}` : ''}
            ${e.estado === 'pendiente' || e.estado === 'origen_aprobado' ? `<br><span style="font-size:12px;color:#1a73e8;">🔗 <a href="${e.enlace}" target="_blank">${e.enlace}</a></span>` : ''}
          </li>`;
        });
        popupContent += `</ul></div>`;
      }
    }

    // Navegación
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
// BLOQUE 2B: LISTA, CONTADORES, DETALLE, URGENCIAS, GEOCODIFICACIÓN
// ===========================================================
// ============================================================
// BLOQUE 2B: LISTA, CONTADORES, DETALLE, URGENCIAS, GEOCODIFICACIÓN
// ============================================================

let filtroLista = 'todos';

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
    if (tipo === 'edificio_caido' && p.informacion?.recogido) {
      tipo = 'edificio_recogido';
    }
    if (tipos[tipo]) tipos[tipo].count++;
  });

  let html = '';
  for (const [key, val] of Object.entries(tipos)) {
    if (val.count > 0 || key === 'edificio_caido' || key === 'edificio_recogido') {
      html += `<span style="background:#f0f0f0;padding:4px 10px;border-radius:16px;font-size:13px;font-weight:bold;">${val.label}: ${val.count}</span>`;
    }
  }
  contenedor.innerHTML = html;
}

function mostrarListaPuntos() {
  const panel = document.getElementById('panelLista');
  panel.style.display = 'flex';
  actualizarContadores();

  const contenedor = document.getElementById('contenedorLista');
  if (!contenedor) return;

  let puntosFiltrados = [...todosLosPuntos];
  
  switch (filtroLista) {
    case 'todos': break;
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

  puntosFiltrados.reverse();

  let html = '';
  puntosFiltrados.forEach(p => {
    const tipo = TIPOS[p.tipo];
    if (!tipo) return;
    const esUrgente = p.informacion?.urgente || false;
    const recogido = p.tipo === 'edificio_caido' && p.informacion?.recogido;
    const estado = recogido ? '✅ Recogido' : (esUrgente ? '🚨 Urgente' : '');

    html += `
      <div class="item-lista" data-id="${p.id}" style="display:flex;justify-content:space-between;align-items:center;padding:10px 12px;border-bottom:1px solid #eee;cursor:pointer;background:${recogido ? '#f0f0f0' : 'white'};border-left:4px solid ${recogido ? '#757575' : tipo.color};margin-bottom:4px;border-radius:4px;">
        <div style="flex:1;">
          <strong>${p.nombre}</strong>
          <span style="font-size:13px;color:#555;margin-left:8px;">${tipo.label}</span>
          ${estado ? `<span style="font-size:12px;background:${esUrgente ? '#d32f2f' : '#2e7d32'};color:white;padding:2px 8px;border-radius:12px;margin-left:8px;">${estado}</span>` : ''}
        </div>
        <span style="color:#1a73e8;font-size:12px;">👁️ Ver</span>
      </div>
    `;
  });

  if (puntosFiltrados.length === 0) {
    html = '<p style="text-align:center;color:#666;padding:40px;">No hay puntos que coincidan con el filtro seleccionado.</p>';
  }

  contenedor.innerHTML = html;

  document.querySelectorAll('.item-lista').forEach(el => {
    el.addEventListener('click', function() {
      const id = this.dataset.id;
      mostrarDetallePunto(id);
    });
  });
}

function mostrarDetallePunto(id) {
  const punto = todosLosPuntos.find(p => p.id === id);
  if (!punto) { alert('Punto no encontrado'); return; }

  const panel = document.getElementById('panelDetalle');
  panel.style.display = 'flex';
  document.getElementById('detalleTitulo').textContent = `📌 ${punto.nombre}`;

  const tipo = TIPOS[punto.tipo];
  if (!tipo) return;

  let html = `
    <div style="margin-bottom:12px;">
      <span style="font-weight:bold;">Tipo:</span> ${tipo.icono} ${tipo.label}
    </div>
    <div style="margin-bottom:12px;">
      <span style="font-weight:bold;">Dirección:</span> ${punto.informacion?.direccion || 'No especificada'}
    </div>
    <div style="margin-bottom:12px;">
      <span style="font-weight:bold;">Coordenadas:</span> ${punto.lat}, ${punto.lng}
    </div>
    <div style="margin-bottom:12px;">
      <span style="font-weight:bold;">Creado:</span> ${punto.informacion?.fecha_creacion || 'Sin fecha'}
    </div>
  `;

  if (modoAdmin) {
    const nombreReg = punto.informacion?.nombre_registrador || 'No especificado';
    const rolReg = punto.informacion?.rol_registrador || 'Sin rol';
    html += `<div style="margin-bottom:12px;background:#f0f0f0;padding:8px;border-radius:4px;">
      <strong>👤 Registrado por:</strong> ${nombreReg} (${rolReg})
    </div>`;
  }

  const necesidades = punto.informacion?.necesidades || [];
  const esUrgente = punto.informacion?.urgente || false;
  if (necesidades.length > 0) {
    html += `<div style="margin-bottom:12px;background:${esUrgente ? '#ffebee' : '#fff3e0'};padding:8px;border-radius:4px;border-left:4px solid ${esUrgente ? '#d32f2f' : '#E53935'};">
      <strong style="color:${esUrgente ? '#d32f2f' : '#E53935'};">🔥 Prioridad ${esUrgente ? '🚨 URGENTE' : ''}</strong>
      <ul style="margin:4px 0 0 18px;">`;
    necesidades.forEach(n => html += `<li>${n}</li>`);
    html += `</ul></div>`;
  }

  for (const [key, val] of Object.entries(punto.informacion || {})) {
    if (key === 'direccion' || key === 'necesidades' || key === 'urgente' || key === 'voluntarios_infantiles' || key === 'envios' || key === 'nombre_registrador' || key === 'rol_registrador' || key === 'fecha_creacion' || key === 'fecha_edicion') continue;
    if (val && val.length > 0) {
      html += `<div style="margin-bottom:8px;"><strong>${key}:</strong> ${typeof val === 'string' ? val : JSON.stringify(val)}</div>`;
    }
  }

  if (punto.informacion?.voluntarios_infantiles && punto.informacion.voluntarios_infantiles.length > 0) {
    html += `<div style="margin-bottom:12px;"><strong>👥 Voluntarios registrados:</strong><ul style="margin:4px 0 0 18px;">`;
    punto.informacion.voluntarios_infantiles.forEach(v => {
      html += `<li>${v.nombre} (${v.rol || 'Voluntario'}) - ${v.telefono || 'Sin teléfono'}</li>`;
    });
    html += `</ul></div>`;
  }

  if (punto.tipo === 'centro_acopio' && punto.informacion?.envios && punto.informacion.envios.length > 0) {
    html += `<div style="margin-bottom:12px;"><strong>🚚 Envíos activos:</strong><ul style="margin:4px 0 0 18px;">`;
    punto.informacion.envios.forEach(e => {
      const estadoColor = e.estado === 'entregado' ? '#2e7d32' : e.estado === 'incidencia' ? '#d32f2f' : '#F57C00';
      html += `<li>${e.contenido} → ${e.destinoNombre} (<span style="color:${estadoColor};">${e.estado}</span>)</li>`;
    });
    html += `</ul></div>`;
  }

  if (modoAdmin) {
    html += `
      <button id="btnEditarDesdeDetalle" data-id="${punto.id}" style="margin-top:12px;background:#1a237e;color:white;border:none;padding:10px;border-radius:8px;font-weight:bold;cursor:pointer;width:100%;">
        ✏️ Editar este punto
      </button>
      <button id="btnEliminarDesdeDetalle" data-id="${punto.id}" style="margin-top:6px;background:#d32f2f;color:white;border:none;padding:10px;border-radius:8px;font-weight:bold;cursor:pointer;width:100%;">
        🗑️ Eliminar punto
      </button>
    `;
  }

  if (punto.tipo === 'edificio_caido' && !punto.informacion?.recogido) {
    html += `
      <button id="btnRecogerDesdeDetalle" data-id="${punto.id}" style="margin-top:6px;background:#4CAF50;color:white;border:none;padding:10px;border-radius:8px;font-weight:bold;cursor:pointer;width:100%;">
        ✅ Marcar como recogido
      </button>
    `;
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
}

function mostrarUrgencias() {
  const panel = document.getElementById('panelUrgencias');
  panel.style.display = 'flex';

  const contenedor = document.getElementById('contenedorUrgencias');
  if (!contenedor) return;

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
            <strong style="color:#d32f2f;">${tipo.icono} ${p.nombre}</strong>
            <span style="font-size:13px;color:#555;margin-left:8px;">${tipo.label}</span>
            ${p.informacion?.direccion ? `<span style="font-size:13px;color:#555;margin-left:8px;">📍 ${p.informacion.direccion}</span>` : ''}
          </div>
          <span style="font-size:12px;background:#d32f2f;color:white;padding:2px 10px;border-radius:12px;">🚨 URGENTE</span>
        </div>
        <div style="margin-top:6px;font-size:14px;">
          <strong>Necesidades urgentes:</strong>
          <ul style="margin:4px 0 0 18px;">
            ${p.informacion.necesidades.map(n => `<li>${n}</li>`).join('')}
          </ul>
        </div>
        <div style="margin-top:6px;font-size:13px;color:#555;">
          📍 Coordenadas: ${p.lat}, ${p.lng}
          <button class="btn-navegar-urgente" data-id="${p.id}" style="margin-left:12px;background:#1a73e8;color:white;border:none;padding:4px 12px;border-radius:12px;cursor:pointer;font-weight:bold;">🧭 Navegar</button>
        </div>
        ${modoAdmin ? `<div style="margin-top:6px;font-size:12px;color:#777;">👤 Registrado por: ${p.informacion?.nombre_registrador || 'Anónimo'} (${p.informacion?.rol_registrador || 'Sin rol'})</div>` : ''}
      </div>
    `;
  });

  contenedor.innerHTML = html;

  document.querySelectorAll('.btn-navegar-urgente').forEach(btn => {
    btn.addEventListener('click', function() {
      const id = this.dataset.id;
      cerrarLista();
      document.getElementById('panelUrgencias').style.display = 'none';
      iniciarNavegacion(id);
    });
  });
}

function obtenerDireccionDesdeCoordenadas(lat, lng) {
  const campoDireccion = document.getElementById('campo_direccion');
  if (!campoDireccion) return;

  campoDireccion.placeholder = '🔄 Obteniendo dirección...';
  campoDireccion.value = '';

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&countrycodes=ve`;
    fetch(url)
      .then(res => res.json())
      .then(data => {
        if (data && data.display_name) {
          const address = data.address || {};
          const partes = [];
          if (address.road) partes.push(address.road);
          else if (address.pedestrian) partes.push(address.pedestrian);
          if (address.neighbourhood) partes.push(address.neighbourhood);
          else if (address.suburb) partes.push(address.suburb);
          if (address.city || address.town || address.village) {
            partes.push(address.city || address.town || address.village);
          }
          if (address.state) partes.push(address.state);
          const direccionCompleta = partes.length > 0 ? partes.join(', ') : data.display_name;
          campoDireccion.value = direccionCompleta;
          campoDireccion.placeholder = 'Dirección (automática)';
        } else {
          campoDireccion.placeholder = 'No se pudo obtener dirección';
        }
      })
      .catch(() => {
        campoDireccion.placeholder = 'Error al obtener dirección (escribe manual)';
      });
  } catch (e) {
    campoDireccion.placeholder = 'Error al obtener dirección (escribe manual)';
  }
}

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
// ============================================================
// BLOQUE 2C: GESTOS TÁCTILES PARA MINIMIZAR/EXPANDIR PANELES
// ============================================================

// --- Variables de gestos ---
let touchStartY = 0;
let touchStartTime = 0;
let lastTapTime = 0;

// --- Función para alternar minimizar/expandir ---
function togglePanel(panelId) {
  const panel = document.getElementById(panelId);
  if (!panel) return;
  
  const isMinimized = panel.classList.contains('panel-minimizado');
  
  if (isMinimized) {
    // Expandir
    panel.classList.remove('panel-minimizado');
    panel.style.height = '';
    panel.style.minHeight = '';
  } else {
    // Minimizar
    panel.classList.add('panel-minimizado');
    panel.style.height = '50px';
    panel.style.minHeight = '50px';
  }
}

// --- Configurar gestos en un encabezado ---
function setupGestos(headerId, panelId) {
  const header = document.getElementById(headerId);
  const panel = document.getElementById(panelId);
  if (!header || !panel) return;

  // --- Doble toque ---
  header.addEventListener('click', function(e) {
    // Evitar que el doble toque también cierre el panel si se hace clic en el botón cerrar
    if (e.target.closest('button')) return;
    
    const now = Date.now();
    const timeSinceLastTap = now - lastTapTime;
    if (timeSinceLastTap < 300) {
      // Doble toque detectado
      togglePanel(panelId);
      lastTapTime = 0;
    } else {
      lastTapTime = now;
    }
  });

  // --- Deslizamiento vertical (swipe) ---
  header.addEventListener('touchstart', function(e) {
    touchStartY = e.touches[0].clientY;
    touchStartTime = Date.now();
  }, { passive: true });

  header.addEventListener('touchmove', function(e) {
    // Prevenir el scroll del mapa al deslizar en el encabezado
    e.preventDefault();
  }, { passive: false });

  header.addEventListener('touchend', function(e) {
    const touchEndY = e.changedTouches[0].clientY;
    const diffY = touchStartY - touchEndY; // positivo = deslizar arriba, negativo = abajo
    const timeDiff = Date.now() - touchStartTime;
    
    // Solo considerar si el deslizamiento fue rápido (menos de 300ms) y con suficiente distancia
    if (timeDiff < 300 && Math.abs(diffY) > 30) {
      if (diffY > 0) {
        // Deslizar hacia arriba → minimizar
        panel.classList.add('panel-minimizado');
        panel.style.height = '50px';
        panel.style.minHeight = '50px';
      } else {
        // Deslizar hacia abajo → expandir
        panel.classList.remove('panel-minimizado');
        panel.style.height = '';
        panel.style.minHeight = '';
      }
    }
  }, { passive: true });
}

// --- Inicializar gestos para cada panel ---
document.addEventListener('DOMContentLoaded', function() {
  setupGestos('headerLista', 'panelLista');
  setupGestos('headerDetalle', 'panelDetalle');
  setupGestos('headerUrgencias', 'panelUrgencias');
});
// ============================================================
// BLOQUE 3: ADMIN, GEOLOCALIZACIÓN, SELECCIÓN, MENÚ, GUARDADO, SEGURIDAD
// ============================================================

// --- ADMIN Y GEOLOCALIZACIÓN ---
function getAdminPassword() {
  const stored = localStorage.getItem('adminPassword');
  return stored || ADMIN_PASSWORD;
}

function setAdminPassword(newPassword) {
  localStorage.setItem('adminPassword', newPassword);
}

function getContactoEmergencia() {
  return localStorage.getItem('contactoEmergencia') || 'No configurado';
}

function setContactoEmergencia(contacto) {
  localStorage.setItem('contactoEmergencia', contacto);
}

function marcarRecogido(id) {
  const pass = prompt('🔐 Ingresa la contraseña de administrador para marcar como recogido:');
  if (pass !== getAdminPassword()) {
    alert('❌ Contraseña incorrecta.');
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

function eliminarPunto(id) {
  const pass = prompt('🔐 Ingresa la contraseña de administrador para eliminar este punto:');
  if (pass !== getAdminPassword()) {
    alert('❌ Contraseña incorrecta.');
    return;
  }
  if (!confirm('¿Seguro que quieres eliminar este punto de forma permanente?')) return;
  todosLosPuntos = todosLosPuntos.filter(p => p.id !== id);
  guardarPuntos();
  aplicarFiltros();
  alert('🗑️ Punto eliminado.');
}

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

// --- MENÚ Y FORMULARIO ---
const menuOpciones = document.getElementById('menuOpciones');
const btnAgregar = document.getElementById('btnAgregar');
const btnAdmin = document.getElementById('btnAdmin');
const btnChat = document.getElementById('btnChat');
const btnSeguridad = document.getElementById('btnSeguridad');
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

btnAdmin.addEventListener('click', function() {
  const pass = prompt('Ingresa la contraseña de administrador:');
  const currentPassword = getAdminPassword();
  if (pass === currentPassword) {
    modoAdmin = true;
    btnAdmin.textContent = '🔓 Administrador activo';
    btnAdmin.style.background = '#2e7d32';
    btnChat.style.display = 'block';
    btnSeguridad.style.display = 'block';
    document.getElementById('btnEliminar').style.display = 'block';
    aplicarFiltros();
    alert('🔓 Modo administrador activado.');
  } else {
    alert('❌ Contraseña incorrecta.');
  }
});

document.querySelectorAll('#menuOpciones button').forEach(btn => {
  btn.addEventListener('click', function(e) {
    e.stopPropagation();
    const tipo = this.dataset.tipo;
    const config = TIPOS[tipo];
    if (config.requiereAdmin && !modoAdmin) {
      alert('🔐 Este tipo de punto solo puede ser agregado por el administrador. Activa el modo admin con la contraseña.');
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

// --- GUARDAR ---
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
  alert('✅ Punto guardado localmente');
  formulario.style.display = 'none';
  desactivarSeleccion();
  ubicacionSeleccionada = null;
  aplicarFiltros();
});

// --- CANCELAR ---
btnCancelar.addEventListener('click', function() {
  const btnRegistro = document.getElementById('btnRegistrarVoluntario');
  if (btnRegistro) {
    document.getElementById('btnCancelarVoluntario').click();
    return;
  }
  const btnEdicion = document.getElementById('btnGuardarEdicion');
  if (btnEdicion) {
    document.getElementById('btnCancelarEdicion').click();
    return;
  }
  const btnEnvio = document.getElementById('btnCrearEnvio');
  if (btnEnvio) {
    document.getElementById('btnCancelarEnvio').click();
    return;
  }
  const btnIncidencia = document.getElementById('btnGuardarIncidencia');
  if (btnIncidencia) {
    document.getElementById('btnCancelarIncidencia').click();
    return;
  }
  formulario.style.display = 'none';
  desactivarSeleccion();
  ubicacionSeleccionada = null;
});

// --- BUSCADOR ---
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

// --- FILTROS ---
document.querySelectorAll('#filtros .filtro-btn').forEach(btn => {
  btn.addEventListener('click', function() {
    document.querySelectorAll('#filtros .filtro-btn').forEach(b => b.classList.remove('activo'));
    this.classList.add('activo');
    filtroActivo = this.dataset.tipo;
    aplicarFiltros();
  });
});

// --- EVENTOS DE PANELES ---
document.getElementById('btnVerLista').addEventListener('click', function() {
  mostrarListaPuntos();
});
document.getElementById('btnCerrarLista').addEventListener('click', function() {
  cerrarLista();
});
document.getElementById('btnCerrarDetalle').addEventListener('click', function() {
  document.getElementById('panelDetalle').style.display = 'none';
});
document.getElementById('btnUrgencias').addEventListener('click', function() {
  mostrarUrgencias();
});
document.getElementById('btnCerrarUrgencias').addEventListener('click', function() {
  document.getElementById('panelUrgencias').style.display = 'none';
});

// --- SEGURIDAD: CONTRASEÑA MAESTRA Y CAMBIO DE CLAVE ---
function generarPassword() {
  const caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let password = '';
  for (let i = 0; i < 7; i++) {
    const indice = Math.floor(Math.random() * caracteres.length);
    password += caracteres.charAt(indice);
  }
  return password;
}

function mostrarPanelSeguridad() {
  if (!modoAdmin) {
    alert('🔐 Solo el administrador puede acceder a esta sección.');
    return;
  }
  document.getElementById('panelSeguridad').style.display = 'block';
  document.getElementById('displayContacto').textContent = getContactoEmergencia();
}

document.getElementById('btnSeguridad').addEventListener('click', function() {
  mostrarPanelSeguridad();
});

document.getElementById('btnGenerarPassword').addEventListener('click', function() {
  const nueva = generarPassword();
  document.getElementById('inputNuevaPassword').value = nueva;
  document.getElementById('inputConfirmPassword').value = nueva;
  alert(`🔑 Contraseña generada: ${nueva}\n\nPuedes usarla o cambiarla manualmente.`);
});

document.getElementById('btnCambiarPassword').addEventListener('click', function() {
  const master = document.getElementById('inputMasterPassword').value.trim();
  const nueva = document.getElementById('inputNuevaPassword').value.trim();
  const confirm = document.getElementById('inputConfirmPassword').value.trim();

  if (master !== MASTER_PASSWORD) {
    alert('❌ Contraseña maestra incorrecta. Intenta de nuevo.');
    return;
  }
  if (nueva.length !== 7) {
    alert('❌ La nueva contraseña debe tener exactamente 7 caracteres alfanuméricos.');
    return;
  }
  if (!/^[A-Za-z0-9]+$/.test(nueva)) {
    alert('❌ La nueva contraseña solo puede contener letras y números.');
    return;
  }
  if (nueva !== confirm) {
    alert('❌ Las contraseñas no coinciden.');
    return;
  }

  setAdminPassword(nueva);
  alert(`✅ Contraseña cambiada exitosamente.\n\nNueva contraseña: ${nueva}\n\n📞 Notifica a los administradores usando el número de contacto: ${getContactoEmergencia()}\n\n💡 Recomendación: Usa la contraseña generada por el sistema para mayor seguridad.`);
  document.getElementById('panelSeguridad').style.display = 'none';
  document.getElementById('inputMasterPassword').value = '';
  document.getElementById('inputNuevaPassword').value = '';
  document.getElementById('inputConfirmPassword').value = '';
});

document.getElementById('btnEditarContacto').addEventListener('click', function() {
  const actual = getContactoEmergencia();
  const nuevo = prompt('📞 Ingresa el número de contacto para emergencias (ej: +58 412 1234567):', actual);
  if (nuevo !== null) {
    setContactoEmergencia(nuevo);
    document.getElementById('displayContacto').textContent = nuevo;
    alert('✅ Número de contacto actualizado.');
  }
});

document.getElementById('btnCerrarSeguridad').addEventListener('click', function() {
  document.getElementById('panelSeguridad').style.display = 'none';
});
// ============================================================
// BLOQUE 4: VOLUNTARIADO INFANTIL, NAVEGACIÓN, EDICIÓN
// ============================================================

// --- VOLUNTARIADO INFANTIL ---
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
    <p style="font-size:14px;color:#555;margin-bottom:12px;">
      Para garantizar la seguridad de los niños, completa todos los campos obligatorios.
    </p>
    <label>Primer nombre *</label>
    <input type="text" id="v_nombre1" placeholder="Ej: Juan" required />
    <label>Segundo nombre</label>
    <input type="text" id="v_nombre2" placeholder="Ej: Carlos" />
    <label>Primer apellido *</label>
    <input type="text" id="v_apellido1" placeholder="Ej: Pérez" required />
    <label>Segundo apellido</label>
    <input type="text" id="v_apellido2" placeholder="Ej: García" />
    <label>Número de cédula *</label>
    <input type="text" id="v_cedula" required />
    <label>Foto de la cédula (toca para cargar)</label>
    <input type="file" id="v_foto_cedula" accept="image/*" capture="environment" />
    <label>Foto actualizada (toca para cargar)</label>
    <input type="file" id="v_foto_personal" accept="image/*" capture="environment" />
    <label>Teléfono de contacto</label>
    <input type="text" id="v_telefono" />
    <label>Rol (recreador, cuidador, voluntario, etc.)</label>
    <input type="text" id="v_rol" placeholder="Voluntario" />
    <label>Mensaje de seguridad para los niños (opcional)</label>
    <textarea id="v_mensaje" rows="3">Estamos aquí para cuidarte y protegerte. Tu bienestar es lo más importante.</textarea>
    <button id="btnRegistrarVoluntario" data-id="${puntoId}" style="margin-top:12px;background:#FF6F00;color:white;border:none;padding:10px;border-radius:8px;font-weight:bold;cursor:pointer;width:100%;">
      ✅ Registrar voluntario
    </button>
    <button id="btnCancelarVoluntario" style="margin-top:6px;background:#666;color:white;border:none;padding:10px;border-radius:8px;font-weight:bold;cursor:pointer;width:100%;">
      ❌ Cancelar
    </button>
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
      nombre: nombreCompleto,
      cedula,
      foto_cedula: fotoCedula,
      foto_personal: fotoPersonal,
      telefono,
      rol,
      mensaje
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
          }).bindPopup(`📍 ${nombreDestino}`);
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

// --- EDICIÓN DE PUNTOS ---
function mostrarFormularioEdicionPunto(puntoId) {
  const punto = todosLosPuntos.find(p => p.id === puntoId);
  if (!punto) { alert('❌ Punto no encontrado'); return; }
  if (!modoAdmin) { alert('🔐 Solo el administrador puede editar puntos.'); return; }

  const tipo = TIPOS[punto.tipo];
  if (!tipo) return;

  const datosActuales = {};
  tipo.campos.forEach(campo => {
    datosActuales[campo.id] = punto.informacion[campo.id] || '';
  });
  const direccion = punto.informacion.direccion || '';

  let html = `
    <h3 style="color:#1a237e;">✏️ Editar ${tipo.label}</h3>
    <p style="font-size:13px;color:#555;margin-bottom:10px;">
      Modifica los campos y guarda los cambios.
    </p>
  `;

  tipo.campos.forEach(campo => {
    const valor = punto.informacion[campo.id] || '';
    let input = '';
    if (campo.type === 'textarea') {
      input = `<textarea id="edit_${campo.id}" ${campo.required ? 'required' : ''}>${valor}</textarea>`;
    } else if (campo.type === 'select') {
      input = `<select id="edit_${campo.id}">`;
      campo.options.forEach(opt => {
        const selected = opt === valor ? 'selected' : '';
        input += `<option value="${opt}" ${selected}>${opt}</option>`;
      });
      input += `</select>`;
    } else {
      input = `<input type="${campo.type}" id="edit_${campo.id}" value="${valor}" ${campo.required ? 'required' : ''}>`;
    }
    html += `<label>${campo.label}</label>${input}`;
  });

  if (!tipo.campos.find(c => c.id === 'direccion')) {
    html += `
      <label>Dirección</label>
      <input type="text" id="edit_direccion" value="${direccion}" />
    `;
  }

  html += `
    <button id="btnGuardarEdicion" data-id="${puntoId}" style="margin-top:12px;background:#1a237e;color:white;border:none;padding:10px;border-radius:8px;font-weight:bold;cursor:pointer;width:100%;">
      💾 Guardar cambios
    </button>
    <button id="btnCancelarEdicion" style="margin-top:6px;background:#666;color:white;border:none;padding:10px;border-radius:8px;font-weight:bold;cursor:pointer;width:100%;">
      ❌ Cancelar
    </button>
  `;

  formTitulo.innerHTML = `✏️ Editando: ${punto.nombre}`;
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
// BLOQUE 5: TRANSPORTE DE SUMINISTROS CON APROBACIÓN TRIPLE
// ============================================================

function mostrarFormularioCrearEnvio(puntoId) {
  const punto = todosLosPuntos.find(p => p.id === puntoId);
  if (!punto || punto.tipo !== 'centro_acopio') return;

  const destinos = todosLosPuntos.filter(p =>
    p.id !== puntoId && ['refugio', 'hospital', 'centro_acopio', 'veterinaria'].includes(p.tipo)
  );

  if (destinos.length === 0) {
    alert('⚠️ No hay puntos de destino disponibles.');
    return;
  }

  let html = `
    <h3 style="color:#F57C00;">📦 Crear envío de suministros</h3>
    <label>Destino *</label>
    <select id="envio_destino" required>
      <option value="">Selecciona un destino...</option>
  `;
  destinos.forEach(d => {
    html += `<option value="${d.id}">${d.nombre} (${TIPOS[d.tipo].label})</option>`;
  });
  html += `</select>`;

  html += `
    <label>Contenido del envío *</label>
    <input type="text" id="envio_contenido" placeholder="Ej: 50 raciones de comida, 30 litros de agua" required />
    <label>Código de verificación (4-6 dígitos/letras) *</label>
    <input type="text" id="envio_codigo" placeholder="Ej: ABC123" required />
    <label>Observaciones adicionales</label>
    <textarea id="envio_observaciones" rows="2" placeholder="Instrucciones especiales"></textarea>
    <button id="btnCrearEnvio" data-id="${puntoId}" style="margin-top:12px;background:#F57C00;color:white;border:none;padding:10px;border-radius:8px;font-weight:bold;cursor:pointer;width:100%;">
      📦 Crear envío y generar enlace
    </button>
    <button id="btnCancelarEnvio" style="margin-top:6px;background:#666;color:white;border:none;padding:10px;border-radius:8px;font-weight:bold;cursor:pointer;width:100%;">
      ❌ Cancelar
    </button>
  `;

  formTitulo.innerHTML = '📦 Nuevo envío de suministros';
  camposDinamicos.innerHTML = html;
  formulario.style.display = 'block';
  btnGuardar.style.display = 'none';
  btnEliminar.style.display = 'none';
  btnCancelar.style.display = 'none';

  document.getElementById('btnCrearEnvio').addEventListener('click', function() {
    const destinoId = document.getElementById('envio_destino').value;
    const contenido = document.getElementById('envio_contenido').value.trim();
    const codigo = document.getElementById('envio_codigo').value.trim().toUpperCase();
    const observaciones = document.getElementById('envio_observaciones').value.trim();

    if (!destinoId) { alert('❌ Selecciona un destino'); return; }
    if (!contenido) { alert('❌ Describe el contenido'); return; }
    if (!codigo || codigo.length < 3) { alert('❌ El código de verificación debe tener al menos 3 caracteres'); return; }

    const destino = todosLosPuntos.find(p => p.id === destinoId);
    if (!destino) { alert('❌ Destino no encontrado'); return; }
    const origen = punto;

    const envioId = Date.now().toString();
    const enlaceUnico = `${window.location.origin}/?envio=${envioId}`;

    const nuevoEnvio = {
      id: envioId,
      codigo: codigo,
      origenId: origen.id,
      destinoId: destino.id,
      origenNombre: origen.nombre,
      destinoNombre: destino.nombre,
      contenido: contenido,
      observaciones: observaciones || 'Sin observaciones',
      estado: 'pendiente',
      ubicacionActual: { lat: origen.lat, lng: origen.lng },
      destinoLat: destino.lat,
      destinoLng: destino.lng,
      incidencias: [],
      fechaCreacion: new Date().toLocaleString(),
      fechaEntrega: null,
      enlace: enlaceUnico,
      aprobacionOrigen: null,
      aprobacionConductor: null,
      aprobacionDestino: null,
      conductor: null
    };

    if (!punto.informacion.envios) punto.informacion.envios = [];
    punto.informacion.envios.push(nuevoEnvio);
    guardarPuntos();
    agregarMarcadorEnvio(nuevoEnvio);

    alert(`✅ Envío creado. Comparte este enlace:\n\n${enlaceUnico}\n\nCódigo de verificación: ${codigo}\n\nEl conductor, el origen y el destino deben usar este enlace para aprobar.`);

    formulario.style.display = 'none';
    btnGuardar.style.display = 'block';
    btnCancelar.style.display = 'block';
    aplicarFiltros();
  });

  document.getElementById('btnCancelarEnvio').addEventListener('click', function() {
    formulario.style.display = 'none';
    btnGuardar.style.display = 'block';
    btnCancelar.style.display = 'block';
  });
}

function agregarMarcadorEnvio(envio) {
  const icon = L.divIcon({
    html: `<div style="background:#F57C00;color:white;border-radius:50%;width:30px;height:30px;display:flex;align-items:center;justify-content:center;font-size:14px;border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);">🚚</div>`,
    iconSize: [30, 30],
    className: 'envio-marker'
  });

  const aprobadoOrigen = envio.aprobacionOrigen ? '✅' : '⏳';
  const aprobadoConductor = envio.aprobacionConductor ? '✅' : '⏳';
  const aprobadoDestino = envio.aprobacionDestino ? '✅' : '⏳';
  const aprobacionesTexto = `Origen: ${aprobadoOrigen} | Conductor: ${aprobadoConductor} | Destino: ${aprobadoDestino}`;

  let popupContent = `
    <div class="popup-tipo">🚚 Envío de suministros</div>
    <strong>${envio.contenido}</strong><br>
    📍 Desde: ${envio.origenNombre}<br>
    📍 Hacia: ${envio.destinoNombre}<br>
    🔑 Código: ${envio.codigo}<br>
    📊 Estado: <strong style="color:${envio.estado === 'entregado' ? '#2e7d32' : envio.estado === 'incidencia' ? '#d32f2f' : '#F57C00'};">${envio.estado}</strong><br>
    📋 Aprobaciones: ${aprobacionesTexto}<br>
    📅 Creado: ${envio.fechaCreacion}
    ${envio.conductor ? `<br>👤 Conductor: ${envio.conductor.nombre} (${envio.conductor.cedula})` : ''}
    ${envio.conductor ? `<br>📞 Teléfono: ${envio.conductor.telefono}` : ''}
  `;

  if (envio.incidencias && envio.incidencias.length > 0) {
    popupContent += `<div class="popup-seccion"><strong>⚠️ Incidencias:</strong><ul class="popup-lista">`;
    envio.incidencias.forEach(inc => {
      const resuelto = inc.resuelto ? '✅' : '⏳';
      popupContent += `<li><strong>${inc.fecha}</strong> ${inc.titulo} - ${resuelto}</li>`;
    });
    popupContent += `</ul></div>`;
  }

  if (envio.estado !== 'entregado') {
    popupContent += `
      <div style="margin-top:8px;background:#f0f0f0;padding:6px;border-radius:4px;font-size:12px;">
        🔗 Enlace: <a href="${envio.enlace}" target="_blank">${envio.enlace}</a>
        <button class="btn-copiar-enlace" data-enlace="${envio.enlace}" style="background:#1a73e8;color:white;border:none;padding:2px 8px;border-radius:4px;cursor:pointer;font-size:11px;margin-left:4px;">📋 Copiar</button>
      </div>
    `;
    if (!envio.aprobacionOrigen && envio.estado === 'pendiente') {
      popupContent += `
        <button class="btn-aprobar-origen" data-envio-id="${envio.id}" style="margin-top:8px;background:#F57C00;color:white;border:none;padding:6px 12px;border-radius:6px;cursor:pointer;font-weight:bold;width:100%;">
          📦 Aprobar salida (Origen)
        </button>
      `;
    }
    if (envio.aprobacionOrigen && !envio.aprobacionConductor && envio.estado === 'origen_aprobado') {
      popupContent += `
        <button class="btn-conductor" data-envio-id="${envio.id}" style="margin-top:8px;background:#1a73e8;color:white;border:none;padding:6px 12px;border-radius:6px;cursor:pointer;font-weight:bold;width:100%;">
          🚚 Aceptar envío (Conductor)
        </button>
      `;
    }
    if (envio.aprobacionConductor && !envio.aprobacionDestino && envio.estado === 'en_ruta') {
      popupContent += `
        <button class="btn-aprobar-destino" data-envio-id="${envio.id}" style="margin-top:8px;background:#2e7d32;color:white;border:none;padding:6px 12px;border-radius:6px;cursor:pointer;font-weight:bold;width:100%;">
          ✅ Confirmar recepción (Destino)
        </button>
      `;
    }
    if (envio.estado !== 'entregado' && envio.estado !== 'incidencia') {
      popupContent += `
        <button class="btn-reportar-incidencia" data-envio-id="${envio.id}" style="margin-top:4px;background:#d32f2f;color:white;border:none;padding:6px 12px;border-radius:6px;cursor:pointer;font-weight:bold;width:100%;">
          ⚠️ Reportar incidencia
        </button>
      `;
    }
  } else {
    popupContent += `<div style="margin-top:8px;background:#e0e0e0;padding:6px;border-radius:6px;text-align:center;color:#333;">✅ Envío completado con todas las aprobaciones</div>`;
  }

  const marker = L.marker([envio.ubicacionActual.lat, envio.ubicacionActual.lng], { icon })
    .bindPopup(popupContent, { maxWidth: 350, className: 'popup-detalle' });

  marker.on('popupopen', function() {
    const btnCopiar = document.querySelector(`.btn-copiar-enlace[data-enlace="${envio.enlace}"]`);
    if (btnCopiar) {
      btnCopiar.addEventListener('click', function(e) {
        e.stopPropagation();
        navigator.clipboard.writeText(envio.enlace).then(() => {
          alert('📋 Enlace copiado');
        }).catch(() => {
          alert('📋 Copia manual: ' + envio.enlace);
        });
      });
    }
    const btnOrigen = document.querySelector(`.btn-aprobar-origen[data-envio-id="${envio.id}"]`);
    if (btnOrigen) {
      btnOrigen.addEventListener('click', function(e) {
        e.stopPropagation();
        mostrarAprobacionOrigen(envio.id);
      });
    }
    const btnConductor = document.querySelector(`.btn-conductor[data-envio-id="${envio.id}"]`);
    if (btnConductor) {
      btnConductor.addEventListener('click', function(e) {
        e.stopPropagation();
        mostrarFormularioConductor(envio.id);
      });
    }
    const btnDestino = document.querySelector(`.btn-aprobar-destino[data-envio-id="${envio.id}"]`);
    if (btnDestino) {
      btnDestino.addEventListener('click', function(e) {
        e.stopPropagation();
        mostrarAprobacionDestino(envio.id);
      });
    }
    const btnIncidencia = document.querySelector(`.btn-reportar-incidencia[data-envio-id="${envio.id}"]`);
    if (btnIncidencia) {
      btnIncidencia.addEventListener('click', function(e) {
        e.stopPropagation();
        reportarIncidencia(envio.id);
      });
    }
  });

  envio._marker = marker;
  markersLayer.addLayer(marker);
}

// --- FUNCIONES DE APROBACIÓN ---
function buscarEnvio(envioId) {
  for (const punto of todosLosPuntos) {
    if (punto.informacion?.envios) {
      const encontrado = punto.informacion.envios.find(e => e.id === envioId);
      if (encontrado) return encontrado;
    }
  }
  return null;
}

function actualizarMarcadorEnvio(envio) {
  if (envio._marker) {
    markersLayer.removeLayer(envio._marker);
    envio._marker = null;
    agregarMarcadorEnvio(envio);
  }
}

function mostrarAprobacionOrigen(envioId) {
  const envio = buscarEnvio(envioId);
  if (!envio) { alert('❌ Envío no encontrado'); return; }
  if (envio.aprobacionOrigen) { alert('✅ El origen ya aprobó este envío'); return; }
  if (envio.estado !== 'pendiente') { alert('⏳ Este envío ya no está pendiente de aprobación del origen'); return; }

  const panel = document.getElementById('panelAprobacionOrigen');
  panel.style.display = 'block';
  document.getElementById('a_nombre_origen').value = '';
  document.getElementById('a_rol_origen').value = 'Coordinador';
  document.getElementById('a_codigo_origen').value = '';

  document.getElementById('btnAprobarOrigen').onclick = function() {
    const nombre = document.getElementById('a_nombre_origen').value.trim();
    const rol = document.getElementById('a_rol_origen').value;
    const codigo = document.getElementById('a_codigo_origen').value.trim().toUpperCase();

    if (!nombre) { alert('❌ Ingresa tu nombre'); return; }
    if (!codigo) { alert('❌ Ingresa el código de verificación'); return; }
    if (codigo !== envio.codigo) { alert('❌ Código incorrecto. El código correcto es: ' + envio.codigo); return; }

    envio.aprobacionOrigen = { nombre, rol, fecha: new Date().toLocaleString() };
    envio.estado = 'origen_aprobado';
    guardarPuntos();
    actualizarMarcadorEnvio(envio);
    panel.style.display = 'none';
    alert('✅ Salida aprobada por el origen. El envío está listo para el conductor.');
    aplicarFiltros();
  };

  document.getElementById('btnCancelarAprobacionOrigen').onclick = function() {
    panel.style.display = 'none';
  };
}

function mostrarAprobacionDestino(envioId) {
  const envio = buscarEnvio(envioId);
  if (!envio) { alert('❌ Envío no encontrado'); return; }
  if (envio.aprobacionDestino) { alert('✅ El destino ya aprobó este envío'); return; }
  if (envio.estado !== 'en_ruta') { alert('⏳ El envío debe estar en ruta para confirmar recepción'); return; }

  const panel = document.getElementById('panelAprobacionDestino');
  panel.style.display = 'block';
  document.getElementById('a_nombre_destino').value = '';
  document.getElementById('a_rol_destino').value = 'Coordinador';
  document.getElementById('a_codigo_destino').value = '';
  document.getElementById('a_estado_destino').value = 'correcto';

  document.getElementById('btnAprobarDestino').onclick = function() {
    const nombre = document.getElementById('a_nombre_destino').value.trim();
    const rol = document.getElementById('a_rol_destino').value;
    const codigo = document.getElementById('a_codigo_destino').value.trim().toUpperCase();
    const estado = document.getElementById('a_estado_destino').value;

    if (!nombre) { alert('❌ Ingresa tu nombre'); return; }
    if (!codigo) { alert('❌ Ingresa el código de verificación'); return; }
    if (codigo !== envio.codigo) { alert('❌ Código incorrecto'); return; }

    envio.aprobacionDestino = { nombre, rol, estado, fecha: new Date().toLocaleString() };
    envio.estado = 'entregado';
    envio.fechaEntrega = new Date().toLocaleString();
    envio.ubicacionActual = { lat: envio.destinoLat, lng: envio.destinoLng };
    guardarPuntos();
    actualizarMarcadorEnvio(envio);
    panel.style.display = 'none';
    alert('✅ Recepción confirmada por el destino. ¡Envío completado!');
    aplicarFiltros();
  };

  document.getElementById('btnCancelarAprobacionDestino').onclick = function() {
    panel.style.display = 'none';
  };
}

function mostrarFormularioConductor(envioId) {
  const envio = buscarEnvio(envioId);
  if (!envio) { alert('❌ Envío no encontrado'); return; }
  if (envio.aprobacionConductor) { alert('✅ Ya hay un conductor asignado'); return; }
  if (envio.estado !== 'origen_aprobado') { alert('⏳ El origen debe aprobar primero la salida'); return; }

  const panelConductor = document.getElementById('formularioConductor');
  panelConductor.style.display = 'block';
  document.getElementById('c_nombre').value = '';
  document.getElementById('c_cedula').value = '';
  document.getElementById('c_telefono').value = '';
  document.getElementById('c_vehiculo').value = 'Camión';

  document.getElementById('btnAceptarEnvio').onclick = function() {
    const nombre = document.getElementById('c_nombre').value.trim();
    const cedula = document.getElementById('c_cedula').value.trim();
    const telefono = document.getElementById('c_telefono').value.trim();
    const vehiculo = document.getElementById('c_vehiculo').value;

    if (!nombre || !cedula || !telefono) {
      alert('❌ Todos los campos son obligatorios.');
      return;
    }

    envio.conductor = { nombre, cedula, telefono, vehiculo };
    envio.aprobacionConductor = { nombre, cedula, telefono, vehiculo, fecha: new Date().toLocaleString() };
    envio.estado = 'en_ruta';
    guardarPuntos();
    actualizarMarcadorEnvio(envio);
    panelConductor.style.display = 'none';
    alert('✅ Envío aceptado. El conductor está en ruta.');
    aplicarFiltros();
  };

  document.getElementById('btnCancelarConductor').onclick = function() {
    panelConductor.style.display = 'none';
  };
}

function reportarIncidencia(envioId) {
  const envio = buscarEnvio(envioId);
  if (!envio) { alert('❌ Envío no encontrado'); return; }

  const html = `
    <h3 style="color:#d32f2f;">⚠️ Reportar incidencia</h3>
    <p style="font-size:14px;color:#555;margin-bottom:12px;">
      Describe detalladamente lo que ocurrió durante el transporte.
    </p>
    <label>Título *</label>
    <input type="text" id="inc_titulo" placeholder="Ej: Accidente en la vía" required />
    <label>Descripción detallada *</label>
    <textarea id="inc_descripcion" rows="4" placeholder="Describe con detalle lo que pasó" required></textarea>
    <label>¿Requiere asistencia?</label>
    <select id="inc_asistencia">
      <option value="no">No</option>
      <option value="si">Sí (contactar a emergencias)</option>
    </select>
    <button id="btnGuardarIncidencia" data-envio-id="${envioId}" style="margin-top:12px;background:#d32f2f;color:white;border:none;padding:10px;border-radius:8px;font-weight:bold;cursor:pointer;width:100%;">
      📨 Reportar incidencia
    </button>
    <button id="btnCancelarIncidencia" style="margin-top:6px;background:#666;color:white;border:none;padding:10px;border-radius:8px;font-weight:bold;cursor:pointer;width:100%;">
      ❌ Cancelar
    </button>
  `;

  formTitulo.innerHTML = '⚠️ Reporte de incidencia';
  camposDinamicos.innerHTML = html;
  formulario.style.display = 'block';
  btnGuardar.style.display = 'none';
  btnEliminar.style.display = 'none';
  btnCancelar.style.display = 'none';

  document.getElementById('btnGuardarIncidencia').addEventListener('click', function() {
    const titulo = document.getElementById('inc_titulo').value.trim();
    const descripcion = document.getElementById('inc_descripcion').value.trim();
    const asistencia = document.getElementById('inc_asistencia').value;

    if (!titulo) { alert('❌ El título es obligatorio'); return; }
    if (!descripcion) { alert('❌ La descripción es obligatoria'); return; }

    const incidencia = {
      id: Date.now().toString(),
      fecha: new Date().toLocaleString(),
      titulo: titulo,
      descripcion: descripcion,
      requiereAsistencia: asistencia === 'si',
      resuelto: false
    };

    if (!envio.incidencias) envio.incidencias = [];
    envio.incidencias.push(incidencia);
    envio.estado = 'incidencia';
    guardarPuntos();
    actualizarMarcadorEnvio(envio);
    alert('✅ Incidencia reportada.');
    formulario.style.display = 'none';
    btnGuardar.style.display = 'block';
    btnCancelar.style.display = 'block';
    aplicarFiltros();
  });

  document.getElementById('btnCancelarIncidencia').addEventListener('click', function() {
    formulario.style.display = 'none';
    btnGuardar.style.display = 'block';
    btnCancelar.style.display = 'block';
  });
}
// ============================================================
// BLOQUE 6: CHAT DE ADMINISTRADORES
// ============================================================

// Cargar mensajes del chat desde localStorage
function cargarMensajesChat() {
  const stored = localStorage.getItem('chatMensajes');
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      return [];
    }
  }
  return [];
}

// Guardar mensajes del chat
function guardarMensajesChat(mensajes) {
  localStorage.setItem('chatMensajes', JSON.stringify(mensajes));
}

// Mostrar mensajes en el panel de chat
function renderizarChat() {
  const contenedor = document.getElementById('mensajesChat');
  const mensajes = cargarMensajesChat();
  const nombreAdmin = localStorage.getItem('adminNombre') || 'Administrador';

  let html = '';
  mensajes.forEach(m => {
    const esPropio = m.remitente === nombreAdmin;
    html += `
      <div class="mensaje-chat ${esPropio ? 'own' : ''}">
        <div><strong>${m.remitente}</strong>: ${m.texto}</div>
        <div class="meta">${m.fecha}</div>
      </div>
    `;
  });
  contenedor.innerHTML = html;
  contenedor.scrollTop = contenedor.scrollHeight;
}

// Enviar mensaje
function enviarMensajeChat() {
  const input = document.getElementById('inputMensaje');
  const texto = input.value.trim();
  if (!texto) return;

  const nombreAdmin = localStorage.getItem('adminNombre') || 'Administrador';
  const mensajes = cargarMensajesChat();
  mensajes.push({
    remitente: nombreAdmin,
    texto: texto,
    fecha: new Date().toLocaleString()
  });
  guardarMensajesChat(mensajes);
  renderizarChat();
  input.value = '';
}

// Abrir chat
function abrirChat() {
  if (!modoAdmin) {
    alert('🔐 Solo los administradores pueden acceder al chat.');
    return;
  }
  const nombre = prompt('👤 Ingresa tu nombre para el chat:', localStorage.getItem('adminNombre') || '');
  if (nombre) {
    localStorage.setItem('adminNombre', nombre);
  }
  document.getElementById('panelChat').style.display = 'flex';
  renderizarChat();
}

// Eventos del chat
document.getElementById('btnChat').addEventListener('click', function() {
  abrirChat();
});

document.getElementById('btnCerrarChat').addEventListener('click', function() {
  document.getElementById('panelChat').style.display = 'none';
});

document.getElementById('btnEnviarMensaje').addEventListener('click', function() {
  enviarMensajeChat();
});

document.getElementById('inputMensaje').addEventListener('keypress', function(e) {
  if (e.key === 'Enter') {
    enviarMensajeChat();
  }
});
// ============================================================
// BLOQUE 7: INICIALIZACIÓN, VERIFICACIÓN DE ENLACE, EVENTOS DE CIERRE
// ============================================================

// Verificar si hay un enlace de envío en la URL
function verificarEnlaceEnvio() {
  const params = new URLSearchParams(window.location.search);
  const envioId = params.get('envio');
  if (envioId) {
    setTimeout(() => {
      const envio = buscarEnvio(envioId);
      if (envio) {
        if (!envio.aprobacionOrigen) {
          mostrarAprobacionOrigen(envioId);
        } else if (envio.aprobacionOrigen && !envio.aprobacionConductor) {
          mostrarFormularioConductor(envioId);
        } else if (envio.aprobacionConductor && !envio.aprobacionDestino) {
          mostrarAprobacionDestino(envioId);
        } else {
          alert('✅ Este envío ya está completado.');
        }
      } else {
        alert('❌ Envío no encontrado o ya fue eliminado.');
      }
    }, 500);
    window.history.replaceState({}, document.title, window.location.pathname);
  }
}

// Inicialización principal
document.addEventListener('DOMContentLoaded', function() {
  document.getElementById('btnAdmin').style.display = 'block';
});

cargarPuntos();
obtenerUbicacion();

// Esperar a que los datos estén cargados para verificar el enlace
setTimeout(verificarEnlaceEnvio, 800);

console.log('✅ App con todas las funcionalidades: lista, urgencias, aprobación triple, chat, seguridad y protección infantil.');
