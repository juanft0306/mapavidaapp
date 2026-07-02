// ============================================================
// MAPAVIDA - APP COMPLETA
// PARTE 1: CONFIGURACIÓN, TIPOS, CARGA Y VISUALIZACIÓN
// ============================================================

// --- 1. CONFIGURACIÓN ---
const ADMIN_PASSWORD = 'MapaVida2026';

// --- 2. MAPA Y CONTROLES ---
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

// --- 3. DEFINICIONES DE TIPOS (con definiciones claras) ---
const DEFINICIONES = {
  edificio_caido: 'Estructura que ya colapsó total o parcialmente. No ingresar. Necesita maquinaria y personal especializado para remover escombros.',
  peligro_derrumbe: 'Estructura con daños estructurales visibles (grietas, inclinación, etc.) que podría colapsar en cualquier momento. Manténgase alejado.',
  sin_inspeccionar: 'Estructura que aún no ha sido revisada por personal técnico. No se sabe si es segura o no. Evitar el ingreso hasta evaluación oficial.',
  refugio: 'Espacio habilitado para albergar personas damnificadas. Puede tener cupo limitado y necesidades específicas.',
  centro_acopio: 'Lugar donde se recolectan y distribuyen insumos (comida, agua, medicinas, ropa, etc.) para los afectados.',
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
      { id: 'necesidad_infantil', label: '¿Necesitan actividades recreativas o cuidado para niños?', type: 'select', options: ['No', 'Sí'], required: false },
      { id: 'necesidades', label: 'Necesidades detalladas (una por línea)', type: 'textarea', required: false }
    ],
    procesar: (d) => ({
      cupo: parseInt(d.cupo) || 0,
      necesidad_infantil: d.necesidad_infantil === 'Sí',
      necesidades: d.necesidades ? d.necesidades.split('\n').filter(s => s.trim()) : [],
      voluntarios_infantiles: []
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
      { id: 'necesidad_infantil', label: '¿Necesitan actividades recreativas o cuidado para niños?', type: 'select', options: ['No', 'Sí'], required: false },
      { id: 'necesidades', label: 'Necesidades detalladas (una por línea)', type: 'textarea', required: false }
    ],
    procesar: (d) => ({
      necesita: d.necesarios ? d.necesarios.split(',').map(s => s.trim()).filter(Boolean) : [],
      suficientes: d.suficientes ? d.suficientes.split(',').map(s => s.trim()).filter(Boolean) : [],
      necesidad_infantil: d.necesidad_infantil === 'Sí',
      necesidades: d.necesidades ? d.necesidades.split('\n').filter(s => s.trim()) : [],
      voluntarios_infantiles: []
    }),
    popupDetalle: (info) => {
      let html = '';
      if (info.necesita?.length) html += `<div class="popup-info">⚠️ Necesitan: ${info.necesita.join(', ')}</div>`;
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
    definicion: DEFINICIONES.edificio_caido,
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
    definicion: DEFINICIONES.peligro_derrumbe,
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
    definicion: DEFINICIONES.sin_inspeccionar,
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
    definicion: DEFINICIONES.veterinaria,
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
  ayuda_psicologica: {
    label: 'Ayuda psicológica', color: '#8E24AA', icono: '🧠', requiereAdmin: true,
    definicion: DEFINICIONES.ayuda_psicologica,
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
    definicion: DEFINICIONES.vacuna_tetanos,
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
  }
};

// --- 4. FUNCIONES DE CARGA Y VISUALIZACIÓN ---
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
        informacion: { direccion: 'Av. Principal', cupo: 150, necesidad_infantil: true, necesidades: ['Agua', 'Comida', 'Colchonetas'], voluntarios_infantiles: [] }
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

    // Definición clara del tipo (para evitar confusiones)
    const definicionTexto = tipo.definicion ? `<div class="popup-definicion">ℹ️ ${tipo.definicion}</div>` : '';

    let popupContent = `
      <div class="popup-tipo">${tipo.icono} ${tipo.label}</div>
      ${definicionTexto}
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

    // --- BOTONES DE ACCIÓN ---

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

    // Botón ofrecimiento infantil (si aplica)
    if (p.informacion?.necesidad_infantil && p.informacion?.voluntarios_infantiles !== undefined) {
      const yaOfrecido = false; // Podríamos implementar con localStorage
      if (!yaOfrecido) {
        popupContent += `
          <button class="btn-ofrecerse-infantil" data-id="${p.id}" style="margin-top:8px;background:#FF6F00;color:white;border:none;padding:6px 12px;border-radius:6px;cursor:pointer;font-weight:bold;width:100%;">
            🧸 Ofrecerse como voluntario para niños
          </button>
        `;
      } else {
        popupContent += `<div style="margin-top:8px;background:#e0e0e0;padding:6px;border-radius:6px;text-align:center;">✅ Ya te has ofrecido</div>`;
      }
      // Lista de voluntarios registrados
      if (p.informacion.voluntarios_infantiles && p.informacion.voluntarios_infantiles.length > 0) {
        popupContent += `<div class="popup-seccion"><strong>👥 Voluntarios registrados:</strong><ul class="popup-lista">`;
        p.informacion.voluntarios_infantiles.forEach(v => {
          popupContent += `<li>${v.nombre} (${v.rol || 'Voluntario'}) - ${v.telefono || 'Sin teléfono'}</li>`;
        });
        popupContent += `</ul></div>`;
      }
    }

    // Botón navegación
    popupContent += `
      <button class="btn-navegar" data-id="${p.id}" style="margin-top:6px;background:#1a73e8;color:white;border:none;padding:6px 12px;border-radius:6px;cursor:pointer;font-weight:bold;width:100%;">
        🧭 Cómo llegar
      </button>
    `;

    // Botón eliminar (solo admin)
    if (modoAdmin) {
      popupContent += `
        <button class="btn-eliminar-admin" data-id="${p.id}" style="margin-top:6px;background:#d32f2f;color:white;border:none;padding:6px 12px;border-radius:6px;cursor:pointer;font-weight:bold;width:100%;">
          🗑️ Eliminar punto
        </button>
      `;
    }

    // Distancia
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
      // Botón ofrecimiento infantil
      const btnOfrecerse = document.querySelector(`.btn-ofrecerse-infantil[data-id="${p.id}"]`);
      if (btnOfrecerse) {
        btnOfrecerse.addEventListener('click', function(e) {
          e.stopPropagation();
          mostrarFormularioVoluntarioInfantil(p.id);
        });
      }
      // Botón navegación
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

// --- 5. FUNCIONES ADMIN: ELIMINAR Y MARCAR RECOGIDO ---
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

// --- 6. GEOLOCALIZACIÓN ---
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

// --- 7. UTILIDADES ---
function calcularDistancia(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ============================================================
// MAPAVIDA - APP COMPLETA
// PARTE 2: INTERACCIÓN, FORMULARIOS, NAVEGACIÓN
// ============================================================

// --- 8. SELECCIÓN EN EL MAPA ---
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

// --- 9. MENÚ Y FORMULARIO ---
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

// Botón administrador
btnAdmin.addEventListener('click', function() {
  const pass = prompt('Ingresa la contraseña de administrador:');
  if (pass === ADMIN_PASSWORD) {
    modoAdmin = true;
    btnAdmin.textContent = '🔓 Administrador activo';
    btnAdmin.style.background = '#2e7d32';
    document.getElementById('btnEliminar').style.display = 'block';
    aplicarFiltros();
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

// --- 10. GUARDAR ---
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

// --- 11. CANCELAR ---
btnCancelar.addEventListener('click', function() {
  // Si el formulario de voluntario está abierto, cancelarlo también
  const btnRegistro = document.getElementById('btnRegistrarVoluntario');
  if (btnRegistro) {
    // Ya se maneja desde el botón de cancelar del formulario de voluntario
    return;
  }
  formulario.style.display = 'none';
  desactivarSeleccion();
  ubicacionSeleccionada = null;
});

// --- 12. BUSCADOR ---
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

// --- 13. FILTROS ---
document.querySelectorAll('#filtros .filtro-btn').forEach(btn => {
  btn.addEventListener('click', function() {
    document.querySelectorAll('#filtros .filtro-btn').forEach(b => b.classList.remove('activo'));
    this.classList.add('activo');
    filtroActivo = this.dataset.tipo;
    aplicarFiltros();
  });
});

// --- 14. FORMULARIO DE VOLUNTARIO INFANTIL ---
function mostrarFormularioVoluntarioInfantil(puntoId) {
  const punto = todosLosPuntos.find(p => p.id === puntoId);
  if (!punto) return;

  const html = `
    <h3 style="color:#FF6F00;">🧸 Ofrecerse como voluntario</h3>
    <p style="font-size:14px;color:#555;margin-bottom:12px;">
      Para garantizar la seguridad de los niños, completa todos los campos obligatorios.
    </p>
    <label>Nombre completo (2 nombres y 2 apellidos) *</label>
    <input type="text" id="v_nombre" required />

    <label>Número de cédula *</label>
    <input type="text" id="v_cedula" required />

    <label>Enlace a foto de la cédula (URL) *</label>
    <input type="text" id="v_foto_cedula" placeholder="https://..." required />

    <label>Enlace a foto actualizada (URL) *</label>
    <input type="text" id="v_foto_personal" placeholder="https://..." required />

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

  const formTitulo = document.getElementById('formTitulo');
  const camposDinamicos = document.getElementById('camposDinamicos');
  
  formTitulo.innerHTML = '🧸 Registro de voluntario infantil';
  camposDinamicos.innerHTML = html;
  formulario.style.display = 'block';
  
  document.getElementById('btnGuardar').style.display = 'none';
  document.getElementById('btnEliminar').style.display = 'none';
  document.getElementById('btnCancelar').style.display = 'none';

  document.getElementById('btnRegistrarVoluntario').addEventListener('click', function() {
    const nombre = document.getElementById('v_nombre').value.trim();
    const cedula = document.getElementById('v_cedula').value.trim();
    const foto_cedula = document.getElementById('v_foto_cedula').value.trim();
    const foto_personal = document.getElementById('v_foto_personal').value.trim();
    const telefono = document.getElementById('v_telefono').value.trim();
    const rol = document.getElementById('v_rol').value.trim() || 'Voluntario';
    const mensaje = document.getElementById('v_mensaje').value.trim() || 'Estamos aquí para cuidarte y protegerte.';

    if (!nombre || !cedula || !foto_cedula || !foto_personal) {
      alert('❌ Todos los campos con * son obligatorios');
      return;
    }

    const punto = todosLosPuntos.find(p => p.id === puntoId);
    if (!punto) return;
    if (!punto.informacion.voluntarios_infantiles) {
      punto.informacion.voluntarios_infantiles = [];
    }
    punto.informacion.voluntarios_infantiles.push({
      nombre, cedula, foto_cedula, foto_personal, telefono, rol, mensaje
    });
    guardarPuntos();
    alert('✅ Te has registrado como voluntario para actividades infantiles. ¡Gracias por tu ayuda!');
    formulario.style.display = 'none';
    document.getElementById('btnGuardar').style.display = 'block';
    document.getElementById('btnCancelar').style.display = 'block';
    aplicarFiltros();
  });

  document.getElementById('btnCancelarVoluntario').addEventListener('click', function() {
    formulario.style.display = 'none';
    document.getElementById('btnGuardar').style.display = 'block';
    document.getElementById('btnCancelar').style.display = 'block';
  });
}

