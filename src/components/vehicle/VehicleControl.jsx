import { useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import AddVehicleModal from "./AddVehicleModal";
import VehicleSelector from "../VehicleSelector";
export default function VehicleControl() {
  const { vehicles, activeVehicle, setActiveVehicle, isGuest, logout } = useAuth();
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const leave = async () => { setBusy(true); try { await logout(); } catch (err) { setError(err.message); setBusy(false); } };
  return <div className="space-y-2"><div className="flex min-w-0 items-end gap-2">
    <VehicleSelector vehicles={vehicles} activeVehicle={activeVehicle} onVehicleChange={(id) => setActiveVehicle(vehicles.find((v) => v.id === id))} />
    {!isGuest && <button onClick={() => setAdding(true)} className="min-h-11 shrink-0 rounded-xl border border-slate-200 px-3 text-xs font-semibold hover:bg-slate-50">Add Vehicle</button>}
    <button disabled={busy} onClick={leave} className="min-h-11 shrink-0 px-2 text-xs font-semibold text-slate-500 disabled:opacity-50">Sign out</button>
  </div>{error && <p role="alert" className="text-sm text-red-700">{error}</p>}{adding && <AddVehicleModal onClose={() => setAdding(false)} />}</div>;
}
