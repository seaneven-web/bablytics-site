// Bablytics Guide — Firebase web config for the mailing-list pages
// (subscribe.html / unsubscribe.html). Round 26.
//
// null = the Firebase project does not exist yet (owner decision, 2026-08-23).
// While it is null the sign-up form degrades honestly to a mailto: flow — the
// button reads "Subscribe by email" and opens the visitor's own mail app with
// the request prefilled; nothing is written anywhere and nothing is sent
// automatically.
//
// To switch the real form on: follow site/firebase/README.md, then replace the
// null with the four values `firebase apps:sdkconfig web` prints, e.g.
//
//   window.BABLYTICS_FIREBASE = {
//     apiKey: "AIza…",                          // a public web API key — access is
//     authDomain: "bablytics-site.firebaseapp.com", // gated by firestore.rules, not by this
//     projectId: "bablytics-site",
//     appId: "1:…:web:…",
//   };
//
// Only these four keys are read. Keep the file as plain JS (no module syntax):
// both pages load it with a classic <script src="assets/firebase-config.js">.
window.BABLYTICS_FIREBASE = null;
