// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app';
import { getAuth, signOut, GoogleAuthProvider, signInWithCredential } from 'firebase/auth';

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyAA1hrqYpKC6jcrjDyPtwKlDDpwDg4WM_U",
    authDomain: "icognition-app.firebaseapp.com",
    projectId: "icognition-app",
    storageBucket: "icognition-app.appspot.com",
    messagingSenderId: "1022378307371",
    appId: "1:1022378307371:web:43a550bd3efad3ea7f9f6e",
    measurementId: "G-M1H60J2J4T"
};

const firebase = initializeApp(firebaseConfig);
const auth = getAuth(firebase);
  
export { firebase, auth, signOut, GoogleAuthProvider, signInWithCredential}