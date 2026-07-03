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
