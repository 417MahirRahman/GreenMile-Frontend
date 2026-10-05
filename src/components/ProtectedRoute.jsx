import { Navigate } from "react-router";
import { useAuth } from "../hooks/useAuth";
export default function ProtectedRoute({ children }) {
  const { isAuthenticated, loading, error, refreshUser, logout } = useAuth();
  if (loading) return <main className="flex min-h-dvh items-center justify-center bg-emerald-950 text-white" role="status">Preparing GreenMile…</main>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (error) return <main className="flex min-h-dvh items-center justify-center bg-slate-50 p-6"><div className="max-w-md rounded-2xl bg-white p-6 shadow-lg"><h1 className="text-xl font-bold">Unable to prepare your account</h1><p role="alert" className="my-4 text-sm text-red-700">{error}</p><button onClick={() => refreshUser().catch(() => {})} className="min-h-11 rounded-xl bg-emerald-700 px-4 text-white">Try again</button><button onClick={() => logout().catch(() => {})} className="ml-3 min-h-11 px-3">Sign out</button></div></main>;
  return children;
}
