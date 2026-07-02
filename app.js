// ============================================================
// 1. CONFIGURACIÓN SUPABASE (¡REEMPLAZA TU CLAVE!)
// ============================================================
const SUPABASE_URL = 'https://gtaadqluoljexglenbqo.supabase.co';
const SUPABASE_ANON_KEY = 'TU_CLAVE_ANON_AQUI'; // <-- PON AQUÍ TU CLAVE REAL
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ============================================================
// 2. MAPA Y CONTROLES
// ============================================================
const map = L.map('map').setView([10.4806, -66.9036], 12);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: 'MapaVida'
}).addTo(map);

// Variables globales
let todosLosPuntos = [];
let markersLayer = L.layerGroup().addTo(map);
let ubicacionUsuario = null;
let markerUsuario = null;
let ubicacionSeleccionada = null;
let markerSeleccion = null;
let tipoSeleccionado = null;
let filtroActivo = 'todos';

// Ocultar loader
document.getElementById('cargando').style.display = 'none';

// ============================================================
// 3. DEFINICIÓN DE TIPOS (colores, iconos, campos, lógica)
// ============================================================
const TIPOS = {
  refugio: {
    label: 'Refugio', color: '#2E7D32', icono: '🏠',
    campos: [
      { id: 'nombre', label: 'Nombre del refugio *', type: 'text', required: true },
      { id: 'direccion', label: 'Dirección', type: 'text', required: false },
      { id: 'cupo', label: 'Cupo disponible (personas)', type: 'number', required: false },
      { id: 'necesita', label: '¿Qué necesitan? (separado por comas)', type: 'textarea', required: false }
    ],
    procesar: (d) => ({ cupo: parseInt(d.cupo)||0, necesita: d.necesita?d.necesita.split(',').map(s=>s.trim()).filter(Boolean):[] }),
    popup: (info) => {
      let h = `<div class="popup-info">👥 Cupo: ${info.cupo||'N/E'}</div>`;
      if (info.necesita?.length) h += `<div class="popup-info">📦 Necesitan: ${info.necesita.join(', ')}</div>`;
      return h;
    }
  },
  centro_acopio: {
    label: 'Centro de acopio', color: '#F57C00', icono: '📦',
    campos: [
      { id: 'nombre', label: 'Nombre del centro *', type: 'text', required: true },
      { id: 'direccion', label: 'Dirección', type: 'text', required: false },
      { id: 'necesarios', label: 'Insumos necesarios (separados por comas)', type: 'textarea', required: false },
      { id: 'suficientes', label: 'Insumos ya suficientes (separados por comas)', type: 'textarea', required: false }
    ],
    procesar: (d) => ({
      necesita: d.necesarios?d.necesarios.split(',').map(s=>s.trim()).filter(Boolean):[],
      suficientes: d.suficientes?d.suficientes.split(',').map(s=>s.trim()).filter(Boolean):[]
    }),
    popup: (info) => {
      let h = '';
      if (info.necesita?.length) h += `<div class="popup-info">⚠️ Necesitan: ${info.necesita.join(', ')}</div>`;
      if (info.suficientes?.length) h += `<div class="popup-info">✅ Ya tienen: ${info.suficientes.join(', ')}</div>`;
      return h;
    }
  },
  hospital: {
    label: 'Hospital', color: '#1976D2', icono: '🏥',
    campos: [
      { id: 'nombre', label: 'Nombre del hospital *', type: 'text', required: true },
      { id: 'direccion', label: 'Dirección', type: 'text', required: false },
      { id: 'medicamentos', label: 'Medicamentos necesarios (separados por comas)', type: 'textarea', required: false },
      { id: 'sangre', label: '¿Necesitan donaciones de sangre?', type: 'select', options: ['No', 'Sí'], required: false }
    ],
    procesar: (d) => ({ medicamentos: d.medicamentos?d.medicamentos.split(',').map(s=>s.trim()).filter(Boolean):[], necesita_sangre: d.sangre==='Sí' }),
    popup: (info) => {
      let h = '';
      if (info.medicamentos?.length) h += `<div class="popup-info">💊 Medicamentos: ${info.medicamentos.join(', ')}</div>`;
      if (info.necesita_sangre) h += `<div class="popup-info" style="color:#d32f2f;">🩸 ¡Urgen donaciones de sangre!</div>`;
      return h;
    }
  },
  edificio_caido: {
    label: 'Edificio caído', color: '#C62828', icono: '💥',
    campos: [
      { id: 'nombre', label: 'Ubicación / referencia *', type: 'text', required: true },
      { id: 'apoyo', label: '¿Qué apoyo necesitan? (ej: agua, comida, escombros)', type: 'textarea', required: false }
    ],
    procesar: (d) => ({ apoyo: d.apoyo?d.apoyo.split(',').map(s=>s.trim()).filter(Boolean):[] }),
    popup: (info) => {
      let h = `<div class="popup-info" style="color:#C62828;">⚠️ Edificio colapsado</div>`;
      if (info.apoyo?.length) h += `<div class="popup-info">🛠️ Necesitan: ${info.apoyo.join(', ')}</div>`;
      return h;
    }
  },
  peligro_derrumbe: {
    label: 'Peligro de derrumbe', color: '#E65100', icono: '⚠️',
    campos: [
      { id: 'nombre', label: 'Ubicación / referencia *', type: 'text', required: true },
      { id: 'advertencia', label: 'Advertencia adicional (opcional)', type: 'textarea', required: false }
    ],
    procesar: (d) => ({ advertencia: d.advertencia || 'Manténgase alejado, estructura inestable' }),
    popup: (info) => `<div class="popup-advertencia">⚠️ ${info.advertencia}</div>`
  },
  sin_inspeccionar: {
    label: 'Sin inspeccionar', color: '#6A1B9A', icono: '❓',
    campos: [
      { id: 'nombre', label: 'Ubicación / referencia *', type: 'text', required: true },
      { id: 'nota', label: 'Nota adicional (opcional)', type: 'textarea', required: false }
    ],
    procesar: (d) => ({ mensaje: d.nota || 'Estructura no ha sido inspeccionada por personal autorizado' }),
    popup: (info) => `<div class="popup-info" style="color:#6A1B9A;">❓ ${info.mensaje}</div>`
  },
  veterinaria: {
    label: 'Atención veterinaria', color: '#00897B', icono: '🐾',
    campos: [
      { id: 'nombre', label: 'Nombre del centro veterinario *', type: 'text', required: true },
      { id: 'direccion', label: 'Dirección', type: 'text', required: false },
      { id: 'servicios', label: 'Servicios que ofrecen (separados por comas)', type: 'textarea', required: false },
      { id: 'emergencia', label: '¿Atienden emergencias 24h?', type: 'select', options: ['No', 'Sí'], required: false }
    ],
    procesar: (d) => ({
      servicios: d.servicios?d.servicios.split(',').map(s=>s.trim()).filter(Boolean):[],
      emergencia_24h: d.emergencia === 'Sí'
    }),
    popup: (info) => {
      let h = '';
      if (info.servicios?.length) h += `<div class="popup-info">🩺 Servicios: ${info.servicios.join(', ')}</div>`;
      if (info.emergencia_24h) h += `<div class="popup-info" style="color:#00897B;">🕐 Atención 24h</div>`;
      return h;
    }
  }
};

