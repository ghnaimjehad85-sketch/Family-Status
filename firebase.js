import { initializeApp } from "https://www.gstatic.com/firebasejs/13.4.0/firebase-app.js";

import {
    getAuth,
    setPersistence,
    browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/13.4.0/firebase-auth.js";

import { getFirestore } from "https://www.gstatic.com/firebasejs/13.4.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyBnW-_-9K9g5xKjB4YBhoExjE1PY4YSoao",
    authDomain: "familystatus-ede1b.firebaseapp.com",
    projectId: "familystatus-ede1b",
    storageBucket: "familystatus-ede1b.firebasestorage.app",
    messagingSenderId: "889717509140",
    appId: "1:889717509140:web:2beefa397771fc1ef2eb01",
    measurementId: "G-74X95JQBTY"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

// تفعيل حفظ الجلسة محلياً في المتصفح ليبقى المستخدم متصلاً بعد إغلاق المتصفح
setPersistence(auth, browserLocalPersistence).catch((error) => {
    console.error("Auth persistence error:", error);
});