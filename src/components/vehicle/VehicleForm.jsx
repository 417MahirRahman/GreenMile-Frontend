import { useEffect, useRef, useState } from "react";
import { createVehicle } from "../../api/vehicleApi";
import { useAuth } from "../../hooks/useAuth";
export default function VehicleForm({ onCreated }) {
  const { refreshUser, setActiveVehicle } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const controller = useRef(null);
  useEffect(() => () => controller.current?.abort(), []);
  async function submit(event) {
    event.preventDefault();
    if (controller.current) return;
    const form = new FormData(event.currentTarget);
    const body = { vehicleName: form.get("vehicleName").trim(), batteryId: form.get("batteryId").trim(), batteryCapacityKWh: Number(form.get("capacity")) };
    if (!body.vehicleName || !body.batteryId || !Number.isFinite(body.batteryCapacityKWh) || body.batteryCapacityKWh <= 0) { setError("Enter a name, battery ID, and positive nominal capacity."); return; }
    const request = new AbortController(); controller.current = request;
    setBusy(true); setError("");
    try {
      const vehicle = await createVehicle(body, { signal: request.signal });
      const profile = await refreshUser();
      if (request.signal.aborted || !profile) return;
      setActiveVehicle(vehicle); onCreated?.(vehicle);
    } catch (err) { if (!request.signal.aborted) setError(err.message); }
    finally { if (!request.signal.aborted) setBusy(false); controller.current = null; }
  }
  return <form onSubmit={submit} className="space-y-5">
    {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <label className="block text-sm font-semibold" htmlFor="vehicle-name">Vehicle name<input autoFocus id="vehicle-name" name="vehicleName" required maxLength={120} disabled={busy} placeholder="My EV" className="mt-2 block min-h-11 w-full rounded-xl border border-slate-300 px-3 focus:outline-emerald-600" /></label>
    <div><label className="block text-sm font-semibold" htmlFor="battery-id">Battery ID</label><input id="battery-id" name="batteryId" required disabled={busy} aria-describedby="battery-id-help" placeholder="Identifier from your IoT device" className="mt-2 block min-h-11 w-full rounded-xl border border-slate-300 px-3 focus:outline-emerald-600" /><p id="battery-id-help" className="mt-1 text-xs text-slate-500">Use the identifier configured on your battery device.</p></div>
    <label className="block text-sm font-semibold" htmlFor="battery-capacity">Nominal vehicle battery capacity (kWh)<input id="battery-capacity" name="capacity" type="number" min="0.001" step="any" required disabled={busy} placeholder="Capacity from the vehicle specification" className="mt-2 block min-h-11 w-full rounded-xl border border-slate-300 px-3 focus:outline-emerald-600" /></label>
    <button disabled={busy} className="min-h-11 w-full rounded-xl bg-emerald-700 px-4 font-semibold text-white hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:opacity-50">{busy ? "Connecting vehicle…" : "Add Vehicle"}</button>
  </form>;
}
