
const params = new URLSearchParams(window.location.search);

const inviteLink = params.get("link");

const input = document.getElementById("inviteLink");
const copyButton = document.getElementById("copyInvite");
const message = document.getElementById("copyMessage");

if (inviteLink) {
    try {
        const url = new URL(inviteLink);

        if (url.protocol !== "https:" && url.protocol !== "http:") {
            throw new Error("Invalid link");
        }

        input.value = url.href;

    } catch {
        input.value = "";
        copyButton.disabled = true;
        message.textContent = "رابط الدعوة غير صالح.";
    }
} else {
    input.value = "";
    copyButton.disabled = true;
    message.textContent = "لم يتم العثور على رابط الدعوة.";
}

copyButton.addEventListener("click", async () => {
    try {
        await navigator.clipboard.writeText(input.value);
        message.textContent = "تم نسخ رابط الدعوة بنجاح! 🎉";
    } catch {
        input.select();
        message.textContent = "انسخ الرابط يدوياً.";
    }
});
