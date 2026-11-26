import { auth, db } from "./firebase.js";

import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    onAuthStateChanged,
    setPersistence,
    browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/13.4.0/firebase-auth.js";

import {
    doc,
    setDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/13.4.0/firebase-firestore.js";

// =================================
// تحويل تلقائي إذا كان المستخدم مسجلاً مسبقاً في صفحات الدخول/التسجيل
// =================================
const isAuthPage =
    window.location.pathname.endsWith("/login.html") ||
    window.location.pathname.endsWith("/signup.html");

if (isAuthPage) {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            window.location.replace("my-communities.html");
        }
    });
}

// =================================
// إنشاء حساب جديد
// =================================
const signupForm = document.getElementById("signupForm");

if (signupForm) {
    signupForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const firstName = document.getElementById("firstName").value.trim();
        const lastName = document.getElementById("lastName").value.trim();
        const email = document.getElementById("email").value.trim();
        const age = Number(document.getElementById("age").value);
        const username = document.getElementById("username").value.trim();
        const password = document.getElementById("password").value;
        const confirmPassword = document.getElementById("confirmPassword").value;

        if (password !== confirmPassword) {
            alert("كلمتا المرور غير متطابقتين!");
            return;
        }

        if (!Number.isInteger(age) || age < 6 || age > 120) {
            alert("يرجى إدخال عمر صحيح.");
            return;
        }

        if (!firstName || !lastName || !username) {
            alert("يرجى تعبئة جميع الخانات.");
            return;
        }

        const button = signupForm.querySelector('button[type="submit"]');
        button.disabled = true;
        button.textContent = "جارٍ إنشاء الحساب...";

        try {
            await setPersistence(auth, browserLocalPersistence);

            const userCredential = await createUserWithEmailAndPassword(
                auth,
                email,
                password
            );

            const user = userCredential.user;

            await setDoc(doc(db, "users", user.uid), {
                firstName,
                lastName,
                email,
                age,
                username,
                privacy: "public",
                isVerified: false,
                createdAt: serverTimestamp()
            });

            await setDoc(doc(db, "publicProfiles", user.uid), {
                firstName,
                lastName,
                username,
                privacy: "public",
                isVerified: false,
                createdAt: serverTimestamp()
            });

            alert("تم إنشاء حسابك بنجاح! أهلاً بك في FamilyStatus ❤️");
            window.location.replace("my-communities.html");
        } catch (error) {
            console.error("Signup Error:", error);

            const messages = {
                "auth/email-already-in-use": "هذا البريد الإلكتروني مسجل بالفعل.",
                "auth/invalid-email": "البريد الإلكتروني غير صحيح.",
                "auth/weak-password": "كلمة المرور ضعيفة.",
                "auth/network-request-failed": "تحقق من اتصال الإنترنت.",
                "permission-denied": "لا توجد صلاحية لحفظ البيانات في قاعدة البيانات."
            };

            alert(messages[error.code] || "حدث خطأ أثناء إنشاء الحساب. راجع Console للتفاصيل.");
        } finally {
            button.disabled = false;
            button.innerHTML = 'إنشاء الحساب <span>←</span>';
        }
    });
}

// =================================
// تسجيل الدخول
// =================================
const loginForm = document.getElementById("loginForm");

if (loginForm) {
    loginForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;

        const button = loginForm.querySelector('button[type="submit"]');
        button.disabled = true;
        button.textContent = "جارٍ تسجيل الدخول...";

        try {
            await setPersistence(auth, browserLocalPersistence);

            await signInWithEmailAndPassword(
                auth,
                email,
                password
            );

            alert("تم تسجيل الدخول بنجاح! أهلاً بعودتك ❤️");
            window.location.replace("my-communities.html");
        } catch (error) {
            console.error("Login Error:", error);

            const messages = {
                "auth/invalid-credential": "البريد الإلكتروني أو كلمة المرور غير صحيحة.",
                "auth/user-not-found": "هذا الحساب غير موجود.",
                "auth/wrong-password": "كلمة المرور غير صحيحة.",
                "auth/invalid-email": "البريد الإلكتروني غير صحيح.",
                "auth/network-request-failed": "تحقق من اتصال الإنترنت."
            };

            alert(messages[error.code] || "حدث خطأ أثناء تسجيل الدخول.");
        } finally {
            button.disabled = false;
            button.innerHTML = 'تسجيل الدخول <span>←</span>';
        }
    });
}