import { auth, db } from "./firebase.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/13.4.0/firebase-auth.js";

import {
    doc,
    getDoc,
    setDoc,
    updateDoc,
    addDoc,
    collection,
    query,
    where,
    getDocs,
    orderBy,
    limit,
    onSnapshot,
    arrayUnion,
    arrayRemove,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/13.4.0/firebase-firestore.js";

// =================================
// قراءة معرف المجتمع من الرابط
// =================================
const communityId = new URLSearchParams(window.location.search).get("id");

if (!communityId) {
    window.location.href = "my-communities.html";
}

// عناصر الصفحة
const communityNameEl = document.getElementById("communityName");
const communityDescEl = document.getElementById("communityDescription");
const membersStatusList = document.getElementById("membersStatusList");

const chatMessagesEl = document.getElementById("chatMessages");
const chatForm = document.getElementById("chatForm");
const chatInput = document.getElementById("chatInput");
const unverifiedChatNotice = document.getElementById("unverifiedChatNotice");

const statusButtons = document.querySelectorAll(".status-option");

const addPeopleButton = document.getElementById("addPeopleButton");
const addPeoplePanel = document.getElementById("addPeoplePanel");
const userSearchForm = document.getElementById("userSearchForm");
const usernameSearch = document.getElementById("usernameSearch");
const userSearchMessage = document.getElementById("userSearchMessage");
const userSearchResults = document.getElementById("userSearchResults");

const showQrBtn = document.getElementById("showQrBtn");
const qrModal = document.getElementById("qrModal");
const closeQrModal = document.getElementById("closeQrModal");
const communityQrCanvas = document.getElementById("communityQrCanvas");

let currentUser = null;
let currentUserProfile = {};
let communityData = null;
let statusMap = {};
let lastNotifiedStatus = null;
let renderVersion = 0;

function isVerifiedUser() {
    return Boolean(currentUserProfile?.isVerified);
}

// =================================
// أدوات مساعدة لعرض الاسم والتنبيهات
// =================================
function getDisplayName(profile = {}) {
    const full = `${profile.firstName || ""} ${profile.lastName || ""}`.trim();
    return full || profile.username || "عضو";
}

function showRoomToast(text) {
    const existing = document.getElementById("roomToastBanner");
    if (existing) existing.remove();

    const toast = document.createElement("div");
    toast.id = "roomToastBanner";
    toast.textContent = text;
    toast.style.cssText = `
        position: fixed;
        bottom: 22px;
        left: 50%;
        transform: translateX(-50%);
        background: #24141b;
        color: #fff5f7;
        border: 1px solid rgba(249, 115, 22, 0.45);
        padding: 11px 18px;
        border-radius: 14px;
        font-size: 13px;
        font-weight: 600;
        z-index: 9999;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.45);
        font-family: 'Cairo', sans-serif;
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2600);
}

// =================================
// فتح وإغلاق لوحة البحث و QR + عناصر الغرفة
// =================================
if (addPeopleButton && addPeoplePanel) {
    addPeopleButton.addEventListener("click", () => {
        const isHidden = getComputedStyle(addPeoplePanel).display === "none";
        addPeoplePanel.style.display = isHidden ? "block" : "none";
        addPeopleButton.textContent = isHidden
            ? "× إغلاق البحث"
            : "+ إضافة أشخاص إلى المجتمع";
    });
}

if (showQrBtn && qrModal) {
    showQrBtn.addEventListener("click", () => {
        communityQrCanvas.innerHTML = "";
        if (typeof QRCode !== "undefined") {
            new QRCode(communityQrCanvas, {
                text: `community:${communityId}`,
                width: 190,
                height: 190
            });
        }
        qrModal.style.display = "flex";
    });
}

if (closeQrModal && qrModal) {
    closeQrModal.addEventListener("click", () => {
        qrModal.style.display = "none";
    });
}

function injectRoomQuickControls() {
    const controlsAnchor = document.getElementById("toolsSection") || addPeopleButton?.parentElement || document.body;
    if (document.getElementById("roomExtraControls")) return;

    const verified = isVerifiedUser();

    const wrap = document.createElement("div");
    wrap.id = "roomExtraControls";
    wrap.style.cssText = `
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
        margin-top: 12px;
    `;

    // ميزة الموثقين 3: ملاحظة حالة مفصّلة
    const noteInput = document.createElement("input");
    noteInput.id = "statusNoteInput";
    noteInput.type = "text";
    noteInput.maxLength = 70;
    noteInput.disabled = !verified;
    noteInput.placeholder = verified
        ? "ملاحظة حالة للموثقين (مثل: في اجتماع حتى 7:30)"
        : "ملاحظة الحالة متاحة للموثقين فقط";
    noteInput.style.cssText = `
        flex: 1;
        min-width: 220px;
        padding: 10px 13px;
        border-radius: 12px;
        border: 1px solid rgba(249, 115, 22, 0.3);
        background: #140b0f;
        color: #fff5f7;
        opacity: ${verified ? "1" : "0.6"};
        font-family: 'Cairo', sans-serif;
        font-size: 13px;
    `;

    // ميزة الموثقين 2: تنبيه المجتمع السريع
    const pingBtn = document.createElement("button");
    pingBtn.id = "pingCommunityBtn";
    pingBtn.type = "button";
    pingBtn.disabled = !verified;
    pingBtn.textContent = verified ? "🔔 تنبيه المجتمع" : "🔒 تنبيه المجتمع (للموثقين)";
    pingBtn.style.cssText = `
        padding: 10px 14px;
        border-radius: 12px;
        border: 1px solid rgba(249, 115, 22, 0.35);
        background: #24141b;
        color: #fed7aa;
        opacity: ${verified ? "1" : "0.6"};
        font-family: 'Cairo', sans-serif;
        font-size: 13px;
        font-weight: 700;
        cursor: ${verified ? "pointer" : "not-allowed"};
    `;

    pingBtn.addEventListener("click", async () => {
        if (!currentUser || !communityId || !isVerifiedUser()) {
            showRoomToast("تنبيه المجتمع متاح للحسابات الموثقة فقط");
            return;
        }
        pingBtn.disabled = true;
        try {
            const actorName = getDisplayName(currentUserProfile);
            await addDoc(collection(db, "statusNotifications"), {
                communityId,
                communityName: communityData?.name || "مجتمع عائلي",
                actorId: currentUser.uid,
                actorName,
                statusLabel: "أرسل تنبيهاً سريعاً لأفراد المجتمع",
                type: "ping",
                seenBy: [currentUser.uid],
                createdAt: serverTimestamp()
            });
            showRoomToast("تم إرسال التنبيه لأفراد المجتمع");
        } catch (err) {
            console.error("Ping error:", err);
            showRoomToast("تعذر إرسال التنبيه");
        } finally {
            setTimeout(() => {
                pingBtn.disabled = !isVerifiedUser();
            }, 1500);
        }
    });

    const leaveRoomBtn = document.createElement("button");
    leaveRoomBtn.type = "button";
    leaveRoomBtn.textContent = "🚪 مغادرة المجتمع";
    leaveRoomBtn.style.cssText = `
        padding: 10px 14px;
        border-radius: 12px;
        border: 1px solid rgba(239, 68, 68, 0.4);
        background: rgba(127, 29, 29, 0.22);
        color: #fca5a5;
        font-family: 'Cairo', sans-serif;
        font-size: 13px;
        font-weight: 700;
        cursor: pointer;
    `;

    leaveRoomBtn.addEventListener("click", async () => {
        if (!currentUser || !communityId) return;
        const ok = confirm(`هل تريد مغادرة مجتمع "${communityData?.name || "مجتمع عائلي"}"؟`);
        if (!ok) return;
        leaveRoomBtn.disabled = true;
        try {
            await updateDoc(doc(db, "communities", communityId), {
                members: arrayRemove(currentUser.uid)
            });
            window.location.replace("my-communities.html");
        } catch (err) {
            console.error("Leave room error:", err);
            showRoomToast("تعذر مغادرة المجتمع");
            leaveRoomBtn.disabled = false;
        }
    });

    wrap.append(noteInput, pingBtn, leaveRoomBtn);
    controlsAnchor.appendChild(wrap);
}

// =================================
// تحديث حالتي في المجتمع + تسجيل إشعار تغيير الحالة
// =================================
function highlightSelectedStatus(selectedStatus) {
    statusButtons.forEach(btn => {
        btn.classList.toggle("selected", btn.dataset.status === selectedStatus);
    });
}

statusButtons.forEach(btn => {
    btn.addEventListener("click", async () => {
        if (!currentUser || !communityId) return;

        const chosenStatus = btn.dataset.status;
        const verified = isVerifiedUser();
        const noteInput = document.getElementById("statusNoteInput");
        const noteValue = verified ? (noteInput?.value || "").trim() : "";
        const actorName = getDisplayName(currentUserProfile);

        highlightSelectedStatus(chosenStatus);

        try {
            const memberStatusRef = doc(
                db,
                "communities",
                communityId,
                "memberStatuses",
                currentUser.uid
            );

            await setDoc(memberStatusRef, {
                uid: currentUser.uid,
                name: actorName,
                username: currentUserProfile.username || "",
                isVerified: verified,
                status: chosenStatus,
                note: noteValue,
                updatedAt: serverTimestamp()
            }, { merge: true });

            const notifyKey = `${chosenStatus}::${noteValue}`;
            if (lastNotifiedStatus !== notifyKey) {
                lastNotifiedStatus = notifyKey;
                const statusText = noteValue ? `${chosenStatus} (${noteValue})` : chosenStatus;

                await addDoc(collection(db, "statusNotifications"), {
                    communityId,
                    communityName: communityData?.name || "مجتمع عائلي",
                    actorId: currentUser.uid,
                    actorName,
                    statusLabel: statusText,
                    type: "status_change",
                    seenBy: [currentUser.uid],
                    createdAt: serverTimestamp()
                });
            }

            showRoomToast(`تم تحديث حالتك إلى: ${chosenStatus}`);
        } catch (error) {
            console.error("Status update error:", error);
            alert("تعذر تحديث الحالة، حاول مرة أخرى.");
        }
    });
});

// =================================
// الاستماع اللحظي لبيانات المجتمع والأعضاء
// =================================
function listenToCommunityAndMembers() {
    const communityRef = doc(db, "communities", communityId);

    onSnapshot(communityRef, async (snap) => {
        if (!snap.exists()) {
            alert("هذا المجتمع غير موجود.");
            window.location.href = "my-communities.html";
            return;
        }

        communityData = snap.data();

        if (!Array.isArray(communityData.members) || !communityData.members.includes(currentUser.uid)) {
            alert("لست عضواً في هذا المجتمع.");
            window.location.href = "my-communities.html";
            return;
        }

        const uniqueMembers = [...new Set(communityData.members)];
        communityNameEl.textContent = communityData.name || "مجتمع عائلي";
        communityDescEl.textContent = communityData.description || `${uniqueMembers.length} أعضاء`;

        renderMembersList(uniqueMembers);
    });
}

function listenToStatuses() {
    const statusesRef = collection(db, "communities", communityId, "memberStatuses");
    onSnapshot(statusesRef, (snapshot) => {
        statusMap = {};
        snapshot.forEach(docSnap => {
            statusMap[docSnap.id] = docSnap.data();
        });

        const myStatusData = statusMap[currentUser.uid];
        if (myStatusData?.status) {
            highlightSelectedStatus(myStatusData.status);
            lastNotifiedStatus = `${myStatusData.status}::${myStatusData.note || ""}`;
            const noteInput = document.getElementById("statusNoteInput");
            if (noteInput && isVerifiedUser() && myStatusData.note && !noteInput.value) {
                noteInput.value = myStatusData.note;
            }
        }

        if (communityData?.members) {
            renderMembersList(communityData.members);
        }
    });
}

async function renderMembersList(memberIds) {
    const currentVersion = ++renderVersion;
    const uniqueMemberIds = [...new Set(Array.isArray(memberIds) ? memberIds : [])];
    const fragment = document.createDocumentFragment();

    for (const uid of uniqueMemberIds) {
        if (currentVersion !== renderVersion) return;

        let memberName = statusMap[uid]?.name;
        let isVerified = Boolean(statusMap[uid]?.isVerified);
        const memberNote = isVerified ? (statusMap[uid]?.note || "") : "";

        if (!memberName) {
            try {
                const profileSnap = await getDoc(doc(db, "publicProfiles", uid));
                if (currentVersion !== renderVersion) return;
                if (profileSnap.exists()) {
                    const p = profileSnap.data();
                    memberName = getDisplayName(p);
                    isVerified = Boolean(p.isVerified);
                }
            } catch (_) {}
        }

        if (currentVersion !== renderVersion) return;

        const row = document.createElement("div");
        row.className = isVerified ? "member-row verified-member-row" : "member-row";
        if (isVerified) {
            row.style.borderColor = "rgba(29, 155, 240, 0.45)";
            row.style.background = "linear-gradient(135deg, rgba(29, 155, 240, 0.08), #140b0f)";
        }

        const nameDiv = document.createElement("div");
        nameDiv.className = "member-name";
        nameDiv.textContent = memberName || "عضو في المجتمع";

        if (isVerified) {
            const badge = document.createElement("span");
            badge.className = "verified-badge";
            badge.textContent = "✓";
            badge.title = "حساب موثق";
            nameDiv.appendChild(badge);
        }

        if (memberNote) {
            const noteSpan = document.createElement("small");
            noteSpan.textContent = ` — ${memberNote}`;
            noteSpan.style.cssText = "color:#fed7aa; font-size:12px; margin-right:6px;";
            nameDiv.appendChild(noteSpan);
        }

        const statusPill = document.createElement("span");
        statusPill.className = "member-status-pill";
        statusPill.textContent = statusMap[uid]?.status || "متاح";
        if (isVerified) {
            statusPill.style.borderColor = "rgba(29, 155, 240, 0.55)";
        }

        row.append(nameDiv, statusPill);
        fragment.appendChild(row);
    }

    if (currentVersion !== renderVersion) return;
    membersStatusList.innerHTML = "";
    membersStatusList.appendChild(fragment);
}

// =================================
// الدردشة الكتابية (للموثقين بالصح الأزرق فقط)
// =================================
function listenToMessages() {
    const messagesQuery = query(
        collection(db, "communities", communityId, "messages"),
        orderBy("createdAt", "asc"),
        limit(50)
    );

    onSnapshot(messagesQuery, (snapshot) => {
        chatMessagesEl.innerHTML = "";

        if (snapshot.empty) {
            chatMessagesEl.innerHTML = '<p style="color:#aaa0bb; font-size:13px; text-align:center;">لا توجد رسائل بعد.</p>';
            return;
        }

        snapshot.forEach(docSnap => {
            const msg = docSnap.data();
            const item = document.createElement("div");
            item.className = "chat-msg";

            const header = document.createElement("div");
            header.className = "chat-msg-header";
            header.textContent = msg.senderName || "عضو";

            const badge = document.createElement("span");
            badge.className = "verified-badge";
            badge.textContent = "✓";
            header.appendChild(badge);

            const body = document.createElement("div");
            body.textContent = msg.text || "";

            item.append(header, body);
            chatMessagesEl.appendChild(item);
        });

        chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
    });
}

if (chatForm) {
    chatForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (!currentUser || !isVerifiedUser()) return;

        const text = chatInput.value.trim();
        if (!text) return;

        chatInput.value = "";

        try {
            await addDoc(collection(db, "communities", communityId, "messages"), {
                senderId: currentUser.uid,
                senderName: getDisplayName(currentUserProfile),
                isVerified: true,
                text,
                createdAt: serverTimestamp()
            });
        } catch (error) {
            console.error("Send message error:", error);
            alert("تعذر إرسال الرسالة.");
        }
    });
}

// =================================
// البحث عن أعضاء وإضافتهم (عام = مباشر / خاص = طلب إشعار)
// =================================
if (userSearchForm) {
    userSearchForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const searchTerm = usernameSearch.value.trim();
        if (!searchTerm) return;

        userSearchResults.innerHTML = "";
        userSearchMessage.textContent = "جارٍ البحث...";

        try {
            const q = query(
                collection(db, "publicProfiles"),
                where("username", "==", searchTerm)
            );
            const snap = await getDocs(q);

            if (snap.empty) {
                userSearchMessage.textContent = "لم يتم العثور على مستخدم بهذا اليوزر.";
                return;
            }

            userSearchMessage.textContent = "";

            snap.forEach(userDoc => {
                const targetUid = userDoc.id;
                const u = userDoc.data();
                const isPrivate = u.privacy === "private";

                const row = document.createElement("div");
                row.className = "user-result";

                const info = document.createElement("div");
                info.innerHTML = `<strong>${u.firstName || ""} ${u.lastName || ""} (@${u.username})</strong>
                    <span style="color:#aaa0bb; font-size:12px;">${isPrivate ? "🔒 حساب خاص (يتطلب موافقته)" : "🌍 حساب عام"}</span>`;

                const actionBtn = document.createElement("button");
                actionBtn.className = "add-user-button";

                if (communityData?.members?.includes(targetUid)) {
                    actionBtn.textContent = "عضو بالفعل";
                    actionBtn.disabled = true;
                } else {
                    actionBtn.textContent = isPrivate ? "إرسال طلب انضمام" : "إضافة مباشرة";
                    actionBtn.addEventListener("click", async () => {
                        actionBtn.disabled = true;
                        try {
                            if (isPrivate) {
                                await addDoc(collection(db, "joinRequests"), {
                                    toUserId: targetUid,
                                    fromUserId: currentUser.uid,
                                    fromName: getDisplayName(currentUserProfile),
                                    communityId,
                                    communityName: communityData.name || "مجتمع عائلي",
                                    status: "pending",
                                    createdAt: serverTimestamp()
                                });
                                actionBtn.textContent = "تم إرسال الطلب ✉️";
                            } else {
                                await updateDoc(doc(db, "communities", communityId), {
                                    members: arrayUnion(targetUid)
                                });
                                actionBtn.textContent = "تمت الإضافة ✅";
                            }
                        } catch (err) {
                            console.error("Add member error:", err);
                            alert("حدث خطأ أثناء العملية.");
                            actionBtn.disabled = false;
                        }
                    });
                }

                row.append(info, actionBtn);
                userSearchResults.appendChild(row);
            });
        } catch (error) {
            console.error("Search error:", error);
            userSearchMessage.textContent = "حدث خطأ أثناء البحث.";
        }
    });
}

// =================================
// بدء التشغيل بعد التحقق من المستخدم
// =================================
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "login.html";
        return;
    }

    currentUser = user;

    try {
        const userSnap = await getDoc(doc(db, "users", user.uid));
        if (userSnap.exists()) {
            currentUserProfile = userSnap.data();
        }
    } catch (_) {}

    // ميزة الموثقين 1: إرسال الرسائل للموثقين فقط
    if (isVerifiedUser()) {
        chatForm.style.display = "flex";
        unverifiedChatNotice.style.display = "none";
    } else {
        chatForm.style.display = "none";
        unverifiedChatNotice.style.display = "block";
    }

    injectRoomQuickControls();
    listenToCommunityAndMembers();
    listenToStatuses();
    listenToMessages();
});