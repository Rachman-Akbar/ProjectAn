import { useEffect, useMemo, useState } from "react";
import { ImagePlus, Images, Info, Package, Trash2, X } from "lucide-react";
import { fieldClass } from "@/components/Common";
import { api, errorMessage, resourceData } from "@/lib/api";

const MAX_IMAGES = 12;

const emptyForm = () => ({
    category_id: "",
    name: "",
    slug: "",
    sku: "",
    type: "product",
    description: "",
    brand: "",
    price: "",
    track_stock: true,
    stock: "0",
    status: "published",
    is_featured: false,
    is_active: true,
});


function normalizeBoolean(value, fallback = false) {
    if (value === null || value === undefined) {
        return fallback;
    }

    if (typeof value === "string") {
        return !["0", "false", "off", "no", ""].includes(value.toLowerCase());
    }

    return Boolean(value);
}

function productToForm(product) {
    if (!product) {
        return emptyForm();
    }

    return {
        category_id: String(product.primary_category_id ?? product.category_id ?? ""),
        name: product.name ?? "",
        slug: product.slug ?? "",
        sku: product.sku ?? "",
        type: product.type ?? "product",
        description: product.description ?? "",
        brand: product.brand ?? "",
        price: String(product.price ?? ""),
        track_stock: normalizeBoolean(product.track_stock, true),
        stock: String(product.stock ?? "0"),
        status: product.status ?? "published",
        is_featured: normalizeBoolean(product.is_featured),
        is_active: normalizeBoolean(product.is_active, true),
    };
}

function existingProductImages(product) {
    if (!product) {
        return [];
    }

    const images = Array.isArray(product.images) && product.images.length
        ? product.images
        : Array.isArray(product.image_urls)
            ? product.image_urls
            : product.thumbnail
                ? [product.thumbnail]
                : [];

    return images.map((image, index) => ({
        key: `existing-${image?.id ?? index}`,
        path: typeof image === "string" ? image : image.path ?? image.url,
        url: typeof image === "string" ? image : image.url ?? image.path,
    })).filter((image) => image.path && image.url);
}

