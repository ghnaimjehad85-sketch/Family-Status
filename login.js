import { auth } from "./firebase.js";

import {
    setPersistence,
    browserLocalPersistence,
    signInWithEmailAndPassword,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/13.4.0/firebase-auth.js";

const loginForm = document.getElementById("loginForm");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const loginButton = document.getElementById("loginButton");
const loginMessage = document.getElementById("loginMessage");

let isSubmittingLogin = false;

onAuthStateChanged(auth, (user) => {
    if (user && !isSubmittingLogin) {
        window.location.replace("my-communities.html");
    }
});

function getFriendlyAuthError(errorCode) {
    switch (errorCode) {
        case "auth/invalid-credential":
        case "auth/user-not-found":
        case "auth/wrong-password":
            return "البريد الإلكتروني أو كلمة المرور غير صحيحة.";
        case "auth/invalid-email":
            return "صيغة البريد الإلكتروني غير صحيحة.";
        case "auth/too-many-requests":
            return "تمت محاولات كثيرة، انتظر قليلاً ثم أعد المحاولة.";
        case "auth/network-request-failed":
            return "تحقق من اتصال الإنترنت ثم أعد المحاولة.";
        default:
            return "تعذر تسجيل الدخول، تأكد من البيانات وحاول مرة أخرى.";
    }
}

if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const email = (emailInput?.value || "").trim();
        const password = passwordInput?.value || "";

        if (!email || !password) {
            if (loginMessage) {
                loginMessage.textContent = "يرجى إدخال البريد الإلكتروني وكلمة المرور.";
            }
            return;
        }

        isSubmittingLogin = true;

        if (loginButton) {
            loginButton.disabled = true;
            loginButton.textContent = "جارٍ الدخول...";
        }

        if (loginMessage) {
            loginMessage.textContent = "";
        }

        try {
            await setPersistence(auth, browserLocalPersistence);
            await signInWithEmailAndPassword(auth, email, password);

            if (loginMessage) {
                loginMessage.textContent = "تم تسجيل الدخول بنجاح، جارٍ التحويل...";
            }

            window.location.replace("my-communities.html");
        } catch (error) {
            console.error("Login error:", error);
            if (loginMessage) {
                loginMessage.textContent = getFriendlyAuthError(error?.code);
            }
            isSubmittingLogin = false;

            if (loginButton) {
                loginButton.disabled = false;
                loginButton.textContent = "دخول";
            }
        }
    });
}