import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronUp, ImagePlus, Images, Info, Layers, Plus, Star, Trash2, X } from "lucide-react";
import { fieldClass } from "@/components/Common";
import { api, collectionData, errorMessage, resourceData } from "@/lib/api";

const MAX_IMAGES = 12;

const emptyForm = () => ({
    category_id: "",
    name: "",
    slug: "",
    type: "product",
    description: "",
    brand: "",
    status: "published",
    is_featured: false,
    is_active: true,
});

const emptySimpleVariant = () => ({
    id: null,
    sku: "",
    price: "",
    track_stock: true,
    stock: "0",
});

const emptyAttribute = () => ({
    name: "",
    value: "",
});

function createClientKey() {
    return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
}

const emptyVariant = (isDefault = false) => ({
    _key: createClientKey(),
    id: null,
    name: "",
    sku: "",
    price: "",
    attributes: [emptyAttribute()],
    track_stock: true,
    stock: "0",
    is_default: isDefault,
    is_active: true,
});

function normalizeBoolean(value, fallback = false) {
    if (value === null || value === undefined) {
        return fallback;
    }

    if (typeof value === "string") {
        return !["", "0", "false", "off", "no"].includes(value.trim().toLowerCase());
    }

    return Boolean(value);
}

function pathFromImage(value) {
    const raw = typeof value === "object" && value
        ? value.path ?? value.url ?? ""
        : value ?? "";

    if (typeof raw !== "string") {
        return "";
    }

    const normalized = raw.trim().replaceAll("\\", "/");

    if (!normalized) {
        return "";
    }

    if (/^https?:\/\//i.test(normalized)) {
        try {
            const url = new URL(normalized);
            const mediaMarker = "/api/media/products/";
            const storageMarker = "/storage/";

            if (url.pathname.includes(mediaMarker)) {
                return `products/${decodeURIComponent(url.pathname.split(mediaMarker).pop() ?? "")}`;
            }

            if (url.pathname.includes(storageMarker)) {
                return decodeURIComponent(url.pathname.split(storageMarker).pop() ?? "");
            }

            return "";
        } catch {
            return "";
        }
    }

    return normalized
        .replace(/^\/+/, "")
        .replace(/^storage\/app\/public\//, "")
        .replace(/^public\/storage\//, "")
        .replace(/^storage\//, "");
}

function urlFromImage(value, fallback = "") {
    if (typeof value === "object" && value) {
        if (typeof value.url === "string" && value.url.trim()) {
            return value.url.trim();
        }

        if (typeof value.path === "string" && /^https?:\/\//i.test(value.path)) {
            return value.path;
        }
    }

    if (typeof value === "string" && /^https?:\/\//i.test(value)) {
        return value;
    }

    return fallback;
}

function productExistingImages(product) {
    const source = Array.isArray(product?.images) ? product.images : [];
    const urls = Array.isArray(product?.image_urls) ? product.image_urls : [];
    const fallbackThumbnail = typeof product?.thumbnail === "string" ? product.thumbnail : "";
    const normalized = source
        .map((image, index) => {
            const path = pathFromImage(image);
            const url = urlFromImage(image, urls[index] ?? (index === 0 ? fallbackThumbnail : ""));

            return {
                id: `existing-${index}-${path}`,
                path,
                url,
            };
        })
        .filter((image) => image.path && image.url);

    if (normalized.length) {
        return normalized;
    }

    return urls
        .map((url, index) => ({
            id: `existing-url-${index}`,
            path: pathFromImage(url),
            url,
        }))
        .filter((image) => image.path && image.url);
}

function normalizeVariant(variant, index) {
    const attributes = Array.isArray(variant?.attributes) && variant.attributes.length
        ? variant.attributes.map((attribute) => ({
            name: String(attribute?.name ?? ""),
            value: String(attribute?.value ?? ""),
        }))
        : [emptyAttribute()];

    return {
        _key: variant?.id ? `variant-${variant.id}` : createClientKey(),
        id: variant?.id ?? null,
        name: String(variant?.name ?? ""),
        sku: String(variant?.sku ?? ""),
        price: String(variant?.price ?? ""),
        attributes,
        track_stock: normalizeBoolean(variant?.track_stock, true),
        stock: String(variant?.stock ?? "0"),
        is_default: normalizeBoolean(variant?.is_default, index === 0),
        is_active: normalizeBoolean(variant?.is_active, true),
    };
}

function ImagePreview({ src, alt }) {
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        setFailed(false);
    }, [src]);

    if (!src || failed) {
        return (
            <div className="grid h-full w-full place-items-center bg-slate-100 text-xs font-bold text-slate-400">
                Gambar gagal dimuat
            </div>
        );
    }

    return (
        <img
            src={src}
            alt={alt}
            className="h-full w-full object-cover"
            onError={() => setFailed(true)}
        />
    );
}

export function ProductForm({ product, categories, onClose, onSaved }) {
    const fileInputRef = useRef(null);
    const newImagesRef = useRef([]);
    const [form, setForm] = useState(emptyForm());
    const [activeTab, setActiveTab] = useState("information");
    const [variantMode, setVariantMode] = useState(false);
    const [expandedVariants, setExpandedVariants] = useState({});
    const [simpleVariant, setSimpleVariant] = useState(emptySimpleVariant());
    const [variants, setVariants] = useState([emptyVariant(true)]);
    const [existingImages, setExistingImages] = useState([]);
    const [newImages, setNewImages] = useState([]);
    const [attributeOptions, setAttributeOptions] = useState([]);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const totalImages = existingImages.length + newImages.length;
    const title = product ? "Edit Produk" : "Tambah Produk";

    useEffect(() => {
        let active = true;

        api.get("/admin/products/attribute-options")
            .then((response) => {
                if (active) {
                    setAttributeOptions(collectionData(response)
                        .map((attribute) => typeof attribute === "string" ? attribute : attribute?.name)
                        .map((name) => String(name ?? "").trim())
                        .filter(Boolean));
                }
            })
            .catch(() => {
                if (active) {
                    setAttributeOptions([]);
                }
            });

        return () => {
            active = false;
        };
    }, []);

    useEffect(() => {
        const productVariants = Array.isArray(product?.variants) ? product.variants : [];
        const defaultVariant = product?.default_variant ?? productVariants[0] ?? null;
        const detectedVariantMode = Boolean(
            product?.has_multiple_variants
            || productVariants.length > 1
            || productVariants.some((variant) => Array.isArray(variant?.attributes) && variant.attributes.length > 0)
        );

        setForm(product
            ? {
                category_id: String(product.primary_category_id ?? product.category_id ?? product.category?.id ?? ""),
                name: String(product.name ?? ""),
                slug: String(product.slug ?? ""),
                type: String(product.type ?? "product"),
                description: String(product.description ?? ""),
                brand: String(product.brand ?? ""),
                status: String(product.status ?? "published"),
                is_featured: normalizeBoolean(product.is_featured),
                is_active: normalizeBoolean(product.is_active, true),
            }
            : emptyForm());

        setVariantMode(detectedVariantMode);
        setSimpleVariant(defaultVariant
            ? {
                id: defaultVariant.id ?? null,
                sku: String(defaultVariant.sku ?? ""),
                price: String(defaultVariant.price ?? ""),
                track_stock: normalizeBoolean(defaultVariant.track_stock, true),
                stock: String(defaultVariant.stock ?? "0"),
            }
            : emptySimpleVariant());
        const normalizedVariants = productVariants.length
            ? productVariants.map(normalizeVariant)
            : [emptyVariant(true)];

        setVariants(normalizedVariants);
        setExpandedVariants(normalizedVariants.reduce((result, variant, index) => ({
            ...result,
            [variant._key]: index === 0,
        }), {}));
        setActiveTab("information");
        setExistingImages(productExistingImages(product));
        setNewImages((current) => {
            current.forEach((image) => URL.revokeObjectURL(image.url));
            return [];
        });
        setError("");
    }, [product]);

    useEffect(() => {
        newImagesRef.current = newImages;
    }, [newImages]);

    useEffect(() => () => {
        newImagesRef.current.forEach((image) => URL.revokeObjectURL(image.url));
    }, []);

    const availableAttributeNames = useMemo(() => {
        const localNames = variants.flatMap((variant) => variant.attributes.map((attribute) => attribute.name));

        return [...new Set([...attributeOptions, ...localNames].map((name) => String(name ?? "").trim()).filter(Boolean))]
            .sort((left, right) => left.localeCompare(right));
    }, [attributeOptions, variants]);

    const selectImages = (event) => {
        const files = Array.from(event.target.files ?? []);
        event.target.value = "";

        if (!files.length) {
            return;
        }

        const availableSlots = Math.max(0, MAX_IMAGES - totalImages);
        const accepted = files
            .filter((file) => ["image/jpeg", "image/png", "image/webp"].includes(file.type))
            .filter((file) => file.size <= 5 * 1024 * 1024)
            .slice(0, availableSlots);

        if (!accepted.length) {
            setError("Gambar harus JPG, PNG, atau WebP dengan ukuran maksimal 5 MB per file.");
            return;
        }

        setError("");
        setNewImages((current) => [
            ...current,
            ...accepted.map((file) => ({
                id: `${file.name}-${file.lastModified}-${globalThis.crypto?.randomUUID?.() ?? Math.random()}`,
                file,
                url: URL.createObjectURL(file),
            })),
        ]);
    };

    const removeExistingImage = (id) => {
        setExistingImages((current) => current.filter((image) => image.id !== id));
    };

    const removeNewImage = (id) => {
        setNewImages((current) => {
            const target = current.find((image) => image.id === id);

            if (target) {
                URL.revokeObjectURL(target.url);
            }

            return current.filter((image) => image.id !== id);
        });
    };

    const addVariant = () => {
        const variant = emptyVariant(variants.length === 0);

        setVariants((current) => [...current, variant]);
        setExpandedVariants((current) => ({ ...current, [variant._key]: true }));
    };

    const toggleVariant = (key) => {
        setExpandedVariants((current) => ({ ...current, [key]: !current[key] }));
    };

    const updateVariant = (index, patch) => {
        setVariants((current) => current.map((variant, variantIndex) => (
            variantIndex === index ? { ...variant, ...patch } : variant
        )));
    };

    const removeVariant = (index) => {
        const removed = variants[index];

        if (removed) {
            setExpandedVariants((current) => {
                const next = { ...current };
                delete next[removed._key];
                return next;
            });
        }

        setVariants((current) => {
            const next = current.filter((_, variantIndex) => variantIndex !== index);

            if (!next.length) {
                const fallback = emptyVariant(true);
                setExpandedVariants((expanded) => ({ ...expanded, [fallback._key]: true }));
                return [fallback];
            }

            if (!next.some((variant) => variant.is_default)) {
                next[0] = { ...next[0], is_default: true };
            }

            return next;
        });
    };

    const setDefaultVariant = (index) => {
        setVariants((current) => current.map((variant, variantIndex) => ({
            ...variant,
            is_default: variantIndex === index,
        })));
    };

    const addAttribute = (variantIndex) => {
        setVariants((current) => current.map((variant, index) => (
            index === variantIndex
                ? { ...variant, attributes: [...variant.attributes, emptyAttribute()] }
                : variant
        )));
    };

    const updateAttribute = (variantIndex, attributeIndex, patch) => {
        setVariants((current) => current.map((variant, index) => (
            index === variantIndex
                ? {
                    ...variant,
                    attributes: variant.attributes.map((attribute, currentAttributeIndex) => (
                        currentAttributeIndex === attributeIndex
                            ? { ...attribute, ...patch }
                            : attribute
                    )),
                }
                : variant
        )));
    };

    const removeAttribute = (variantIndex, attributeIndex) => {
        setVariants((current) => current.map((variant, index) => {
            if (index !== variantIndex) {
                return variant;
            }

            const attributes = variant.attributes.filter((_, currentAttributeIndex) => currentAttributeIndex !== attributeIndex);

            return {
                ...variant,
                attributes: attributes.length ? attributes : [emptyAttribute()],
            };
        }));
    };

    const validate = () => {
        if (!form.category_id || !form.name.trim()) {
            return { message: "Kategori dan nama produk wajib diisi.", tab: "information" };
        }

        if (variantMode) {
            if (!variants.length) {
                return { message: "Tambahkan minimal satu variant.", tab: "pricing" };
            }

            if (variants.filter((variant) => variant.is_default).length !== 1) {
                return { message: "Pilih tepat satu variant default.", tab: "pricing" };
            }

            if (!variants.some((variant) => variant.is_active)) {
                return { message: "Minimal harus ada satu variant aktif.", tab: "pricing" };
            }

            for (const variant of variants) {
                if (!variant.name.trim() || variant.price === "") {
                    return { message: "Nama dan harga setiap variant wajib diisi.", tab: "pricing", variantKey: variant._key };
                }

                const validAttributes = variant.attributes.filter((attribute) => attribute.name.trim() && attribute.value.trim());

                if (!validAttributes.length) {
                    return {
                        message: `Variant ${variant.name || "baru"} harus memiliki minimal satu atribut.`,
                        tab: "pricing",
                        variantKey: variant._key,
                    };
                }

                if (variant.track_stock && variant.stock === "") {
                    return {
                        message: `Stok variant ${variant.name || "baru"} wajib diisi.`,
                        tab: "pricing",
                        variantKey: variant._key,
                    };
                }
            }
        } else {
            if (simpleVariant.price === "") {
                return { message: "Harga produk wajib diisi.", tab: "pricing" };
            }

            if (simpleVariant.track_stock && simpleVariant.stock === "") {
                return { message: "Stok produk wajib diisi.", tab: "pricing" };
            }
        }

        return null;
    };

    const submit = async (event) => {
        event.preventDefault();
        const validationError = validate();

        if (validationError) {
            setError(validationError.message);
            setActiveTab(validationError.tab);

            if (validationError.variantKey) {
                setExpandedVariants((current) => ({ ...current, [validationError.variantKey]: true }));
            }

            return;
        }

        setSaving(true);
        setError("");

        const body = new FormData();
        body.append("category_id", form.category_id);
        body.append("primary_category_id", form.category_id);
        body.append("name", form.name.trim());
        body.append("slug", form.slug.trim());
        body.append("type", form.type);
        body.append("description", form.description.trim());
        body.append("brand", form.brand.trim());
        body.append("status", form.status);
        body.append("is_featured", form.is_featured ? "1" : "0");
        body.append("is_active", form.is_active ? "1" : "0");
        body.append("existing_images", JSON.stringify(existingImages.map((image) => image.path)));
        body.append("variant_mode", variantMode ? "1" : "0");

        newImages.forEach((image) => {
            body.append("images[]", image.file);
        });

        if (variantMode) {
            body.append("variants", JSON.stringify(variants.map((variant) => ({
                id: variant.id,
                name: variant.name.trim(),
                sku: variant.sku.trim() || null,
                price: Number(variant.price),
                attributes: variant.attributes
                    .map((attribute) => ({
                        name: attribute.name.trim(),
                        value: attribute.value.trim(),
                    }))
                    .filter((attribute) => attribute.name && attribute.value),
                track_stock: Boolean(variant.track_stock),
                stock: variant.track_stock ? Number(variant.stock || 0) : null,
                is_default: Boolean(variant.is_default),
                is_active: Boolean(variant.is_active),
            }))));
        } else {
            if (simpleVariant.id) {
                body.append("simple_variant_id", String(simpleVariant.id));
            }

            body.append("sku", simpleVariant.sku.trim());
            body.append("price", String(Number(simpleVariant.price)));
            body.append("track_stock", simpleVariant.track_stock ? "1" : "0");
            body.append("stock", simpleVariant.track_stock ? String(Number(simpleVariant.stock || 0)) : "0");
        }

        try {
            const response = await api.post(
                product ? `/admin/products/${product.id}` : "/admin/products",
                body
            );
            const saved = resourceData(response);

            await onSaved?.(saved);
            onClose?.();
        } catch (exception) {
            setError(errorMessage(exception, "Produk gagal disimpan."));
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/55 p-3 sm:p-5">
            <form onSubmit={submit} className="mx-auto my-3 w-full max-w-6xl overflow-hidden rounded-3xl bg-white shadow-2xl">
                <div className="sticky top-0 z-20 flex items-center justify-between border-b bg-white px-5 py-4 sm:px-7">
                    <div>
                        <h2 className="text-2xl font-black text-slate-950">{title}</h2>
                        <p className="mt-1 text-sm text-slate-500">Data produk, gambar, harga, stok, dan variant.</p>
                    </div>
                    <button type="button" onClick={onClose} className="rounded-xl border p-2 text-slate-600 hover:bg-slate-100">
                        <X />
                    </button>
                </div>

                <div className="border-b bg-white px-5 pt-4 sm:px-7">
                    <div className="flex gap-2 overflow-x-auto pb-4">
                        {[
                            { id: "information", label: "Informasi", icon: Info },
                            { id: "images", label: `Gambar (${totalImages})`, icon: Images },
                            { id: "pricing", label: variantMode ? `Variant (${variants.length})` : "Harga & Stok", icon: Layers },
                        ].map((tab) => {
                            const Icon = tab.icon;

                            return (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`inline-flex shrink-0 items-center gap-2 rounded-t-xl border-b-2 px-4 py-3 text-sm font-black transition ${activeTab === tab.id ? "border-emerald-600 text-emerald-700" : "border-transparent text-slate-500 hover:text-slate-900"}`}
                                >
                                    <Icon size={17} /> {tab.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="grid gap-6 p-5 sm:p-7">
                    {error ? (
                        <p className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700">
                            {error}
                        </p>
                    ) : null}

                    {activeTab === "information" ? (
                        <section className="grid gap-4 rounded-2xl border p-5 md:grid-cols-2">
                            <div className="md:col-span-2">
                                <h3 className="font-black text-slate-950">Informasi Produk</h3>
                                <p className="mt-1 text-sm text-slate-500">Atur identitas, kategori, status, dan deskripsi produk.</p>
                            </div>
                            <select required value={form.category_id} onChange={(event) => setForm({ ...form, category_id: event.target.value })} className={fieldClass}>
                                <option value="">Pilih kategori</option>
                                {(categories ?? []).map((category) => (
                                    <option key={category.id} value={category.id}>{category.name}</option>
                                ))}
                            </select>
                            <select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })} className={fieldClass}>
                                <option value="product">Produk</option>
                                <option value="service">Layanan</option>
                            </select>
                            <input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Nama produk" className={fieldClass} />
                            <input value={form.slug} onChange={(event) => setForm({ ...form, slug: event.target.value })} placeholder="Slug otomatis jika kosong" className={fieldClass} />
                            <input value={form.brand} onChange={(event) => setForm({ ...form, brand: event.target.value })} placeholder="Brand" className={fieldClass} />
                            <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })} className={fieldClass}>
                                <option value="draft">Draft</option>
                                <option value="published">Published</option>
                                <option value="archived">Archived</option>
                            </select>
                            <textarea rows={4} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Deskripsi produk" className={`${fieldClass} md:col-span-2`} />
                            <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                                <input type="checkbox" checked={form.is_featured} onChange={(event) => setForm({ ...form, is_featured: event.target.checked })} />
                                Produk unggulan
                            </label>
                            <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                                <input type="checkbox" checked={form.is_active} onChange={(event) => setForm({ ...form, is_active: event.target.checked })} />
                                Produk aktif
                            </label>
                        </section>
                    ) : null}

                    {activeTab === "images" ? (
                        <section className="rounded-2xl border p-5">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <h3 className="font-black text-slate-950">Gambar Produk</h3>
                                    <p className="mt-1 text-sm text-slate-500">JPG, PNG, atau WebP. Maksimal 5 MB per file.</p>
                                </div>
                                <button type="button" disabled={totalImages >= MAX_IMAGES} onClick={() => fileInputRef.current?.click()} className="inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 font-bold disabled:opacity-40">
                                    <ImagePlus size={18} /> Tambah Gambar
                                </button>
                                <input ref={fileInputRef} type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={selectImages} className="hidden" />
                            </div>

                            <div className="mt-5 flex flex-wrap gap-3">
                                {existingImages.map((image) => (
                                    <div key={image.id} className="relative h-36 w-36 overflow-hidden rounded-2xl border bg-slate-100">
                                        <ImagePreview src={image.url} alt="Produk" />
                                        <button type="button" onClick={() => removeExistingImage(image.id)} className="absolute right-2 top-2 rounded-full bg-white p-1.5 text-rose-600 shadow">
                                            <X size={15} />
                                        </button>
                                    </div>
                                ))}
                                {newImages.map((image) => (
                                    <div key={image.id} className="relative h-36 w-36 overflow-hidden rounded-2xl border bg-slate-100">
                                        <ImagePreview src={image.url} alt={image.file.name} />
                                        <button type="button" onClick={() => removeNewImage(image.id)} className="absolute right-2 top-2 rounded-full bg-white p-1.5 text-rose-600 shadow">
                                            <X size={15} />
                                        </button>
                                    </div>
                                ))}
                                {!totalImages ? (
                                    <div className="grid h-36 w-full place-items-center rounded-2xl border border-dashed bg-slate-50 text-sm font-bold text-slate-400 sm:w-72">
                                        Belum ada gambar
                                    </div>
                                ) : null}
                            </div>
                        </section>
                    ) : null}

                    {activeTab === "pricing" ? (
                        <section className="rounded-2xl border p-5">
                            <div>
                                <h3 className="font-black text-slate-950">Harga, Stok, dan Variant</h3>
                                <p className="mt-1 text-sm text-slate-500">Pilih produk sederhana atau gunakan variant yang dibentuk dari atribut.</p>
                            </div>

                            <div className="mt-5 inline-flex rounded-xl border bg-slate-100 p-1">
                                <button
                                    type="button"
                                    onClick={() => setVariantMode(false)}
                                    className={`rounded-lg px-4 py-2.5 text-sm font-black transition ${!variantMode ? "bg-white text-emerald-700 shadow-sm" : "text-slate-500"}`}
                                >
                                    Tanpa Variant
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setVariantMode(true)}
                                    className={`rounded-lg px-4 py-2.5 text-sm font-black transition ${variantMode ? "bg-white text-emerald-700 shadow-sm" : "text-slate-500"}`}
                                >
                                    Gunakan Variant
                                </button>
                            </div>

                            {!variantMode ? (
                                <div className="mt-5">
                                    <p className="mb-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">Sistem akan menyimpan satu variant default otomatis. Buyer tidak perlu memilih variant.</p>
                                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                                        <input value={simpleVariant.sku} onChange={(event) => setSimpleVariant({ ...simpleVariant, sku: event.target.value })} placeholder="SKU" className={fieldClass} />
                                        <input required type="number" min="0" step="0.01" value={simpleVariant.price} onChange={(event) => setSimpleVariant({ ...simpleVariant, price: event.target.value })} placeholder="Harga" className={fieldClass} />
                                        <label className="flex items-center gap-2 rounded-xl border px-4 text-sm font-bold">
                                            <input type="checkbox" checked={simpleVariant.track_stock} onChange={(event) => setSimpleVariant({ ...simpleVariant, track_stock: event.target.checked })} />
                                            Lacak stok
                                        </label>
                                        <input disabled={!simpleVariant.track_stock} required={simpleVariant.track_stock} type="number" min="0" step="1" value={simpleVariant.stock} onChange={(event) => setSimpleVariant({ ...simpleVariant, stock: event.target.value })} placeholder="Stok" className={fieldClass} />
                                    </div>
                                </div>
                            ) : (
                                <div className="mt-5 grid gap-4">
                                    {variants.map((variant, variantIndex) => {
                                        const expanded = Boolean(expandedVariants[variant._key]);
                                        const attributeSummary = variant.attributes
                                            .filter((attribute) => attribute.name.trim() && attribute.value.trim())
                                            .map((attribute) => `${attribute.name}: ${attribute.value}`)
                                            .join(" · ");

                                        return (
                                            <article key={variant._key} className="overflow-hidden rounded-2xl border bg-slate-50">
                                                <div className="flex items-center gap-3 p-4">
                                                    <button type="button" onClick={() => toggleVariant(variant._key)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                                                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-slate-600 shadow-sm">
                                                            {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                                        </span>
                                                        <span className="min-w-0">
                                                            <span className="block truncate font-black">{variant.name.trim() || `Variant ${variantIndex + 1}`}</span>
                                                            <span className="mt-0.5 block truncate text-xs text-slate-500">{attributeSummary || "Atribut belum diisi"}</span>
                                                        </span>
                                                    </button>
                                                    {variant.is_default ? <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-700">Default</span> : null}
                                                    <button type="button" onClick={() => removeVariant(variantIndex)} className="rounded-lg p-2 text-rose-600 hover:bg-rose-50">
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>

                                                {expanded ? (
                                                    <div className="border-t bg-white p-4">
                                                        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                                                            <input required value={variant.name} onChange={(event) => updateVariant(variantIndex, { name: event.target.value })} placeholder="Nama variant" className={fieldClass} />
                                                            <input value={variant.sku} onChange={(event) => updateVariant(variantIndex, { sku: event.target.value })} placeholder="SKU" className={fieldClass} />
                                                            <input required type="number" min="0" step="0.01" value={variant.price} onChange={(event) => updateVariant(variantIndex, { price: event.target.value })} placeholder="Harga" className={fieldClass} />
                                                            <input disabled={!variant.track_stock} required={variant.track_stock} type="number" min="0" step="1" value={variant.stock} onChange={(event) => updateVariant(variantIndex, { stock: event.target.value })} placeholder="Stok" className={fieldClass} />
                                                        </div>

                                                        <div className="mt-4 flex flex-wrap gap-5">
                                                            <label className="flex items-center gap-2 text-sm font-bold">
                                                                <input type="radio" name="default_variant" checked={variant.is_default} onChange={() => setDefaultVariant(variantIndex)} />
                                                                <Star size={16} /> Default
                                                            </label>
                                                            <label className="flex items-center gap-2 text-sm font-bold">
                                                                <input type="checkbox" checked={variant.track_stock} onChange={(event) => updateVariant(variantIndex, { track_stock: event.target.checked })} />
                                                                Lacak stok
                                                            </label>
                                                            <label className="flex items-center gap-2 text-sm font-bold">
                                                                <input type="checkbox" checked={variant.is_active} onChange={(event) => updateVariant(variantIndex, { is_active: event.target.checked })} />
                                                                Aktif
                                                            </label>
                                                        </div>

                                                        <div className="mt-4 grid gap-3">
                                                            {variant.attributes.map((attribute, attributeIndex) => (
                                                                <div key={attributeIndex} className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                                                                    <input list="product-attribute-options" value={attribute.name} onChange={(event) => updateAttribute(variantIndex, attributeIndex, { name: event.target.value })} placeholder="Nama atribut, misalnya Warna" className={fieldClass} />
                                                                    <input value={attribute.value} onChange={(event) => updateAttribute(variantIndex, attributeIndex, { value: event.target.value })} placeholder="Nilai, misalnya Hitam" className={fieldClass} />
                                                                    <button type="button" onClick={() => removeAttribute(variantIndex, attributeIndex)} className="rounded-xl border p-3 text-rose-600">
                                                                        <Trash2 size={18} />
                                                                    </button>
                                                                </div>
                                                            ))}
                                                            <button type="button" onClick={() => addAttribute(variantIndex)} className="inline-flex w-fit items-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm font-bold">
                                                                <Plus size={16} /> Tambah Atribut
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : null}
                                            </article>
                                        );
                                    })}
                                    <button type="button" onClick={addVariant} className="inline-flex w-fit items-center gap-2 rounded-xl border px-4 py-2.5 font-black">
                                        <Plus size={18} /> Tambah Variant
                                    </button>
                                </div>
                            )}
                        </section>
                    ) : null}
                </div>

                <datalist id="product-attribute-options">
                    {availableAttributeNames.map((name) => <option key={name} value={name} />)}
                </datalist>

                <div className="sticky bottom-0 flex justify-end gap-3 border-t bg-white px-5 py-4 sm:px-7">
                    <button type="button" onClick={onClose} className="rounded-xl border px-5 py-3 font-bold">Batal</button>
                    <button disabled={saving} className="rounded-xl bg-emerald-600 px-6 py-3 font-black text-white disabled:bg-slate-300">
                        {saving ? "Menyimpan..." : "Simpan Produk"}
                    </button>
                </div>
            </form>
        </div>
    );
}
