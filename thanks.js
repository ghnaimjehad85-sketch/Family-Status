(() => {
    if (window.__familyStatusThanksLoaded) return;
    window.__familyStatusThanksLoaded = true;

    const style = document.createElement("style");

    style.textContent = `
    .thanks-button {
        position: fixed;
        bottom: 25px;
        right: 25px;
        width: 58px;
        height: 58px;
        border-radius: 50%;
        border: 1px solid rgba(249, 115, 22, 0.55);
        background: linear-gradient(135deg, #f97316, #ec4899);
        color: white;
        font-size: 25px;
        cursor: pointer;
        z-index: 9998;
        box-shadow: 0 8px 25px rgba(249, 115, 22, 0.35);
        transition: transform 0.25s ease, box-shadow 0.25s ease, filter 0.25s ease;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: 'Cairo', sans-serif;
    }

    .thanks-button:hover {
        transform: translateY(-3px) scale(1.06);
        box-shadow: 0 12px 30px rgba(236, 72, 153, 0.42);
        filter: brightness(1.08);
    }

    .thanks-modal {
        display: none;
        position: fixed;
        inset: 0;
        background: rgba(10, 5, 8, 0.82);
        backdrop-filter: blur(10px);
        z-index: 9999;
        justify-content: center;
        align-items: center;
        padding: 18px;
    }

    .thanks-modal.active {
        display: flex;
    }

    .thanks-card {
        position: relative;
        background: linear-gradient(160deg, #24141b, #190e13);
        border: 1px solid rgba(249, 115, 22, 0.32);
        border-radius: 26px;
        padding: 32px 24px 26px;
        width: 100%;
        max-width: 400px;
        text-align: center;
        color: #fff5f7;
        box-shadow: 0 25px 70px rgba(0, 0, 0, 0.55);
        animation: thanksPopIn 0.22s ease-out;
        font-family: 'Cairo', sans-serif;
    }

    @keyframes thanksPopIn {
        from {
            opacity: 0;
            transform: scale(0.94) translateY(10px);
        }
        to {
            opacity: 1;
            transform: scale(1) translateY(0);
        }
    }

    .close-thanks {
        position: absolute;
        top: 12px;
        left: 14px;
        width: 34px;
        height: 34px;
        border-radius: 10px;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(249, 115, 22, 0.22);
        color: #fbcfe8;
        font-size: 22px;
        line-height: 1;
        cursor: pointer;
        transition: 0.2s;
    }

    .close-thanks:hover {
        background: rgba(236, 72, 153, 0.2);
        color: #fff;
    }

    .thanks-icon {
        width: 66px;
        height: 66px;
        margin: 0 auto 12px;
        border-radius: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 36px;
        background: rgba(249, 115, 22, 0.14);
        border: 1px solid rgba(236, 72, 153, 0.28);
    }

    .thanks-card h2 {
        color: #fed7aa;
        font-size: 21px;
        margin: 0 0 10px;
        font-weight: 800;
    }

    .thanks-card p {
        color: #d6bec7;
        line-height: 1.9;
        font-size: 14px;
        margin: 0;
    }

    .thanks-card strong {
        color: #fb923c;
    }

    .thanks-badge-pill {
        display: inline-block;
        margin-top: 12px;
        padding: 5px 12px;
        border-radius: 999px;
        background: rgba(236, 72, 153, 0.14);
        border: 1px solid rgba(244, 114, 182, 0.28);
        color: #fbcfe8;
        font-size: 12px;
        font-weight: 600;
    }

    .thanks-divider {
        height: 1px;
        background: linear-gradient(90deg, transparent, rgba(249, 115, 22, 0.35), transparent);
        margin: 20px 0;
    }

    .thanks-card h3 {
        color: #f472b6;
        font-size: 16px;
        margin: 0 0 6px;
        font-weight: 700;
    }

    .iban-box {
        background: #140b0f;
        border: 1px solid rgba(249, 115, 22, 0.35);
        padding: 13px 10px;
        border-radius: 13px;
        font-size: 13px;
        font-weight: 700;
        color: #fff5f7;
        overflow-wrap: anywhere;
        user-select: all;
        direction: ltr;
        margin-top: 10px;
    }

    .copy-iban-btn {
        width: 100%;
        margin-top: 10px;
        padding: 10px 14px;
        border: none;
        border-radius: 12px;
        background: linear-gradient(135deg, #f97316, #ec4899);
        color: #fff;
        font-family: 'Cairo', sans-serif;
        font-size: 13px;
        font-weight: 700;
        cursor: pointer;
        transition: 0.2s;
    }

    .copy-iban-btn:hover {
        filter: brightness(1.08);
        transform: translateY(-1px);
    }

    .thanks-footer {
        margin-top: 18px !important;
        color: #fbcfe8 !important;
        font-size: 13px !important;
        font-weight: 600;
    }

    @media (max-width: 500px) {
        .thanks-button {
            bottom: 18px;
            right: 18px;
            width: 52px;
            height: 52px;
            font-size: 22px;
        }
    }
    `;

    document.head.appendChild(style);

    const button = document.createElement("button");
    button.className = "thanks-button";
    button.type = "button";
    button.textContent = "🌅";
    button.title = "رسالة شكر ودعم";

    const modal = document.createElement("div");
    modal.className = "thanks-modal";

    modal.innerHTML = `
        <div class="thanks-card">
            <button class="close-thanks" type="button" aria-label="إغلاق">×</button>

            <div class="thanks-icon">🌅</div>

            <h2>شكراً لاستخدامك FamilyStatus</h2>

            <p>
                هذا الموقع صُنع بكل حب واهتمام ليجمع العائلة،
                ونقدّر تعب وجهد المطور الذي استغرق
                <strong>شهرين</strong>
                في صناعة هذا الموقع.
            </p>

            <div class="thanks-badge-pill">ثيم الغروب الدافئ • FamilyStatus</div>

            <div class="thanks-divider"></div>

            <h3>دعم وتقدير المطوّر</h3>

            <p>رقم الآيبان:</p>

            <div class="iban-box" id="developerIbanText">SA8520000002372731479940</div>

            <button class="copy-iban-btn" type="button" id="copyIbanBtn">
                📋 نسخ رقم الآيبان
            </button>

            <p class="thanks-footer">
                شكراً لكونك جزءاً من عائلتنا 🧡
            </p>
        </div>
    `;

    document.body.append(button, modal);

    const closeBtn = modal.querySelector(".close-thanks");
    const copyIbanBtn = modal.querySelector("#copyIbanBtn");
    const ibanText = modal.querySelector("#developerIbanText")?.textContent?.trim() || "";

    const closeModal = () => {
        modal.classList.remove("active");
    };

    button.addEventListener("click", () => {
        modal.classList.add("active");
    });

    closeBtn.addEventListener("click", closeModal);

    modal.addEventListener("click", (event) => {
        if (event.target === modal) {
            closeModal();
        }
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && modal.classList.contains("active")) {
            closeModal();
        }
    });

    if (copyIbanBtn && ibanText) {
        copyIbanBtn.addEventListener("click", async () => {
            try {
                await navigator.clipboard.writeText(ibanText);
                copyIbanBtn.textContent = "تم نسخ الآيبان ✓";
                setTimeout(() => {
                    copyIbanBtn.textContent = "📋 نسخ رقم الآيبان";
                }, 2000);
            } catch (_) {
                copyIbanBtn.textContent = "حدّد الرقم أعلاه للنسخ";
                setTimeout(() => {
                    copyIbanBtn.textContent = "📋 نسخ رقم الآيبان";
                }, 2000);
            }
        });
    }
})();