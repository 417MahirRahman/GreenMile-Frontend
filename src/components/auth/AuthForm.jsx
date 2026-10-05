import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import { useAuth } from "../../hooks/useAuth";
const messages = {
  "auth/popup-closed-by-user": "Google sign-in was cancelled.", "auth/popup-blocked": "Allow the Google sign-in popup and try again.",
  "auth/invalid-credential": "Incorrect email or password.", "auth/invalid-email": "Enter a valid email address.",
  "auth/too-many-requests": "Too many attempts. Try again later.", "auth/email-already-in-use": "An account already uses this email address.",
};
export default function AuthForm({ registering = false }) {
  const { register, login, loginWithGoogle, loginAsGuest } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const lock = useRef(false);
  async function run(kind, action) {
    if (lock.current) return;
    lock.current = true; setBusy(kind); setError("");
    try { await action(); navigate("/", { replace: true }); }
    catch (err) { if (err.name !== "AbortError") setError(messages[err.code] || err.message || "Unable to sign in. Try again."); }
    finally { lock.current = false; setBusy(""); }
  }
  function submit(event) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const password = values.get("password");
    if (registering && password !== values.get("confirm")) { setError("Passwords do not match."); return; }
    const body = { email: values.get("email").trim(), password, name: values.get("name")?.trim() };
    run("email", () => registering ? register(body) : login(body));
  }
  const input = "mt-2 block min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm focus:outline-emerald-600 disabled:opacity-50";
  return <div>
    <button disabled={Boolean(busy)} onClick={() => run("google", loginWithGoogle)} className="min-h-12 w-full rounded-xl bg-emerald-700 px-4 font-semibold text-white hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:opacity-50">{busy === "google" ? "Connecting to Google…" : "Continue with Google"}</button>
    <p className="my-5 text-center text-xs text-slate-400">or continue with email</p>
    {error && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <form onSubmit={submit} className="space-y-4">
      {registering && <label htmlFor="auth-name" className="block text-sm font-semibold">Full name<input id="auth-name" name="name" autoComplete="name" required disabled={Boolean(busy)} className={input} /></label>}
      <label htmlFor="auth-email" className="block text-sm font-semibold">Email<input id="auth-email" name="email" type="email" autoComplete="email" required disabled={Boolean(busy)} className={input} /></label>
      <label htmlFor="auth-password" className="block text-sm font-semibold">Password<input id="auth-password" name="password" type="password" autoComplete={registering ? "new-password" : "current-password"} minLength={registering ? 6 : undefined} required disabled={Boolean(busy)} className={input} /></label>
      {registering && <label htmlFor="auth-confirm" className="block text-sm font-semibold">Confirm password<input id="auth-confirm" name="confirm" type="password" autoComplete="new-password" minLength={6} required disabled={Boolean(busy)} className={input} /></label>}
      <button disabled={Boolean(busy)} className="min-h-11 w-full rounded-xl border border-emerald-700 font-semibold text-emerald-800 hover:bg-emerald-50 disabled:opacity-50">{busy === "email" ? "Please wait…" : registering ? "Create account" : "Sign in with email"}</button>
    </form>
    {!registering && <button disabled={Boolean(busy)} onClick={() => run("guest", loginAsGuest)} className="mt-4 min-h-11 w-full rounded-xl bg-slate-100 text-sm font-semibold hover:bg-slate-200 disabled:opacity-50">{busy === "guest" ? "Preparing your demo vehicle…" : "Explore as Guest"}</button>}
    <p className="mt-6 text-center text-sm text-slate-500">{registering ? "Already have an account? " : "New to GreenMile? "}<Link to={registering ? "/login" : "/register"} className="font-semibold text-emerald-700">{registering ? "Sign in" : "Create account"}</Link></p>
  </div>;
}
