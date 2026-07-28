import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
    ArrowRight,
    CheckCircle2,
    ChevronDown,
    Grid3X3,
    ListOrdered,
    Menu,
    Minus,
    Plus,
    Search,
    ShoppingBag,
    ShoppingCart,
    Star,
    Trash2,
    X,
} from "lucide-react";
import { Link, Navigate, Outlet, useNavigate, useParams, useSearchParams } from "react-router-dom";
import company from "@/data/companyProfile.json";
import {
    Empty,
    fieldClass,
    Loading,
    productPrice,
    QueryError,
    StatusBadge,
    variantDescription,
} from "@/components/Common";
import { VariantSelectionModal } from "@/components/public/VariantSelectionModal";
import { api, collectionData, errorMessage, paginatedData, resourceData } from "@/lib/api";
import { currency, dateTime } from "@/lib/format";
import { cartSummary, useCartStore } from "@/stores/cartStore";

function activeVariants(product) {
    return Array.isArray(product?.variants) ? product.variants.filter((variant) => variant.is_active) : [];
}

function requiresVariantSelection(product) {
    return activeVariants(product).length > 1;
}

function checkoutItemPayload(item) {
    const payload = {
        product_id: Number(item.product.id),
        quantity: Math.max(1, Number(item.quantity) || 1),
    };

    if (requiresVariantSelection(item.product) && item.variant?.id) {
        payload.product_variant_id = Number(item.variant.id);
    }

    if (item.variant?.sku) {
        payload.variant_sku = String(item.variant.sku);
    }

    return payload;
}

function safeRating(product) {
    return Number(product?.rating) || 0;
}

function normalizeImageValue(value) {
    if (typeof value === "string") {
        return value.trim();
    }

    if (value && typeof value === "object") {
        return String(value.url ?? value.path ?? "").trim();
    }

    return "";
}

function productImageUrls(product) {
    const values = [
        product?.thumbnail,
        ...(Array.isArray(product?.image_urls) ? product.image_urls : []),
        ...(Array.isArray(product?.images) ? product.images : []),
    ];

    return [...new Set(values.map(normalizeImageValue).filter(Boolean))];
}

function SafeImage({ src, alt, className, fallbackClassName = "" }) {
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        setFailed(false);
    }, [src]);

    if (!src || failed) {
        return (
            <div className={`grid place-items-center bg-slate-100 text-xs font-bold text-slate-400 ${fallbackClassName}`}>
                Tanpa gambar
            </div>
        );
    }

    return <img src={src} alt={alt} className={className} onError={() => setFailed(true)} />;
}

