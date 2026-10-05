import { useEffect, useRef } from "react";
import VehicleForm from "./VehicleForm";
export default function AddVehicleModal({ onClose }) {
  const dialog = useRef(null);
  useEffect(() => { const element = dialog.current; element.showModal(); return () => element.close(); }, []);
  return <dialog ref={dialog} onCancel={(event) => { event.preventDefault(); onClose(); }} aria-labelledby="add-vehicle-title" className="m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-2xl bg-white p-6 text-slate-900 shadow-2xl backdrop:bg-slate-950/50">
    <div className="mb-5 flex items-center justify-between gap-3"><h2 id="add-vehicle-title" className="text-xl font-bold">Connect another vehicle</h2><button aria-label="Close add vehicle" onClick={onClose} className="min-h-11 min-w-11 rounded-lg hover:bg-slate-100">✕</button></div>
    <VehicleForm onCreated={onClose} />
  </dialog>;
}
