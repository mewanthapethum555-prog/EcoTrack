import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported as isAnalyticsSupported } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDCa5rCZOykfMTQDrW_SXPqkA_HtKD_Qvk",
  authDomain: "eco-track-a45b2.firebaseapp.com",
  projectId: "eco-track-a45b2",
  storageBucket: "eco-track-a45b2.firebasestorage.app",
  messagingSenderId: "1860768589",
  appId: "1:1860768589:web:e2e65e2f1f42e495fb9d04",
  measurementId: "G-CV3D4G1XR8"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Analytics is optional and not supported everywhere (SSR / some browsers).
export let analytics = null;
if (typeof window !== "undefined") {
  isAnalyticsSupported()
    .then((ok) => {
      if (ok) analytics = getAnalytics(app);
    })
    .catch(() => {
      analytics = null;
    });
}