export default function RouteSearchForm({ search }) {
  return <form onSubmit={search.findRoutes} className="space-y-3">
    <label htmlFor="starting-location" className="block text-xs font-semibold text-slate-500">Starting Location<input id="starting-location" required value={search.startPlace} onChange={(e) => search.setStartPlace(e.target.value)} placeholder="e.g. Gulshan 1" className="mt-1 block min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 focus:outline-emerald-600" /></label>
    <label htmlFor="destination" className="block text-xs font-semibold text-slate-500">Destination<input id="destination" required value={search.destinationPlace} onChange={(e) => search.setDestinationPlace(e.target.value)} placeholder="Where are you heading?" className="mt-1 block min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 focus:outline-emerald-600" /></label>
    <button disabled={search.loading} className="min-h-11 w-full rounded-xl bg-emerald-700 px-3 text-sm font-bold text-white hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:opacity-50">{search.loading ? "Finding routes…" : "Find GreenMile Routes"}</button>
    {search.error && <p role="alert" className="text-sm text-red-700">{search.error}</p>}
  </form>;
}
