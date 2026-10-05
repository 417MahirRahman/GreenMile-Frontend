import { useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { useBatteryData } from "../../hooks/useBatteryData";
import { useRouteSearch } from "../../hooks/useRouteSearch";
import VehicleMap from "../../components/VehicleMap";
import BatteryDashboard from "../../components/BatteryDashboard";
import BatteryStatusBar from "../../components/battery/BatteryStatusBar";
import VehicleControl from "../../components/vehicle/VehicleControl";
import RouteSearchForm from "../../components/routes/RouteSearchForm";
import RouteBottomSheet from "../../components/routes/RouteBottomSheet";
import DemoControls from "../../components/DemoControls";
import BatteryDetailsModal from "../../components/battery/BatteryDetailsModal";
export default function Home() {
  const { activeVehicle, isGuest, user } = useAuth();
  const battery = useBatteryData(activeVehicle?.batteryId);
  const search = useRouteSearch(activeVehicle?.batteryId, battery.battery?.soc);
  const [details, setDetails] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const canSimulate = isGuest || ["DEMO", "ADMIN"].includes(user?.role);
  return <main className="relative h-dvh w-full overflow-hidden bg-slate-200 text-slate-900">
    <VehicleMap routes={search.routes} startLocation={search.startLocation} destinationLocation={search.destinationLocation} selectedRoute={search.selectedRoute} setSelectedRoute={search.setSelectedRoute} />
    <div className="pointer-events-none absolute inset-x-3 top-3 z-10 flex flex-col gap-3 md:right-auto md:w-[370px]">
      <section className="pointer-events-auto max-h-[calc(100dvh-11rem)] overflow-y-auto rounded-2xl border border-white bg-white/95 p-4 shadow-xl backdrop-blur md:max-h-[calc(100dvh-1.5rem)]">
        <div className="mb-3 flex items-center justify-between"><h1 className="text-xl font-black tracking-tight">Green<span className="text-emerald-700">Mile</span></h1>{canSimulate ? <span className="rounded-full bg-amber-100 px-3 py-1 text-[10px] font-bold text-amber-900">{isGuest || user?.role === "DEMO" ? "Demo Mode" : "Demo tools"}</span> : <span className="text-[10px] font-semibold uppercase tracking-widest text-emerald-700">Plan your journey</span>}</div>
        <VehicleControl />
        {search.routes.length > 0 && <button onClick={() => setShowSearch(!showSearch)} className="mt-2 min-h-11 w-full rounded-xl bg-slate-100 text-xs font-semibold">{showSearch ? "Close search" : "Edit journey"}</button>}
        <div className={`mt-4 ${search.routes.length && !showSearch ? "hidden" : "block"}`}><RouteSearchForm search={{ ...search, findRoutes: async (event) => { if (await search.findRoutes(event)) setShowSearch(false); } }} />
          {canSimulate && <DemoControls key={user?.id} refreshBattery={battery.refresh} />}
        </div>
      </section>
      <div className="pointer-events-auto md:hidden"><BatteryStatusBar data={battery} route={search.routes[search.selectedRoute]} onDetails={() => setDetails(true)} /></div>
    </div>
    <div className="pointer-events-auto absolute right-3 top-3 z-10 hidden max-w-[calc(100%-410px)] md:block"><BatteryStatusBar data={battery} route={search.routes[search.selectedRoute]} onDetails={() => setDetails(true)} /></div>
    <RouteBottomSheet key={activeVehicle?.id} search={search} hiddenOnMobile={showSearch} />
    {details && <BatteryDetailsModal onClose={() => setDetails(false)}><BatteryDashboard data={battery} /></BatteryDetailsModal>}
  </main>;
}
