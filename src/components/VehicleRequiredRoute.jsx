import { Navigate } from "react-router";
import { useAuth } from "../hooks/useAuth";
export default function VehicleRequiredRoute({ children }) {
  const { isGuest, activeVehicle, refreshUser } = useAuth();
  if (!activeVehicle?.batteryId && isGuest) return <main className="grid min-h-dvh place-items-center bg-slate-50 p-6"><div><p>Demo vehicle is not ready.</p><button className="mt-4 min-h-11 rounded-xl bg-emerald-700 px-4 text-white" onClick={() => refreshUser().catch(() => {})}>Prepare demo vehicle</button></div></main>;
  if (!activeVehicle?.batteryId) return <Navigate to="/vehicle-setup" replace />;
  return children;
}