// --- 15. NAVEGACIÓN (RUTA HASTA UN PUNTO) ---
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
  if (controlRuta) {
    map.removeControl(controlRuta);
    controlRuta = null;
  }

  controlRuta = L.Routing.control({
    waypoints: [
      L.latLng(origen.lat, origen.lng),
      L.latLng(destino.lat, destino.lng)
    ],
    routeWhileDragging: true,
    showAlternatives: false,
    lineOptions: {
      styles: [{ color: '#E53935', weight: 5, opacity: 0.8 }],
      extendToWaypoints: false,
      missingRouteTolerance: 0
    },
    altLineOptions: {
      styles: [{ color: '#1976D2', weight: 3, opacity: 0.4 }]
    },
    router: L.Routing.osrmv1({
      serviceUrl: 'https://router.project-osrm.org/route/v1'
    }),
    plan: L.Routing.plan([
      L.latLng(origen.lat, origen.lng),
      L.latLng(destino.lat, destino.lng)
    ], {
      createMarker: function(i, wp) {
        if (i === 0) {
          return L.marker(wp.latLng, {
            icon: L.divIcon({
              html: '<div style="background:#1a73e8;border-radius:50%;width:16px;height:16px;border:3px solid white;box-shadow:0 0 10px rgba(26,115,232,0.6);"></div>',
              iconSize: [16, 16]
            })
          }).bindPopup('📍 Origen');
        } else {
          return L.marker(wp.latLng, {
            icon: L.divIcon({
              html: `<div style="background:#E53935;border-radius:50%;width:20px;height:20px;border:3px solid white;box-shadow:0 0 10px rgba(229,57,53,0.6);display:flex;align-items:center;justify-content:center;font-size:12px;color:white;font-weight:bold;">🏁</div>`,
              iconSize: [20, 20]
            })
          }).bindPopup(`📍 ${nombreDestino}`);
        }
      }
    }),
    createMarker: function() { return null; },
    fitSelectedRoutes: true,
    show: true
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
  if (controlRuta) {
    map.removeControl(controlRuta);
    controlRuta = null;
  }
  modoNavegacion = false;
  document.getElementById('btnCancelarNavegacion').style.display = 'none';
  alert('🧭 Navegación cancelada');
}

// --- 16. MOSTRAR BOTÓN ADMIN Y INICIO ---
document.addEventListener('DOMContentLoaded', function() {
  document.getElementById('btnAdmin').style.display = 'block';
});

cargarPuntos();
obtenerUbicacion();

console.log('✅ App completa con definiciones, protección infantil y navegación');