// ============================================================
// 4. FUNCIONES DE CARGA Y VISUALIZACIÓN
// ============================================================
async function cargarPuntos() {
  try {
    const { data, error } = await supabase.from('puntos').select('*');
    if (error) throw error;
    todosLosPuntos = data || [];
    localStorage.setItem('puntosCache', JSON.stringify(todosLosPuntos));
    aplicarFiltros();
  } catch (error) {
    const cached = localStorage.getItem('puntosCache');
    if (cached) { todosLosPuntos = JSON.parse(cached); aplicarFiltros(); }
    else alert('No hay datos. Conéctate a internet.');
  }
}

function aplicarFiltros() {
  const filtrados = filtroActivo === 'todos'
    ? todosLosPuntos
    : todosLosPuntos.filter(p => p.tipo === filtroActivo);
  mostrarPuntos(filtrados);
  // Si hay ubicación del usuario, recalcular distancias y recomendar
  if (ubicacionUsuario) {
    const conDistancia = filtrados.map(p => ({
      ...p,
      distancia: calcularDistancia(ubicacionUsuario.lat, ubicacionUsuario.lng, p.lat, p.lng)
    }));
    conDistancia.sort((a,b) => a.distancia - b.distancia);
    const cercanos = conDistancia.slice(0, 5);
    // Mostrar recomendación en la consola (puedes adaptarlo)
    console.log('📍 Más cercanos:', cercanos.map(p => `${p.nombre} (${p.distancia.toFixed(2)} km)`));
  }
}

