import { auth, db } from "./firebase.js";

import {
    onAuthStateChanged,
    updateEmail,
    deleteUser,
    signOut
} from "https://www.gstatic.com/firebasejs/13.4.0/firebase-auth.js";

import {
    collection,
    addDoc,
    getDocs,
    query,
    where,
    doc,
    getDoc,
    setDoc,
    updateDoc,
    deleteDoc,
    arrayUnion,
    arrayRemove,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/13.4.0/firebase-firestore.js";

const ADMIN_EMAIL = "ghnaimjehad85@gmail.com";

// =================================
// عناصر الصفحة
// =================================
const communityList = document.getElementById("communityList");
const pageMessage = document.getElementById("pageMessage");
const userGreeting = document.getElementById("userGreeting");
const headerVerifiedBadge = document.getElementById("headerVerifiedBadge");

const addButton = document.getElementById("addCommunityButton");
const addOptions = document.getElementById("addCommunityOptions");
const createButton = document.getElementById("createNewCommunity");
const joinQRButton = document.getElementById("joinByQR");

// مركز الإشعارات
const notificationsButton = document.getElementById("notificationsButton");
const notifBadge = document.getElementById("notifBadge");
const notificationsPage = document.getElementById("notificationsPage");
const backNotificationsButton = document.getElementById("backNotificationsButton");
const joinRequestsList = document.getElementById("joinRequestsList");
const joinRequestsEmpty = document.getElementById("joinRequestsEmpty");
const statusNotificationsList = document.getElementById("statusNotificationsList");
const statusNotificationsEmpty = document.getElementById("statusNotificationsEmpty");

// الصفحات المنبثقة
const settingsButton = document.getElementById("settingsButton");
const settingsPage = document.getElementById("settingsPage");
const backHomeButton = document.getElementById("backHomeButton");

const privacyPage = document.getElementById("privacyPage");
const editAccountPage = document.getElementById("editAccountPage");
const verificationPage = document.getElementById("verificationPage");
const qrPage = document.getElementById("qrPage");
const deletePage = document.getElementById("deletePage");
const adminVerifyPage = document.getElementById("adminVerifyPage");

// أزرار فتح الصفحات
const accountPrivacyButton = document.getElementById("accountPrivacyButton");
const editAccountButton = document.getElementById("editAccountButton");
const verificationButton = document.getElementById("verificationButton");
const qrSettingsButton = document.getElementById("qrSettingsButton");
const adminVerifyButton = document.getElementById("adminVerifyButton");
const deleteAccountButton = document.getElementById("deleteAccountButton");
const logoutButton = document.getElementById("logoutButton");

// أزرار الرجوع
const backPrivacyButton = document.getElementById("backPrivacyButton");
const backEditButton = document.getElementById("backEditButton");
const backVerificationButton = document.getElementById("backVerificationButton");
const backQrButton = document.getElementById("backQrButton");
const backDeleteButton = document.getElementById("backDeleteButton");
const backAdminVerifyButton = document.getElementById("backAdminVerifyButton");

// الخصوصية
const publicAccountOption = document.getElementById("publicAccountOption");
const privateAccountOption = document.getElementById("privateAccountOption");
const privacyStatus = document.getElementById("privacyStatus");

// تعديل الحساب
const editAccountForm = document.getElementById("editAccountForm");
const editFirstName = document.getElementById("editFirstName");
const editLastName = document.getElementById("editLastName");
const editUsername = document.getElementById("editUsername");
const editAge = document.getElementById("editAge");
const editEmail = document.getElementById("editEmail");
const saveAccountBtn = document.getElementById("saveAccountBtn");
const editAccountStatus = document.getElementById("editAccountStatus");

// طلب التوثيق وإدارة المدير
const verificationRequestForm = document.getElementById("verificationRequestForm");
const verifyFullName = document.getElementById("verifyFullName");
const verifyEmail = document.getElementById("verifyEmail");
const verifyPhone = document.getElementById("verifyPhone");
const confirmVerifyBtn = document.getElementById("confirmVerifyBtn");
const verificationStatusText = document.getElementById("verificationStatusText");
const adminRequestsList = document.getElementById("adminRequestsList");
const adminVerifyStatus = document.getElementById("adminVerifyStatus");

// الباركود QR
const startCameraBtn = document.getElementById("startCameraBtn");
const qrImageInput = document.getElementById("qrImageInput");
const qrStatusText = document.getElementById("qrStatusText");

// حذف الحساب
const confirmDeleteAccountBtn = document.getElementById("confirmDeleteAccountBtn");
const deleteStatusText = document.getElementById("deleteStatusText");

let currentUser = null;
let currentUserData = {};
let userCommunityIds = [];
let html5QrScanner = null;

// =================================
// إدارة التنقل بين الصفحات
// =================================
function hideAllSubPages() {
    [
        notificationsPage,
        settingsPage,
        privacyPage,
        editAccountPage,
        verificationPage,
        qrPage,
        deletePage,
        adminVerifyPage
    ].forEach(page => {
        if (page) page.style.display = "none";
    });
    stopCameraScanner();
}

function openSubPage(targetPage) {
    hideAllSubPages();
    if (targetPage) targetPage.style.display = "block";
}

if (addButton && addOptions) {
    addButton.addEventListener("click", () => {
        const isHidden = getComputedStyle(addOptions).display === "none";
        addOptions.style.display = isHidden ? "block" : "none";
        addButton.textContent = isHidden ? "×" : "+";
    });
}

if (createButton) {
    createButton.addEventListener("click", () => {
        window.location.href = "create-community.html";
    });
}

if (joinQRButton) {
    joinQRButton.addEventListener("click", async () => {
        addOptions.style.display = "none";
        addButton.textContent = "+";
        await openQRPage();
    });
}

if (settingsButton) {
    settingsButton.addEventListener("click", () => openSubPage(settingsPage));
}

if (backHomeButton) {
    backHomeButton.addEventListener("click", hideAllSubPages);
}

// =================================
// مركز الإشعارات (طلبات الانضمام + تغيير الحالات)
// =================================
if (notificationsButton) {
    notificationsButton.addEventListener("click", async () => {
        openSubPage(notificationsPage);
        await loadNotificationsCenter();
    });
}

if (backNotificationsButton) {
    backNotificationsButton.addEventListener("click", async () => {
        hideAllSubPages();
        await refreshNotificationsBadge();
    });
}

async function refreshNotificationsBadge() {
    if (!currentUser || !notifBadge) return;
    let count = 0;

    try {
        const reqQuery = query(
            collection(db, "joinRequests"),
            where("targetUserId", "==", currentUser.uid),
            where("status", "==", "pending")
        );
        const reqSnap = await getDocs(reqQuery);
        count += reqSnap.size;

        if (userCommunityIds.length > 0) {
            const chunks = [];
            for (let i = 0; i < userCommunityIds.length; i += 10) {
                chunks.push(userCommunityIds.slice(i, i + 10));
            }
            for (const chunk of chunks) {
                const notifQuery = query(
                    collection(db, "statusNotifications"),
                    where("communityId", "in", chunk)
                );
                const notifSnap = await getDocs(notifQuery);
                notifSnap.forEach(d => {
                    const data = d.data();
                    const seenBy = Array.isArray(data.seenBy) ? data.seenBy : [];
                    if (data.actorId !== currentUser.uid && !seenBy.includes(currentUser.uid)) {
                        count += 1;
                    }
                });
            }
        }
    } catch (_) {}

    if (count > 0) {
        notifBadge.style.display = "inline-flex";
        notifBadge.textContent = String(count);
    } else {
        notifBadge.style.display = "none";
        notifBadge.textContent = "0";
    }
}

async function loadNotificationsCenter() {
    if (!currentUser) return;
    joinRequestsList.innerHTML = "";
    statusNotificationsList.innerHTML = "";
    joinRequestsEmpty.textContent = "جارٍ تحميل طلبات الانضمام...";
    statusNotificationsEmpty.textContent = "جارٍ تحميل إشعارات الحالات...";

    // 1. تحميل طلبات الانضمام المعلقة الخاصة بالمستخدم
    try {
        const reqQuery = query(
            collection(db, "joinRequests"),
            where("targetUserId", "==", currentUser.uid),
            where("status", "==", "pending")
        );
        const reqSnap = await getDocs(reqQuery);

        if (reqSnap.empty) {
            joinRequestsEmpty.textContent = "لا توجد طلبات انضمام معلقة.";
        } else {
            joinRequestsEmpty.textContent = "";
            reqSnap.forEach(reqDoc => {
                const req = reqDoc.data();
                const card = document.createElement("div");
                card.className = "community-card";

                const info = document.createElement("div");
                info.className = "community-info";
                info.innerHTML = `
                    <h3>${req.communityName || "مجتمع عائلي"}</h3>
                    <p>دعوة انضمام مرسلة إليك — اختر انضمام أو حذف</p>
                `;

                const actions = document.createElement("div");
                actions.className = "card-actions";

                const acceptBtn = document.createElement("button");
                acceptBtn.className = "open-community";
                acceptBtn.textContent = "انضمام";

                const deleteBtn = document.createElement("button");
                deleteBtn.className = "reject-request-btn";
                deleteBtn.textContent = "حذف";

                acceptBtn.addEventListener("click", async () => {
                    acceptBtn.disabled = true;
                    deleteBtn.disabled = true;
                    acceptBtn.textContent = "جارٍ الانضمام...";
                    try {
                        await updateDoc(doc(db, "communities", req.communityId), {
                            members: arrayUnion(currentUser.uid)
                        });
                        await deleteDoc(doc(db, "joinRequests", reqDoc.id));
                        card.remove();
                        if (!joinRequestsList.children.length) {
                            joinRequestsEmpty.textContent = "لا توجد طلبات انضمام معلقة.";
                        }
                        await loadCommunities();
                        await refreshNotificationsBadge();
                    } catch (err) {
                        console.error("Accept join request error:", err);
                        alert("تعذر الانضمام للمجتمع.");
                        acceptBtn.disabled = false;
                        deleteBtn.disabled = false;
                        acceptBtn.textContent = "انضمام";
                    }
                });

                deleteBtn.addEventListener("click", async () => {
                    acceptBtn.disabled = true;
                    deleteBtn.disabled = true;
                    try {
                        await deleteDoc(doc(db, "joinRequests", reqDoc.id));
                        card.remove();
                        if (!joinRequestsList.children.length) {
                            joinRequestsEmpty.textContent = "لا توجد طلبات انضمام معلقة.";
                        }
                        await refreshNotificationsBadge();
                    } catch (err) {
                        console.error("Delete join request error:", err);
                        alert("تعذر حذف الطلب.");
                        acceptBtn.disabled = false;
                        deleteBtn.disabled = false;
                    }
                });

                actions.append(acceptBtn, deleteBtn);
                card.append(info, actions);
                joinRequestsList.appendChild(card);
            });
        }
    } catch (error) {
        console.error("Load join requests error:", error);
        joinRequestsEmpty.textContent = "تعذر تحميل طلبات الانضمام.";
    }

    // 2. تحميل إشعارات تغيير الحالات في مجتمعات المستخدم
    try {
        if (!userCommunityIds.length) {
            statusNotificationsEmpty.textContent = "لا توجد إشعارات حالات حالياً.";
            return;
        }

        const allNotifs = [];
        for (let i = 0; i < userCommunityIds.length; i += 10) {
            const chunk = userCommunityIds.slice(i, i + 10);
            const notifQuery = query(
                collection(db, "statusNotifications"),
                where("communityId", "in", chunk)
            );
            const notifSnap = await getDocs(notifQuery);
            notifSnap.forEach(d => {
                allNotifs.push({ id: d.id, ...d.data() });
            });
        }

        allNotifs.sort((a, b) => {
            const ta = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
            const tb = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
            return tb - ta;
        });

        if (!allNotifs.length) {
            statusNotificationsEmpty.textContent = "لا توجد إشعارات حالات حالياً.";
            return;
        }

        statusNotificationsEmpty.textContent = "";
        for (const item of allNotifs.slice(0, 25)) {
            const card = document.createElement("div");
            card.className = "community-card";

            const avatar = document.createElement("div");
            avatar.className = "community-avatar";
            avatar.textContent = "🔔";

            const info = document.createElement("div");
            info.className = "community-info";
            info.innerHTML = `
                <h3>${item.actorName || "عضو"} أصبح: ${item.statusLabel || "محدّث الحالة"}</h3>
                <p>في مجتمع: ${item.communityName || "مجتمع عائلي"}</p>
            `;

            card.append(avatar, info);
            statusNotificationsList.appendChild(card);

            const seenBy = Array.isArray(item.seenBy) ? item.seenBy : [];
            if (!seenBy.includes(currentUser.uid)) {
                updateDoc(doc(db, "statusNotifications", item.id), {
                    seenBy: arrayUnion(currentUser.uid)
                }).catch(() => {});
            }
        }

        await refreshNotificationsBadge();
    } catch (error) {
        console.error("Load status notifications error:", error);
        statusNotificationsEmpty.textContent = "تعذر تحميل إشعارات الحالات.";
    }
}

// =================================
// 1. خصوصية الحساب
// =================================
if (accountPrivacyButton) {
    accountPrivacyButton.addEventListener("click", async () => {
        openSubPage(privacyPage);
        await loadPrivacy();
    });
}

if (backPrivacyButton) {
    backPrivacyButton.addEventListener("click", () => openSubPage(settingsPage));
}

function updatePrivacyUI(privacy) {
    if (!publicAccountOption || !privateAccountOption) return;
    publicAccountOption.classList.toggle("selected", privacy === "public");
    privateAccountOption.classList.toggle("selected", privacy === "private");
}

async function loadPrivacy() {
    if (!currentUser) return;
    privacyStatus.textContent = "جارٍ تحميل إعدادات الخصوصية...";
    try {
        const userSnap = await getDoc(doc(db, "users", currentUser.uid));
        const privacy = userSnap.exists() ? (userSnap.data().privacy || "public") : "public";
        updatePrivacyUI(privacy);
        privacyStatus.textContent = privacy === "private"
            ? "حسابك خاص حاليًا 🔒"
            : "حسابك عام حاليًا 🌍";
    } catch (error) {
        console.error("Load privacy error:", error);
        privacyStatus.textContent = "تعذر تحميل إعدادات الخصوصية.";
    }
}

async function savePrivacy(privacy) {
    if (!currentUser) return;
    publicAccountOption.disabled = true;
    privateAccountOption.disabled = true;
    privacyStatus.textContent = "جارٍ حفظ إعداداتك...";
    try {
        await setDoc(doc(db, "users", currentUser.uid), {
            privacy,
            updatedAt: serverTimestamp()
        }, { merge: true });

        await setDoc(doc(db, "publicProfiles", currentUser.uid), {
            privacy,
            updatedAt: serverTimestamp()
        }, { merge: true });

        currentUserData.privacy = privacy;
        updatePrivacyUI(privacy);
        privacyStatus.textContent = privacy === "private"
            ? "تم تحويل حسابك إلى خاص بنجاح 🔒"
            : "تم تحويل حسابك إلى عام بنجاح 🌍";
    } catch (error) {
        console.error("Save privacy error:", error);
        privacyStatus.textContent = "حدث خطأ أثناء حفظ الخصوصية.";
    } finally {
        publicAccountOption.disabled = false;
        privateAccountOption.disabled = false;
    }
}

if (publicAccountOption) publicAccountOption.addEventListener("click", () => savePrivacy("public"));
if (privateAccountOption) privateAccountOption.addEventListener("click", () => savePrivacy("private"));

// =================================
// 2. تعديل الحساب
// =================================
if (editAccountButton) {
    editAccountButton.addEventListener("click", async () => {
        openSubPage(editAccountPage);
        editAccountStatus.textContent = "";
        await loadUserProfileData();
        editFirstName.value = currentUserData.firstName || "";
        editLastName.value = currentUserData.lastName || "";
        editUsername.value = currentUserData.username || "";
        editAge.value = currentUserData.age || "";
        editEmail.value = currentUser.email || currentUserData.email || "";
    });
}

if (backEditButton) {
    backEditButton.addEventListener("click", () => openSubPage(settingsPage));
}

if (editAccountForm) {
    editAccountForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (!currentUser) return;

        const firstName = editFirstName.value.trim();
        const lastName = editLastName.value.trim();
        const username = editUsername.value.trim();
        const age = Number(editAge.value);
        const email = editEmail.value.trim();

        if (!Number.isInteger(age) || age < 6 || age > 120) {
            editAccountStatus.textContent = "يرجى إدخال عمر صحيح.";
            return;
        }

        saveAccountBtn.disabled = true;
        saveAccountBtn.textContent = "جارٍ الحفظ...";
        editAccountStatus.textContent = "";

        try {
            if (email && email !== currentUser.email) {
                await updateEmail(currentUser, email);
            }

            await setDoc(doc(db, "users", currentUser.uid), {
                firstName,
                lastName,
                username,
                age,
                email,
                updatedAt: serverTimestamp()
            }, { merge: true });

            await setDoc(doc(db, "publicProfiles", currentUser.uid), {
                firstName,
                lastName,
                username,
                updatedAt: serverTimestamp()
            }, { merge: true });

            currentUserData = { ...currentUserData, firstName, lastName, username, age, email };
            applyUserHeaderUI();
            editAccountStatus.textContent = "تم تحديث بيانات الحساب بنجاح ✅";
        } catch (error) {
            console.error("Update account error:", error);
            if (error.code === "auth/requires-recent-login") {
                editAccountStatus.textContent = "لتغيير البريد الإلكتروني، سجل الدخول مرة أخرى ثم أعد المحاولة.";
            } else {
                editAccountStatus.textContent = "تعذر حفظ التعديلات. تحقق من البيانات والصلاحيات.";
            }
        } finally {
            saveAccountBtn.disabled = false;
            saveAccountBtn.textContent = "حفظ التعديلات";
        }
    });
}

