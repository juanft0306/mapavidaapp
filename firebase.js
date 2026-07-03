// ============================================================
// firebase.js - CONEXIÓN Y SERVICIOS PARA FIREBASE
// ============================================================

// 1. Configuración de Firebase (RELLENA CON TUS DATOS)
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBEvms5sGlH5VoyzueGji1Hie9CZSy7mF0",
  authDomain: "mapavidaapp.firebaseapp.com",
  databaseURL: "https://mapavidaapp-default-rtdb.firebaseio.com",
  projectId: "mapavidaapp",
  storageBucket: "mapavidaapp.firebasestorage.app",
  messagingSenderId: "520208807974",
  appId: "1:520208807974:web:d3c4ae19f4eb4a576ccee7",
  measurementId: "G-SJPX734LHK"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

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
