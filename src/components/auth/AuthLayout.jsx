import { Link } from "react-router";
export default function AuthLayout({ title, description, children }) {
  return <main className="min-h-dvh bg-slate-50 text-slate-900 lg:grid lg:grid-cols-2">
    <aside className="relative overflow-hidden bg-emerald-950 px-6 py-8 text-white sm:px-12 lg:flex lg:flex-col lg:justify-between lg:p-16">
      <Link to="/" className="text-2xl font-black tracking-tight">Green<span className="text-lime-300">Mile</span><span className="ml-2 text-sm font-normal text-emerald-200">EV Route Optimizer</span></Link>
      <div className="max-w-lg py-8 lg:py-20"><p className="text-xs font-bold uppercase tracking-[0.2em] text-lime-300">Go further. Travel smarter.</p><h1 className="mt-5 text-4xl font-semibold leading-tight sm:text-5xl">A better route for<br />your battery.</h1><p className="mt-5 leading-7 text-emerald-100">Plan your journey with live battery insights, traffic-aware energy estimates, and GreenMile recommendations.</p></div>
      <p className="hidden text-sm text-emerald-200 lg:block">Battery-aware journeys, from start to arrival.</p>
    </aside>
    <section className="flex items-center justify-center px-5 py-10 sm:p-12"><div className="w-full max-w-md"><h2 className="text-3xl font-bold">{title}</h2><p className="mt-2 text-sm leading-6 text-slate-500">{description}</p><div className="mt-7">{children}</div></div></section>
  </main>;
}
