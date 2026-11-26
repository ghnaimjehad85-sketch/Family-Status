
const loginButton = document.querySelector(".login-btn");
const signupButton = document.querySelector(".signup-btn");
const primaryButton = document.querySelector(".primary-btn");
const secondaryButton = document.querySelector(".secondary-btn");

if (loginButton) {
    loginButton.addEventListener("click", () => {
        window.location.href = "login.html";
    });
}

if (signupButton) {
    signupButton.addEventListener("click", () => {
        window.location.href = "signup.html";
    });
}

if (primaryButton) {
    primaryButton.addEventListener("click", () => {
        window.location.href = "signup.html";
    });
}

if (secondaryButton) {
    secondaryButton.addEventListener("click", () => {
        document.querySelector(".preview-card").scrollIntoView({
            behavior: "smooth",
            block: "center"
        });
    });
}
