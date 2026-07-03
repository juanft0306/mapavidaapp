// ============================================================
// supabase.js - CONEXIÓN Y SERVICIOS PARA SUPABASE
// ============================================================

// 1. IMPORTAR LA LIBRERÍA (usando CDN, igual que en tu index.html)
//    Ya tienes la URL en tu service worker, la usamos aquí también.
const SUPABASE_URL = 'https://gtaadqluoljexglenbqo.supabase.co'; // <--- REEMPLAZA CON TU PROJECT URL
const SUPABASE_ANON_KEY = 'sb_publishable_n_h1fN6QWuEWbFxrCTKFvQ_rxw-o9-Y'; // <--- REEMPLAZA CON TU ANON PUBLIC KEY

// 2. CREAR EL CLIENTE DE SUPABASE
//    Este es el objeto que usaremos para todas las operaciones.
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ============================================================
// FUNCIONES PARA INTERACTUAR CON LA NUBE
// ============================================================

// --- GUARDAR PUNTOS EN SUPABASE ---
async function guardarPuntosEnNube(puntos) {
    // Convertimos el array de puntos a un formato que Supabase entienda.
    // Supabase espera un array de objetos con las mismas columnas que creamos.
    const puntosParaSubir = puntos.map(p => ({
        id: parseInt(p.id), // Supabase usa número, tu app usa string
        tipo: p.tipo,
        nombre: p.nombre,
        lat: p.lat,
        lng: p.lng,
        informacion: p.informacion // Se guarda automáticamente como JSON
    }));

    // Usamos 'upsert' para insertar o actualizar si ya existe
    const { data, error } = await supabaseClient
        .from('puntos')
        .upsert(puntosParaSubir, { onConflict: 'id' });

    if (error) {
        console.error('❌ Error al guardar en Supabase:', error);
        return false;
    }
    console.log('✅ Datos guardados en Supabase:', data);
    return true;
}

// --- CARGAR PUNTOS DESDE SUPABASE ---
async function cargarPuntosDesdeNube() {
    const { data, error } = await supabaseClient
        .from('puntos')
        .select('*');

    if (error) {
        console.error('❌ Error al cargar desde Supabase:', error);
        return [];
    }
    console.log('✅ Datos cargados desde Supabase:', data.length, 'puntos');
    return data;
}

// --- SINCRONIZAR: Guardar local y luego en la nube ---
async function sincronizarConNube(puntos) {
    // Primero guardamos en localStorage (tu método actual)
    localStorage.setItem('puntosMapaVida', JSON.stringify(puntos));
    
    // Luego enviamos a la nube en segundo plano
    try {
        await guardarPuntosEnNube(puntos);
    } catch (e) {
        console.warn('⚠️ No se pudo sincronizar con la nube, los datos están seguros localmente.');
    }
}
