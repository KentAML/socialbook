// script.js — accounts and profiles stored online with Firebase.

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

// ===== PASTE YOUR FIREBASE CONFIG HERE =====
const firebaseConfig = {
  apiKey: "PASTE_HERE",
  authDomain: "PASTE_HERE",
  projectId: "PASTE_HERE",
  storageBucket: "PASTE_HERE",
  messagingSenderId: "PASTE_HERE",
  appId: "PASTE_HERE"
};
// ===========================================

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ---------- Helpers ----------
function showMessage(el, text, isError = true) {
  el.textContent = text;
  el.style.color = isError ? "crimson" : "green";
}

function friendlyError(err) {
  switch (err.code) {
    case "auth/email-already-in-use": return "That email is already registered.";
    case "auth/weak-password": return "Password must be at least 8 characters.";
    case "auth/invalid-email": return "Please enter a valid email address.";
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found": return "Incorrect email or password.";
    case "auth/too-many-requests": return "Too many attempts. Try again later.";
    case "auth/network-request-failed": return "Network problem. Check your internet.";
    default: return "Error: " + (err.code || err.message);
  }
}

// ---------- Register ----------
const registerForm = document.getElementById("registerForm");

if (registerForm) {
  const registerMessage = document.getElementById("registerMessage");

  registerForm.addEventListener("submit", async (e) => {
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

    try {
      showMessage(registerMessage, "Creating account...", false);
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await setDoc(doc(db, "users", cred.user.uid), {
        firstName, lastName, birthday, gender, email
      });
      showMessage(registerMessage, "Account created! Redirecting...", false);
      setTimeout(() => (window.location.href = "profile.html"), 1000);
    } catch (err) {
      showMessage(registerMessage, friendlyError(err));
    }
  });
}

// ---------- Login ----------
const loginForm = document.getElementById("loginForm");

if (loginForm) {
  const loginMessage = document.getElementById("loginMessage");

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("loginEmail").value.trim().toLowerCase();
    const password = document.getElementById("loginPassword").value;

    try {
      showMessage(loginMessage, "Logging in...", false);
      await signInWithEmailAndPassword(auth, email, password);
      showMessage(loginMessage, "Welcome back!", false);
      setTimeout(() => (window.location.href = "profile.html"), 600);
    } catch (err) {
      showMessage(loginMessage, friendlyError(err));
    }
  });
}

// ---------- Profile ----------
const profileName = document.getElementById("profileName");

if (profileName) {
  const profileImage = document.getElementById("profileImage");
  const profileInitial = document.getElementById("profileInitial");
  const photoInput = document.getElementById("photoInput");

  function showPhoto(src) {
    profileImage.src = src;
    profileImage.hidden = false;
    profileImage.style.display = "block";
    profileInitial.style.display = "none";
  }

  onAuthStateChanged(auth, async (firebaseUser) => {
    // Not logged in -> back to login page
    if (!firebaseUser) {
      window.location.href = "index.html";
      return;
    }

    const userRef = doc(db, "users", firebaseUser.uid);
    let data;
    try {
      const snap = await getDoc(userRef);
      data = snap.exists() ? snap.data() : null;
    } catch (err) {
      alert("Could not load your profile: " + err.message);
      return;
    }

    if (!data) {
      alert("Profile data not found for this account.");
      return;
    }

    profileName.textContent = `${data.firstName} ${data.lastName}`;
    profileInitial.textContent = data.firstName.charAt(0).toUpperCase();
    document.getElementById("profileEmail").textContent = data.email;
    document.getElementById("profileBirthday").textContent = data.birthday;
    document.getElementById("profileGender").textContent = data.gender;

    if (data.photo) showPhoto(data.photo);

    // Change profile picture
    photoInput.addEventListener("change", () => {
      const file = photoInput.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onerror = () => alert("Could not read that file.");
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => alert("That image type isn't supported. Try a JPG or PNG.");
        img.onload = async () => {
          // Crop to a square and shrink so it stays small
          const size = 200;
          const canvas = document.createElement("canvas");
          canvas.width = canvas.height = size;
          const min = Math.min(img.width, img.height);
          canvas.getContext("2d").drawImage(
            img, (img.width - min) / 2, (img.height - min) / 2, min, min, 0, 0, size, size
          );
          const dataUrl = canvas.toDataURL("image/jpeg", 0.8);

          showPhoto(dataUrl);
          try {
            await updateDoc(userRef, { photo: dataUrl });
          } catch (err) {
            alert("Photo shown but NOT saved: " + err.message);
          }
          photoInput.value = "";
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  });

  // Log out
  document.getElementById("logoutBtn").addEventListener("click", async () => {
    await signOut(auth);
    window.location.href = "index.html";
  });
}