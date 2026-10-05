import { useCallback, useEffect, useRef, useState } from "react";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup, signInAnonymously, signOut, onAuthStateChanged, updateProfile } from "firebase/auth";
import { auth, googleProvider } from "../firebase/firebase";
import { AuthContext } from "./AuthContext";
import { getProfile } from "../api/authApi";
import { prepareDemoVehicle } from "../api/demoApi";
const empty = { firebaseUser: null, user: null, vehicles: [], activeVehicle: null };
export function AuthProvider({ children }) {
  const [state, setState] = useState(empty);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const work = useRef({ uid: null, controller: null, promise: null });
  const readyUid = useRef(null);
  const loadProfile = useCallback((firebaseUser, force = false) => {
    const uid = firebaseUser?.uid || null;
    // A completed sign-in operation may arrive after logout or another sign-in.
    if (uid !== (auth.currentUser?.uid || null)) return Promise.reject(new DOMException("Account changed", "AbortError"));
    if (!force && work.current.uid === uid && work.current.promise && !work.current.controller?.signal.aborted) return work.current.promise;
    work.current.controller?.abort();
    const controller = new AbortController();
    const identityChanged = work.current.uid !== uid;
    const job = { uid, controller, promise: null };
    work.current = job;
    if (identityChanged || !uid) { readyUid.current = null; setState({ ...empty, firebaseUser }); }
    if (identityChanged || (uid && readyUid.current !== uid)) setLoading(true);
    setError("");
    job.promise = (async () => {
      try {
        if (!firebaseUser) return null;
        const options = { user: firebaseUser, signal: controller.signal };
        let user = await getProfile(options);
        let demo = null;
        if ((firebaseUser.isAnonymous || user.role === "GUEST") && !user.vehicles?.some((v) => v.batteryId)) {
          demo = await prepareDemoVehicle(options);
          user = await getProfile(options);
        }
        if (controller.signal.aborted || work.current !== job || auth.currentUser?.uid !== uid) return null;
        const vehicles = user.vehicles || [];
        readyUid.current = uid;
        setState((previous) => ({ firebaseUser, user, vehicles,
          activeVehicle: vehicles.find((v) => v.id === demo?.id) || vehicles.find((v) => v.id === previous.activeVehicle?.id) || vehicles[0] || null,
        }));
        return user;
      } catch (err) {
        if (err.name !== "AbortError" && work.current === job) setError(err.message);
        throw err;
      } finally {
        if (work.current === job) { job.promise = null; setLoading(false); }
      }
    })();
    return job.promise;
  }, []);
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => { loadProfile(user).catch(() => {}); });
    return () => { unsubscribe(); work.current.controller?.abort(); };
  }, [loadProfile]);
  const refreshUser = useCallback(() => loadProfile(auth.currentUser, true), [loadProfile]);
  const setActiveVehicle = useCallback((vehicle) => {
    setState((previous) => {
      const id = typeof vehicle === "function" ? vehicle(previous.activeVehicle)?.id : vehicle?.id;
      return { ...previous, activeVehicle: previous.vehicles.find((v) => v.id === id) || previous.activeVehicle };
    });
  }, []);
  const finishLogin = async (credential) => { await loadProfile(credential.user); return credential.user; };
  const login = async ({ email, password }) => finishLogin(await signInWithEmailAndPassword(auth, email, password));
  const loginWithGoogle = async () => {
    const credential = await signInWithPopup(auth, googleProvider);
    await credential.user.getIdToken(true);
    return finishLogin(credential);
  };
  const loginAsGuest = async () => finishLogin(await signInAnonymously(auth));
  const register = async ({ name, email, password }) => {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    if (name?.trim()) { await updateProfile(credential.user, { displayName: name.trim() }); await credential.user.reload(); }
    await loadProfile(credential.user, true);
    return credential.user;
  };
  const logout = async () => {
    work.current.controller?.abort();
    work.current = { uid: null, controller: null, promise: null };
    readyUid.current = null;
    setState(empty); setError(""); setLoading(false);
    try { await signOut(auth); }
    catch (err) { await loadProfile(auth.currentUser, true); throw err; }
  };
  return <AuthContext.Provider value={{ ...state, loading, error, register, login, loginWithGoogle, loginAsGuest, logout, refreshUser, setActiveVehicle,
    isAuthenticated: Boolean(state.firebaseUser), isGuest: state.user?.role === "GUEST" || state.firebaseUser?.isAnonymous === true,
  }}>{children}</AuthContext.Provider>;
}
