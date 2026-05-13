import firebase from "firebase/compat/app";
import "firebase/compat/auth";
import "firebase/compat/firestore";
import "firebase/compat/storage";

// COLAR AQUI A STRING DE CONEXÃO
const firebaseConfig = {
  apiKey: "AIzaSyAzb3sNSQTIC3qtp2zZ4798UDkQfiKe3mE",
  authDomain: "info-63d45.firebaseapp.com",
  projectId: "info-63d45",
  storageBucket: "info-63d45.firebasestorage.app",
  messagingSenderId: "501437748070",
  appId: "1:501437748070:web:ed50c12474c6168fb52ea7",  
};
  
  
// INICIALIZAR O FIREBASE
let app;
if (firebase.apps.length == 0) {
    app = firebase.initializeApp(firebaseConfig);
} else {
    app = firebase.app();
}

const auth = firebase.auth();
const firestore = firebase.firestore();
const storage = firebase.storage();
export { auth, firestore, storage };