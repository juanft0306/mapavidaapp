// ============================================================
// sync.js - SINCRONIZACIÓN CON FIREBASE
// ============================================================

// 1. Verificar que Firebase esté disponible
if (typeof firebase === 'undefined' || typeof database === 'undefined') {
    console.error('❌ Firebase no está definido. Revisa firebase.js');
}

// 2. Convertir puntos a formato simple (ya es compatible)
// No necesitamos conversión, pero la dejamos por si acaso

// 3. CARGAR PUNTOS DESDE FIREBASE (siempre)
async function cargarPuntos() {
    console.log('🔄 Cargando desde Firebase...');
    
    try {
        const snapshot = await cargarPuntosDesdeFirebase();
        const puntos = snapshot.val();

        if (puntos) {
            // Convertir el objeto a array si viene como objeto con claves
            if (!Array.isArray(puntos)) {
                window.todosLosPuntos = Object.values(puntos);
            } else {
                window.todosLosPuntos = puntos;
            }
            // Guardar en localStorage como respaldo
            localStorage.setItem('puntosMapaVida', JSON.stringify(window.todosLosPuntos));
            console.log(`☁️ ${window.todosLosPuntos.length} puntos cargados desde Firebase`);
        } else {
            // Si no hay datos en Firebase, intentar localStorage
            const stored = localStorage.getItem('puntosMapaVida');
            if (stored) {
                try {
                    window.todosLosPuntos = JSON.parse(stored);
                    console.log('📂 Usando respaldo local');
                } catch (e) {
                    window.todosLosPuntos = [];
                }
            }
            // Si todo está vacío, crear punto de ejemplo
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
                localStorage.setItem('puntosMapaVida', JSON.stringify(window.todosLosPuntos));
                // Subir a Firebase
                await guardarPuntosEnFirebase(window.todosLosPuntos);
                console.log('☁️ Punto de ejemplo subido a Firebase');
            }
        }
    } catch (e) {
        console.error('❌ Error al cargar desde Firebase:', e);
        // Fallback: usar localStorage
        const stored = localStorage.getItem('puntosMapaVida');
        if (stored) {
            try {
                window.todosLosPuntos = JSON.parse(stored);
                console.log('📂 Usando respaldo local (error)');
            } catch (e2) {
                window.todosLosPuntos = [];
            }
        }
    }

    // Mostrar en el mapa
    if (typeof aplicarFiltros === 'function') {
        aplicarFiltros();
    }
    console.log('✅ Carga finalizada');
}

// 4. GUARDAR PUNTOS EN FIREBASE (siempre)
window.guardarPuntos = async function() {
    // Guardar localmente como respaldo
    localStorage.setItem('puntosMapaVida', JSON.stringify(window.todosLosPuntos));
    console.log('💾 Guardado local');

    // Subir a Firebase
    try {
        await guardarPuntosEnFirebase(window.todosLosPuntos);
        console.log('☁️ Datos sincronizados con Firebase');
    } catch (e) {
        console.warn('⚠️ No se pudo sincronizar con Firebase:', e);
        alert('⚠️ No se pudo conectar con Firebase. Los datos están guardados localmente.');
    }
};

// 5. Sobrescribir la función de app.js para que NO se ejecute
window.cargarPuntos = function() {
    console.log('⏳ Carga delegada a sync.js');
};

// 6. Ejecutar la carga después de que app.js termine
window.addEventListener('load', async function() {
    // Restaurar la función real
    window.cargarPuntos = cargarPuntos;
    await cargarPuntos();
});

console.log('🔄 sync.js cargado. App usando Firebase como fuente principal.');
