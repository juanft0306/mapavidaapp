// ============================================================
// firebase.js - CONEXIÓN Y SERVICIOS PARA FIREBASE
// ============================================================

// 1. Configuración de Firebase (reemplaza con tus datos)
const firebaseConfig = {
  apiKey: "AIzaSyBEvms5sGlH5VoyzueGji1Hie9CZSy7mF0",  // <--- REEMPLAZA
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
  // Guardamos en la ruta 'puntos' de la base de datos
  return database.ref('puntos').set(puntos);
}

// 4. Función para CARGAR puntos desde Firebase
function cargarPuntosDesdeFirebase() {
  return database.ref('puntos').once('value');
}

// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

