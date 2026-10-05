import { useEffect, useRef } from "react";
export default function BatteryDetailsModal({ children, onClose }) {
  const dialog = useRef(null);
  useEffect(() => { const node = dialog.current; node.showModal(); return () => node.close(); }, []);
  return <dialog ref={dialog} onCancel={(e) => { e.preventDefault(); onClose(); }} aria-label="Battery details" className="m-auto max-h-[90dvh] w-[calc(100%-1.5rem)] max-w-xl overflow-y-auto rounded-2xl bg-white p-5 text-slate-900 shadow-2xl backdrop:bg-slate-950/50"><div className="mb-2 flex justify-end"><button autoFocus onClick={onClose} className="min-h-11 rounded-lg px-4 text-sm font-semibold hover:bg-slate-100">Close battery details</button></div>{children}</dialog>;
}
