import { currency } from "@/lib/format";

export const fieldClass = "rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-100";

export function Loading({ label = "Memuat data..." }) {
    return <div className="flex min-h-52 items-center justify-center gap-3 text-slate-500"><span className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-700 border-t-transparent" />{label}</div>;
}

export function Empty({ title, action }) {
    return <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center"><h3 className="text-lg font-black">{title}</h3>{action ? <div className="mt-6">{action}</div> : null}</div>;
}

export function QueryError({ message = "Data belum dapat dimuat." }) {
    return <div className="rounded-2xl border border-rose-200 bg-rose-50 px-6 py-8 text-center text-rose-700"><h3 className="font-black">{message}</h3><button type="button" onClick={() => window.location.reload()} className="mt-4 rounded-xl bg-rose-700 px-5 py-2.5 font-bold text-white">Muat ulang</button></div>;
}

export function productPrice(product) {
    return currency.format(Number(product?.price) || 0);
}

const statusClass = {
    pending: "bg-amber-100 text-amber-800",
    confirmed: "bg-blue-100 text-blue-800",
    processing: "bg-violet-100 text-violet-800",
    completed: "bg-emerald-100 text-emerald-800",
    cancelled: "bg-rose-100 text-rose-800",
};

export function StatusBadge({ status }) {
    return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-black uppercase ${statusClass[status] ?? "bg-slate-100 text-slate-700"}`}>{status}</span>;
}
