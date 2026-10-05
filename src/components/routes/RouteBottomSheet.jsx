import { useState } from "react";
import RouteCard from "./RouteCard";
import RouteDetails from "./RouteDetails";
import { isRouteSelectable } from "../../utils/routeFormatting";

const recommendationStates = {
  BATTERY_SAFE: { title: "GreenMile Recommended", state: "Battery Safe", reason: "Recommended because it gives the best overall balance of travel time, battery use, and battery safety.", badgeClass: "bg-emerald-700 text-white" },
  LOW_RESERVE: { title: "Best Available Route", state: "Low Battery Reserve", reason: "No route keeps the preferred battery reserve. This is the best available option.", badgeClass: "bg-amber-100 text-amber-950" },
  NO_FEASIBLE_ROUTE: { title: "Not Reachable With Current Charge", state: "Not Reachable With Current Charge", reason: "This route cannot be completed with the current battery charge.", badgeClass: "bg-red-100 text-red-800" },
};
const comparisons = [
  { field: "durationSeconds", label: "Fastest" },
  { field: "estimatedEnergyWh", label: "Lowest Energy" },
  { field: "batteryStressScore", label: "Most Battery-Friendly" },
  { field: "projectedArrivalSoc", label: "Highest Charge Left", highest: true },
];
function finiteValue(value) {
  return value != null && String(value).trim() !== "" && Number.isFinite(Number(value)) ? Number(value) : null;
}

export default function RouteBottomSheet({ search, hiddenOnMobile = false }) {
  const [detailsRouteIndex, setDetailsRouteIndex] = useState(null);
  const route = search.routes[detailsRouteIndex];
  if (!search.routes.length) return null;
  const multiple = search.routes.length > 1;
  const allInformational = search.routes.every((item) => !isRouteSelectable(item, search.currentSoc));
  const recommendation = recommendationStates[search.recommendationLevel] || {
    title: "Best Available Option", state: "Review battery status", reason: "Evaluated using your current battery condition.", badgeClass: "bg-slate-100 text-slate-800",
  };
  // Compare returned values for presentation only; never sort or rerank routes.
  const bestValues = comparisons.map(({ field, highest }) => {
    const values = search.routes.map((item) => finiteValue(item[field])).filter((value) => value !== null);
    return values.length ? (highest ? Math.max(...values) : Math.min(...values)) : null;
  });
  const impacts = search.routes.map((item) => finiteValue(item.batteryStressScore)).filter((value) => value !== null);
  const lowestImpact = impacts.length ? Math.min(...impacts) : null;
  const highestImpact = impacts.length ? Math.max(...impacts) : null;
  const widthClass = multiple ? search.routes.length === 2 ? "md:max-w-[860px]" : "md:max-w-[1200px]" : "md:max-w-[420px]";
  const gridClass = multiple ? search.routes.length === 2 ? "md:grid-cols-2" : "md:grid-cols-2 lg:grid-cols-3" : "";
  return <section aria-label="Route results" className={`pointer-events-auto absolute inset-x-3 bottom-3 z-20 ${hiddenOnMobile ? "hidden md:flex" : "flex"} max-h-[42dvh] flex-col overflow-hidden rounded-2xl border border-white bg-white/95 shadow-2xl backdrop-blur md:left-auto md:max-h-[65dvh] md:w-[calc(100%-1.5rem)] ${widthClass}`}>
    <div className="shrink-0 border-b border-slate-100 px-4 py-3">
      <h2 className="text-sm font-bold">{multiple ? "Compare GreenMile Routes" : "GreenMile Route Evaluation"}</h2>
      <p className="mt-1 text-xs leading-5 text-slate-500">{multiple ? "Compare travel time, battery use, remaining charge, and battery impact." : "GreenMile evaluated the available route using your current battery condition."}</p>
    </div>
    <div className="min-h-0 overflow-y-auto overscroll-contain p-3">
      {allInformational && <div role="alert" className="mb-3 rounded-xl bg-red-100 p-3 text-xs leading-5 text-red-900"><p className="font-bold">{search.batteryEmpty ? "Battery Empty — Charge Before Driving" : "Trip Not Possible With Current Charge"}</p><p>{search.batteryEmpty ? "Your current battery charge is too low to start this trip. Please charge your EV before driving." : "None of these routes can be completed with the current charge. Charge your EV before driving."}</p><p className="mt-1 font-semibold">Routes are shown for information only.</p></div>}
      {!multiple && <p className="mb-3 rounded-lg bg-slate-50 p-3 text-xs leading-5 text-slate-600">Only one route was returned for this journey. GreenMile evaluated it using your current battery condition.</p>}
      <div className={`grid gap-3 ${gridClass}`}>{search.routes.map((item, index) => {
        const recommended = item.routeIndex === search.recommendedRouteIndex;
        const selectable = isRouteSelectable(item, search.currentSoc);
        const badges = multiple ? comparisons.filter(({ field }, metric) => bestValues[metric] !== null && finiteValue(item[field]) === bestValues[metric]).map(({ label }) => label) : [];
        const impact = finiteValue(item.batteryStressScore);
        const batteryImpact = !multiple || impact === null ? "Evaluated" : impact === lowestImpact ? "Most Battery-Friendly" : impact === highestImpact ? "Highest Battery Impact" : "Higher Battery Impact";
        const reason = !selectable ? "This route cannot be completed with the current battery charge." : recommended ? recommendation.reason : badges.includes("Lowest Energy") ? "Uses the least battery among the available routes." : badges.includes("Highest Charge Left") ? "Keeps the most charge at arrival." : badges.includes("Fastest") ? "Fastest available route." : badges.includes("Most Battery-Friendly") ? "Has the lowest estimated battery impact among the available routes." : "An alternative evaluated using travel time, battery use, and battery condition.";
        return <RouteCard
        key={item.routeIndex} route={item} selected={search.selectedRoute === index} selectable={selectable} batteryEmpty={search.batteryEmpty}
        recommended={recommended} recommendation={recommendation} comparing={multiple} comparisonBadges={badges} batteryImpact={batteryImpact} reason={reason}
        onSelect={() => search.setSelectedRoute(index)} detailsOpen={detailsRouteIndex === index}
        onDetails={() => { search.setSelectedRoute(index); setDetailsRouteIndex(detailsRouteIndex === index ? null : index); }}
      />; })}</div>
      <p className="mt-3 text-[11px] text-slate-500">{allInformational ? "View Details to inspect a route's battery requirements." : "Select a reachable route card or route line on the map."}</p>
      {route && <RouteDetails route={route} battery={search.routeBatteryInfo} scoring={search.scoring} recommendationMessage={search.recommendationMessage} />}
    </div>
  </section>;
}
