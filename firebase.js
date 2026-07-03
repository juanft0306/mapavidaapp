import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getDatabase, ref, set, onValue } from "firebase/database";

const firebaseConfig = {
  apiKey: "AlzaSyBEvms5GlH5VoyzueGjiH1ie9CZSY7mf0",
  authDomain: "mapavidaapp.firebaseapp.com",
  databaseURL: "https://mapavidaapp-default-rtdb.firebaseio.com",
  projectId: "mapavidaapp",
  storageBucket: "mapavidaapp.appspot.com",
  messagingSenderId: "520208807974",
  appId: "1:520208807974:web:d3c4ae19f4eb4a576ccee7",
  measurementId: "G-SJFX734LHK"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const database = getDatabase(app);

export function guardarPuntosEnFirebase(puntos) {
  return set(ref(database, 'puntos'), puntos);
}

export function cargarPuntosDesdeFirebase() {
  return onValue(ref(database, 'puntos'), (snapshot) => {
    return snapshot.val();
  });
}

export function escucharCambios(callback) {
  return onValue(ref(database, 'puntos'), (snapshot) => {
    callback(snapshot.val());
  });
}
