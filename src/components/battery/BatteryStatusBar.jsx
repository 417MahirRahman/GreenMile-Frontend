import { getBatteryWarnings } from "../../utils/batteryWarnings";
import { number, formatDistance, formatArrivalCharge, isBatteryEmpty } from "../../utils/routeFormatting";
export default function BatteryStatusBar({ data, route, onDetails }) {
  const batteryEmpty = isBatteryEmpty(data.battery?.soc);
  const warnings = getBatteryWarnings(data.battery ? { ...data.battery, soh: data.soh } : null).filter((warning) => !batteryEmpty || !["Critically Low Battery", "Low Battery"].includes(warning.title));
  return <div className="rounded-2xl border border-white/70 bg-white/95 px-4 py-3 shadow-lg backdrop-blur">
    <div className="flex items-center justify-between gap-2"><div className="flex min-w-0 flex-wrap gap-x-5 gap-y-1 text-sm">
      <span><span className="text-xs text-slate-500">SoC </span><strong>{number(batteryEmpty ? 0 : data.battery?.soc, 0, "%")}</strong></span>
      <span><span className="text-xs text-slate-500">SoH </span><strong>{number(data.soh, 0, "%")}</strong></span>
      <span><span className="text-xs text-slate-500">Temp </span><strong>{number(data.battery?.temperature, 1, "°C")}</strong></span>
      {route && <span className="hidden sm:inline"><span className="text-xs text-slate-500">Arrival </span><strong>{formatArrivalCharge(route.projectedArrivalSoc)}</strong> · {formatDistance(route.distanceMeters)}</span>}
    </div><button onClick={onDetails} className="min-h-11 shrink-0 text-xs font-semibold text-emerald-800">Battery details</button></div>
    {data.loading && <p role="status" className="text-xs text-slate-500">Loading battery…</p>}
    {data.error && <p role="alert" className="text-xs text-red-700">{data.error}</p>}
    {batteryEmpty && <div role="alert" className="mt-2 rounded-xl bg-red-50 p-3 text-red-800"><p className="text-sm font-bold">Battery Empty — Charge Before Driving</p><p className="mt-1 text-xs leading-5">Your current battery charge is too low to start this trip. Please charge your EV before driving.</p></div>}
    {warnings.map((warning) => <p key={warning.title} role="status" className="mt-1 text-xs font-semibold text-amber-800">⚠ {warning.title}</p>)}
  </div>;
}
