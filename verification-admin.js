import { auth, db } from "./firebase.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/13.4.0/firebase-auth.js";

import {
    collection,
    addDoc,
    doc,
    getDoc,
    updateDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/13.4.0/firebase-firestore.js";

const ADMIN_NOTIFICATION_EMAIL = "ghnaimjehad85@gmail.com";

const requestForm = document.getElementById("verificationRequestForm");
const reasonInput = document.getElementById("verificationReason");
const submitBtn = document.getElementById("submitVerificationBtn");
const statusMsg = document.getElementById("verificationRequestMessage");

let currentUser = null;
let currentProfile = {};

function showStatus(text, isError = false) {
    if (!statusMsg) return;
    statusMsg.textContent = text;
    statusMsg.style.color = isError ? "#f87171" : "#fed7aa";
}

onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    if (!user) return;

    try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists()) {
            currentProfile = snap.data() || {};
        }
    } catch (err) {
        console.error("Failed to load user profile:", err);
    }
});

async function queueEmailNotification(payload) {
    // 1) كتابة إشعار في مجموعة mail ليتم إرساله إلى ghnaimjehad85@gmail.com
    await addDoc(collection(db, "mail"), {
        to: ADMIN_NOTIFICATION_EMAIL,
        message: {
            subject: `🛡️ طلب توثيق جديد في FamilyStatus - @${payload.username || payload.userId}`,
            text: [
                "تم استلام طلب توثيق جديد في FamilyStatus:",
                `الاسم: ${payload.fullName}`,
                `اسم المستخدم: @${payload.username || "غير محدد"}`,
                `معرّف المستخدم (UID): ${payload.userId}`,
                `البريد الإلكتروني للحساب: ${payload.userEmail || "غير متوفر"}`,
                `السبب / الملاحظة: ${payload.reason || "لم يتم إدخال سبب"}`
            ].join("\n")
        },
        createdAt: serverTimestamp()
    });

    // 2) إرسال فوري عبر EmailJS إذا كان محملاً في الصفحة
    if (typeof window.emailjs !== "undefined") {
        try {
            await window.emailjs.send("YOUR_SERVICE_ID", "YOUR_TEMPLATE_ID", {
                to_email: ADMIN_NOTIFICATION_EMAIL,
                applicant_name: payload.fullName,
                username: payload.username,
                user_id: payload.userId,
                user_email: payload.userEmail,
                reason: payload.reason
            });
        } catch (emailJsErr) {
            console.warn("EmailJS optional send skipped:", emailJsErr);
        }
    }
}

if (requestForm) {
    requestForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        if (!currentUser) {
            showStatus("يجب تسجيل الدخول أولاً لإرسال طلب التوثيق.", true);
            return;
        }

        const reason = (reasonInput?.value || "").trim();
        const fullName =
            [currentProfile.firstName, currentProfile.lastName].filter(Boolean).join(" ").trim() ||
            currentProfile.username ||
            currentUser.email ||
            currentUser.uid;
        const username = currentProfile.username || "";

        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = "جارٍ إرسال الطلب...";
        }
        showStatus("");

        try {
            const requestPayload = {
                userId: currentUser.uid,
                uid: currentUser.uid,
                userEmail: currentUser.email || "",
                fullName,
                username,
                reason,
                status: "pending",
                createdAt: serverTimestamp()
            };

            await addDoc(collection(db, "verificationRequests"), requestPayload);

            await updateDoc(doc(db, "users", currentUser.uid), {
                verificationStatus: "pending"
            }).catch(() => {});

            await queueEmailNotification(requestPayload);

            if (reasonInput) reasonInput.value = "";
            showStatus("تم إرسال طلب التوثيق بنجاح وتم إشعار الإدارة.");
        } catch (error) {
            console.error("Verification request error:", error);
            showStatus("تعذر إرسال طلب التوثيق، حاول مرة أخرى.", true);
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = "إرسال طلب التوثيق";
            }
        }
    });
}