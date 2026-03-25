import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBwjRDz0Nmrqkh9IDb4tq71BA3HLxTr_vI",
  authDomain: "clinical-precision.firebaseapp.com",
  projectId: "clinical-precision",
  storageBucket: "clinical-precision.firebasestorage.app",
  messagingSenderId: "325247550296",
  appId: "1:325247550296:web:0c341921021c8c62d75b2d"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = null;

export const loginWithGoogle = () => signInWithPopup(auth, googleProvider);
export const loginWithEmail = (email: string, password: string) => signInWithEmailAndPassword(auth, email, password);
export const signupWithEmail = (email: string, password: string) => createUserWithEmailAndPassword(auth, email, password);
export const logout = () => signOut(auth);
export const handleFirestoreError = (error: any) => console.error(error);
export const OperationType = { SIGN_IN: "signIn" };