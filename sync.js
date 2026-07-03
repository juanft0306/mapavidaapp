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
        id: parseInt(punto.id),          // app.js usa string, Supabase usa BIGINT
        tipo: punto.tipo,
        nombre: punto.nombre,
        lat: punto.lat,
        lng: punto.lng,
        informacion: punto.informacion,   // objeto JSONB
        user_id: punto.user_id || null
    };
}

// 3. Función para convertir de Supabase a formato app.js
function puntoDesdeSupabase(data) {
    return {
        id: data.id.toString(),           // volver a string
        tipo: data.tipo,
        nombre: data.nombre,
        lat: data.lat,
        lng: data.lng,
        informacion: data.informacion,
        user_id: data.user_id
    };
}

// 4. Función: Cargar puntos desde Supabase
async function cargarPuntosDesdeSupabase() {
    const { data, error } = await supabaseClient
        .from('puntos')
        .select('*')
        .order('id', { ascending: true });

    if (error) {
        console.error('❌ Error al cargar desde Supabase:', error);
        return [];
    }

    // Convertir cada registro al formato de app.js
    const puntos = data.map(puntoDesdeSupabase);
    console.log(`☁️ ${puntos.length} puntos cargados desde la nube`);
    return puntos;
}

// 5. NUEVA FUNCIÓN: Cargar puntos (prioriza la nube)
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
                // Subir estos puntos a la nube para que otros los vean
                await guardarPuntosEnNube(puntos);
                console.log('☁️ Datos locales subidos a la nube');
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
            await guardarPuntosEnNube(puntos);
            window.todosLosPuntos = puntos;
            console.log('🆕 Punto de ejemplo creado y subido a la nube');
        }
    }

    // Aplicar filtros para mostrar en el mapa
    if (typeof aplicarFiltros === 'function') {
        aplicarFiltros();
    }
    console.log('✅ Carga finalizada');
}

// 6. SOBRESCRIBIR 'cargarPuntos' de app.js
window.cargarPuntos = cargarPuntos;

// 7. SOBRESCRIBIR 'guardarPuntos' de app.js
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

// 9. EJECUTAR LA CARGA AHORA MISMO (después de sobrescribir)
// Esto reemplaza la llamada original de app.js
setTimeout(async () => {
    await cargarPuntos();
}, 100); // Pequeño retraso para asegurar que todo esté cargado

console.log('🔄 sync.js cargado. Las funciones de guardado/carga ahora usan Supabase.');