function mostrarPuntos(puntos) {
  markersLayer.clearLayers();
  puntos.forEach(p => {
    const tipo = TIPOS[p.tipo];
    if (!tipo) return;
    const icono = L.divIcon({
      html: `<div style="background:${tipo.color};color:white;border-radius:50%;width:34px;height:34px;display:flex;align-items:center;justify-content:center;font-size:18px;border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);">${tipo.icono}</div>`,
      iconSize: [34, 34],
      className: ''
    });
    let popupContent = `
      <div class="popup-tipo">${tipo.icono} ${tipo.label}</div>
      <strong>${p.nombre}</strong><br>
      ${p.informacion?.direccion ? p.informacion.direccion + '<br>' : ''}
      ${tipo.popup(p.informacion || {})}
    `;
    // Si hay ubicación del usuario, mostrar distancia
    if (ubicacionUsuario) {
      const dist = calcularDistancia(ubicacionUsuario.lat, ubicacionUsuario.lng, p.lat, p.lng);
      popupContent += `<div class="popup-distancia">📍 ${dist.toFixed(2)} km de ti</div>`;
    }
    L.marker([p.lat, p.lng], { icon: icono })
      .bindPopup(popupContent)
      .addTo(markersLayer);
  });
}

// ============================================================
// 5. GEOLOCALIZACIÓN (GPS)
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
// 6. SELECCIÓN EN EL MAPA (primero tocar, luego formulario)
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
  // Desactivar selección y mostrar formulario
  map.off('click', onMapClick);
  map.getContainer().style.cursor = '';
  mostrarFormulario(tipoSeleccionado);
}

// ============================================================
// 7. MENÚ Y FORMULARIO
// ============================================================
const menuOpciones = document.getElementById('menuOpciones');
const btnAgregar = document.getElementById('btnAgregar');
const formulario = document.getElementById('formulario');
const formTitulo = document.getElementById('formTitulo');
const camposDinamicos = document.getElementById('camposDinamicos');
const fLatDisplay = document.getElementById('fLatDisplay');
const fLngDisplay = document.getElementById('fLngDisplay');
const btnGuardar = document.getElementById('btnGuardar');
const btnCancelar = document.getElementById('btnCancelar');

// Mostrar/ocultar menú
btnAgregar.addEventListener('click', function(e) {
  e.stopPropagation();
  menuOpciones.style.display = (menuOpciones.style.display === 'flex') ? 'none' : 'flex';
});
document.addEventListener('click', function() { menuOpciones.style.display = 'none'; });

// Seleccionar tipo del menú
document.querySelectorAll('#menuOpciones button').forEach(btn => {
  btn.addEventListener('click', function(e) {
    e.stopPropagation();
    const tipo = this.dataset.tipo;
    tipoSeleccionado = tipo;
    menuOpciones.style.display = 'none';
    activarSeleccion();
    const msg = `Toca el mapa para ubicar el ${TIPOS[tipo].label.toLowerCase()}`;
    alert(msg);
  });
});

// ============================================================
// 8. MOSTRAR FORMULARIO CON CAMPOS DINÁMICOS
// ============================================================
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
}

// ============================================================
// 9. GUARDAR
// ============================================================
btnGuardar.addEventListener('click', async function() {
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

  const { error } = await supabase
    .from('puntos')
    .insert([{
      tipo: tipoSeleccionado,
      nombre: datos.nombre,
      lat: ubicacionSeleccionada.lat,
      lng: ubicacionSeleccionada.lng,
      informacion: informacion
    }]);

  if (error) {
    alert('❌ Error: ' + error.message);
  } else {
    alert('✅ Punto guardado');
    formulario.style.display = 'none';
    desactivarSeleccion();
    ubicacionSeleccionada = null;
    cargarPuntos();
  }
});

// ============================================================
// 10. CANCELAR
// ============================================================
btnCancelar.addEventListener('click', function() {
  formulario.style.display = 'none';
  desactivarSeleccion();
  ubicacionSeleccionada = null;
});

// ============================================================
// 11. BUSCADOR (Nominatim)
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
// 12. FILTROS
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
// 13. UTILIDADES
// ============================================================
function calcularDistancia(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// ============================================================
// 14. INICIO
// ============================================================
cargarPuntos();
obtenerUbicacion();
