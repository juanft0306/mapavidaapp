// ============================================================
// sync.js - SOBRESCRIBE LAS FUNCIONES DE APP.JS PARA USAR SUPABASE
// ============================================================

// 1. Asegurar que el cliente de Supabase esté disponible
if (typeof supabaseClient === 'undefined') {
    console.error('❌ supabaseClient no definido. Asegúrate de cargar supabase.js antes que sync.js');
}

// 2. Función para convertir un punto de app.js a formato de tabla
function puntoParaSupabase(punto) {
    return {
        id: parseInt(punto.id),
        tipo: punto.tipo,
        nombre: punto.nombre,
        lat: punto.lat,
        lng: punto.lng,
        informacion: punto.informacion,
        user_id: punto.user_id || null
    };
}

// 3. Función para convertir de Supabase a formato app.js
function puntoDesdeSupabase(data) {
    return {
        id: data.id.toString(),
        tipo: data.tipo,
        nombre: data.nombre,
        lat: data.lat,
        lng: data.lng,
        informacion: data.informacion,
        user_id: data.user_id
    };
}

// 4. Función: Cargar puntos desde Supabase (con manejo de errores)
async function cargarPuntosDesdeSupabase() {
    try {
        const { data, error } = await supabaseClient
            .from('puntos')
            .select('*')
            .order('id', { ascending: true });

        if (error) {
            console.error('❌ Error al cargar desde Supabase:', error);
            return [];
        }
        const puntos = data.map(puntoDesdeSupabase);
        console.log(`☁️ ${puntos.length} puntos cargados desde la nube`);
        return puntos;
    } catch (e) {
        console.error('❌ Excepción al cargar desde Supabase:', e);
        return [];
    }
}

// 5. NUEVA FUNCIÓN: Cargar puntos (prioriza la nube, con manejo de errores)
async function cargarPuntos() {
    console.log('🔄 Iniciando carga de datos...');

    // Intentar cargar desde Supabase primero (fuente de verdad)
    let puntos = await cargarPuntosDesdeSupabase();

    if (puntos.length > 0) {
        // Si hay datos en la nube, guardarlos localmente y usarlos
        localStorage.setItem('puntosMapaVida', JSON.stringify(puntos));
        window.todosLosPuntos = puntos;
        console.log('✅ Datos cargados desde la nube');
    } else {
        // Si la nube está vacía, intentar cargar localStorage
        const stored = localStorage.getItem('puntosMapaVida');
        if (stored) {
            try {
                puntos = JSON.parse(stored);
                window.todosLosPuntos = puntos;
                console.log('📂 Datos cargados desde localStorage (nube vacía)');
                // Subir estos puntos a la nube para que otros los vean (con try-catch)
                try {
                    await guardarPuntosEnNube(puntos);
                    console.log('☁️ Datos locales subidos a la nube');
                } catch (e) {
                    console.warn('⚠️ No se pudieron subir a la nube:', e);
                }
            } catch (e) {
                puntos = [];
                console.warn('⚠️ Error al parsear localStorage:', e);
            }
        }

        // Si no hay nada, crear punto de ejemplo y guardarlo
        if (puntos.length === 0) {
            const puntoEjemplo = {
                id: Date.now().toString(),
                tipo: 'refugio',
                nombre: 'Refugio Ejemplo',
                lat: 10.4910,
                lng: -66.8730,
                informacion: {
                    direccion: 'Av. Principal',
                    cupo: 100,
                    necesidades: ['Agua', 'Comida', 'Colchonetas'],
                    estado: 'aprobado',
                    fecha_creacion: new Date().toLocaleString(),
                    fecha_edicion: new Date().toLocaleString()
                }
            };
            puntos = [puntoEjemplo];
            localStorage.setItem('puntosMapaVida', JSON.stringify(puntos));
            try {
                await guardarPuntosEnNube(puntos);
                console.log('☁️ Punto de ejemplo subido a la nube');
            } catch (e) {
                console.warn('⚠️ No se pudo subir el punto de ejemplo:', e);
            }
            window.todosLosPuntos = puntos;
            console.log('🆕 Punto de ejemplo creado');
        }
    }

    // Aplicar filtros para mostrar en el mapa
    if (typeof aplicarFiltros === 'function') {
        aplicarFiltros();
    } else {
        console.warn('⚠️ aplicarFiltros no está disponible');
    }
    console.log('✅ Carga finalizada');
}

// 6. SOBRESCRIBIR 'cargarPuntos' de app.js
window.cargarPuntos = cargarPuntos;

// 7. SOBRESCRIBIR 'guardarPuntos' de app.js (con manejo de errores)
window.guardarPuntos = async function() {
    // Primero guardar localmente (comportamiento original)
    localStorage.setItem('puntosMapaVida', JSON.stringify(window.todosLosPuntos));
    console.log('💾 Datos guardados en localStorage');

    // Luego subir a la nube en segundo plano
    try {
        const puntosParaSubir = window.todosLosPuntos.map(puntoParaSupabase);
        const { data, error } = await supabaseClient
            .from('puntos')
            .upsert(puntosParaSubir, { onConflict: 'id' });

        if (error) {
            console.error('❌ Error al guardar en Supabase:', error);
        } else {
            console.log('☁️ Datos sincronizados con la nube');
        }
    } catch (e) {
        console.warn('⚠️ No se pudo sincronizar con la nube (problema de red)', e);
    }
};

// 8. (Opcional) Forzar sincronización completa desde la nube
window.sincronizarDesdeNube = async function() {
    const puntos = await cargarPuntosDesdeSupabase();
    if (puntos.length > 0) {
        window.todosLosPuntos = puntos;
        localStorage.setItem('puntosMapaVida', JSON.stringify(puntos));
        if (typeof aplicarFiltros === 'function') {
            aplicarFiltros();
        }
        alert('✅ Sincronizado con la nube');
    } else {
        alert('ℹ️ La nube está vacía');
    }
};

// 9. EVITAR QUE APP.JS EJECUTE SU VERSIÓN ORIGINAL DE CARGAR PUNTOS
//    Reemplazamos la función original por una vacía para que no haga nada.
const originalCargarPuntos = window.cargarPuntos;
window.cargarPuntos = function() {
    console.log('⏳ Carga de app.js diferida por sync.js');
};

// Esperamos a que app.js termine y luego ejecutamos nuestra carga
window.addEventListener('load', async function() {
    // Restauramos nuestra función real
    window.cargarPuntos = cargarPuntos;
    await cargarPuntos();
});

console.log('🔄 sync.js cargado. La carga de puntos ha sido diferida.');
