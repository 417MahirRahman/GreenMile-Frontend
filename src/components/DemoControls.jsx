import { useEffect, useRef, useState } from "react";
import { simulateCycles } from "../api/demoApi";
import { useAuth } from "../hooks/useAuth";
export default function DemoControls({ refreshBattery }) {
  const { refreshUser, setActiveVehicle } = useAuth();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const work = useRef(null);
  useEffect(() => () => work.current?.abort(), []);
  async function simulate(cycles) {
    if (work.current) return;
    const controller = new AbortController(); work.current = controller;
    setBusy(true); setMessage(""); setError("");
    try {
      const data = await simulateCycles(cycles, { signal: controller.signal });
      const profile = await refreshUser();
      if (controller.signal.aborted || !profile) return;
      setActiveVehicle(data.vehicle); refreshBattery();
      const results = data.results || [];
      const aiFailure = results.some((result) => result.automaticSoH?.error);
      setMessage(`${data.cyclesCompleted} demo cycle(s) processed · ${data.readingsGenerated} readings. ${aiFailure ? "Readings saved; AI prediction failed. Check service availability." : "Battery and available SoH are refreshing."}`);
    } catch (err) { if (!controller.signal.aborted) setError(err.message); }
    finally { if (!controller.signal.aborted) setBusy(false); work.current = null; }
  }
  return (
    <section aria-label="Demo simulation" className="mt-3 border-t border-slate-100 pt-3">
      <button disabled={busy} onClick={() => simulate(10)} className="min-h-11 w-full rounded-xl bg-amber-100 px-3 py-2 text-xs font-semibold text-amber-950 disabled:opacity-50">
        {busy ? "Preparing SoH Demo..." : "Prepare SoH Demo (10 Cycles)"}
      </button>
      <p className="mt-2 text-xs leading-4 text-slate-600">Generates the 10-cycle history required by the current SoH model.</p>
      <p className="mt-1 text-[10px] leading-4 text-slate-500">Illustrative demo readings. Simulation always targets your dedicated demo vehicle. The server may require a cooldown between runs.</p>
      {message && <p role="status" className="mt-2 text-xs text-emerald-800">{message}</p>}
      {error && <p role="alert" className="mt-2 text-xs text-red-700">{error}</p>}
    </section>
  );
}
