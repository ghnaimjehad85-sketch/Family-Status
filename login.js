import { auth } from "./firebase.js";

import {
    signInWithEmailAndPassword,
    sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/13.4.0/firebase-auth.js";

const loginForm = document.getElementById("loginForm");
const emailInput = document.getElementById("loginEmail");
const passwordInput = document.getElementById("loginPassword");
const loginSubmitBtn = document.getElementById("loginSubmitBtn");
const forgotPasswordBtn = document.getElementById("forgotPasswordBtn");
const loginMessage = document.getElementById("loginMessage");

function setMessage(text, isError = false) {
    if (!loginMessage) return;
    loginMessage.textContent = text;
    loginMessage.style.color = isError ? "#f87171" : "#fed7aa";
}

function getResetErrorMessage(code) {
    switch (code) {
        case "auth/user-not-found":
            return "لا يوجد حساب مسجل بهذا البريد الإلكتروني.";
        case "auth/invalid-email":
            return "صيغة البريد الإلكتروني غير صحيحة.";
        case "auth/too-many-requests":
            return "تم إرسال طلبات كثيرة، انتظر قليلاً ثم أعد المحاولة.";
        default:
            return "تعذر إرسال رسالة إعادة تعيين كلمة السر، تحقق من إعدادات Firebase أو الاتصال بالإنترنت.";
    }
}

// تسجيل الدخول بالبريد وكلمة السر
if (loginForm) {
    loginForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const email = (emailInput?.value || "").trim();
        const password = passwordInput?.value || "";

        if (!email || !password) {
            setMessage("يرجى إدخال البريد الإلكتروني وكلمة السر.", true);
            return;
        }

        if (loginSubmitBtn) {
            loginSubmitBtn.disabled = true;
            loginSubmitBtn.textContent = "جارٍ تسجيل الدخول...";
        }
        if (forgotPasswordBtn) {
            forgotPasswordBtn.disabled = true;
        }
        setMessage("");

        try {
            await signInWithEmailAndPassword(auth, email, password);
            window.location.href = "index.html";
        } catch (error) {
            console.error("Login error:", error);
            if (
                error?.code === "auth/invalid-credential" ||
                error?.code === "auth/wrong-password" ||
                error?.code === "auth/user-not-found"
            ) {
                setMessage("البريد الإلكتروني أو كلمة السر غير صحيحة.", true);
            } else if (error?.code === "auth/invalid-email") {
                setMessage("صيغة البريد الإلكتروني غير صحيحة.", true);
            } else {
                setMessage("تعذر تسجيل الدخول، تحقق من البيانات أو الاتصال بالإنترنت.", true);
            }
        } finally {
            if (loginSubmitBtn) {
                loginSubmitBtn.disabled = false;
                loginSubmitBtn.textContent = "تسجيل الدخول";
            }
            if (forgotPasswordBtn) {
                forgotPasswordBtn.disabled = false;
            }
        }
    });
}

// إرسال رسالة إعادة تعيين كلمة السر للبريد المكتوب في خانة البريد
if (forgotPasswordBtn) {
    forgotPasswordBtn.addEventListener("click", async () => {
        const email = (emailInput?.value || "").trim();

        if (!email) {
            setMessage("اكتب البريد الإلكتروني المرتبط بحسابك أولاً ثم اضغط نسيت كلمة السر.", true);
            emailInput?.focus();
            return;
        }

        forgotPasswordBtn.disabled = true;
        if (loginSubmitBtn) {
            loginSubmitBtn.disabled = true;
        }
        setMessage("جارٍ إرسال رسالة إعادة تعيين كلمة السر...");

        try {
            await sendPasswordResetEmail(auth, email);
            setMessage(
                `تم إرسال رسالة إعادة تعيين كلمة السر إلى ${email}. تفقد صندوق الوارد أو مجلد الرسائل غير المرغوب فيها (Spam).`
            );
        } catch (error) {
            console.error("Reset password error:", error);
            setMessage(getResetErrorMessage(error?.code), true);
        } finally {
            forgotPasswordBtn.disabled = false;
            if (loginSubmitBtn) {
                loginSubmitBtn.disabled = false;
            }
        }
    });
}