import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Trash2, X } from "lucide-react";
import { fieldClass, Loading } from "@/components/Common";
import { api, errorMessage, paginatedData, resourceData } from "@/lib/api";

const blankLine = () => ({ product_id: "", quantity: "1" });

const blankBuyer = () => ({
    customer_type: "individual",
    name: "",
    email: "",
    phone: "",
    address: "",
    nik: "",
    npwp: "",
    province: "",
    city: "",
    company_name: "",
    postal_code: "",
    country: "Indonesia",
    notes: "",
    payment_method: "internal_billing",
});

export function OrderCreateForm({ onClose, onSaved }) {
    const [buyer, setBuyer] = useState(blankBuyer());
    const [items, setItems] = useState([blankLine()]);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const products = useQuery({
        queryKey: ["admin-products-for-order"],
        queryFn: async () => paginatedData(await api.get("/admin/products", { params: { per_page: 100, status: "published" } })).data,
    });
    const business = buyer.customer_type === "business";
    const updateBuyer = (key) => (event) => setBuyer((current) => ({ ...current, [key]: event.target.value }));
    const updateLine = (index, patch) => setItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));

    const submit = async (event) => {
        event.preventDefault();
        setSaving(true);
        setError("");

        try {
            const result = resourceData(await api.post("/admin/orders", {
                ...buyer,
                nik: business ? buyer.nik : null,
                npwp: business ? buyer.npwp : null,
                province: business ? buyer.province : null,
                city: business ? buyer.city : null,
                company_name: business ? buyer.company_name : null,
                postal_code: business ? buyer.postal_code : null,
                country: business ? buyer.country : null,
                notes: buyer.notes || null,
                items: items.map((item) => ({
                    product_id: Number(item.product_id),
                    quantity: Number(item.quantity),
                })),
            }));
            await onSaved(result);
            onClose();
        } catch (exception) {
            setError(errorMessage(exception, "Order gagal dibuat."));
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 p-4">
            <form onSubmit={submit} className="mx-auto my-4 w-full max-w-5xl rounded-2xl border border-slate-200 bg-white">
                <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                    <div><h2 className="text-xl font-black">Buat Order</h2><p className="mt-1 text-sm text-slate-500">Harga dan stok dihitung ulang oleh backend.</p></div>
                    <button type="button" onClick={onClose} className="rounded-lg p-2 hover:bg-slate-100"><X /></button>
                </div>

                <div className="p-5">
                    {error ? <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700">{error}</div> : null}
                    <div className="grid grid-cols-2 gap-2 rounded-xl border border-slate-200 p-1">
                        <button type="button" onClick={() => setBuyer((current) => ({ ...current, customer_type: "individual" }))} className={`rounded-lg px-4 py-3 text-sm font-black ${!business ? "bg-emerald-50 text-emerald-700" : "text-slate-500"}`}>Perorangan</button>
                        <button type="button" onClick={() => setBuyer((current) => ({ ...current, customer_type: "business" }))} className={`rounded-lg px-4 py-3 text-sm font-black ${business ? "bg-emerald-50 text-emerald-700" : "text-slate-500"}`}>Badan Usaha</button>
                    </div>

                    <div className="mt-5 grid gap-4 md:grid-cols-2">
                        {business ? <>
                            <label className="grid gap-2 text-sm font-bold md:col-span-2">Perusahaan<input required value={buyer.company_name} onChange={updateBuyer("company_name")} className={fieldClass} /></label>
                            <label className="grid gap-2 text-sm font-bold">Nama penanggung jawab<input required value={buyer.name} onChange={updateBuyer("name")} className={fieldClass} /></label>
                            <label className="grid gap-2 text-sm font-bold">NIK<input required inputMode="numeric" maxLength={16} pattern="[0-9]{16}" value={buyer.nik} onChange={updateBuyer("nik")} className={fieldClass} /></label>
                            <label className="grid gap-2 text-sm font-bold">NPWP<input required value={buyer.npwp} onChange={updateBuyer("npwp")} className={fieldClass} /></label>
                            <label className="grid gap-2 text-sm font-bold">Negara<input required value={buyer.country} onChange={updateBuyer("country")} className={fieldClass} /></label>
                            <label className="grid gap-2 text-sm font-bold">Provinsi<input required value={buyer.province} onChange={updateBuyer("province")} className={fieldClass} /></label>
                            <label className="grid gap-2 text-sm font-bold">Kota<input required value={buyer.city} onChange={updateBuyer("city")} className={fieldClass} /></label>
                            <label className="grid gap-2 text-sm font-bold">Kode Pos<input required value={buyer.postal_code} onChange={updateBuyer("postal_code")} className={fieldClass} /></label>
                        </> : <label className="grid gap-2 text-sm font-bold md:col-span-2">Nama buyer<input required value={buyer.name} onChange={updateBuyer("name")} className={fieldClass} /></label>}
                        <label className="grid gap-2 text-sm font-bold">Email buyer<input required type="email" value={buyer.email} onChange={updateBuyer("email")} className={fieldClass} /></label>
                        <label className="grid gap-2 text-sm font-bold">No. HP<input required value={buyer.phone} onChange={updateBuyer("phone")} className={fieldClass} /></label>
                        <label className="grid gap-2 text-sm font-bold">Metode pembayaran<select value={buyer.payment_method} onChange={updateBuyer("payment_method")} className={fieldClass}><option value="internal_billing">Internal Billing</option><option value="bank_transfer">Transfer Manual</option><option value="cod">COD</option></select></label>
                        <label className="grid gap-2 text-sm font-bold md:col-span-2">Alamat<textarea required rows={3} value={buyer.address} onChange={updateBuyer("address")} className={fieldClass} /></label>
                        <label className="grid gap-2 text-sm font-bold md:col-span-2">Catatan<textarea rows={2} value={buyer.notes} onChange={updateBuyer("notes")} className={fieldClass} /></label>
                    </div>

                    <section className="mt-6 rounded-xl border border-slate-200 p-4">
                        <div className="flex items-center justify-between gap-3">
                            <div><h3 className="font-black">Item Order</h3><p className="text-sm text-slate-500">Produk yang sama hanya boleh dipilih satu kali.</p></div>
                            <button type="button" onClick={() => setItems((current) => [...current, blankLine()])} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 font-bold text-white"><Plus size={18} /> Tambah Item</button>
                        </div>

                        {products.isLoading ? <Loading label="Memuat produk..." /> : (
                            <div className="mt-4 grid gap-3">
                                {items.map((item, index) => (
                                    <div key={index} className="grid gap-3 md:grid-cols-[1fr_130px_auto]">
                                        <select required value={item.product_id} onChange={(event) => updateLine(index, { product_id: event.target.value })} className={fieldClass}>
                                            <option value="">Pilih produk</option>
                                            {products.data?.filter((product) => product.is_active).map((product) => <option key={product.id} value={product.id}>{product.name} · {product.sku} · Rp {Number(product.price).toLocaleString("id-ID")}</option>)}
                                        </select>
                                        <input required type="number" min="1" max="999" value={item.quantity} onChange={(event) => updateLine(index, { quantity: event.target.value })} className={fieldClass} />
                                        <button type="button" disabled={items.length === 1} onClick={() => setItems((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="rounded-xl border border-slate-300 p-3 text-rose-600 disabled:opacity-30"><Trash2 /></button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                </div>

                <div className="flex justify-end gap-3 border-t border-slate-200 px-5 py-4">
                    <button type="button" onClick={onClose} className="rounded-xl border border-slate-300 px-5 py-3 font-bold">Batal</button>
                    <button disabled={saving || products.isLoading} className="rounded-xl bg-emerald-600 px-6 py-3 font-black text-white disabled:bg-slate-300">{saving ? "Menyimpan..." : "Buat Order"}</button>
                </div>
            </form>
        </div>
    );
}
