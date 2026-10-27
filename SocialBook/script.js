// script.js — classroom demo only: data is kept in the browser, NOT secure.

const USERS_KEY = "socialbookUsers";
const SESSION_KEY = "socialbookCurrentUser";

// ---------- Helpers ----------
function getUsers() {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY)) || [];
  } catch {
    return [];
  }
}

function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function showMessage(el, text, isError = true) {
  el.textContent = text;
  el.style.color = isError ? "crimson" : "green";
}

// ---------- Register ----------
const registerForm = document.getElementById("registerForm");

if (registerForm) {
  const registerMessage = document.getElementById("registerMessage");

  registerForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const firstName = document.getElementById("firstName").value.trim();
    const lastName = document.getElementById("lastName").value.trim();
    const birthday = document.getElementById("birthday").value;
    const gender = document.getElementById("gender").value;
    const email = document.getElementById("registerEmail").value.trim().toLowerCase();
    const password = document.getElementById("registerPassword").value;
    const confirmPassword = document.getElementById("confirmPassword").value;

    if (password !== confirmPassword) {
      showMessage(registerMessage, "Passwords do not match.");
      return;
    }

    const users = getUsers();
    if (users.some((u) => u.email === email)) {
      showMessage(registerMessage, "That email is already registered.");
      return;
    }

    users.push({ firstName, lastName, birthday, gender, email, password });
    saveUsers(users);

    showMessage(registerMessage, "Account created! Redirecting to login...", false);
    registerForm.reset();
    setTimeout(() => (window.location.href = "index.html"), 1200);
  });
}

// ---------- Login ----------
const loginForm = document.getElementById("loginForm");

if (loginForm) {
  const loginMessage = document.getElementById("loginMessage");

  loginForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const email = document.getElementById("loginEmail").value.trim().toLowerCase();
    const password = document.getElementById("loginPassword").value;

    const user = getUsers().find((u) => u.email === email && u.password === password);

    if (!user) {
      showMessage(loginMessage, "Incorrect email or password.");
      return;
    }

    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ email: user.email }));

    showMessage(loginMessage, `Welcome back, ${user.firstName}!`, false);
    setTimeout(() => (window.location.href = "profile.html"), 800);
  });
}

// ---------- Profile ----------
const profileName = document.getElementById("profileName");

if (profileName) {
  const session = JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null");
  const user = session && getUsers().find((u) => u.email === session.email);

  if (!user) {
    window.location.href = "index.html";
  } else {
    profileName.textContent = `${user.firstName} ${user.lastName}`;
    document.getElementById("profileInitial").textContent = user.firstName.charAt(0).toUpperCase();
    document.getElementById("profileEmail").textContent = user.email;
    document.getElementById("profileBirthday").textContent = user.birthday;
    document.getElementById("profileGender").textContent = user.gender;

    // Profile picture
    const profileImage = document.getElementById("profileImage");
    const profileInitial = document.getElementById("profileInitial");
    const photoInput = document.getElementById("photoInput");

    function showPhoto(src) {
      profileImage.src = src;
      profileImage.hidden = false;
      profileInitial.hidden = true;
    }

    if (user.photo) showPhoto(user.photo);

    photoInput.addEventListener("change", () => {
      const file = photoInput.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onerror = () => alert("Could not read that file.");
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => alert("That image type isn't supported. Try a JPG or PNG.");
        img.onload = () => {
          // Crop to a square and shrink so it fits in storage
          const size = 200;
          const canvas = document.createElement("canvas");
          canvas.width = canvas.height = size;
          const min = Math.min(img.width, img.height);
          canvas.getContext("2d").drawImage(
            img, (img.width - min) / 2, (img.height - min) / 2, min, min, 0, 0, size, size
          );
          const dataUrl = canvas.toDataURL("image/jpeg", 0.8);

          try {
            const users = getUsers();
            const i = users.findIndex((u) => u.email === user.email);
            users[i].photo = dataUrl;
            saveUsers(users);
            showPhoto(dataUrl);
          } catch (err) {
            alert("Could not save the photo: " + err.message);
          }
          photoInput.value = "";
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  // Log out
  document.getElementById("logoutBtn").addEventListener("click", () => {
    sessionStorage.removeItem(SESSION_KEY);
    window.location.href = "index.html";
  });
}
// ---------- Export / Import accounts ----------
const exportBtn = document.getElementById("exportBtn");
const importInput = document.getElementById("importInput");

if (exportBtn) {
  exportBtn.addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(getUsers(), null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "socialbook-accounts.json";
    a.click();
    URL.revokeObjectURL(a.href);
  });
}

if (importInput) {
  importInput.addEventListener("change", () => {
    const file = importInput.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const imported = JSON.parse(reader.result);
        if (!Array.isArray(imported)) throw new Error("Wrong file format");

        const users = getUsers();
        imported.forEach((u) => {
          if (!u.email) return;
          const i = users.findIndex((x) => x.email === u.email);
          if (i === -1) users.push(u);
          else users[i] = u; // overwrite so the photo and latest details come along
        });
        saveUsers(users);
        alert("Accounts imported. You can log in now.");
      } catch (err) {
        alert("Could not import: " + err.message);
      }
      importInput.value = "";
    };
    reader.readAsText(file);
  });
}