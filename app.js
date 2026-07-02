// ============================================================
// 1. MAPA Y CONTROLES
// ============================================================
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
let modoAdmin = false; // Solo el desarrollador puede activar
let puntoEnEdicion = null; // Para eliminar

// Contraseña del administrador (cámbiala por la que quieras)
const ADMIN_PASSWORD = 'MapaVida2026';

document.getElementById('cargando').style.display = 'none';

// ============================================================
// 2. DEFINICIÓN DE TIPOS (con campos específicos)
// ============================================================
const TIPOS = {
  refugio: {
    label: 'Refugio', color: '#2E7D32', icono: '🏠', requiereAdmin: false,
    campos: [
      { id: 'nombre', label: 'Nombre del refugio *', type: 'text', required: true },
      { id: 'direccion', label: 'Dirección', type: 'text', required: false },
      { id: 'cupo', label: 'Cupo disponible (personas)', type: 'number', required: false },
      { id: 'necesidades', label: 'Necesidades detalladas (una por línea)', type: 'textarea', required: false }
    ],
    procesar: (d) => ({
      cupo: parseInt(d.cupo) || 0,
      necesidades: d.necesidades ? d.necesidades.split('\n').filter(s => s.trim()) : []
    }),
    popupDetalle: (info) => `<div class="popup-info">👥 Cupo: ${info.cupo || 'N/E'}</div>`
  },
  centro_acopio: {
    label: 'Centro de acopio', color: '#F57C00', icono: '📦', requiereAdmin: false,
    campos: [
      { id: 'nombre', label: 'Nombre del centro *', type: 'text', required: true },
      { id: 'direccion', label: 'Dirección', type: 'text', required: false },
      { id: 'necesarios', label: 'Insumos necesarios (separados por comas)', type: 'textarea', required: false },
      { id: 'suficientes', label: 'Insumos que YA NO necesitan (separados por comas)', type: 'textarea', required: false },
      { id: 'necesidades', label: 'Necesidades detalladas (una por línea)', type: 'textarea', required: false }
    ],
    procesar: (d) => ({
      necesita: d.necesarios ? d.necesarios.split(',').map(s => s.trim()).filter(Boolean) : [],
      suficientes: d.suficientes ? d.suficientes.split(',').map(s => s.trim()).filter(Boolean) : [],
      necesidades: d.necesidades ? d.necesidades.split('\n').filter(s => s.trim()) : []
    }),
    popupDetalle: (info) => {
      let html = '';
      if (info.necesita?.length) html += `<div class="popup-info">⚠️ Necesitan: ${info.necesita.join(', ')}</div>`;
      if (info.suficientes?.length) html += `<div class="popup-info" style="color:#2e7d32;">✅ Ya no necesitan: ${info.suficientes.join(', ')}</div>`;
      return html;
    }
  },
  hospital: {
    label: 'Hospital', color: '#1976D2', icono: '🏥', requiereAdmin: false,
    campos: [
      { id: 'nombre', label: 'Nombre del hospital *', type: 'text', required: true },
      { id: 'direccion', label: 'Dirección', type: 'text', required: false },
      { id: 'medicamentos', label: 'Medicamentos necesarios (separados por comas)', type: 'textarea', required: false },
      { id: 'sangre', label: '¿Necesitan donaciones de sangre?', type: 'select', options: ['No', 'Sí'], required: false },
      { id: 'necesidades', label: 'Necesidades detalladas (una por línea)', type: 'textarea', required: false }
    ],
    procesar: (d) => ({
      medicamentos: d.medicamentos ? d.medicamentos.split(',').map(s => s.trim()).filter(Boolean) : [],
      necesita_sangre: d.sangre === 'Sí',
      necesidades: d.necesidades ? d.necesidades.split('\n').filter(s => s.trim()) : []
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
    campos: [
      { id: 'nombre', label: 'Ubicación / referencia *', type: 'text', required: true },
      { id: 'apoyo', label: '¿Qué apoyo necesitan? (ej: agua, comida, escombros)', type: 'textarea', required: false },
      { id: 'necesidades', label: 'Necesidades detalladas (una por línea)', type: 'textarea', required: false }
    ],
    procesar: (d) => ({
      apoyo: d.apoyo ? d.apoyo.split(',').map(s => s.trim()).filter(Boolean) : [],
      recogido: false,
      necesidades: d.necesidades ? d.necesidades.split('\n').filter(s => s.trim()) : []
    }),
    popupDetalle: (info) => {
      let html = `<div class="popup-info" style="color:#C62828;">⚠️ Edificio colapsado</div>`;
      if (info.apoyo?.length) html += `<div class="popup-info">🛠️ Necesitan: ${info.apoyo.join(', ')}</div>`;
      if (info.recogido) html += `<div class="popup-info" style="color:#2e7d32;">✅ Ya recogido y limpiado</div>`;
      return html;
    }
  },
  peligro_derrumbe: {
    label: 'Peligro de derrumbe', color: '#E65100', icono: '⚠️', requiereAdmin: false,
    campos: [
      { id: 'nombre', label: 'Ubicación / referencia *', type: 'text', required: true },
      { id: 'advertencia', label: 'Advertencia adicional (opcional)', type: 'textarea', required: false },
      { id: 'necesidades', label: 'Necesidades detalladas (una por línea)', type: 'textarea', required: false }
    ],
    procesar: (d) => ({
      advertencia: d.advertencia || 'Manténgase alejado, estructura inestable',
      necesidades: d.necesidades ? d.necesidades.split('\n').filter(s => s.trim()) : []
    }),
    popupDetalle: (info) => `<div class="popup-advertencia">⚠️ ${info.advertencia}</div>`
  },
  sin_inspeccionar: {
    label: 'Sin inspeccionar', color: '#6A1B9A', icono: '❓', requiereAdmin: false,
    campos: [
      { id: 'nombre', label: 'Ubicación / referencia *', type: 'text', required: true },
      { id: 'nota', label: 'Nota adicional (opcional)', type: 'textarea', required: false },
      { id: 'necesidades', label: 'Necesidades detalladas (una por línea)', type: 'textarea', required: false }
    ],
    procesar: (d) => ({
      mensaje: d.nota || 'Estructura no ha sido inspeccionada por personal autorizado',
      necesidades: d.necesidades ? d.necesidades.split('\n').filter(s => s.trim()) : []
    }),
    popupDetalle: (info) => `<div class="popup-info" style="color:#6A1B9A;">❓ ${info.mensaje}</div>`
  },
  veterinaria: {
    label: 'Atención veterinaria', color: '#00897B', icono: '🐾', requiereAdmin: false,
    campos: [
      { id: 'nombre', label: 'Nombre del centro veterinario *', type: 'text', required: true },
      { id: 'direccion', label: 'Dirección', type: 'text', required: false },
      { id: 'servicios', label: 'Servicios que ofrecen (separados por comas)', type: 'textarea', required: false },
      { id: 'emergencia', label: '¿Atienden emergencias 24h?', type: 'select', options: ['No', 'Sí'], required: false },
      { id: 'necesidades', label: 'Necesidades detalladas (una por línea)', type: 'textarea', required: false }
    ],
    procesar: (d) => ({
      servicios: d.servicios ? d.servicios.split(',').map(s => s.trim()).filter(Boolean) : [],
      emergencia_24h: d.emergencia === 'Sí',
      necesidades: d.necesidades ? d.necesidades.split('\n').filter(s => s.trim()) : []
    }),
    popupDetalle: (info) => {
      let html = '';
      if (info.servicios?.length) html += `<div class="popup-info">🩺 Servicios: ${info.servicios.join(', ')}</div>`;
      if (info.emergencia_24h) html += `<div class="popup-info" style="color:#00897B;">🕐 Atención 24h</div>`;
      return html;
    }
  },
  // NUEVOS TIPOS (solo administrador)
  ayuda_psicologica: {
    label: 'Ayuda psicológica', color: '#8E24AA', icono: '🧠', requiereAdmin: true,
    campos: [
      { id: 'nombre', label: 'Nombre del centro / profesional *', type: 'text', required: true },
      { id: 'direccion', label: 'Dirección', type: 'text', required: false },
      { id: 'horario', label: 'Horario de atención', type: 'text', required: false },
      { id: 'contacto', label: 'Teléfono de contacto', type: 'text', required: false },
      { id: 'necesidades', label: 'Información adicional (una por línea)', type: 'textarea', required: false }
    ],
    procesar: (d) => ({
      horario: d.horario || '',
      contacto: d.contacto || '',
      necesidades: d.necesidades ? d.necesidades.split('\n').filter(s => s.trim()) : []
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
    campos: [
      { id: 'nombre', label: 'Nombre del punto de vacunación *', type: 'text', required: true },
      { id: 'direccion', label: 'Dirección', type: 'text', required: false },
      { id: 'horario', label: 'Horario de aplicación', type: 'text', required: false },
      { id: 'contacto', label: 'Teléfono de contacto', type: 'text', required: false },
      { id: 'necesidades', label: 'Información adicional (una por línea)', type: 'textarea', required: false }
    ],
    procesar: (d) => ({
      horario: d.horario || '',
      contacto: d.contacto || '',
      necesidades: d.necesidades ? d.necesidades.split('\n').filter(s => s.trim()) : []
    }),
    popupDetalle: (info) => {
      let html = '';
      if (info.horario) html += `<div class="popup-info">🕐 Horario: ${info.horario}</div>`;
      if (info.contacto) html += `<div class="popup-info">📞 Contacto: ${info.contacto}</div>`;
      return html;
    }
  },
  proteccion_infantil: {
    label: 'Protección infantil', color: '#FF6F00', icono: '👶', requiereAdmin: true,
    campos: [
      { id: 'nombre', label: 'Nombre completo (2 nombres y 2 apellidos) *', type: 'text', required: true },
      { id: 'cedula', label: 'Número de cédula *', type: 'text', required: true },
      { id: 'foto_cedula', label: 'Enlace a foto de la cédula (URL) *', type: 'text', required: true },
      { id: 'foto_personal', label: 'Enlace a foto actualizada (URL) *', type: 'text', required: true },
      { id: 'direccion', label: 'Dirección de contacto', type: 'text', required: false },
      { id: 'telefono', label: 'Teléfono de contacto', type: 'text', required: false },
      { id: 'rol', label: 'Rol (recreador, cuidador, voluntario, etc.)', type: 'text', required: false },
      { id: 'mensaje', label: 'Mensaje de seguridad para los niños (opcional)', type: 'textarea', required: false }
    ],
    procesar: (d) => ({
      cedula: d.cedula || '',
      foto_cedula: d.foto_cedula || '',
      foto_personal: d.foto_personal || '',
      telefono: d.telefono || '',
      rol: d.rol || 'Voluntario',
      mensaje: d.mensaje || 'Estamos aquí para cuidarte y protegerte. Tu bienestar es lo más importante.'
    }),
    popupDetalle: (info) => {
      let html = `
        <div class="popup-info">🆔 Cédula: ${info.cedula || 'N/E'}</div>
        <div class="popup-info">📸 <a href="${info.foto_cedula}" target="_blank">Ver foto de cédula</a></div>
        <div class="popup-info">📸 <a href="${info.foto_personal}" target="_blank">Ver foto actual</a></div>
        ${info.telefono ? `<div class="popup-info">📞 Teléfono: ${info.telefono}</div>` : ''}
        ${info.rol ? `<div class="popup-info">👤 Rol: ${info.rol}</div>` : ''}
        <div class="popup-mensaje-bonito">
          <p>💛 ${info.mensaje || 'Estamos aquí para cuidarte y protegerte. Tu bienestar es lo más importante.'}</p>
        </div>
      `;
      return html;
    }
  }
};

// ============================================================
// 3. FUNCIONES DE CARGA Y VISUALIZACIÓN
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
        informacion: { direccion: 'Av. Principal', cupo: 150, necesidades: ['Agua', 'Comida', 'Colchonetas'] }
      },
      {
        id: '2', tipo: 'edificio_caido', nombre: 'Edificio Las Mercedes',
        lat: 10.5000, lng: -66.9000,
        informacion: { direccion: 'Calle 2', apoyo: ['grúa'], recogido: false, necesidades: ['Grúa', 'Voluntarios'] }
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
  const filtrados = filtroActivo === 'todos'
    ? todosLosPuntos
    : todosLosPuntos.filter(p => p.tipo === filtroActivo);
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

    let popupContent = `
      <div class="popup-tipo">${tipo.icono} ${tipo.label}</div>
      <strong>${p.nombre}</strong><br>
      ${p.informacion?.direccion ? p.informacion.direccion + '<br>' : ''}
      ${tipo.popupDetalle(p.informacion || {})}
    `;

    // Necesidades detalladas (bloque común)
    const necesidades = p.informacion?.necesidades || [];
    if (necesidades.length > 0) {
      popupContent += `<div class="popup-seccion"><strong>📋 Más información</strong><ul class="popup-lista">`;
      necesidades.forEach(n => popupContent += `<li>${n}</li>`);
      popupContent += `</ul></div>`;
    }

    // Botón recogido (solo edificios caídos)
    if (p.tipo === 'edificio_caido' && !recogido) {
      popupContent += `
        <button class="btn-recoger" data-id="${p.id}" style="margin-top:8px;background:#4CAF50;color:white;border:none;padding:6px 12px;border-radius:6px;cursor:pointer;font-weight:bold;width:100%;">
          ✅ Marcar como recogido
        </button>
      `;
    } else if (p.tipo === 'edificio_caido' && recogido) {
      popupContent += `<div style="margin-top:8px;background:#e0e0e0;padding:6px;border-radius:6px;text-align:center;color:#333;">✅ Ya recogido y limpiado</div>`;
    }

    // Botón eliminar (solo si modoAdmin activo)
    if (modoAdmin) {
      popupContent += `
        <button class="btn-eliminar-admin" data-id="${p.id}" style="margin-top:8px;background:#d32f2f;color:white;border:none;padding:6px 12px;border-radius:6px;cursor:pointer;font-weight:bold;width:100%;">
          🗑️ Eliminar punto
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
      // Botón recoger
      const btnRecoger = document.querySelector(`.btn-recoger[data-id="${p.id}"]`);
      if (btnRecoger) btnRecoger.addEventListener('click', (e) => { e.stopPropagation(); marcarRecogido(p.id); });
      // Botón eliminar (admin)
      const btnEliminar = document.querySelector(`.btn-eliminar-admin[data-id="${p.id}"]`);
      if (btnEliminar) btnEliminar.addEventListener('click', (e) => { e.stopPropagation(); eliminarPunto(p.id); });
    });

    markersLayer.addLayer(marker);
  });
}

// ============================================================
// 4. FUNCIONES ADMIN: ELIMINAR Y MARCAR RECOGIDO
// ============================================================
function marcarRecogido(id) {
  const punto = todosLosPuntos.find(p => p.id === id);
  if (!punto || punto.tipo !== 'edificio_caido' || punto.informacion.recogido) return;
  punto.informacion.recogido = true;
  guardarPuntos();
  aplicarFiltros();
  alert('✅ Edificio marcado como recogido y limpiado. ¡Gracias!');
}

function eliminarPunto(id) {
  if (!modoAdmin) return alert('🔐 Solo el administrador puede eliminar puntos.');
  if (!confirm('¿Seguro que quieres eliminar este punto de interés de forma permanente?')) return;
  todosLosPuntos = todosLosPuntos.filter(p => p.id !== id);
  guardarPuntos();
  aplicarFiltros();
  alert('🗑️ Punto eliminado.');
}

// ============================================================
// 5. GEOLOCALIZACIÓN
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

// ============================================================
// 6. SELECCIÓN EN EL MAPA Y FORMULARIO
// ============================================================
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
}

// ============================================================
// 7. MENÚ Y FORMULARIO
// ============================================================
const menuOpciones = document.getElementById('menuOpciones');
const btnAgregar = document.getElementById('btnAgregar');
const btnAdmin = document.getElementById('btnAdmin');
const formulario = document.getElementById('formulario');
const formTitulo = document.getElementById('formTitulo');
const camposDinamicos = document.getElementById('camposDinamicos');
const fLatDisplay = document.getElementById('fLatDisplay');
const fLngDisplay = document.getElementById('fLngDisplay');
const btnGuardar = document.getElementById('btnGuardar');
const btnEliminar = document.getElementById('btnEliminar');
const btnCancelar = document.getElementById('btnCancelar');

// Mostrar/ocultar menú
btnAgregar.addEventListener('click', function(e) {
  e.stopPropagation();
  menuOpciones.style.display = (menuOpciones.style.display === 'flex') ? 'none' : 'flex';
});
document.addEventListener('click', function() { menuOpciones.style.display = 'none'; });

// Botón administrador (desbloquear con contraseña)
btnAdmin.addEventListener('click', function() {
  const pass = prompt('Ingresa la contraseña de administrador:');
  if (pass === ADMIN_PASSWORD) {
    modoAdmin = true;
    btnAdmin.textContent = '🔓 Administrador activo';
    btnAdmin.style.background = '#2e7d32';
    document.getElementById('btnEliminar').style.display = 'block';
    aplicarFiltros(); // recargar para mostrar botones eliminar
    alert('🔓 Modo administrador activado. Ahora puedes eliminar puntos desde sus popups.');
  } else {
    alert('❌ Contraseña incorrecta.');
  }
});

// Seleccionar tipo del menú
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
}

// ============================================================
// 8. GUARDAR
// ============================================================
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

// ============================================================
// 9. CANCELAR
// ============================================================
btnCancelar.addEventListener('click', function() {
  formulario.style.display = 'none';
  desactivarSeleccion();
  ubicacionSeleccionada = null;
});

// ============================================================
// 10. BUSCADOR
// ============================================================
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

// ============================================================
// 11. FILTROS
// ============================================================
document.querySelectorAll('#filtros .filtro-btn').forEach(btn => {
  btn.addEventListener('click', function() {
    document.querySelectorAll('#filtros .filtro-btn').forEach(b => b.classList.remove('activo'));
    this.classList.add('activo');
    filtroActivo = this.dataset.tipo;
    aplicarFiltros();
  });
});

// ============================================================
// 12. UTILIDADES
// ============================================================
function calcularDistancia(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Mostrar botón admin al cargar
document.addEventListener('DOMContentLoaded', function() {
  document.getElementById('btnAdmin').style.display = 'block';
});

// ============================================================
// 13. INICIO
// ============================================================
cargarPuntos();
obtenerUbicacion();

console.log('✅ App con administración, protección infantil, psicología y vacunas');
