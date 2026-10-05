export default function VehicleSelector({ vehicles, activeVehicle, onVehicleChange }) {
  return <label htmlFor="active-vehicle" className="block min-w-0 flex-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Active vehicle
    <select id="active-vehicle" value={activeVehicle?.id || ""} onChange={(event) => onVehicleChange(event.target.value)} className="mt-1 min-h-11 w-full min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-2 text-xs font-semibold normal-case tracking-normal text-slate-900 focus:outline-emerald-600">
      {vehicles.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.vehicleName}</option>)}
    </select>
  </label>;
}
