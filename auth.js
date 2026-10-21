// ═══════════════════════════════════════════════════════════════
// AUTH — Placeholder until Firebase is set up.
// When you're ready, uncomment loadFirebase() at the bottom.
// ═══════════════════════════════════════════════════════════════

let _currentUser = null;
let _fbReady = false;

function isAuthReady() {
  return _fbReady;
}

function getCurrentUser() {
  return _currentUser;
}

async function signInWithEmail(email, password) {
  if (!_fbReady) { console.warn("Auth not configured yet."); return null; }
  // TODO: firebase.auth().signInWithEmailAndPassword(email, password)
  return null;
}

async function signInWithGoogle() {
  if (!_fbReady) { console.warn("Auth not configured yet."); return null; }
  // TODO: firebase.auth().signInWithPopup(new firebase.auth.GoogleAuthProvider())
  return null;
}

async function signUpWithEmail(email, password) {
  if (!_fbReady) { console.warn("Auth not configured yet."); return null; }
  // TODO: firebase.auth().createUserWithEmailAndPassword(email, password)
  return null;
}

async function signOutUser() {
  if (!_fbReady) { _currentUser = null; return; }
  // TODO: firebase.auth().signOut()
}

function openLoginModal() {
  document.getElementById("loginModal").classList.add("open");
}

function closeLoginModal() {
  document.getElementById("loginModal").classList.remove("open");
}

// ── Uncomment this when Firebase keys are filled in ──
// function loadFirebase() {
//   const s = document.createElement("script");
//   s.src = "https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js";
//   s.onload = () => {
//     const s2 = document.createElement("script");
//     s2.src = "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth-compat.js";
//     s2.onload = () => {
//       firebase.initializeApp(window.FIREBASE_CONFIG);
//       _fbReady = true;
//       firebase.auth().onAuthStateChanged(u => { _currentUser = u; });
//     };
//     document.head.appendChild(s2);
//   };
//   document.head.appendChild(s);
// }
// loadFirebase();