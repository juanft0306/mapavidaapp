// ============================================================
// sync.js - VERSIÓN SIMPLIFICADA: SIEMPRE USA SUPABASE
// ============================================================

// 1. Verificar que el cliente de Supabase esté disponible
if (typeof supabaseClient === 'undefined') {
    console.error('❌ supabaseClient no definido. Revisa que supabase.js esté cargado.');
}

// 2. Convertir punto de app.js a formato Supabase
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

// 3. Convertir de Supabase a formato app.js
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

// 4. CARGAR PUNTOS DESDE SUPABASE (siempre)
async function cargarPuntos() {
    console.log('🔄 Cargando desde Supabase...');
    
    try {
        const { data, error } = await supabaseClient
            .from('puntos')
            .select('*')
            .order('id', { ascending: true });

        if (error) {
            console.error('❌ Error al cargar:', error);
            // Si hay error, intentar cargar desde localStorage como respaldo
            const stored = localStorage.getItem('puntosMapaVida');
            if (stored) {
                try {
                    window.todosLosPuntos = JSON.parse(stored);
                    console.log('📂 Usando respaldo local');
                } catch (e) {
                    window.todosLosPuntos = [];
                }
            }
        } else {
            // Convertir datos
            const puntos = data.map(puntoDesdeSupabase);
            window.todosLosPuntos = puntos;
            // Guardar en localStorage como respaldo
            localStorage.setItem('puntosMapaVida', JSON.stringify(puntos));
            console.log(`☁️ ${puntos.length} puntos cargados desde la nube`);
        }
    } catch (e) {
        console.error('❌ Excepción al cargar:', e);
        // Fallback: usar localStorage
        const stored = localStorage.getItem('puntosMapaVida');
        if (stored) {
            try {
                window.todosLosPuntos = JSON.parse(stored);
                console.log('📂 Usando respaldo local (excepción)');
            } catch (e2) {
                window.todosLosPuntos = [];
            }
        }
    }

    // Si no hay puntos, crear uno de ejemplo
    if (!window.todosLosPuntos || window.todosLosPuntos.length === 0) {
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
        window.todosLosPuntos = [puntoEjemplo];
        // Guardar en localStorage y subir a nube
        localStorage.setItem('puntosMapaVida', JSON.stringify(window.todosLosPuntos));
        try {
            await guardarPuntosEnNube(window.todosLosPuntos);
            console.log('☁️ Punto de ejemplo subido a la nube');
        } catch (e) {
            console.warn('⚠️ No se pudo subir el punto de ejemplo:', e);
        }
    }

    // Mostrar en el mapa
    if (typeof aplicarFiltros === 'function') {
        aplicarFiltros();
    }
    console.log('✅ Carga finalizada');
}

// 5. GUARDAR PUNTOS EN SUPABASE (siempre)
window.guardarPuntos = async function() {
    // Guardar localmente como respaldo
    localStorage.setItem('puntosMapaVida', JSON.stringify(window.todosLosPuntos));
    console.log('💾 Guardado local');

    // Subir a la nube
    try {
        const puntosParaSubir = window.todosLosPuntos.map(puntoParaSupabase);
        const { data, error } = await supabaseClient
            .from('puntos')
            .upsert(puntosParaSubir, { onConflict: 'id' });

        if (error) {
            console.error('❌ Error al guardar en Supabase:', error);
            alert('⚠️ Error al guardar en la nube. Revisa tu conexión.');
        } else {
            console.log('☁️ Datos sincronizados con la nube');
        }
    } catch (e) {
        console.warn('⚠️ No se pudo sincronizar:', e);
        alert('⚠️ No se pudo conectar con la nube. Los datos están guardados localmente.');
    }
};

// 6. Sobrescribir la función de app.js para que NO se ejecute
const originalCargarPuntos = window.cargarPuntos;
window.cargarPuntos = function() {
    console.log('⏳ Carga delegada a sync.js');
};

// 7. Ejecutar la carga después de que app.js termine
window.addEventListener('load', async function() {
    // Restaurar la función real
    window.cargarPuntos = cargarPuntos;
    await cargarPuntos();
});

console.log('🔄 sync.js cargado. App usando Supabase como fuente principal.');
