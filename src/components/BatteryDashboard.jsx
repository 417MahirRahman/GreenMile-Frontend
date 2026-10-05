import { getBatteryWarnings } from "../utils/batteryWarnings";
import { number } from "../utils/routeFormatting";
export default function BatteryDashboard({ data }) {
  const { battery, totalEnergy, soh, sohError, loading, error, refresh } = data;
  const warnings = getBatteryWarnings(battery ? { ...battery, soh } : null);
  const cycles = battery?.cycleInformation;
  return <section aria-label="Battery Information">
    <div className="flex items-center justify-between"><h2 className="text-xl font-bold">Battery Information</h2><button disabled={loading} onClick={refresh} className="min-h-11 text-sm font-semibold text-emerald-800 disabled:opacity-50">Refresh</button></div>
    {loading && <p role="status" className="text-sm text-slate-500">Loading battery data…</p>}
    {error && <p role="alert" className="my-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      <Card title="Battery Temperature" value={number(battery?.temperature, 1, "°C")} />
      <Card title="State of Charge" value={number(battery?.soc, 1, "%")} />
      <Card title="State of Health" value={number(soh, 1, "%")} detail={sohError || (soh == null ? "AI prediction is not available yet." : "Latest AI estimate")} />
      <Card title="Charging Status" value={battery?.chargingStatus || "—"} />
      <Card title="Energy Consumption" value={number(totalEnergy, 2, " Wh")} detail={`Power: ${number(battery?.power, 2, " W")} · latest interval: ${number(battery?.energyWh, 3, " Wh")}`} />
      <Card title="Cycle Information" value={`${number(cycles?.equivalentFullCycles ?? battery?.cycleCount, 3)} EFC`} detail={`Completed AI cycles: ${number(cycles?.completedDischargeCycles, 0)} · discharged: ${number(cycles?.totalDischargedCapacityMah, 2, " mAh")} · rated: ${number(cycles?.ratedCapacityMah, 0, " mAh")}`} />
      <div className="rounded-xl border border-slate-200 p-4 sm:col-span-2"><h3 className="text-xs font-semibold text-slate-500">Battery Warnings</h3>{warnings.length ? warnings.map((warning) => <p key={warning.title} className="mt-2 text-sm text-amber-800"><strong>{warning.title}</strong> — {warning.message}</p>) : <p className="mt-2 text-sm">{battery ? "No threshold warnings in the latest reading." : "Awaiting battery readings."}</p>}</div>
    </div>
    <p className="mt-4 text-xs text-slate-500">Readings refresh approximately every five seconds. EFC and completed discharge sessions are different measures.</p>
  </section>;
}
function Card({ title, value, detail }) {
  return <div className="rounded-xl border border-slate-200 p-4"><h3 className="text-xs font-semibold text-slate-500">{title}</h3><p className="mt-2 break-words text-xl font-bold">{value}</p>{detail && <p className="mt-2 text-xs leading-5 text-slate-500">{detail}</p>}</div>;
}
