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

// 4. NUEVA FUNCIÓN: Cargar puntos desde Supabase (si localStorage está vacío)
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
    console.log(`✅ ${puntos.length} puntos cargados desde la nube`);
    return puntos;
}

// 5. SOBRESCRIBIR 'cargarPuntos' de app.js
const cargarPuntosOriginal = window.cargarPuntos; // guardamos por si acaso

window.cargarPuntos = async function() {
    // Intentar cargar desde localStorage primero
    const stored = localStorage.getItem('puntosMapaVida');
    let puntos = [];
    let desdeNube = false;

    if (stored) {
        try {
            puntos = JSON.parse(stored);
            console.log('📂 Datos cargados desde localStorage');
        } catch (e) {
            puntos = [];
        }
    }

    // Si no hay datos locales, o si queremos forzar sincronización, ir a la nube
    if (puntos.length === 0) {
        console.log('☁️ No hay datos locales, cargando desde Supabase...');
        puntos = await cargarPuntosDesdeSupabase();
        if (puntos.length > 0) {
            // Guardar en localStorage para futuras cargas rápidas
            localStorage.setItem('puntosMapaVida', JSON.stringify(puntos));
            console.log('💾 Datos de la nube guardados localmente');
        } else {
            // Si la nube está vacía, crear un punto de ejemplo (opcional)
            // Puedes comentar esta parte si ya tienes datos en la nube
            if (localStorage.getItem('puntosMapaVida') === null) {
                const puntoEjemplo = {
                    id: Date.now().toString(),
                    tipo: 'refugio',
                    nombre: 'Refugio Ejemplo',
                    lat: 10.4910,
                    lng: -66.8730,
                    informacion: {
                        direccion: 'Av. Principal',
                        cupo: 100,
                        necesidades: ['Agua', 'Comida'],
                        estado: 'aprobado',
                        fecha_creacion: new Date().toLocaleString(),
                        fecha_edicion: new Date().toLocaleString()
                    }
                };
                puntos = [puntoEjemplo];
                localStorage.setItem('puntosMapaVida', JSON.stringify(puntos));
                // También subirlo a la nube para que otros dispositivos lo vean
                await guardarPuntosEnNube(puntos);
            }
        }
    }

    // Asignar a la variable global de app.js
    window.todosLosPuntos = puntos;
    // Aplicar filtros para mostrar en el mapa
    if (typeof aplicarFiltros === 'function') {
        aplicarFiltros();
    }
    console.log('✅ Puntos cargados y mapa actualizado');
};

// 6. SOBRESCRIBIR 'guardarPuntos' de app.js
const guardarPuntosOriginal = window.guardarPuntos;

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

// 7. (Opcional) Forzar sincronización completa desde la nube
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

// 8. Ejecutar la carga al iniciar (sustituye a la llamada original en app.js)
// app.js llama a cargarPuntos() al final, pero como la sobrescribimos, se usará nuestra versión.
console.log('🔄 sync.js cargado. Las funciones de guardado/carga ahora usan Supabase.');
