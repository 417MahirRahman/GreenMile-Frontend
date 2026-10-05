import { number, formatDuration, formatChargeShortfall } from "../../utils/routeFormatting";
export default function RouteDetails({ route, battery, scoring, recommendationMessage }) {
  const metrics = [
    ...(formatChargeShortfall(route.projectedArrivalSoc) ? [["Estimated Charge Shortfall", formatChargeShortfall(route.projectedArrivalSoc)]] : []),
    ["Static duration", formatDuration(route.staticDurationSeconds)],
    ["Average speed", number(route.averageSpeedKmh, 1, " km/h")], ["Energy rate", number(route.energyRateWhPerKm, 1, " Wh/km")],
    ["Traction energy", number(route.tractionEnergyWh, 1, " Wh")], ["Auxiliary energy", number(route.auxiliaryEnergyWh, 1, " Wh")],
    ["Traffic delay", formatDuration(route.trafficDelaySeconds)], ["Traffic delay ratio", number(route.trafficDelayRatio, 3)],
    ["Normal / slow / jam ratios", [route.normalTrafficRatio, route.slowTrafficRatio, route.trafficJamRatio].map((v) => number(v, 3)).join(" / ")],
    ["Traffic stress", number(route.trafficStressScore, 4)], ["Projected SoC drop", number(route.projectedSocDrop, 2, "%")],
    ["Reserve penalty", number(route.reservePenalty, 4)], ["Depletion ratio", number(route.depletionRatio, 4)], ["Health-adjusted load", number(route.healthAdjustedLoad, 4)],
    ["Battery Impact (raw battery stress score)", number(route.batteryStressScore, 4)], ["Time score", number(route.timeScore, 4)], ["Energy score", number(route.energyScore, 4)], ["Route Score", number(route.finalScore, 4)],
    ["Google route labels", route.routeLabels?.join(", ") || "—"],
    ["Routing SoC / SoH", `${number(battery?.soc, 1, "%")} / ${number(battery?.sohPercent, 1, "%")}`],
    ["Nominal capacity", number(battery?.routingBatteryCapacityKWh, 2, " kWh")], ["Nominal battery energy", number(battery?.nominalBatteryWh, 1, " Wh")],
    ["Health-adjusted energy", number(battery?.effectiveBatteryWh, 1, " Wh")], ["Available battery energy", number(battery?.availableBatteryWh, 1, " Wh")], ["Minimum reserve", number(battery?.minimumReserveSoc, 1, "%")],
    ["Time / energy / battery weights", [scoring?.timeWeight, scoring?.energyWeight, scoring?.batteryWeight].map((v) => number(v, 3)).join(" / ")],
  ];
  return <section className="mt-4 rounded-xl border border-slate-200 bg-white p-3"><h3 className="font-bold">Route {route.routeIndex + 1} · technical details</h3>{recommendationMessage && <p className="mt-2 text-xs leading-5 text-slate-600">{recommendationMessage}</p>}<dl className="mt-3 grid gap-x-6 divide-y divide-slate-100 md:grid-cols-2">{metrics.map(([label, value]) => <div key={label} className="flex min-w-0 flex-wrap justify-between gap-2 py-2 text-xs"><dt className="text-slate-500">{label}</dt><dd className="break-words font-semibold">{value}</dd></div>)}</dl><p className="mt-4 rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-900">{scoring?.note || "Prototype energy estimates and battery stress proxies are not directly measured degradation."}</p></section>;
}
