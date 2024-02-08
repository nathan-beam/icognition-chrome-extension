// Import the functions you need from the SDKs you need
import firebase from 'firebase/compat/app';
import * as firebaseui from 'firebaseui'

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDNAL2iRK_otPM5dQfHA1lr_1EKEeq4ifo",
    authDomain: "strange-tome-412113.firebaseapp.com",
    projectId: "strange-tome-412113",
    storageBucket: "strange-tome-412113.appspot.com",
    messagingSenderId: "458477770208",
    appId: "1:458477770208:web:cf43ba4d23eb6c91d54785"
};
  
// Initialize Firebase
firebase.initializeApp(firebaseConfig);
//console.log('firebase initialized. Env variable: ', process.env.MIX_API_KEY)  
export { firebase, firebaseui }