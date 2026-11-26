import { auth, db } from "./firebase.js";

import {
    createUserWithEmailAndPassword,
    sendPasswordResetEmail,
    updatePassword,
    reauthenticateWithCredential,
    EmailAuthProvider,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/13.4.0/firebase-auth.js";

import {
    doc,
    setDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/13.4.0/firebase-firestore.js";

// عناصر إنشاء الحساب
const signupForm = document.getElementById("signupForm");
const emailInput = document.getElementById("signupEmail");
const passwordInput = document.getElementById("signupPassword");
const firstNameInput = document.getElementById("firstName");
const lastNameInput = document.getElementById("lastName");
const usernameInput = document.getElementById("username");
const submitBtn = document.getElementById("signupSubmitBtn");
const statusBox = document.getElementById("signupMessage");

// عناصر زر "نسيت كلمة السر"
const forgotPasswordBtn = document.getElementById("forgotPasswordBtn");
const resetEmailInput = document.getElementById("resetEmailInput");

// عناصر "تعديل كلمة السر"
const changePasswordForm = document.getElementById("changePasswordForm");
const currentPasswordInput = document.getElementById("currentPasswordInput");
const newPasswordInput = document.getElementById("newPasswordInput");
const changePassBtn = document.getElementById("changePasswordBtn");
const changePassStatus = document.getElementById("changePasswordMessage");

let activeUser = null;

onAuthStateChanged(auth, (user) => {
    activeUser = user;
});

function setStatus(el, text, isError = false) {
    if (!el) return;
    el.textContent = text;
    el.style.color = isError ? "#f87171" : "#fed7aa";
}

function mapAuthError(code) {
    switch (code) {
        case "auth/email-already-in-use":
            return "هذا البريد الإلكتروني مستخدم بالفعل.";
        case "auth/invalid-email":
            return "صيغة البريد الإلكتروني غير صحيحة.";
        case "auth/weak-password":
            return "كلمة السر ضعيفة، يجب أن تكون 6 أحرف على الأقل.";
        case "auth/operation-not-allowed":
            return "تسجيل البريد وكلمة السر غير مفعّل في Firebase Authentication.";
        case "auth/requires-recent-login":
            return "يرجى إدخال كلمة السر الحالية ثم المحاولة مرة أخرى.";
        case "auth/wrong-password":
        case "auth/invalid-credential":
            return "كلمة السر الحالية غير صحيحة.";
        default:
            return `حدث خطأ (${code || "unknown"})، تحقق من الإعدادات أو الاتصال بالإنترنت.`;
    }
}

// 1) إنشاء حساب جديد
if (signupForm) {
    signupForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const email = (emailInput?.value || "").trim();
        const password = passwordInput?.value || "";
        const firstName = (firstNameInput?.value || "").trim();
        const lastName = (lastNameInput?.value || "").trim();
        const username = (usernameInput?.value || "").trim().replace(/^@+/, "");

        if (!email || !password) {
            setStatus(statusBox, "يرجى إدخال البريد الإلكتروني وكلمة السر.", true);
            return;
        }

        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = "جارٍ إنشاء الحساب...";
        }
        setStatus(statusBox, "");

        try {
            const cred = await createUserWithEmailAndPassword(auth, email, password);
            const uid = cred.user.uid;
            const fullName = [firstName, lastName].filter(Boolean).join(" ").trim() || username || email;

            await setDoc(doc(db, "users", uid), {
                uid,
                email,
                firstName,
                lastName,
                fullName,
                username,
                isVerified: false,
                verificationStatus: "none",
                createdAt: serverTimestamp()
            }, { merge: true });

            await setDoc(doc(db, "publicProfiles", uid), {
                uid,
                fullName,
                username,
                isVerified: false,
                updatedAt: serverTimestamp()
            }, { merge: true });

            setStatus(statusBox, "تم إنشاء الحساب بنجاح.");
            window.location.href = "index.html";
        } catch (error) {
            console.error("Signup failed:", error);
            setStatus(statusBox, mapAuthError(error?.code), true);
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = "إنشاء حساب";
            }
        }
    });
}

// 2) زر "نسيت كلمة السر"
if (forgotPasswordBtn) {
    forgotPasswordBtn.addEventListener("click", async () => {
        const targetEmail = (resetEmailInput?.value || emailInput?.value || "").trim();

        if (!targetEmail) {
            setStatus(statusBox, "اكتب البريد الإلكتروني أولاً لإرسال رابط استعادة كلمة السر.", true);
            return;
        }

        forgotPasswordBtn.disabled = true;
        try {
            await sendPasswordResetEmail(auth, targetEmail);
            setStatus(statusBox, `تم إرسال رابط إعادة تعيين كلمة السر إلى ${targetEmail} (تحقق من الوارد أو Spam).`);
        } catch (error) {
            console.error("Password reset failed:", error);
            setStatus(statusBox, mapAuthError(error?.code), true);
        } finally {
            forgotPasswordBtn.disabled = false;
        }
    });
}

// 3) تعديل كلمة السر للمستخدم المسجل دخوله
if (changePasswordForm) {
    changePasswordForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const user = auth.currentUser || activeUser;
        const currentPass = currentPasswordInput?.value || "";
        const newPass = newPasswordInput?.value || "";

        if (!user || !user.email) {
            setStatus(changePassStatus, "يجب تسجيل الدخول أولاً لتعديل كلمة السر.", true);
            return;
        }

        if (!newPass || newPass.length < 6) {
            setStatus(changePassStatus, "كلمة السر الجديدة يجب أن تكون 6 أحرف على الأقل.", true);
            return;
        }

        if (changePassBtn) {
            changePassBtn.disabled = true;
            changePassBtn.textContent = "جارٍ التحديث...";
        }
        setStatus(changePassStatus, "");

        try {
            if (currentPass) {
                const credential = EmailAuthProvider.credential(user.email, currentPass);
                await reauthenticateWithCredential(user, credential);
            }

            await updatePassword(user, newPass);
            if (currentPasswordInput) currentPasswordInput.value = "";
            if (newPasswordInput) newPasswordInput.value = "";
            setStatus(changePassStatus, "تم تعديل كلمة السر بنجاح.");
        } catch (error) {
            console.error("Update password failed:", error);
            setStatus(changePassStatus, mapAuthError(error?.code), true);
        } finally {
            if (changePassBtn) {
                changePassBtn.disabled = false;
                changePassBtn.textContent = "تعديل كلمة السر";
            }
        }
    });
}