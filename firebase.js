// ============================================================
// firebase.js - CONEXIÓN Y SERVICIOS PARA FIREBASE
// ============================================================

// 1. Configuración de Firebase (RELLENA CON TUS DATOS)
const firebaseConfig = {
  apiKey: "AIzaSyBEvms5sGlH5VoyzueGji1Hie9CZSy7mF0", // <--- PON AQUÍ TU API KEY
  authDomain: "mapavida-app.firebaseapp.com",
  databaseURL: "https://mapavida-app-default-rtdb.firebaseio.com",
  projectId: "mapavida-app",
  storageBucket: "mapavida-app.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};

// 2. Inicializar Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// 3. Función para GUARDAR puntos en Firebase
function guardarPuntosEnFirebase(puntos) {
  return database.ref('puntos').set(puntos);
}

// 4. Función para CARGAR puntos desde Firebase
function cargarPuntosDesdeFirebase() {
  return database.ref('puntos').once('value');
}

// 5. (Opcional) Escuchar cambios en tiempo real
function escucharCambios(callback) {
  database.ref('puntos').on('value', (snapshot) => {
    const data = snapshot.val();
    callback(data);
  });
}