export function PublicHeader() {
    const [mobileOpen, setMobileOpen] = useState(false);
    const [categoryOpen, setCategoryOpen] = useState(false);
    const items = useCartStore((state) => state.items);
    const navigate = useNavigate();
    const [params] = useSearchParams();
    const [search, setSearch] = useState(params.get("search") ?? "");
    const summary = cartSummary(items);
    const categories = useQuery({
        queryKey: ["categories"],
        queryFn: async () => collectionData(await api.get("/categories")),
        staleTime: 5 * 60 * 1000,
    });
    const sortedCategories = useMemo(
        () => [...(categories.data ?? [])].sort((a, b) => Number(a.sort_order) - Number(b.sort_order) || a.name.localeCompare(b.name)),
        [categories.data],
    );

    const submit = (event) => {
        event.preventDefault();
        navigate(search.trim() ? `/products?search=${encodeURIComponent(search.trim())}` : "/products");
        setMobileOpen(false);
    };

    return (
        <header className="sticky top-0 z-50 border-b border-slate-200 bg-white shadow-sm">
            <div className="relative mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 lg:px-8">
                <Link to="/" className="flex shrink-0 items-center gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-700 text-sm font-black text-white">K</span>
                    <span className="hidden sm:block">
                        <strong className="block text-base font-black leading-none text-slate-950">{company.shortName}</strong>
                        <small className="mt-1 block text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">{company.tagline}</small>
                    </span>
                </Link>

                <button
                    type="button"
                    onClick={() => setCategoryOpen((value) => !value)}
                    className="hidden shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700 transition hover:border-emerald-600 hover:text-emerald-700 md:inline-flex"
                >
                    <Grid3X3 size={18} />
                    Kategori
                    <ChevronDown size={16} className={categoryOpen ? "rotate-180 transition" : "transition"} />
                </button>

                <form onSubmit={submit} className="hidden min-w-0 flex-1 items-center rounded-xl border border-slate-200 bg-slate-50 px-2 md:flex">
                    <Search size={18} className="ml-2 shrink-0 text-slate-400" />
                    <input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Cari produk, layanan, kategori, atau SKU"
                        className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm outline-none"
                    />
                    <button className="rounded-lg bg-slate-950 px-4 py-2 text-xs font-black text-white">Cari</button>
                </form>

                <Link
                    to="/cart?tab=orders"
                    title="Riwayat order"
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:border-emerald-600 hover:text-emerald-700"
                >
                    <ListOrdered size={19} />
                </Link>

                <Link to="/cart" title="Keranjang" className="relative grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-950 text-white transition hover:bg-emerald-700">
                    <ShoppingCart size={19} />
                    {summary.quantity > 0 ? (
                        <span className="absolute -right-1.5 -top-1.5 min-w-5 rounded-full bg-rose-500 px-1 text-center text-[10px] font-black leading-5 text-white ring-2 ring-white">
                            {summary.quantity}
                        </span>
                    ) : null}
                </Link>

                <button type="button" onClick={() => setMobileOpen((value) => !value)} className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 md:hidden">
                    {mobileOpen ? <X size={20} /> : <Menu size={20} />}
                </button>

                {categoryOpen ? (
                    <div className="absolute left-4 right-4 top-[calc(100%+1px)] hidden rounded-b-3xl border border-t-0 border-slate-200 bg-white p-6 shadow-2xl md:block lg:left-8 lg:right-8">
                        <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-4">
                            <div>
                                <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">Kategori produk</p>
                                <h2 className="mt-1 text-xl font-black">Temukan kebutuhan perusahaan</h2>
                            </div>
                            <Link to="/products" onClick={() => setCategoryOpen(false)} className="inline-flex items-center gap-2 text-sm font-black text-emerald-700">
                                Semua produk <ArrowRight size={16} />
                            </Link>
                        </div>
                        {categories.isLoading ? (
                            <Loading label="Memuat kategori..." />
                        ) : (
                            <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                                {sortedCategories.map((category) => (
                                    <Link
                                        key={category.id}
                                        to={`/products?category=${category.slug}`}
                                        onClick={() => setCategoryOpen(false)}
                                        className="rounded-xl border border-transparent px-4 py-3 transition hover:border-emerald-200 hover:bg-emerald-50"
                                    >
                                        <b className="block text-sm text-slate-900">{category.name}</b>
                                        <span className="mt-1 block text-xs text-slate-500">{category.products_count ?? 0} produk</span>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>
                ) : null}
            </div>

            {mobileOpen ? (
                <div className="border-t border-slate-200 bg-white px-4 py-4 md:hidden">
                    <form onSubmit={submit} className="flex items-center rounded-xl border border-slate-200 bg-slate-50 px-2">
                        <Search size={18} className="ml-2 text-slate-400" />
                        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari produk..." className="min-w-0 flex-1 bg-transparent px-3 py-2.5 outline-none" />
                        <button className="rounded-lg bg-slate-950 px-3 py-2 text-xs font-black text-white">Cari</button>
                    </form>
                    <div className="mt-4 rounded-xl border border-slate-200 p-3">
                        <p className="px-2 text-xs font-black uppercase tracking-[0.16em] text-emerald-700">Kategori</p>
                        <div className="mt-2 grid gap-1 sm:grid-cols-2">
                            {sortedCategories.map((category) => (
                                <Link key={category.id} to={`/products?category=${category.slug}`} onClick={() => setMobileOpen(false)} className="rounded-lg px-2 py-2 text-sm font-bold hover:bg-slate-100">
                                    {category.name}
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>
            ) : null}
        </header>
    );
}

export function PublicLayout() {
    return (
        <div className="min-h-screen bg-[#f7f8f7] text-slate-900">
            <PublicHeader />
            <Outlet />
        </div>
    );
}

export function ProductCard({ product }) {
    const navigate = useNavigate();
    const add = useCartStore((state) => state.add);
    const [modalOpen, setModalOpen] = useState(false);
    const [action, setAction] = useState("cart");
    const [notice, setNotice] = useState("");
    const variant = product.default_variant ?? activeVariants(product)[0] ?? null;

    useEffect(() => {
        if (!notice) {
            return undefined;
        }

        const timer = window.setTimeout(() => setNotice(""), 1800);
        return () => window.clearTimeout(timer);
    }, [notice]);

    const begin = (nextAction) => {
        if (!product.available || !variant) {
            return;
        }

        if (requiresVariantSelection(product)) {
            setAction(nextAction);
            setModalOpen(true);
            return;
        }

        add(product, variant, 1);

        if (nextAction === "checkout") {
            navigate("/checkout");
            return;
        }

        setNotice("Ditambahkan ke keranjang");
    };

    const confirm = (selected, quantity) => {
        add(product, selected, quantity);
        setModalOpen(false);

        if (action === "checkout") {
            navigate("/checkout");
            return;
        }

        setNotice("Ditambahkan ke keranjang");
    };

    return (
        <>
            <article className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
                {notice ? <span className="absolute left-3 top-3 z-10 rounded-full bg-slate-950 px-3 py-1.5 text-[11px] font-black text-white">{notice}</span> : null}
                <Link to={`/products/${product.slug}`} className="relative block aspect-[4/3] overflow-hidden bg-slate-100">
                    <SafeImage src={productImageUrls(product)[0]} alt={product.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" fallbackClassName="h-full w-full" />
                </Link>
                <div className="p-4">
                    <p className="text-[11px] font-black uppercase tracking-[0.14em] text-emerald-700">{product.category?.name ?? "Katalog internal"}</p>
                    <Link to={`/products/${product.slug}`} className="mt-2 block line-clamp-2 min-h-12 text-base font-black leading-6 text-slate-950">{product.name}</Link>
                    <div className="mt-2 flex items-center gap-1 text-xs text-amber-500">
                        <Star size={14} fill="currentColor" />
                        <span className="font-black">{safeRating(product).toFixed(1)}</span>
                        <span className="text-slate-400">({Number(product.review_count) || 0})</span>
                    </div>
                    <p className="mt-3 text-lg font-black text-emerald-700">{productPrice(product)}</p>
                    <p className="mt-1 text-xs text-slate-500">{requiresVariantSelection(product) ? `${activeVariants(product).length} pilihan variant` : variant?.available ? "Tersedia" : "Tidak tersedia"}</p>
                    <div className="mt-4 grid grid-cols-2 gap-2">
                        <button disabled={!product.available} onClick={() => begin("cart")} className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-emerald-700 px-3 py-2.5 text-xs font-black text-emerald-800 disabled:opacity-40">
                            <ShoppingCart size={15} /> Keranjang
                        </button>
                        <button disabled={!product.available} onClick={() => begin("checkout")} className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-950 px-3 py-2.5 text-xs font-black text-white disabled:bg-slate-300">
                            <ShoppingBag size={15} /> Checkout
                        </button>
                    </div>
                </div>
            </article>

            <VariantSelectionModal
                open={modalOpen}
                product={product}
                initialVariantId={variant?.id}
                checkoutMode={action === "checkout"}
                title={action === "checkout" ? "Pilih variant sebelum checkout" : "Pilih variant untuk keranjang"}
                onClose={() => setModalOpen(false)}
                onConfirm={confirm}
            />
        </>
    );
}

export function HomePage() {
    const featured = useQuery({
        queryKey: ["featured"],
        queryFn: async () => paginatedData(await api.get("/products", { params: { featured: 1, per_page: 8 } })).data,
        retry: false,
    });

    return (
        <main>
            <section className="border-b border-slate-200 bg-white">
                <div className="mx-auto max-w-7xl px-4 py-16 lg:px-8 lg:py-20">
                    <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-700">Marketplace internal perusahaan</p>
                    <h1 className="mt-5 max-w-4xl text-4xl font-black leading-tight text-slate-950 sm:text-5xl lg:text-6xl">{company.heroTitle}</h1>
                    <p className="mt-5 max-w-3xl text-base leading-8 text-slate-600 sm:text-lg">{company.heroSubtitle}</p>
                </div>
            </section>

            <section className="mx-auto max-w-7xl px-4 py-16 lg:px-8">
                <div className="flex flex-wrap items-end justify-between gap-4">
                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-700">Pilihan perusahaan</p>
                        <h2 className="mt-3 text-3xl font-black">Produk & layanan unggulan</h2>
                    </div>
                    <Link to="/products" className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-black">
                        Lihat semua <ArrowRight size={16} />
                    </Link>
                </div>
                {featured.isLoading ? (
                    <Loading />
                ) : featured.isError ? (
                    <div className="mt-8"><QueryError message={errorMessage(featured.error, "Produk unggulan belum dapat dimuat.")} /></div>
                ) : featured.data?.length ? (
                    <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                        {featured.data.map((product) => <ProductCard key={product.id} product={product} />)}
                    </div>
                ) : (
                    <div className="mt-8"><Empty title="Belum ada produk unggulan" /></div>
                )}
            </section>
        </main>
    );
}

export function ProductsPage() {
    const [params, setParams] = useSearchParams();
    const categories = useQuery({ queryKey: ["categories"], queryFn: async () => collectionData(await api.get("/categories")) });
    const products = useQuery({
        queryKey: ["products", params.toString()],
        queryFn: async () => paginatedData(await api.get("/products", { params: Object.fromEntries(params.entries()) })),
        retry: false,
    });
    const update = (key, value) => {
        const next = new URLSearchParams(params);
        value ? next.set(key, value) : next.delete(key);
        next.delete("page");
        setParams(next);
    };

    return (
        <main className="mx-auto max-w-7xl px-4 py-12 lg:px-8">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-700">Katalog internal</p>
            <h1 className="mt-3 text-4xl font-black">Produk & Layanan</h1>
            <div className="mt-7 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-4">
                <input value={params.get("search") ?? ""} onChange={(event) => update("search", event.target.value)} placeholder="Cari produk..." className={fieldClass} />
                <select value={params.get("category") ?? ""} onChange={(event) => update("category", event.target.value)} className={fieldClass}>
                    <option value="">Semua kategori</option>
                    {categories.data?.map((category) => <option key={category.id} value={category.slug}>{category.name}</option>)}
                </select>
                <select value={params.get("type") ?? ""} onChange={(event) => update("type", event.target.value)} className={fieldClass}>
                    <option value="">Produk & layanan</option>
                    <option value="product">Produk</option>
                    <option value="service">Layanan</option>
                </select>
                <select value={params.get("sort") ?? ""} onChange={(event) => update("sort", event.target.value)} className={fieldClass}>
                    <option value="">Terbaru</option>
                    <option value="name">Nama</option>
                    <option value="price_asc">Harga termurah</option>
                    <option value="price_desc">Harga termahal</option>
                </select>
            </div>
            {products.isLoading ? (
                <Loading />
            ) : products.isError ? (
                <div className="mt-8"><QueryError message={errorMessage(products.error, "Katalog belum dapat dimuat.")} /></div>
            ) : products.data?.data.length ? (
                <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                    {products.data.data.map((product) => <ProductCard key={product.id} product={product} />)}
                </div>
            ) : (
                <div className="mt-8"><Empty title="Produk tidak ditemukan" /></div>
            )}
        </main>
    );
}

export function ProductDetailPage() {
    const { slug = "" } = useParams();
    const navigate = useNavigate();
    const add = useCartStore((state) => state.add);
    const query = useQuery({
        queryKey: ["product", slug],
        queryFn: async () => resourceData(await api.get(`/products/${slug}`)),
        retry: false,
    });
    const [selected, setSelected] = useState(null);
    const [quantity, setQuantity] = useState(1);

    useEffect(() => {
        if (query.data) {
            setSelected(query.data.default_variant ?? activeVariants(query.data)[0] ?? null);
            setQuantity(1);
        }
    }, [query.data]);

    if (query.isLoading) {
        return <Loading />;
    }

    if (query.isError) {
        return <main className="mx-auto max-w-4xl px-4 py-16"><QueryError message={errorMessage(query.error, "Detail produk belum dapat dimuat.")} /></main>;
    }

    if (!query.data) {
        return <main className="mx-auto max-w-4xl px-4 py-16"><Empty title="Produk tidak ditemukan" /></main>;
    }

    const product = query.data;
    const maxQuantity = selected?.track_stock ? Math.max(1, selected.stock ?? 1) : 99;
    const submit = (destination) => {
        if (!selected?.available) {
            return;
        }
        add(product, selected, quantity);
        navigate(destination === "checkout" ? "/checkout" : "/cart");
    };

    return (
        <main className="mx-auto max-w-7xl px-4 py-12 lg:px-8">
            <div className="grid gap-10 lg:grid-cols-2">
                <div>
                    <div className="aspect-square overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                        <SafeImage src={productImageUrls(product)[0]} alt={product.name} className="h-full w-full object-cover" fallbackClassName="h-full w-full" />
                    </div>
                    {productImageUrls(product).length > 1 ? (
                        <div className="mt-3 flex gap-3 overflow-x-auto pb-2">
                            {productImageUrls(product).map((url) => <SafeImage key={url} src={url} alt={product.name} className="h-20 w-20 shrink-0 rounded-xl border border-slate-200 object-cover" fallbackClassName="h-20 w-20 shrink-0 rounded-xl border" />)}
                        </div>
                    ) : null}
                </div>
                <div>
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-700">{product.category?.name ?? "Katalog internal"}</p>
                    <h1 className="mt-3 text-4xl font-black leading-tight">{product.name}</h1>
                    <div className="mt-3 flex items-center gap-2 text-amber-500"><Star fill="currentColor" size={18} /><b>{safeRating(product).toFixed(1)}</b><span className="text-sm text-slate-400">({Number(product.review_count) || 0} ulasan)</span></div>
                    <p className="mt-6 text-3xl font-black text-emerald-700">{currency.format(Number(selected?.price ?? product.price) || 0)}</p>
                    <p className="mt-6 whitespace-pre-line leading-8 text-slate-600">{product.description || "Informasi produk belum tersedia."}</p>

                    {requiresVariantSelection(product) ? (
                        <div className="mt-8">
                            <h3 className="font-black">Pilih variant</h3>
                            <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                {activeVariants(product).map((variant) => (
                                    <button key={variant.id} type="button" disabled={!variant.available} onClick={() => { setSelected(variant); setQuantity(1); }} className={`rounded-2xl border p-4 text-left transition ${selected?.id === variant.id ? "border-emerald-600 bg-emerald-50" : "border-slate-200 bg-white hover:border-slate-400"} disabled:opacity-50`}>
                                        <b>{variant.name}</b>
                                        <small className="mt-1 block leading-5 text-slate-500">{variantDescription(variant)}</small>
                                        <span className="mt-2 block font-black text-emerald-700">{currency.format(Number(variant.price) || 0)}</span>
                                        <small className={variant.available ? "text-emerald-600" : "text-rose-600"}>{variant.available ? variant.track_stock ? `Stok ${variant.stock ?? 0}` : "Tersedia" : "Tidak tersedia"}</small>
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : null}

                    <div className="mt-6 flex items-center justify-between rounded-2xl bg-slate-100 p-4">
                        <div>
                            <p className="text-xs font-bold uppercase text-slate-500">Jumlah</p>
                            <p className="mt-1 text-sm text-slate-600">Subtotal {currency.format((Number(selected?.price) || 0) * quantity)}</p>
                        </div>
                        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-1">
                            <button type="button" onClick={() => setQuantity((value) => Math.max(1, value - 1))} className="rounded-lg p-2 hover:bg-slate-100"><Minus size={17} /></button>
                            <b className="min-w-8 text-center">{quantity}</b>
                            <button type="button" onClick={() => setQuantity((value) => Math.min(maxQuantity, value + 1))} className="rounded-lg p-2 hover:bg-slate-100"><Plus size={17} /></button>
                        </div>
                    </div>
                    <div className="mt-6 grid grid-cols-2 gap-3">
                        <button disabled={!selected?.available} onClick={() => submit("cart")} className="rounded-2xl border border-emerald-700 py-4 font-black text-emerald-800 disabled:opacity-40"><ShoppingCart className="mr-2 inline" size={18} />Tambah keranjang</button>
                        <button disabled={!selected?.available} onClick={() => submit("checkout")} className="rounded-2xl bg-slate-950 py-4 font-black text-white disabled:bg-slate-300"><ShoppingBag className="mr-2 inline" size={18} />Checkout</button>
                    </div>
                </div>
            </div>
        </main>
    );
}

function CartPanel() {
    const items = useCartStore((state) => state.items);
    const update = useCartStore((state) => state.update);
    const remove = useCartStore((state) => state.remove);
    const replaceVariant = useCartStore((state) => state.replaceVariant);
    const [editingItem, setEditingItem] = useState(null);
    const summary = cartSummary(items);

    if (!items.length) {
        return <Empty title="Keranjang masih kosong" action={<Link to="/products" className="rounded-xl bg-emerald-700 px-5 py-3 font-bold text-white">Belanja sekarang</Link>} />;
    }

    return (
        <>
            <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
                <div className="space-y-4">
                    {items.map((item) => (
                        <article key={item.variant.id} className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                            <div className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                                <SafeImage src={productImageUrls(item.product)[0]} alt={item.product.name} className="h-full w-full object-cover" fallbackClassName="h-full w-full" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <h2 className="font-black">{item.product.name}</h2>
                                {requiresVariantSelection(item.product) ? (
                                    <>
                                        <p className="mt-1 text-sm text-slate-500">{item.variant.name}{item.variant.sku ? ` · ${item.variant.sku}` : ""}</p>
                                        <p className="mt-1 text-xs text-slate-400">{variantDescription(item.variant)}</p>
                                    </>
                                ) : null}
                                <p className="mt-2 font-black text-emerald-700">{currency.format(Number(item.variant.price) || 0)}</p>
                                <div className="mt-3 flex flex-wrap items-center gap-2">
                                    <button type="button" onClick={() => update(item.variant.id, item.quantity - 1)} className="rounded-lg border border-slate-200 p-2"><Minus size={16} /></button>
                                    <b className="min-w-7 text-center">{item.quantity}</b>
                                    <button type="button" onClick={() => update(item.variant.id, item.quantity + 1)} className="rounded-lg border border-slate-200 p-2"><Plus size={16} /></button>
                                    {requiresVariantSelection(item.product) ? <button type="button" onClick={() => setEditingItem(item)} className="ml-1 rounded-lg bg-slate-100 px-3 py-2 text-xs font-black text-slate-700">Ganti variant</button> : null}
                                    <button type="button" onClick={() => remove(item.variant.id)} className="ml-auto rounded-lg p-2 text-rose-600 hover:bg-rose-50"><Trash2 size={19} /></button>
                                </div>
                            </div>
                        </article>
                    ))}
                </div>
                <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:sticky lg:top-24">
                    <h2 className="text-xl font-black">Ringkasan</h2>
                    <div className="mt-5 flex justify-between text-sm"><span>Total item</span><b>{summary.quantity}</b></div>
                    <div className="mt-3 flex justify-between text-lg"><span>Total</span><b className="text-emerald-700">{currency.format(summary.total)}</b></div>
                    <Link to="/checkout" className="mt-6 flex items-center justify-center gap-2 rounded-xl bg-slate-950 py-3 font-black text-white"><ShoppingBag size={18} />Checkout</Link>
                </aside>
            </div>

            <VariantSelectionModal
                open={Boolean(editingItem)}
                product={editingItem?.product ?? null}
                initialVariantId={editingItem?.variant.id}
                title="Ganti variant di keranjang"
                confirmLabel="Gunakan variant ini"
                onClose={() => setEditingItem(null)}
                onConfirm={(variant) => {
                    if (!editingItem) {
                        return;
                    }
                    replaceVariant(editingItem.variant.id, editingItem.product, variant, editingItem.quantity);
                    setEditingItem(null);
                }}
            />
        </>
    );
}

const blankBuyerForm = () => ({
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

function buyerFormFromOrder(order) {
    return {
        customer_type: order.customer_type === "business" ? "business" : "individual",
        name: order.guest_name ?? "",
        email: order.guest_email ?? "",
        phone: order.guest_phone ?? "",
        address: order.guest_address ?? "",
        nik: order.guest_nik ?? "",
        npwp: order.guest_npwp ?? "",
        province: order.guest_province ?? "",
        city: order.guest_city ?? "",
        company_name: order.guest_company_name ?? "",
        postal_code: order.guest_postal_code ?? "",
        country: order.guest_country ?? "Indonesia",
        notes: order.guest_notes ?? "",
        payment_method: order.payment_method ?? "internal_billing",
    };
}

function checkoutPayload(form) {
    if (form.customer_type === "business") {
        return form;
    }

    return {
        ...form,
        nik: null,
        npwp: null,
        province: null,
        city: null,
        company_name: null,
        postal_code: null,
        country: null,
    };
}

function BuyerTypeSelector({ value, onChange, disabled = false }) {
    return (
        <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
            <button type="button" disabled={disabled} onClick={() => onChange("individual")} className={`rounded-lg px-4 py-3 text-sm font-black transition ${value === "individual" ? "bg-white text-emerald-700 shadow-sm" : "text-slate-500"} disabled:cursor-not-allowed disabled:opacity-60`}>
                Perorangan
            </button>
            <button type="button" disabled={disabled} onClick={() => onChange("business")} className={`rounded-lg px-4 py-3 text-sm font-black transition ${value === "business" ? "bg-white text-emerald-700 shadow-sm" : "text-slate-500"} disabled:cursor-not-allowed disabled:opacity-60`}>
                Badan Usaha
            </button>
        </div>
    );
}

function BuyerIdentityFields({ form, onChange, disabled = false, showPayment = false }) {
    const business = form.customer_type === "business";
    const update = (key) => (event) => onChange({ [key]: event.target.value });

    return (
        <div className="grid gap-4">
            <BuyerTypeSelector value={form.customer_type} onChange={(customer_type) => onChange({ customer_type })} disabled={disabled} />
            <div className="grid gap-4 sm:grid-cols-2">
                {business ? (
                    <>
                        <label className="grid gap-2 text-sm font-bold sm:col-span-2">
                            Perusahaan
                            <input required disabled={disabled} value={form.company_name} onChange={update("company_name")} placeholder="Nama badan usaha" className={fieldClass} />
                        </label>
                        <label className="grid gap-2 text-sm font-bold">
                            Nama penanggung jawab
                            <input required disabled={disabled} value={form.name} onChange={update("name")} placeholder="Nama lengkap" className={fieldClass} />
                        </label>
                        <label className="grid gap-2 text-sm font-bold">
                            NIK
                            <input required disabled={disabled} inputMode="numeric" maxLength={16} pattern="[0-9]{16}" value={form.nik} onChange={update("nik")} placeholder="16 digit NIK" className={fieldClass} />
                        </label>
                        <label className="grid gap-2 text-sm font-bold">
                            NPWP
                            <input required disabled={disabled} value={form.npwp} onChange={update("npwp")} placeholder="Contoh 01.234.567.8-901.000" className={fieldClass} />
                        </label>
                        <label className="grid gap-2 text-sm font-bold">
                            Negara
                            <input required disabled={disabled} value={form.country} onChange={update("country")} placeholder="Indonesia" className={fieldClass} />
                        </label>
                        <label className="grid gap-2 text-sm font-bold">
                            Provinsi
                            <input required disabled={disabled} value={form.province} onChange={update("province")} placeholder="Provinsi" className={fieldClass} />
                        </label>
                        <label className="grid gap-2 text-sm font-bold">
                            Kota
                            <input required disabled={disabled} value={form.city} onChange={update("city")} placeholder="Kota/Kabupaten" className={fieldClass} />
                        </label>
                        <label className="grid gap-2 text-sm font-bold">
                            Kode Pos
                            <input required disabled={disabled} value={form.postal_code} onChange={update("postal_code")} placeholder="Kode pos" className={fieldClass} />
                        </label>
                    </>
                ) : (
                    <label className="grid gap-2 text-sm font-bold sm:col-span-2">
                        Nama lengkap
                        <input required disabled={disabled} value={form.name} onChange={update("name")} placeholder="Nama lengkap" className={fieldClass} />
                    </label>
                )}
                <label className="grid gap-2 text-sm font-bold">
                    Email
                    <input required disabled={disabled} type="email" value={form.email} onChange={update("email")} placeholder="nama@perusahaan.com" className={fieldClass} />
                </label>
                <label className="grid gap-2 text-sm font-bold">
                    Telepon
                    <input required disabled={disabled} value={form.phone} onChange={update("phone")} placeholder="Nomor telepon" className={fieldClass} />
                </label>
                <label className="grid gap-2 text-sm font-bold sm:col-span-2">
                    Alamat
                    <textarea required disabled={disabled} rows={4} value={form.address} onChange={update("address")} placeholder="Alamat lengkap" className={fieldClass} />
                </label>
                <label className="grid gap-2 text-sm font-bold sm:col-span-2">
                    Catatan
                    <textarea disabled={disabled} rows={3} value={form.notes} onChange={update("notes")} placeholder="Catatan pesanan (opsional)" className={fieldClass} />
                </label>
                {showPayment ? (
                    <label className="grid gap-2 text-sm font-bold sm:col-span-2">
                        Metode pembayaran
                        <select disabled={disabled} value={form.payment_method} onChange={update("payment_method")} className={fieldClass}>
                            <option value="internal_billing">Internal Billing</option>
                            <option value="bank_transfer">Transfer Manual</option>
                            <option value="cod">COD</option>
                        </select>
                    </label>
                ) : null}
            </div>
        </div>
    );
}

function BuyerIdentitySummary({ data }) {
    const business = data.customer_type === "business";

    return (
        <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
            <div><dt className="text-slate-500">Tipe checkout</dt><dd className="mt-1 font-bold">{business ? "Badan Usaha" : "Perorangan"}</dd></div>
            {business ? <div><dt className="text-slate-500">Perusahaan</dt><dd className="mt-1 font-bold">{data.company_name}</dd></div> : null}
            <div><dt className="text-slate-500">{business ? "Penanggung jawab" : "Nama"}</dt><dd className="mt-1 font-bold">{data.name}</dd></div>
            <div><dt className="text-slate-500">Email</dt><dd className="mt-1 break-all font-bold">{data.email}</dd></div>
            <div><dt className="text-slate-500">Telepon</dt><dd className="mt-1 font-bold">{data.phone}</dd></div>
            {business ? (
                <>
                    <div><dt className="text-slate-500">NIK</dt><dd className="mt-1 font-bold">{data.nik}</dd></div>
                    <div><dt className="text-slate-500">NPWP</dt><dd className="mt-1 font-bold">{data.npwp}</dd></div>
                    <div><dt className="text-slate-500">Provinsi</dt><dd className="mt-1 font-bold">{data.province}</dd></div>
                    <div><dt className="text-slate-500">Kota</dt><dd className="mt-1 font-bold">{data.city}</dd></div>
                    <div><dt className="text-slate-500">Kode Pos</dt><dd className="mt-1 font-bold">{data.postal_code}</dd></div>
                    <div><dt className="text-slate-500">Negara</dt><dd className="mt-1 font-bold">{data.country}</dd></div>
                </>
            ) : null}
            <div className="sm:col-span-2"><dt className="text-slate-500">Alamat</dt><dd className="mt-1 whitespace-pre-line font-bold">{data.address}</dd></div>
            {data.payment_method ? <div><dt className="text-slate-500">Metode</dt><dd className="mt-1 font-bold">{data.payment_method}</dd></div> : null}
            {data.notes ? <div className="sm:col-span-2"><dt className="text-slate-500">Catatan</dt><dd className="mt-1 whitespace-pre-line font-bold">{data.notes}</dd></div> : null}
        </dl>
    );
}

function OrderDetail({ order, verificationEmail, onChanged }) {
    const [edit, setEdit] = useState(() => buyerFormFromOrder(order));
    const [cancelReason, setCancelReason] = useState("");
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        setEdit(buyerFormFromOrder(order));
        setMessage("");
        setError("");
        setCancelReason("");
    }, [order]);

    const save = async () => {
        setSaving(true);
        setError("");
        setMessage("");
        try {
            const result = resourceData(await api.put(`/orders/track/${order.order_number}`, {
                email_verification: verificationEmail,
                ...checkoutPayload(edit),
            }));
            setMessage("Data buyer berhasil diperbarui.");
            await onChanged(result.guest_email, result.order_number);
        } catch (exception) {
            setError(errorMessage(exception));
        } finally {
            setSaving(false);
        }
    };

    const cancel = async () => {
        if (!window.confirm("Batalkan order ini?")) {
            return;
        }
        setSaving(true);
        setError("");
        setMessage("");
        try {
            const result = resourceData(await api.post(`/orders/${order.order_number}/cancel`, {
                email: verificationEmail,
                cancel_reason: cancelReason,
            }));
            setMessage("Order berhasil dibatalkan.");
            await onChanged(result.guest_email, result.order_number);
        } catch (exception) {
            setError(errorMessage(exception));
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="grid gap-6 lg:grid-cols-2">
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <p className="text-sm text-slate-500">{order.order_number}</p>
                        <h2 className="text-xl font-black">Detail Order</h2>
                    </div>
                    <StatusBadge status={order.status} />
                </div>
                <p className="mt-3 text-sm text-slate-500">Dibuat {dateTime(order.created_at)}</p>
                <div className="mt-5 rounded-xl bg-slate-50 p-4">
                    <h3 className="font-black">Identitas Buyer</h3>
                    <BuyerIdentitySummary data={buyerFormFromOrder(order)} />
                </div>
                <div className="mt-5 space-y-3">
                    {(order.items ?? []).map((item) => (
                        <div key={item.id} className="border-b border-slate-100 pb-3">
                            <div className="flex justify-between gap-3"><b>{item.product_name} × {item.quantity}</b><b>{currency.format(Number(item.subtotal) || 0)}</b></div>
                            {item.variant_name && item.variant_name !== "Default" ? <small className="text-slate-500">{item.variant_name} · {item.product_sku}</small> : null}
                        </div>
                    ))}
                </div>
                <div className="mt-5 flex justify-between text-lg"><b>Total</b><b className="text-emerald-700">{currency.format(Number(order.total_amount) || 0)}</b></div>
                {order.cancel_reason ? <p className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">Alasan batal: {order.cancel_reason}</p> : null}
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-black">Ubah Data Buyer</h2>
                <div className="mt-4">
                    <BuyerIdentityFields form={edit} onChange={(patch) => setEdit((current) => ({ ...current, ...patch }))} disabled={order.status !== "pending"} />
                    {error ? <p className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p> : null}
                    {message ? <p className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-700">{message}</p> : null}
                    {order.status === "pending" ? (
                        <div className="mt-4 grid gap-3">
                            <button type="button" disabled={saving} onClick={() => void save()} className="rounded-xl bg-emerald-700 py-3 font-black text-white disabled:bg-slate-300">Simpan Perubahan</button>
                            <textarea placeholder="Alasan pembatalan (opsional)" value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} className={fieldClass} />
                            <button type="button" disabled={saving} onClick={() => void cancel()} className="rounded-xl bg-rose-600 py-3 font-black text-white disabled:bg-slate-300">Batalkan Order</button>
                        </div>
                    ) : (
                        <p className="mt-4 text-sm text-slate-500">Data tidak dapat diubah setelah order diproses.</p>
                    )}
                </div>
            </section>
        </div>
    );
}

function OrderHistoryPanel() {
    const [params, setParams] = useSearchParams();
    const [email, setEmail] = useState(params.get("email") ?? "");
    const [orders, setOrders] = useState([]);
    const [selectedNumber, setSelectedNumber] = useState(params.get("order") ?? "");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const selected = orders.find((order) => order.order_number === selectedNumber) ?? orders[0] ?? null;

    const load = async (nextEmail = email, preferredOrder = "") => {
        const normalizedEmail = nextEmail.trim().toLowerCase();
        if (!normalizedEmail) {
            return;
        }
        setLoading(true);
        setError("");
        try {
            const result = collectionData(await api.get("/orders/track", { params: { email: normalizedEmail } }));
            setOrders(result);
            const target = result.find((order) => order.order_number === preferredOrder) ?? result[0] ?? null;
            setSelectedNumber(target?.order_number ?? "");
            setEmail(normalizedEmail);
            const next = new URLSearchParams(params);
            next.set("tab", "orders");
            next.set("email", normalizedEmail);
            target?.order_number ? next.set("order", target.order_number) : next.delete("order");
            setParams(next, { replace: true });
        } catch (exception) {
            setOrders([]);
            setSelectedNumber("");
            setError(errorMessage(exception, "Riwayat order tidak ditemukan."));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const initialEmail = params.get("email");
        if (initialEmail) {
            void load(initialEmail, params.get("order") ?? "");
        }
    }, []);

    return (
        <div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-xl font-black">Riwayat Order</h2>
                <p className="mt-2 text-sm text-slate-500">Masukkan email checkout untuk menampilkan seluruh order yang pernah dibuat.</p>
                <form onSubmit={(event) => { event.preventDefault(); void load(); }} className="mt-4 flex flex-col gap-3 sm:flex-row">
                    <input required type="email" placeholder="nama@perusahaan.com" value={email} onChange={(event) => setEmail(event.target.value)} className={`${fieldClass} flex-1`} />
                    <button disabled={loading} className="rounded-xl bg-slate-950 px-6 py-3 font-black text-white disabled:bg-slate-300">{loading ? "Mencari..." : "Tampilkan Riwayat"}</button>
                </form>
                {error ? <p className="mt-4 rounded-xl bg-rose-50 p-4 text-rose-700">{error}</p> : null}
            </div>

            {orders.length ? (
                <div className="mt-6 grid gap-6 xl:grid-cols-[300px_1fr]">
                    <aside className="space-y-3">
                        {orders.map((order) => (
                            <button
                                key={order.id}
                                type="button"
                                onClick={() => {
                                    setSelectedNumber(order.order_number);
                                    const next = new URLSearchParams(params);
                                    next.set("tab", "orders");
                                    next.set("email", email);
                                    next.set("order", order.order_number);
                                    setParams(next, { replace: true });
                                }}
                                className={`w-full rounded-2xl border p-4 text-left transition ${selected?.id === order.id ? "border-emerald-600 bg-emerald-50" : "border-slate-200 bg-white hover:border-slate-400"}`}
                            >
                                <div className="flex items-center justify-between gap-2"><b className="text-sm">{order.order_number}</b><StatusBadge status={order.status} /></div>
                                <p className="mt-2 text-sm text-slate-500">{dateTime(order.created_at)}</p>
                                <p className="mt-2 font-black text-emerald-700">{currency.format(Number(order.total_amount) || 0)}</p>
                            </button>
                        ))}
                    </aside>
                    {selected ? <OrderDetail key={selected.id} order={selected} verificationEmail={email} onChanged={load} /> : null}
                </div>
            ) : null}
        </div>
    );
}

export function CartPage() {
    const [params, setParams] = useSearchParams();
    const tab = params.get("tab") === "orders" ? "orders" : "cart";
    const setTab = (nextTab) => {
        const next = new URLSearchParams(params);
        nextTab === "orders" ? next.set("tab", "orders") : next.delete("tab");
        setParams(next);
    };

    return (
        <main className="mx-auto max-w-7xl px-4 py-12 lg:px-8">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-700">Pusat pesanan</p>
            <h1 className="mt-3 text-4xl font-black">Keranjang & Riwayat Order</h1>
            <div className="mt-7 inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
                <button type="button" onClick={() => setTab("cart")} className={`rounded-lg px-5 py-2.5 text-sm font-black ${tab === "cart" ? "bg-slate-950 text-white" : "text-slate-600"}`}>Keranjang</button>
                <button type="button" onClick={() => setTab("orders")} className={`rounded-lg px-5 py-2.5 text-sm font-black ${tab === "orders" ? "bg-slate-950 text-white" : "text-slate-600"}`}>Riwayat Order</button>
            </div>
            <div className="mt-7">{tab === "orders" ? <OrderHistoryPanel /> : <CartPanel />}</div>
        </main>
    );
}

function CheckoutItems({ items, total }) {
    return (
        <div>
            {items.map((item) => (
                <div key={item.variant.id} className="mt-4 border-b border-slate-100 pb-4 text-sm">
                    <div className="flex justify-between gap-3"><span className="font-bold">{item.product.name} × {item.quantity}</span><b>{currency.format((Number(item.variant.price) || 0) * item.quantity)}</b></div>
                    {requiresVariantSelection(item.product) ? <p className="mt-1 text-xs text-slate-500">{item.variant.name}</p> : null}
                </div>
            ))}
            <div className="mt-5 flex justify-between text-lg"><b>Total</b><b className="text-emerald-700">{currency.format(total)}</b></div>
        </div>
    );
}

export function CheckoutPage() {
    const items = useCartStore((state) => state.items);
    const clear = useCartStore((state) => state.clear);
    const summary = cartSummary(items);
    const [step, setStep] = useState("identity");
    const [order, setOrder] = useState(null);
    const [form, setForm] = useState(blankBuyerForm);
    const mutation = useMutation({
        mutationFn: async () => resourceData(await api.post("/checkout", {
            ...checkoutPayload(form),
            items: items.map(checkoutItemPayload),
        })),
        onSuccess: (result) => {
            clear();
            setOrder(result);
            setStep("success");
        },
    });

    if (!items.length && step !== "success") {
        return <main className="mx-auto max-w-4xl px-4 py-16"><Empty title="Keranjang kosong" action={<Link to="/products" className="rounded-xl bg-emerald-700 px-5 py-3 font-black text-white">Kembali ke katalog</Link>} /></main>;
    }

    if (step === "success" && order) {
        return (
            <main className="mx-auto max-w-5xl px-4 py-12 lg:px-8">
                <div className="rounded-3xl border border-emerald-200 bg-white p-6 shadow-sm sm:p-8">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-4">
                            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-emerald-100 text-emerald-700"><CheckCircle2 size={30} /></span>
                            <div><p className="text-sm font-bold text-emerald-700">Order berhasil dibuat</p><h1 className="text-2xl font-black">{order.order_number}</h1></div>
                        </div>
                        <StatusBadge status={order.status} />
                    </div>
                    <div className="mt-7 grid gap-6 lg:grid-cols-2">
                        <section className="rounded-2xl bg-slate-50 p-5">
                            <h2 className="font-black">Detail Buyer</h2>
                            <BuyerIdentitySummary data={buyerFormFromOrder(order)} />
                        </section>
                        <section className="rounded-2xl border border-slate-200 p-5">
                            <h2 className="font-black">Detail Pesanan</h2>
                            <div className="mt-4 space-y-3">
                                {(order.items ?? []).map((item) => (
                                    <div key={item.id} className="border-b border-slate-100 pb-3">
                                        <div className="flex justify-between gap-3"><b>{item.product_name} × {item.quantity}</b><b>{currency.format(Number(item.subtotal) || 0)}</b></div>
                                        {item.variant_name && item.variant_name !== "Default" ? <p className="mt-1 text-xs text-slate-500">{item.variant_name}</p> : null}
                                    </div>
                                ))}
                            </div>
                            <div className="mt-5 flex justify-between text-lg"><b>Total</b><b className="text-emerald-700">{currency.format(Number(order.total_amount) || 0)}</b></div>
                        </section>
                    </div>
                    <Link to={`/cart?tab=orders&email=${encodeURIComponent(order.guest_email)}&order=${encodeURIComponent(order.order_number)}`} className="mt-7 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-6 py-3 font-black text-white">
                        <ListOrdered size={18} /> Buka riwayat order
                    </Link>
                </div>
            </main>
        );
    }

    if (step === "preview") {
        return (
            <main className="mx-auto max-w-5xl px-4 py-12 lg:px-8">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-700">Preview checkout</p>
                <h1 className="mt-3 text-4xl font-black">Periksa sebelum membuat order</h1>
                <div className="mt-7 grid gap-6 lg:grid-cols-[1fr_360px]">
                    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                        <h2 className="text-xl font-black">Identitas Buyer</h2>
                        <BuyerIdentitySummary data={form} />
                        <button type="button" onClick={() => setStep("identity")} className="mt-6 rounded-xl border border-slate-300 px-5 py-3 font-black">Ubah Identitas</button>
                    </section>
                    <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:sticky lg:top-24">
                        <h2 className="font-black">Ringkasan Pesanan</h2>
                        <CheckoutItems items={items} total={summary.total} />
                        {mutation.isError ? <p className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{errorMessage(mutation.error)}</p> : null}
                        <button type="button" disabled={mutation.isPending} onClick={() => mutation.mutate()} className="mt-6 w-full rounded-xl bg-slate-950 py-3 font-black text-white disabled:bg-slate-300">
                            {mutation.isPending ? "Memproses..." : "Konfirmasi & Buat Order"}
                        </button>
                    </aside>
                </div>
            </main>
        );
    }

    return (
        <main className="mx-auto max-w-5xl px-4 py-12 lg:px-8">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-700">Guest checkout</p>
            <h1 className="mt-3 text-4xl font-black">Isi identitas checkout</h1>
            <p className="mt-3 text-slate-500">Pilih checkout perorangan atau badan usaha. Data akan ditampilkan kembali pada halaman preview.</p>
            <form onSubmit={(event) => { event.preventDefault(); setStep("preview"); }} className="mt-7 grid gap-6 lg:grid-cols-[1fr_360px]">
                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <BuyerIdentityFields form={form} onChange={(patch) => setForm((current) => ({ ...current, ...patch }))} showPayment />
                </section>
                <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:sticky lg:top-24">
                    <h2 className="font-black">Ringkasan Pesanan</h2>
                    <CheckoutItems items={items} total={summary.total} />
                    <button className="mt-6 w-full rounded-xl bg-slate-950 py-3 font-black text-white">Lanjut ke Preview</button>
                </aside>
            </form>
        </main>
    );
}

export function OrderSuccessPage() {
    return <Navigate to="/cart?tab=orders" replace />;
}

export function TrackOrderPage() {
    return <Navigate to="/cart?tab=orders" replace />;
}
