import { number, formatDistance, formatDuration, formatArrivalCharge } from "../../utils/routeFormatting";

export default function RouteCard({ route, selected, selectable, batteryEmpty, recommended, recommendation, comparing, comparisonBadges = [], batteryImpact, reason, onSelect, onDetails, detailsOpen }) {
  const safety = !selectable ? "Not Reachable With Current Charge" : recommended ? recommendation.state : route.reserveSafe ? "Battery Safe" : "Low Battery Reserve";
  return <article onClick={selectable ? onSelect : undefined} aria-label={`Route ${route.routeIndex + 1}`} className={`flex w-full min-w-0 flex-col rounded-xl border-2 p-3 text-left transition ${!selectable ? "border-red-200 bg-red-50/60" : selected ? "cursor-pointer border-emerald-600 bg-emerald-50" : "cursor-pointer border-slate-100 bg-white hover:border-emerald-200"}`}>
    <h3 className="text-sm font-bold">Route {route.routeIndex + 1}</h3>
    <div className={`mt-2 flex flex-wrap content-start gap-1 ${comparing ? "md:min-h-14" : ""}`}>
      {recommended && <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${selectable ? recommendation.badgeClass : "bg-red-100 text-red-800"}`}>{selectable ? recommendation.title : "Not Reachable With Current Charge"}</span>}
      {comparisonBadges.map((badge) => <span key={badge} className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-700">{badge}</span>)}
    </div>
    <div className="mt-3 grid grid-cols-2 gap-2">
      <div><p className="text-[11px] text-slate-500">Travel Time</p><p className="text-xl font-bold">{formatDuration(route.durationSeconds)}</p></div>
      <div><p className="text-[11px] text-slate-500">Distance</p><p className="text-xl font-bold">{formatDistance(route.distanceMeters)}</p></div>
    </div>
    <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
      <div><p className="text-[11px] text-slate-500">Battery Use</p><p className="font-semibold">{number(route.estimatedEnergyWh, 0, " Wh")}</p></div>
      <div><p className="text-[11px] text-slate-500">Charge Left at Arrival</p><p className="font-semibold">{formatArrivalCharge(batteryEmpty ? 0 : route.projectedArrivalSoc)}</p></div>
    </div>
    <div className="mt-3 border-t border-slate-200 pt-2 text-xs">
      <p className="text-[11px] text-slate-500">Battery Safety</p>
      <p className={`mt-1 font-semibold ${!selectable ? "text-red-700" : route.reserveSafe ? "text-emerald-800" : "text-amber-800"}`}>{selectable ? "Possible · " : ""}{safety}</p>
      <p className="mt-2 text-[11px] text-slate-500">Battery Impact</p><p className="mt-1 font-semibold text-slate-700">{batteryImpact}</p>
    </div>
    {!selectable && <div className="mt-3 rounded-lg bg-red-100 p-2 text-xs leading-5 text-red-900"><p className="font-bold">Trip Not Possible With Current Charge</p><p>This route requires more battery charge than is currently available.</p></div>}
    <div className="mt-3 flex-1 text-xs leading-5"><p className="font-semibold">Why this route?</p><p className="mt-1 text-slate-600">{reason}</p></div>
    <div className="mt-3 grid grid-cols-2 gap-2">
      <button type="button" disabled={!selectable} aria-pressed={selected} onClick={(event) => { event.stopPropagation(); onSelect(); }} className={`min-h-11 rounded-lg border px-2 text-xs font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 ${!selectable ? "cursor-not-allowed border-red-200 bg-red-100 text-red-800" : selected ? "border-emerald-700 bg-emerald-700 text-white" : "border-emerald-700 bg-white text-emerald-800 hover:bg-emerald-50"}`}>{!selectable ? "Insufficient Charge" : selected ? "Selected" : "Select Route"}</button>
      <button type="button" aria-expanded={detailsOpen} onClick={(event) => { event.stopPropagation(); onDetails(); }} className="min-h-11 rounded-lg bg-slate-100 px-2 text-xs font-semibold hover:bg-slate-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700">{detailsOpen ? "Hide Details" : "View Details"}</button>
    </div>
  </article>;
}