// =================================
// 3. طلب توثيق الحساب + لوحة المدير
// =================================
if (verificationButton) {
    verificationButton.addEventListener("click", async () => {
        openSubPage(verificationPage);
        await loadUserProfileData();
        renderVerificationState();
    });
}

if (backVerificationButton) {
    backVerificationButton.addEventListener("click", () => openSubPage(settingsPage));
}

function renderVerificationState() {
    const isVerified = Boolean(currentUserData.isVerified);
    const hasPending = currentUserData.verificationStatus === "pending";

    if (isVerified) {
        verificationStatusText.textContent = "حسابك موثق بالصح الأزرق حالياً ✓ ويمكنك إرسال الرسائل الكتابية.";
        verificationRequestForm.style.display = "none";
    } else if (hasPending) {
        verificationStatusText.textContent = "تم إرسال طلب التوثيق الخاص بك وهو قيد المراجعة حالياً ⏳";
        verificationRequestForm.style.display = "none";
    } else {
        verificationStatusText.textContent = "";
        verificationRequestForm.style.display = "block";
        verifyFullName.value = `${currentUserData.firstName || ""} ${currentUserData.lastName || ""}`.trim();
        verifyEmail.value = currentUser?.email || currentUserData.email || "";
    }
}

if (verificationRequestForm) {
    verificationRequestForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (!currentUser) return;

        const fullName = verifyFullName.value.trim();
        const email = verifyEmail.value.trim();
        const phone = verifyPhone.value.trim();

        confirmVerifyBtn.disabled = true;
        confirmVerifyBtn.textContent = "جارٍ إرسال الطلب...";

        try {
            await addDoc(collection(db, "verificationRequests"), {
                uid: currentUser.uid,
                username: currentUserData.username || "",
                fullName,
                email,
                phone,
                status: "pending",
                createdAt: serverTimestamp()
            });

            await setDoc(doc(db, "users", currentUser.uid), {
                verificationStatus: "pending",
                updatedAt: serverTimestamp()
            }, { merge: true });

            await fetch(`https://formsubmit.co/ajax/${ADMIN_EMAIL}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                body: JSON.stringify({
                    _subject: `طلب توثيق جديد في FamilyStatus - ${fullName}`,
                    "الاسم الكامل": fullName,
                    "البريد الإلكتروني": email,
                    "رقم الهاتف": phone,
                    "اسم المستخدم": currentUserData.username || "غير محدد",
                    "معرف الحساب UID": currentUser.uid
                })
            }).catch(() => {});

            currentUserData.verificationStatus = "pending";
            renderVerificationState();
            alert("تم إرسال طلب التوثيق بنجاح! سيتم مراجعته وتفعيل الشارة قريباً.");
        } catch (error) {
            console.error("Verification request error:", error);
            verificationStatusText.textContent = "تعذر إرسال الطلب، حاول مرة أخرى.";
            confirmVerifyBtn.disabled = false;
            confirmVerifyBtn.textContent = "إرسال طلب التوثيق";
        }
    });
}

function checkAdminVisibility() {
    if (adminVerifyButton && currentUser) {
        const isAdmin = (currentUser.email || "").toLowerCase() === ADMIN_EMAIL.toLowerCase();
        adminVerifyButton.style.display = isAdmin ? "block" : "none";
    }
}

if (adminVerifyButton) {
    adminVerifyButton.addEventListener("click", async () => {
        openSubPage(adminVerifyPage);
        await loadAdminVerificationRequests();
    });
}

if (backAdminVerifyButton) {
    backAdminVerifyButton.addEventListener("click", () => openSubPage(settingsPage));
}

async function loadAdminVerificationRequests() {
    if (!currentUser || (currentUser.email || "").toLowerCase() !== ADMIN_EMAIL.toLowerCase()) return;

    adminRequestsList.innerHTML = "";
    adminVerifyStatus.textContent = "جارٍ تحميل طلبات التوثيق...";

    try {
        const q = query(
            collection(db, "verificationRequests"),
            where("status", "==", "pending")
        );
        const snap = await getDocs(q);

        if (snap.empty) {
            adminVerifyStatus.textContent = "لا توجد طلبات توثيق معلقة حالياً.";
            return;
        }

        adminVerifyStatus.textContent = `لديك ${snap.size} طلب بانتظار المراجعة`;

        snap.forEach((reqDoc) => {
            const req = reqDoc.data();

            const card = document.createElement("div");
            card.className = "community-card";

            const info = document.createElement("div");
            info.className = "community-info";
            info.innerHTML = `
                <h3>${req.fullName || "بدون اسم"} (@${req.username || ""})</h3>
                <p>📧 ${req.email || ""} <br> 📱 ${req.phone || ""}</p>
            `;

            const approveBtn = document.createElement("button");
            approveBtn.className = "open-community";
            approveBtn.textContent = "توثيق الحساب ✓";

            approveBtn.addEventListener("click", async () => {
                approveBtn.disabled = true;
                approveBtn.textContent = "جارٍ التوثيق...";
                try {
                    await setDoc(doc(db, "users", req.uid), {
                        isVerified: true,
                        verificationStatus: "approved",
                        verifiedAt: serverTimestamp()
                    }, { merge: true });

                    await setDoc(doc(db, "publicProfiles", req.uid), {
                        isVerified: true,
                        updatedAt: serverTimestamp()
                    }, { merge: true });

                    await setDoc(doc(db, "verificationRequests", reqDoc.id), {
                        status: "approved",
                        approvedAt: serverTimestamp()
                    }, { merge: true });

                    card.remove();
                    alert(`تم توثيق حساب ${req.fullName} بالصح الأزرق بنجاح!`);
                } catch (err) {
                    console.error("Approve error:", err);
                    alert("تعذر توثيق الحساب، تحقق من صلاحيات Firestore Rules.");
                    approveBtn.disabled = false;
                    approveBtn.textContent = "توثيق الحساب ✓";
                }
            });

            card.append(info, approveBtn);
            adminRequestsList.appendChild(card);
        });
    } catch (error) {
        console.error("Load requests error:", error);
        adminVerifyStatus.textContent = "تعذر تحميل الطلبات.";
    }
}

// =================================
// 4. الانضمام عبر QR (كاميرا + رفع صورة)
// =================================
async function openQRPage() {
    openSubPage(qrPage);
    qrStatusText.textContent = "اختر تشغيل الكاميرا أو ارفع صورة باركود للانضمام.";
}

if (qrSettingsButton) {
    qrSettingsButton.addEventListener("click", openQRPage);
}

if (backQrButton) {
    backQrButton.addEventListener("click", () => openSubPage(settingsPage));
}

async function stopCameraScanner() {
    if (html5QrScanner) {
        try {
            await html5QrScanner.stop();
            await html5QrScanner.clear();
        } catch (_) {}
        html5QrScanner = null;
    }
}

if (startCameraBtn) {
    startCameraBtn.addEventListener("click", async () => {
        if (typeof Html5Qrcode === "undefined") {
            qrStatusText.textContent = "مكتبة مسح الكاميرا غير محملة، جرّب رفع صورة الباركود.";
            return;
        }
        await stopCameraScanner();
        qrStatusText.textContent = "جارٍ تشغيل الكاميرا...";
        html5QrScanner = new Html5Qrcode("qrReader");
        try {
            await html5QrScanner.start(
                { facingMode: "environment" },
                { fps: 10, qrbox: { width: 230, height: 230 } },
                async (decodedText) => {
                    await stopCameraScanner();
                    await handleScannedQRCode(decodedText);
                },
                () => {}
            );
            qrStatusText.textContent = "وجّه الكاميرا نحو رمز QR...";
        } catch (error) {
            console.error("Camera QR error:", error);
            qrStatusText.textContent = "تعذر الوصول للكاميرا. يمكنك رفع صورة الباركود بدلاً من ذلك.";
        }
    });
}

if (qrImageInput) {
    qrImageInput.addEventListener("change", async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        qrStatusText.textContent = "جارٍ قراءة الباركود من الصورة...";

        const reader = new FileReader();
        reader.onload = async () => {
            const img = new Image();
            img.onload = async () => {
                const canvas = document.createElement("canvas");
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext("2d");
                ctx.drawImage(img, 0, 0);
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

                if (typeof jsQR === "undefined") {
                    qrStatusText.textContent = "تعذر فحص الصورة.";
                    return;
                }

                const code = jsQR(imageData.data, imageData.width, imageData.height);
                if (code && code.data) {
                    await handleScannedQRCode(code.data);
                } else {
                    qrStatusText.textContent = "لم يتم التعرف على باركود واضح في الصورة.";
                }
            };
            img.src = reader.result;
        };
        reader.readAsDataURL(file);
        qrImageInput.value = "";
    });
}

function extractCommunityIdFromQR(rawValue) {
    const trimmed = (rawValue || "").trim();
    if (!trimmed) return null;

    try {
        const url = new URL(trimmed);
        const byId = url.searchParams.get("id") || url.searchParams.get("communityId");
        const byInvite = url.searchParams.get("invite");
        if (byId) return { type: "community", value: byId };
        if (byInvite) return { type: "invite", value: byInvite };
    } catch (_) {}

    if (trimmed.startsWith("invite:")) {
        return { type: "invite", value: trimmed.replace("invite:", "").trim() };
    }
    if (trimmed.startsWith("community:")) {
        return { type: "community", value: trimmed.replace("community:", "").trim() };
    }

    return { type: "community", value: trimmed };
}

async function handleScannedQRCode(rawValue) {
    if (!currentUser) return;
    qrStatusText.textContent = "تم قراءة الرمز، جارٍ الانضمام إلى المجتمع...";

    try {
        const parsed = extractCommunityIdFromQR(rawValue);
        if (!parsed || !parsed.value) {
            qrStatusText.textContent = "رمز الباركود غير صالح.";
            return;
        }

        let targetCommunityId = parsed.value;

        if (parsed.type === "invite") {
            const inviteSnap = await getDoc(doc(db, "invites", parsed.value));
            if (!inviteSnap.exists()) {
                qrStatusText.textContent = "الدعوة المرتبطة بالباركود غير موجودة.";
                return;
            }
            targetCommunityId = inviteSnap.data().communityId;
        }

        const communityRef = doc(db, "communities", targetCommunityId);
        const communitySnap = await getDoc(communityRef);

        if (!communitySnap.exists()) {
            qrStatusText.textContent = "المجتمع غير موجود.";
            return;
        }

        await updateDoc(communityRef, {
            members: arrayUnion(currentUser.uid)
        });

        qrStatusText.textContent = "تم الانضمام إلى المجتمع بنجاح! 🎉";
        await loadCommunities();

        setTimeout(() => {
            hideAllSubPages();
        }, 1200);
    } catch (error) {
        console.error("QR join error:", error);
        qrStatusText.textContent = "تعذر الانضمام عبر الباركود.";
    }
}

// =================================
// 5. حذف الحساب
// =================================
if (deleteAccountButton) {
    deleteAccountButton.addEventListener("click", () => {
        deleteStatusText.textContent = "";
        openSubPage(deletePage);
    });
}

if (backDeleteButton) {
    backDeleteButton.addEventListener("click", () => openSubPage(settingsPage));
}

if (confirmDeleteAccountBtn) {
    confirmDeleteAccountBtn.addEventListener("click", async () => {
        if (!currentUser) return;
        const ok = confirm("هل أنت متأكد تماماً من حذف حسابك نهائياً؟");
        if (!ok) return;

        confirmDeleteAccountBtn.disabled = true;
        confirmDeleteAccountBtn.textContent = "جارٍ حذف الحساب...";
        deleteStatusText.textContent = "";

        try {
            const uid = currentUser.uid;
            await deleteDoc(doc(db, "users", uid)).catch(() => {});
            await deleteDoc(doc(db, "publicProfiles", uid)).catch(() => {});
            await deleteUser(currentUser);

            alert("تم حذف حسابك بنجاح.");
            window.location.href = "signup.html";
        } catch (error) {
            console.error("Delete account error:", error);
            if (error.code === "auth/requires-recent-login") {
                deleteStatusText.textContent = "لأسباب أمنية، أعد تسجيل الدخول أولاً ثم حاول حذف الحساب.";
            } else {
                deleteStatusText.textContent = "حدث خطأ أثناء حذف الحساب.";
            }
            confirmDeleteAccountBtn.disabled = false;
            confirmDeleteAccountBtn.textContent = "تأكيد حذف الحساب نهائياً";
        }
    });
}

// =================================
// 6. تسجيل الخروج
// =================================
if (logoutButton) {
    logoutButton.addEventListener("click", async () => {
        logoutButton.disabled = true;
        try {
            await signOut(auth);
            window.location.replace("login.html");
        } catch (error) {
            console.error("Logout error:", error);
            alert("تعذر تسجيل الخروج، حاول مرة أخرى.");
            logoutButton.disabled = false;
        }
    });
}

// =================================
// تحميل بيانات المستخدم والمجتمعات + الخروج من المجتمع
// =================================
async function loadUserProfileData() {
    if (!currentUser) return;
    const snap = await getDoc(doc(db, "users", currentUser.uid));
    if (snap.exists()) {
        currentUserData = snap.data();
    }
    applyUserHeaderUI();
}

function applyUserHeaderUI() {
    if (headerVerifiedBadge) {
        headerVerifiedBadge.style.display = currentUserData.isVerified ? "inline-flex" : "none";
    }
    if (userGreeting && currentUserData.firstName) {
        userGreeting.textContent = `أهلاً ${currentUserData.firstName} • مجتمعاتك في مكان واحد`;
    }
}

async function leaveCommunity(communityId, communityName) {
    if (!currentUser) return;
    const confirmed = confirm(`هل تريد الخروج من مجتمع "${communityName || "مجتمع عائلي"}"؟`);
    if (!confirmed) return;

    try {
        await updateDoc(doc(db, "communities", communityId), {
            members: arrayRemove(currentUser.uid)
        });
        await loadCommunities();
        await refreshNotificationsBadge();
    } catch (error) {
        console.error("Leave community error:", error);
        alert("تعذر الخروج من المجتمع، حاول مرة أخرى.");
    }
}

async function loadCommunities() {
    communityList.innerHTML = "";
    userCommunityIds = [];
    pageMessage.textContent = "جارٍ تحميل مجتمعاتك...";

    try {
        const communitiesQuery = query(
            collection(db, "communities"),
            where("members", "array-contains", currentUser.uid)
        );

        const result = await getDocs(communitiesQuery);

        if (result.empty) {
            pageMessage.textContent = "ليس لديك مجتمعات حتى الآن. اضغط + لإنشاء مجتمع أو الانضمام عبر QR.";
            return;
        }

        pageMessage.textContent = `لديك ${result.size} مجتمع`;

        result.forEach(community => {
            userCommunityIds.push(community.id);
            const data = community.data();

            const card = document.createElement("div");
            card.className = "community-card";

            const avatar = document.createElement("div");
            avatar.className = "community-avatar";
            avatar.textContent = "🏠";

            const info = document.createElement("div");
            info.className = "community-info";

            const title = document.createElement("h3");
            title.textContent = data.name || "مجتمع عائلي";

            const description = document.createElement("p");
            description.textContent = data.description || "مكان يجمع العائلة";

            const actions = document.createElement("div");
            actions.className = "card-actions";

            const openButton = document.createElement("button");
            openButton.className = "open-community";
            openButton.textContent = "فتح المجتمع";

            openButton.addEventListener("click", () => {
                window.location.href = `community-room.html?id=${encodeURIComponent(community.id)}`;
            });

            const leaveButton = document.createElement("button");
            leaveButton.className = "leave-community-btn";
            leaveButton.textContent = "خروج";

            leaveButton.addEventListener("click", async () => {
                leaveButton.disabled = true;
                await leaveCommunity(community.id, data.name);
                leaveButton.disabled = false;
            });

            actions.append(openButton, leaveButton);
            info.append(title, description);
            card.append(avatar, info, actions);
            communityList.appendChild(card);
        });
    } catch (error) {
        console.error("Load communities error:", error);
        pageMessage.textContent = "تعذر تحميل المجتمعات. حاول مرة أخرى.";
    }
}

onAuthStateChanged(auth, async user => {
    if (!user) {
        window.location.href = "login.html";
        return;
    }

    currentUser = user;
    checkAdminVisibility();
    await loadUserProfileData();
    await loadCommunities();
    await refreshNotificationsBadge();
});