export function ProductForm({ product, categories, onClose, onSaved }) {
    const [activeTab, setActiveTab] = useState("info");
    const [form, setForm] = useState(() => productToForm(product));
    const [existingImages, setExistingImages] = useState(() => existingProductImages(product));
    const [newImages, setNewImages] = useState([]);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");


    const newImagePreviews = useMemo(
        () => newImages.map((file) => ({ file, url: URL.createObjectURL(file) })),
        [newImages],
    );

    useEffect(() => () => {
        newImagePreviews.forEach((preview) => URL.revokeObjectURL(preview.url));
    }, [newImagePreviews]);

    const imageCount = existingImages.length + newImages.length;
    const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

    const addFiles = (event) => {
        const files = Array.from(event.target.files ?? []);
        setNewImages((current) => [...current, ...files].slice(0, Math.max(0, MAX_IMAGES - existingImages.length)));
        event.target.value = "";
    };


    const submit = async (event) => {
        event.preventDefault();
        setSaving(true);
        setError("");

        try {
            const body = new FormData();
            body.append("primary_category_id", form.category_id);
            body.append("category_id", form.category_id);
            body.append("category_ids", JSON.stringify([Number(form.category_id)]));
            body.append("name", form.name);
            body.append("slug", form.slug);
            body.append("sku", form.sku);
            body.append("type", form.type);
            body.append("description", form.description);
            body.append("brand", form.brand);
            body.append("price", form.price);
            body.append("track_stock", form.track_stock ? "1" : "0");
            body.append("stock", form.track_stock ? form.stock : "");
            body.append("status", form.status);
            body.append("is_featured", form.is_featured ? "1" : "0");
            body.append("is_active", form.is_active ? "1" : "0");
            body.append("existing_images", JSON.stringify(existingImages.map((image) => image.path)));
            newImages.forEach((file) => body.append("images[]", file));

            const response = product
                ? await api.post(`/admin/products/${product.id}`, body)
                : await api.post("/admin/products", body);
            await onSaved(resourceData(response));
            onClose();
        } catch (exception) {
            setError(errorMessage(exception, "Produk gagal disimpan."));
        } finally {
            setSaving(false);
        }
    };

    const tabs = [
        { id: "info", label: "Informasi", icon: <Info size={17} /> },
        { id: "images", label: "Gambar", icon: <Images size={17} /> },
        { id: "stock", label: "Harga & Stok", icon: <Package size={17} /> },
    ];

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 p-4">
            <form onSubmit={submit} className="mx-auto my-4 w-full max-w-5xl rounded-2xl border border-slate-200 bg-white">
                <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                    <div>
                        <h2 className="text-xl font-black">{product ? "Edit Produk" : "Tambah Produk"}</h2>
                        <p className="mt-1 text-sm text-slate-500">Produk menggunakan satu harga, satu SKU, dan satu stok.</p>
                    </div>
                    <button type="button" onClick={onClose} className="rounded-lg p-2 hover:bg-slate-100"><X /></button>
                </div>

                <div className="flex gap-1 overflow-x-auto border-b border-slate-200 px-5 pt-3">
                    {tabs.map((tab) => (
                        <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)} className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-black ${activeTab === tab.id ? "border-emerald-600 text-emerald-700" : "border-transparent text-slate-500"}`}>
                            {tab.icon}{tab.label}
                        </button>
                    ))}
                </div>

                <div className="p-5">
                    {error ? <div className="mb-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700">{error}</div> : null}

                    {activeTab === "info" ? (
                        <div className="grid gap-4 md:grid-cols-2">
                            <label className="grid gap-2 text-sm font-bold">Nama produk<input required value={form.name} onChange={(event) => update("name", event.target.value)} className={fieldClass} /></label>
                            <label className="grid gap-2 text-sm font-bold">Slug<input value={form.slug} onChange={(event) => update("slug", event.target.value)} placeholder="Otomatis dari nama jika kosong" className={fieldClass} /></label>
                            <label className="grid gap-2 text-sm font-bold">Kategori<select required value={form.category_id} onChange={(event) => update("category_id", event.target.value)} className={fieldClass}><option value="">Pilih kategori</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
                            <label className="grid gap-2 text-sm font-bold">Jenis<select value={form.type} onChange={(event) => update("type", event.target.value)} className={fieldClass}><option value="product">Produk</option><option value="service">Layanan</option></select></label>
                            <label className="grid gap-2 text-sm font-bold md:col-span-2">Deskripsi<textarea rows={5} value={form.description} onChange={(event) => update("description", event.target.value)} className={fieldClass} /></label>
                            <label className="grid gap-2 text-sm font-bold">Brand<input value={form.brand} onChange={(event) => update("brand", event.target.value)} className={fieldClass} /></label>
                            <label className="grid gap-2 text-sm font-bold">Status<select value={form.status} onChange={(event) => update("status", event.target.value)} className={fieldClass}><option value="published">Published</option><option value="draft">Draft</option><option value="archived">Archived</option></select></label>
                            <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={form.is_featured} onChange={(event) => update("is_featured", event.target.checked)} /> Featured</label>
                            <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={form.is_active} onChange={(event) => update("is_active", event.target.checked)} /> Aktif</label>

                        </div>
                    ) : null}

                    {activeTab === "images" ? (
                        <div>
                            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-300 px-4 py-3 font-bold"><ImagePlus size={18} /> Tambah Gambar<input type="file" accept="image/png,image/jpeg,image/webp" multiple onChange={addFiles} className="hidden" /></label>
                            <p className="mt-2 text-sm text-slate-500">{imageCount}/{MAX_IMAGES} gambar. Gambar pertama menjadi gambar utama.</p>
                            <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                                {existingImages.map((image) => (
                                    <div key={image.key} className="relative aspect-square overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                                        <img src={image.url} alt="Produk" className="h-full w-full object-cover" />
                                        <button type="button" onClick={() => setExistingImages((current) => current.filter((item) => item.key !== image.key))} className="absolute right-2 top-2 rounded-lg bg-white/90 p-2 text-rose-600"><Trash2 size={16} /></button>
                                    </div>
                                ))}
                                {newImagePreviews.map((preview, index) => (
                                    <div key={`${preview.file.name}-${index}`} className="relative aspect-square overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                                        <img src={preview.url} alt={preview.file.name} className="h-full w-full object-cover" />
                                        <button type="button" onClick={() => setNewImages((current) => current.filter((_, fileIndex) => fileIndex !== index))} className="absolute right-2 top-2 rounded-lg bg-white/90 p-2 text-rose-600"><Trash2 size={16} /></button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : null}

                    {activeTab === "stock" ? (
                        <div className="grid gap-4 md:grid-cols-2">
                            <label className="grid gap-2 text-sm font-bold">SKU<input value={form.sku} onChange={(event) => update("sku", event.target.value)} placeholder="Dibuat otomatis jika kosong" className={fieldClass} /></label>
                            <label className="grid gap-2 text-sm font-bold">Harga<input required type="number" min="0" step="0.01" value={form.price} onChange={(event) => update("price", event.target.value)} className={fieldClass} /></label>
                            <label className="flex items-center gap-2 text-sm font-bold md:col-span-2"><input type="checkbox" checked={form.track_stock} onChange={(event) => update("track_stock", event.target.checked)} /> Pantau stok</label>
                            {form.track_stock ? <label className="grid gap-2 text-sm font-bold">Stok<input required type="number" min="0" step="1" value={form.stock} onChange={(event) => update("stock", event.target.value)} className={fieldClass} /></label> : null}
                        </div>
                    ) : null}
                </div>

                <div className="flex justify-end gap-3 border-t border-slate-200 px-5 py-4">
                    <button type="button" onClick={onClose} className="rounded-xl border border-slate-300 px-5 py-3 font-bold">Batal</button>
                    <button disabled={saving} className="rounded-xl bg-emerald-600 px-6 py-3 font-black text-white disabled:bg-slate-300">{saving ? "Menyimpan..." : "Simpan Produk"}</button>
                </div>
            </form>
        </div>
    );
}
