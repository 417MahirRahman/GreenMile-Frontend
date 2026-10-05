import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router";
import { useAuth } from "../../hooks/useAuth";
import AuthLayout from "../../components/auth/AuthLayout";
import VehicleForm from "../../components/vehicle/VehicleForm";
export default function VehicleSetup() {
  const { isGuest, vehicles, logout } = useAuth();
  const [error, setError] = useState("");
  const navigate = useNavigate();
  if (isGuest) return <Navigate to="/" replace />;
  return <AuthLayout title="Connect your vehicle" description="Add the vehicle and battery device you own to start planning battery-aware routes."><VehicleForm onCreated={() => navigate("/", { replace: true })} />{error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}<div className="mt-6 flex justify-between text-sm"><button className="min-h-11 text-slate-500" onClick={() => logout().then(() => navigate("/login", { replace: true })).catch((err) => setError(err.message))}>Sign out</button>{vehicles.length > 0 && <Link to="/" className="min-h-11 font-semibold text-emerald-700">Return to map</Link>}</div></AuthLayout>;
}
