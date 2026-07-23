import { useEffect, useMemo, useState } from "react";
import { Check, Minus, Plus, ShoppingBag, ShoppingCart, X } from "lucide-react";
import { currency } from "@/lib/format";
import { variantDescription } from "@/components/Common";
function maximumQuantity(variant) {
    if (!variant) {
        return 1;
    }
    if (!variant.track_stock) {
        return 99;
    }
    return Math.max(1, variant.stock ?? 1);
}
export function VariantSelectionModal({ open, product, initialVariantId, title = "Pilih variant", confirmLabel, checkoutMode = false, onClose, onConfirm, }) {
    const variants = useMemo(() => Array.isArray(product?.variants) ? product.variants.filter((variant) => variant.is_active) : [], [product]);
    const [selectedId, setSelectedId] = useState(null);
    const [quantity, setQuantity] = useState(1);
    useEffect(() => {
        if (!open || !product) {
            return;
        }
        const preferred = variants.find((variant) => variant.id === initialVariantId)
            ?? variants.find((variant) => variant.is_default)
            ?? variants[0]
            ?? null;
        setSelectedId(preferred?.id ?? null);
        setQuantity(1);
    }, [initialVariantId, open, product, variants]);
    useEffect(() => {
        if (!open) {
            return;
        }
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        const handleEscape = (event) => {
            if (event.key === "Escape") {
                onClose();
            }
        };
        window.addEventListener("keydown", handleEscape);
        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener("keydown", handleEscape);
        };
    }, [onClose, open]);
    if (!open || !product) {
        return null;
    }
    const selected = variants.find((variant) => variant.id === selectedId) ?? null;
    const max = maximumQuantity(selected);
    const safeQuantity = Math.min(quantity, max);
    const buttonLabel = confirmLabel ?? (checkoutMode ? "Lanjut checkout" : "Tambah ke cart");
    return (<div className="fixed inset-0 z-[90] flex items-end justify-center bg-slate-950/65 p-0 backdrop-blur-sm sm:items-center sm:p-5" role="dialog" aria-modal="true">
      <button aria-label="Tutup modal" onClick={onClose} className="absolute inset-0 h-full w-full cursor-default"/>
      <section className="relative z-10 max-h-[92vh] w-full overflow-hidden rounded-t-[2rem] bg-white shadow-2xl sm:max-w-3xl sm:rounded-[2rem]">
        <div className="flex items-start justify-between border-b border-slate-200 px-5 py-5 sm:px-7">
          <div className="min-w-0 pr-4">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-700">{title}</p>
            <h2 className="mt-1 truncate text-xl font-black text-slate-950">{product.name}</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900">
            <X size={20}/>
          </button>
        </div>

        <div className="max-h-[64vh] overflow-y-auto px-5 py-5 sm:px-7">
          <div className="grid gap-3 sm:grid-cols-2">
            {variants.map((variant) => {
            const active = selected?.id === variant.id;
            return (<button key={variant.id} type="button" disabled={!variant.available} onClick={() => {
                    setSelectedId(variant.id);
                    setQuantity(1);
                }} className={`relative rounded-2xl border p-4 text-left transition ${active ? "border-emerald-600 bg-emerald-50 shadow-sm" : "border-slate-200 bg-white hover:border-slate-400"} disabled:cursor-not-allowed disabled:bg-slate-100 disabled:opacity-60`}>
                  {active ? <span className="absolute right-3 top-3 rounded-full bg-emerald-600 p-1 text-white"><Check size={14}/></span> : null}
                  <p className="pr-8 font-black text-slate-950">{variant.name}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">{variantDescription(variant)}</p>
                  <p className="mt-3 text-lg font-black text-emerald-700">{currency.format(Number(variant.price) || 0)}</p>
                  <p className={`mt-1 text-xs font-bold ${variant.available ? "text-emerald-600" : "text-rose-600"}`}>
                    {variant.available
                    ? variant.track_stock
                        ? `Stok tersedia: ${variant.stock ?? 0}`
                        : "Tersedia"
                    : "Stok tidak tersedia"}
                  </p>
                </button>);
        })}
          </div>

          {selected ? (<div className="mt-5 flex flex-col gap-4 rounded-2xl bg-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Jumlah</p>
                <p className="mt-1 text-sm text-slate-600">Subtotal {currency.format((Number(selected.price) || 0) * safeQuantity)}</p>
              </div>
              <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-1">
                <button type="button" onClick={() => setQuantity((value) => Math.max(1, value - 1))} className="rounded-lg p-2 hover:bg-slate-100"><Minus size={17}/></button>
                <span className="min-w-8 text-center font-black">{safeQuantity}</span>
                <button type="button" onClick={() => setQuantity((value) => Math.min(max, value + 1))} className="rounded-lg p-2 hover:bg-slate-100"><Plus size={17}/></button>
              </div>
            </div>) : null}
        </div>

        <div className="flex gap-3 border-t border-slate-200 bg-white px-5 py-4 sm:px-7">
          <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-slate-300 px-4 py-3 font-black text-slate-700 transition hover:bg-slate-100">Batal</button>
          <button type="button" disabled={!selected?.available} onClick={() => selected && onConfirm(selected, safeQuantity)} className="flex flex-[1.35] items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 font-black text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300">
            {checkoutMode ? <ShoppingBag size={19}/> : <ShoppingCart size={19}/>}
            {buttonLabel}
          </button>
        </div>
      </section>
    </div>);
}
