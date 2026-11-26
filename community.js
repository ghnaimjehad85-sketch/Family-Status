import { auth, db } from "./firebase.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/13.4.0/firebase-auth.js";

import {
    addDoc,
    collection,
    serverTimestamp,
    doc,
    setDoc
} from "https://www.gstatic.com/firebasejs/13.4.0/firebase-firestore.js";

function getCurrentUser() {
    return new Promise((resolve) => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            unsubscribe();
            resolve(user);
        });
    });
}

// زر إنشاء مجتمع
const createButton = document.getElementById("createCommunity");

if (createButton) {
    createButton.addEventListener("click", () => {
        window.location.href = "create-community.html";
    });
}

// الانضمام باستخدام رابط دعوة
const joinButton = document.getElementById("joinCommunity");

if (joinButton) {
    joinButton.addEventListener("click", () => {
        const inviteLink = prompt("الصق رابط الدعوة هنا:");
        if (!inviteLink) return;

        try {
            const url = new URL(inviteLink.trim());
            const token = url.searchParams.get("invite");

            if (!token || !url.pathname.endsWith("/join.html")) {
                alert("رابط الدعوة غير صالح.");
                return;
            }

            window.location.href = url.href;
        } catch {
            alert("يرجى إدخال رابط صحيح.");
        }
    });
}

// إنشاء المجتمع وإنشاء رابط الدعوة
const form = document.getElementById("communityForm");

if (form) {
    const message = document.createElement("p");
    message.style.marginTop = "15px";
    message.style.textAlign = "center";
    form.appendChild(message);

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const name = document.getElementById("communityName").value.trim();
        const description = document.getElementById("communityDescription").value.trim();
        const button = form.querySelector('button[type="submit"]');

        if (!name) {
            message.textContent = "اكتب اسم المجتمع أولاً.";
            return;
        }

        button.disabled = true;
        button.textContent = "جارٍ الإنشاء...";

        try {
            const user = await getCurrentUser();
            if (!user) {
                throw new Error("يجب تسجيل الدخول أولاً.");
            }

            const communityRef = await addDoc(
                collection(db, "communities"),
                {
                    name,
                    description,
                    ownerId: user.uid,
                    members: [user.uid],
                    createdAt: serverTimestamp()
                }
            );

            const inviteToken = crypto.randomUUID();

            await setDoc(
                doc(db, "invites", inviteToken),
                {
                    communityId: communityRef.id,
                    createdBy: user.uid,
                    createdAt: serverTimestamp()
                }
            );

            const inviteUrl = new URL("join.html", window.location.href);
            inviteUrl.searchParams.set("invite", inviteToken);
            const inviteLink = inviteUrl.href;

            try {
                await navigator.clipboard.writeText(inviteLink);
                alert(
                    "تم إنشاء المجتمع بنجاح! 🎉\n\n" +
                    "تم نسخ رابط الدعوة:\n" +
                    inviteLink
                );
            } catch {
                prompt("تم إنشاء المجتمع! انسخ رابط الدعوة:", inviteLink);
            }

            window.location.href =
                "invite-created.html?link=" +
                encodeURIComponent(inviteLink);
        } catch (error) {
            console.error("Create community error:", error);
            message.textContent = error.message;
        } finally {
            button.disabled = false;
            button.textContent = "إنشاء المجتمع";
        }
    });
}