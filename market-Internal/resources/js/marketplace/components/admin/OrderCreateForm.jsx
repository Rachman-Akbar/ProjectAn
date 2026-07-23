import { useState } from "react";
import { Plus, Trash2, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { fieldClass, Loading } from "@/components/Common";
import { api, errorMessage, paginatedData, resourceData } from "@/lib/api";
const blankLine = () => ({
    product_id: "",
    product_variant_id: "",
    quantity: "1",
});
export function OrderCreateForm({ onClose, onSaved }) {
    const [name, setName] = useState("");
    const [division, setDivision] = useState("");
    const [phone, setPhone] = useState("");
    const [address, setAddress] = useState("");
    const [notes, setNotes] = useState("");
    const [paymentMethod, setPaymentMethod] = useState("internal_billing");
    const [items, setItems] = useState([blankLine()]);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const products = useQuery({
        queryKey: ["order-create-products"],
        queryFn: async () => paginatedData(await api.get("/admin/products", { params: { per_page: 100 } })).data,
    });
    const updateLine = (index, patch) => {
        setItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
    };
    const chooseProduct = (index, productId) => {
        const product = products.data?.find((item) => item.id === Number(productId));
        updateLine(index, {
            product_id: productId,
            product_variant_id: product?.default_variant ? String(product.default_variant.id) : "",
        });
    };
    const submit = async (event) => {
        event.preventDefault();
        setSaving(true);
        setError("");
        try {
            const result = resourceData(await api.post("/admin/orders", {
                name,
                division,
                phone,
                address,
                notes: notes || null,
                payment_method: paymentMethod,
                items: items.map((item) => ({
                    product_id: Number(item.product_id),
                    product_variant_id: Number(item.product_variant_id),
                    quantity: Number(item.quantity),
                })),
            }));
            await onSaved(result);
            onClose();
        }
        catch (exception) {
            setError(errorMessage(exception, "Order gagal dibuat."));
        }
        finally {
            setSaving(false);
        }
    };
    return (<div className="fixed inset-0 z-50 overflow-y-auto bg-black/55 p-4">
      <form onSubmit={submit} className="mx-auto my-4 w-full max-w-5xl rounded-3xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black">Buat Order</h2>
            <p className="text-sm text-slate-500">Harga dan stok dihitung ulang oleh backend.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl p-2 hover:bg-slate-100"><X /></button>
        </div>

        {error ? <div className="mt-4 rounded-xl bg-rose-50 p-4 text-sm font-bold text-rose-700">{error}</div> : null}

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm font-bold">Nama buyer<input required value={name} onChange={(event) => setName(event.target.value)} className={fieldClass}/></label>
          <label className="grid gap-2 text-sm font-bold">Divisi / unit<input required value={division} onChange={(event) => setDivision(event.target.value)} className={fieldClass}/></label>
          <label className="grid gap-2 text-sm font-bold">No. HP<input required value={phone} onChange={(event) => setPhone(event.target.value)} className={fieldClass}/></label>
          <label className="grid gap-2 text-sm font-bold">Metode pembayaran<select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)} className={fieldClass}><option value="internal_billing">Internal Billing</option><option value="bank_transfer">Transfer Manual</option><option value="cod">COD</option></select></label>
          <label className="grid gap-2 text-sm font-bold md:col-span-2">Alamat<textarea required rows={3} value={address} onChange={(event) => setAddress(event.target.value)} className={fieldClass}/></label>
          <label className="grid gap-2 text-sm font-bold md:col-span-2">Catatan<textarea rows={2} value={notes} onChange={(event) => setNotes(event.target.value)} className={fieldClass}/></label>
        </div>

        <section className="mt-7 rounded-2xl border bg-slate-50 p-5">
          <div className="flex items-center justify-between gap-3">
            <div><h3 className="text-lg font-black">Item Order</h3><p className="text-sm text-slate-500">Variant yang sama hanya boleh dipilih satu kali.</p></div>
            <button type="button" onClick={() => setItems((current) => [...current, blankLine()])} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 font-bold text-white"><Plus size={18}/> Tambah Item</button>
          </div>

          {products.isLoading ? <Loading label="Memuat produk..."/> : (<div className="mt-4 grid gap-4">
              {items.map((item, index) => {
                const product = products.data?.find((entry) => entry.id === Number(item.product_id));
                return (<div key={index} className="grid gap-3 rounded-xl border bg-white p-4 md:grid-cols-[1fr_1fr_130px_auto]">
                    <select required value={item.product_id} onChange={(event) => chooseProduct(index, event.target.value)} className={fieldClass}>
                      <option value="">Pilih produk</option>
                      {products.data?.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}
                    </select>
                    <select required value={item.product_variant_id} onChange={(event) => updateLine(index, { product_variant_id: event.target.value })} className={fieldClass} disabled={!product}>
                      <option value="">Pilih variant</option>
                      {product?.variants.filter((variant) => variant.is_active).map((variant) => <option key={variant.id} value={variant.id}>{variant.name} · {variant.sku}</option>)}
                    </select>
                    <input required type="number" min="1" max="999" value={item.quantity} onChange={(event) => updateLine(index, { quantity: event.target.value })} className={fieldClass}/>
                    <button type="button" disabled={items.length === 1} onClick={() => setItems((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="rounded-xl border p-3 text-rose-600 disabled:opacity-30"><Trash2 /></button>
                  </div>);
            })}
            </div>)}
        </section>

        <div className="mt-7 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="rounded-xl border px-5 py-3 font-bold">Batal</button>
          <button disabled={saving || products.isLoading} className="rounded-xl bg-emerald-600 px-6 py-3 font-black text-white disabled:bg-slate-300">{saving ? "Menyimpan..." : "Buat Order"}</button>
        </div>
      </form>
    </div>);
}
