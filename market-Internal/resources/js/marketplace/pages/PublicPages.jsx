import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    ArrowLeft,
    CheckCircle2,
    History,
    Menu,
    Minus,
    Pencil,
    Plus,
    Search,
    ShoppingCart,
    Trash2,
    X,
} from "lucide-react";
import { Link, Outlet, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import company from "@/data/companyProfile.json";
import { Empty, fieldClass, Loading, productPrice, QueryError, StatusBadge } from "@/components/Common";
import { api, collectionData, errorMessage, resourceData } from "@/lib/api";
import { currency, dateTime } from "@/lib/format";
import { cartSummary, useCartStore } from "@/stores/cartStore";

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
        return <div className={`grid place-items-center bg-slate-100 text-xs font-bold text-slate-400 ${fallbackClassName}`}>Tanpa gambar</div>;
    }

    return <img src={src} alt={alt} className={className} onError={() => setFailed(true)} />;
}

export function PublicHeader() {
    const [mobileOpen, setMobileOpen] = useState(false);
    const [categoryOpen, setCategoryOpen] = useState(false);
    const [categoryPanelStyle, setCategoryPanelStyle] = useState(null);
    const categoryAreaRef = useRef(null);
    const items = useCartStore((state) => state.items);
    const navigate = useNavigate();
    const [params] = useSearchParams();
    const paramsKey = params.toString();
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
    const selectedCategory = sortedCategories.find((category) => category.slug === params.get("category"));
    const categoryLabel = selectedCategory ? `Kategori : ${selectedCategory.name}` : "Kategori";

    useEffect(() => {
        setSearch(params.get("search") ?? "");
    }, [paramsKey]);

    useEffect(() => {
        const close = (event) => {
            if (!categoryAreaRef.current?.contains(event.target)) {
                setCategoryOpen(false);
            }
        };

        document.addEventListener("mousedown", close);
        return () => document.removeEventListener("mousedown", close);
    }, []);

    useEffect(() => {
        if (!categoryOpen) {
            setCategoryPanelStyle(null);
            return undefined;
        }

        const updatePosition = () => {
            const area = categoryAreaRef.current;
            if (!area) {
                return;
            }

            const rect = area.getBoundingClientRect();
            const viewportPadding = 16;
            const gap = 10;
            const rightSpace = window.innerWidth - rect.right - gap - viewportPadding;
            const placeOnRight = rightSpace >= 300;
            const width = placeOnRight
                ? Math.min(520, rightSpace)
                : Math.min(520, window.innerWidth - (viewportPadding * 2));
            const left = placeOnRight
                ? rect.right + gap
                : Math.min(Math.max(viewportPadding, rect.left), window.innerWidth - width - viewportPadding);
            const top = placeOnRight ? Math.max(viewportPadding, rect.top) : rect.bottom + 8;
            const maxHeight = Math.max(180, window.innerHeight - top - viewportPadding);

            setCategoryPanelStyle({
                left,
                top,
                width,
                maxHeight,
                showArrow: placeOnRight,
                arrowLeft: rect.right + 4,
                arrowTop: rect.top + 16,
            });
        };

        updatePosition();
        window.addEventListener("resize", updatePosition);
        window.addEventListener("scroll", updatePosition, true);

        return () => {
            window.removeEventListener("resize", updatePosition);
            window.removeEventListener("scroll", updatePosition, true);
        };
    }, [categoryOpen]);

    const submit = (event) => {
        event.preventDefault();
        const next = new URLSearchParams(params);
        if (search.trim()) {
            next.set("search", search.trim());
        } else {
            next.delete("search");
        }
        navigate(`/products${next.toString() ? `?${next.toString()}` : ""}`);
        setMobileOpen(false);
    };

    const categoryUrl = (category) => {
        const next = new URLSearchParams(params);

        if (next.get("category") === category.slug) {
            next.delete("category");
        } else {
            next.set("category", category.slug);
        }

        return `/products${next.toString() ? `?${next.toString()}` : ""}`;
    };

    return (
        <header className="sticky top-0 z-50 border-b border-slate-200 bg-white">
            <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 lg:px-8">
                <Link to="/" className="flex shrink-0 items-center gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-700 text-sm font-black text-white">K</span>
                    <span className="hidden sm:block">
                        <strong className="block text-base font-black leading-none text-slate-950">{company.shortName}</strong>
                        <small className="mt-1 block text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">{company.tagline}</small>
                    </span>
                </Link>

                <div className="hidden min-w-0 flex-1 grid-cols-2 gap-2 md:grid">
                    <div ref={categoryAreaRef} className="relative min-w-0">
                        <button
                            type="button"
                            aria-expanded={categoryOpen}
                            aria-label="Pilih kategori"
                            onClick={() => setCategoryOpen((value) => !value)}
                            className="flex h-11 w-full min-w-0 items-center gap-3 rounded-xl border border-slate-300 bg-white px-4 text-left text-sm font-bold text-slate-700 transition hover:border-emerald-500"
                        >
                            <Search size={18} className="shrink-0 text-slate-500" />
                            <span className="truncate">{categoryLabel}</span>
                        </button>

                        {categoryOpen && categoryPanelStyle ? (
                            <>
                                {categoryPanelStyle.showArrow ? (
                                    <span
                                        className="fixed z-[60] h-3 w-3 rotate-45 border-b border-l border-slate-200 bg-slate-50"
                                        style={{ left: categoryPanelStyle.arrowLeft, top: categoryPanelStyle.arrowTop }}
                                    />
                                ) : null}
                                <div
                                    className="fixed z-[60] overflow-x-hidden overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 p-3"
                                    style={{
                                        left: categoryPanelStyle.left,
                                        top: categoryPanelStyle.top,
                                        width: categoryPanelStyle.width,
                                        maxHeight: categoryPanelStyle.maxHeight,
                                    }}
                                >
                                    <div className="flex min-w-0 flex-wrap items-start gap-2">
                                        {categories.isLoading ? (
                                            <span className="w-fit max-w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-500">Memuat kategori...</span>
                                        ) : sortedCategories.length ? sortedCategories.map((category) => (
                                            <Link
                                                key={category.id}
                                                to={categoryUrl(category)}
                                                onClick={() => setCategoryOpen(false)}
                                                className={`w-fit max-w-full break-words rounded-2xl border bg-white px-4 py-2.5 text-sm font-bold transition ${selectedCategory?.id === category.id ? "border-emerald-500 text-emerald-700" : "border-slate-200 text-slate-700 hover:border-emerald-300 hover:text-emerald-700"}`}
                                            >
                                                {category.name}
                                            </Link>
                                        )) : (
                                            <span className="w-fit max-w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-500">Kategori belum tersedia</span>
                                        )}
                                    </div>
                                </div>
                            </>
                        ) : null}
                    </div>

                    <form onSubmit={submit} className="relative flex h-11 min-w-0 items-center">
                        <input
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Cari produk atau layanan"
                            className="h-full min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-4 pr-14 text-sm outline-none transition focus:border-emerald-500"
                        />
                        <button type="submit" aria-label="Cari produk" title="Cari" className="absolute right-2 grid h-8 w-8 cursor-pointer place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-emerald-700">
                            <Search size={19} />
                        </button>
                    </form>
                </div>

                <Link to="/track-order" title="Riwayat order" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-slate-800 transition hover:bg-slate-100 hover:text-emerald-700">
                    <History size={20} />
                </Link>

                <Link to="/cart" title="Keranjang" className="relative grid h-10 w-10 shrink-0 place-items-center rounded-xl text-slate-900 transition hover:bg-slate-100 hover:text-emerald-700">
                    <ShoppingCart size={20} />
                    {summary.quantity > 0 ? <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-rose-500 px-1 text-center text-[10px] font-black leading-5 text-white ring-2 ring-white">{summary.quantity}</span> : null}
                </Link>

                <button type="button" onClick={() => setMobileOpen((value) => !value)} className="grid h-10 w-10 place-items-center rounded-xl border border-slate-300 md:hidden">
                    {mobileOpen ? <X size={20} /> : <Menu size={20} />}
                </button>
            </div>

            {mobileOpen ? (
                <div className="border-t border-slate-200 bg-white px-4 py-4 md:hidden">
                    <form onSubmit={submit} className="relative flex h-11 items-center">
                        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari produk atau layanan" className="h-full min-w-0 flex-1 rounded-xl border border-slate-300 px-4 pr-14 text-sm outline-none focus:border-emerald-500" />
                        <button type="submit" aria-label="Cari produk" title="Cari" className="absolute right-2 grid h-8 w-8 cursor-pointer place-items-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-emerald-700"><Search size={19} /></button>
                    </form>
                    <div className="mt-3 flex flex-wrap gap-2">
                        {sortedCategories.map((category) => <Link key={category.id} to={categoryUrl(category)} onClick={() => setMobileOpen(false)} className={`w-fit rounded-2xl border bg-white px-3 py-2 text-sm font-bold ${selectedCategory?.id === category.id ? "border-emerald-500 text-emerald-700" : "border-slate-200 text-slate-700"}`}>{category.name}</Link>)}
                    </div>
                </div>
            ) : null}
        </header>
    );
}

export function PublicLayout() {
    return <div className="min-h-screen bg-white text-slate-900"><PublicHeader /><Outlet /></div>;
}

function ProductCard({ product }) {
    const image = productImageUrls(product)[0];

    return (
        <Link to={`/products/${product.slug}`} className="group relative block aspect-[4/3] overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
            <SafeImage src={image} alt={product.name} className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]" fallbackClassName="h-full w-full" />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/35 to-transparent px-4 pb-4 pt-12">
                <h3 className="line-clamp-2 text-sm font-black text-white sm:text-base">{product.name}</h3>
            </div>
        </Link>
    );
}

function ProductGrid({ products }) {
    if (!products.length) {
        return <Empty title="Produk tidak ditemukan" />;
    }

    return <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{products.map((product) => <ProductCard key={product.id} product={product} />)}</div>;
}

export function HomePage() {
    const featured = useQuery({
        queryKey: ["featured"],
        queryFn: async () => collectionData(await api.get("/products", { params: { featured: 1, sort: "newest" } })),
    });

    return (
        <main>
            <section className="mx-auto w-full max-w-[1440px] px-4 py-7 lg:px-8">
                <p className="max-w-5xl text-xl font-black leading-tight text-slate-950 sm:text-2xl">{company.heroTitle}</p>
            </section>
            <section className="mx-auto max-w-7xl px-4 pb-12 lg:px-8">
                <div className="mb-5 flex items-center justify-between gap-3">
                    <h2 className="text-2xl font-black">Catalog</h2>
                    <Link to="/products" className="text-sm font-black text-emerald-700">Lihat catalog</Link>
                </div>
                {featured.isLoading ? <Loading /> : featured.isError ? <QueryError message={errorMessage(featured.error)} /> : <ProductGrid products={featured.data ?? []} />}
            </section>
        </main>
    );
}

export function ProductsPage() {
    const [params, setParams] = useSearchParams();
    const search = params.get("search") ?? "";
    const category = params.get("category") ?? "";
    const sort = params.get("sort") ?? "newest";
    const query = useQuery({
        queryKey: ["products", search, category, sort],
        queryFn: async () => collectionData(await api.get("/products", { params: { search: search || undefined, category: category || undefined, sort } })),
    });

    const setParam = (key, value) => {
        const next = new URLSearchParams(params);
        if (value) {
            next.set(key, value);
        } else {
            next.delete(key);
        }
        setParams(next);
    };

    return (
        <main className="mx-auto max-w-7xl px-4 py-6 lg:px-8">
            <div className="mb-5 flex flex-wrap justify-end gap-2">
                <select value={sort} onChange={(event) => setParam("sort", event.target.value)} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold outline-none">
                    <option value="newest">Terbaru</option>
                    <option value="name_asc">Nama A-Z</option>
                    <option value="name_desc">Nama Z-A</option>
                    <option value="price_asc">Harga terendah</option>
                    <option value="price_desc">Harga tertinggi</option>
                </select>
            </div>
            {query.isLoading ? <Loading /> : query.isError ? <QueryError message={errorMessage(query.error)} /> : <ProductGrid products={query.data ?? []} />}
        </main>
    );
}

export function ProductDetailPage() {
    const { slug } = useParams();
    const [quantity, setQuantity] = useState(1);
    const [activeImage, setActiveImage] = useState(0);
    const add = useCartStore((state) => state.add);
    const navigate = useNavigate();

    const query = useQuery({
        queryKey: ["product", slug],
        queryFn: async () =>
            resourceData(await api.get(`/products/${slug}`)),
    });

    useEffect(() => {
        setQuantity(1);
        setActiveImage(0);
    }, [slug]);

    if (query.isLoading) {
        return <Loading />;
    }

    if (query.isError || !query.data) {
        return (
            <main className="mx-auto max-w-7xl px-4 py-10 lg:px-8">
                <QueryError
                    message={errorMessage(
                        query.error,
                        "Produk tidak ditemukan.",
                    )}
                />
            </main>
        );
    }

    const product = query.data;
    const images = productImageUrls(product);

    const max = product.track_stock
        ? Math.max(1, Number(product.stock) || 1)
        : 999;

    const unitPrice = Number(product.price) || 0;
    const subtotal = unitPrice * quantity;

    const addToCart = () => {
        add(product, quantity);
    };

    const buyNow = () => {
        add(product, quantity);
        navigate("/checkout");
    };

    return (
        <main className="mx-auto max-w-7xl px-4 py-7 lg:px-8">
            <Link
                to="/products"
                className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-slate-600"
            >
                <ArrowLeft size={17} />
                Kembali
            </Link>

            <div className="grid gap-8 lg:grid-cols-2">
                <section>
                    <div className="aspect-square overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                        <SafeImage
                            src={images[activeImage]}
                            alt={product.name}
                            className="h-full w-full object-cover"
                            fallbackClassName="h-full w-full"
                        />
                    </div>

                    {images.length > 1 ? (
                        <div className="mt-3 flex gap-3 overflow-x-auto">
                            {images.map((image, index) => (
                                <button
                                    key={image}
                                    type="button"
                                    onClick={() => setActiveImage(index)}
                                    className={`h-20 w-20 shrink-0 overflow-hidden rounded-xl border ${
                                        activeImage === index
                                            ? "border-emerald-600"
                                            : "border-slate-200"
                                    }`}
                                >
                                    <SafeImage
                                        src={image}
                                        alt={`${product.name} ${index + 1}`}
                                        className="h-full w-full object-cover"
                                        fallbackClassName="h-full w-full"
                                    />
                                </button>
                            ))}
                        </div>
                    ) : null}
                </section>

                <section className="lg:pt-3">
                    <p className="text-sm font-bold text-emerald-700">
                        {product.category?.name ?? product.type}
                    </p>

                    <h1 className="mt-2 text-3xl font-black text-slate-950">
                        {product.name}
                    </h1>

                    <p className="mt-4 text-2xl font-black text-emerald-700">
                        {productPrice(product)}
                    </p>

                    <div className="mt-4 flex flex-wrap gap-3 text-sm text-slate-500">
                        {product.brand ? (
                            <span>Brand: {product.brand}</span>
                        ) : null}

                        <span>
                            {product.available
                                ? product.track_stock
                                    ? `Stok ${product.stock ?? 0}`
                                    : "Tersedia"
                                : "Tidak tersedia"}
                        </span>
                    </div>

                    {product.description ? (
                        <p className="mt-6 whitespace-pre-line leading-7 text-slate-600">
                            {product.description}
                        </p>
                    ) : null}

                    <div className="mt-7 flex flex-wrap items-center justify-between gap-4 border-y border-slate-200 py-4">
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                disabled={quantity <= 1}
                                onClick={() =>
                                    setQuantity((current) =>
                                        Math.max(1, current - 1),
                                    )
                                }
                                className="grid h-10 w-10 place-items-center rounded-xl border border-slate-300 bg-white text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                <Minus size={17} />
                            </button>

                            <span className="min-w-8 text-center font-black text-slate-950">
                                {quantity}
                            </span>

                            <button
                                type="button"
                                disabled={quantity >= max}
                                onClick={() =>
                                    setQuantity((current) =>
                                        Math.min(max, current + 1),
                                    )
                                }
                                className="grid h-10 w-10 place-items-center rounded-xl border border-slate-300 bg-white text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                <Plus size={17} />
                            </button>
                        </div>

                        <div className="flex items-center gap-3">
                            <span className="text-sm font-bold text-slate-500">
                                Subtotal
                            </span>

                            <span className="text-xl font-black text-emerald-700">
                                {currency.format(subtotal)}
                            </span>
                        </div>
                    </div>

                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                        <button
                            type="button"
                            disabled={!product.available}
                            onClick={addToCart}
                            className="rounded-xl border border-emerald-600 px-5 py-3 font-black text-emerald-700 disabled:border-slate-300 disabled:text-slate-400"
                        >
                            Tambah ke Keranjang
                        </button>

                        <button
                            type="button"
                            disabled={!product.available}
                            onClick={buyNow}
                            className="rounded-xl bg-emerald-600 px-5 py-3 font-black text-white disabled:bg-slate-300"
                        >
                            Checkout
                        </button>
                    </div>
                </section>
            </div>
        </main>
    );
}

export function CartPage() {
    const items = useCartStore((state) => state.items);
    const update = useCartStore((state) => state.update);
    const remove = useCartStore((state) => state.remove);
    const summary = cartSummary(items);

    if (!items.length) {
        return <main className="mx-auto max-w-7xl px-4 py-10 lg:px-8"><Empty title="Keranjang masih kosong" action={<Link to="/products" className="rounded-xl bg-emerald-700 px-5 py-3 font-bold text-white">Lihat catalog</Link>} /></main>;
    }

    return (
        <main className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[1fr_330px] lg:px-8">
            <section className="grid gap-3">
                {items.map((item) => (
                    <article key={item.product.id} className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-4">
                        <div className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                            <SafeImage src={productImageUrls(item.product)[0]} alt={item.product.name} className="h-full w-full object-cover" fallbackClassName="h-full w-full" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <Link to={`/products/${item.product.slug}`} className="font-black text-slate-900">{item.product.name}</Link>
                            <p className="mt-2 font-black text-emerald-700">{currency.format(Number(item.product.price) || 0)}</p>
                            <div className="mt-3 flex items-center gap-2">
                                <button type="button" onClick={() => update(item.product.id, item.quantity - 1)} className="rounded-lg border border-slate-300 p-2"><Minus size={16} /></button>
                                <span className="min-w-8 text-center font-black">{item.quantity}</span>
                                <button type="button" onClick={() => update(item.product.id, item.quantity + 1)} className="rounded-lg border border-slate-300 p-2"><Plus size={16} /></button>
                                <button type="button" onClick={() => remove(item.product.id)} className="ml-auto rounded-lg p-2 text-rose-600 hover:bg-rose-50"><Trash2 size={19} /></button>
                            </div>
                        </div>
                    </article>
                ))}
            </section>

            <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-5 lg:sticky lg:top-24">
                <div className="flex justify-between text-sm"><span>Total item</span><b>{summary.quantity}</b></div>
                <div className="mt-3 flex justify-between text-lg"><span>Total</span><b className="text-emerald-700">{currency.format(summary.total)}</b></div>
                <Link to="/checkout" className="mt-5 block rounded-xl bg-emerald-600 px-5 py-3 text-center font-black text-white">Lanjut Checkout</Link>
            </aside>
        </main>
    );
}

const emptyBuyerForm = () => ({
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

    return { ...form, nik: null, npwp: null, province: null, city: null, company_name: null, postal_code: null, country: null };
}

function BuyerTypeSelector({ value, onChange, disabled = false }) {
    return (
        <div className="grid grid-cols-2 gap-2 rounded-xl border border-slate-200 p-1">
            <button type="button" disabled={disabled} onClick={() => onChange("individual")} className={`rounded-lg px-4 py-3 text-sm font-black transition ${value === "individual" ? "bg-emerald-50 text-emerald-700" : "text-slate-500"}`}>Perorangan</button>
            <button type="button" disabled={disabled} onClick={() => onChange("business")} className={`rounded-lg px-4 py-3 text-sm font-black transition ${value === "business" ? "bg-emerald-50 text-emerald-700" : "text-slate-500"}`}>Badan Usaha</button>
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
                {business ? <>
                    <label className="grid gap-2 text-sm font-bold sm:col-span-2">Perusahaan<input required disabled={disabled} value={form.company_name} onChange={update("company_name")} className={fieldClass} /></label>
                    <label className="grid gap-2 text-sm font-bold">Nama penanggung jawab<input required disabled={disabled} value={form.name} onChange={update("name")} className={fieldClass} /></label>
                    <label className="grid gap-2 text-sm font-bold">NIK<input required disabled={disabled} inputMode="numeric" maxLength={16} pattern="[0-9]{16}" value={form.nik} onChange={update("nik")} className={fieldClass} /></label>
                    <label className="grid gap-2 text-sm font-bold">NPWP<input required disabled={disabled} value={form.npwp} onChange={update("npwp")} className={fieldClass} /></label>
                    <label className="grid gap-2 text-sm font-bold">Negara<input required disabled={disabled} value={form.country} onChange={update("country")} className={fieldClass} /></label>
                    <label className="grid gap-2 text-sm font-bold">Provinsi<input required disabled={disabled} value={form.province} onChange={update("province")} className={fieldClass} /></label>
                    <label className="grid gap-2 text-sm font-bold">Kota<input required disabled={disabled} value={form.city} onChange={update("city")} className={fieldClass} /></label>
                    <label className="grid gap-2 text-sm font-bold">Kode Pos<input required disabled={disabled} value={form.postal_code} onChange={update("postal_code")} className={fieldClass} /></label>
                </> : <label className="grid gap-2 text-sm font-bold sm:col-span-2">Nama lengkap<input required disabled={disabled} value={form.name} onChange={update("name")} className={fieldClass} /></label>}
                <label className="grid gap-2 text-sm font-bold">Email<input required disabled={disabled} type="email" value={form.email} onChange={update("email")} className={fieldClass} /></label>
                <label className="grid gap-2 text-sm font-bold">Telepon<input required disabled={disabled} value={form.phone} onChange={update("phone")} className={fieldClass} /></label>
                <label className="grid gap-2 text-sm font-bold sm:col-span-2">Alamat<textarea required disabled={disabled} rows={4} value={form.address} onChange={update("address")} className={fieldClass} /></label>
                <label className="grid gap-2 text-sm font-bold sm:col-span-2">Catatan<textarea disabled={disabled} rows={3} value={form.notes} onChange={update("notes")} className={fieldClass} /></label>
                {showPayment ? <label className="grid gap-2 text-sm font-bold sm:col-span-2">Metode pembayaran<select disabled={disabled} value={form.payment_method} onChange={update("payment_method")} className={fieldClass}><option value="internal_billing">Internal Billing</option><option value="bank_transfer">Transfer Manual</option><option value="cod">COD</option></select></label> : null}
            </div>
        </div>
    );
}

function BuyerIdentitySummary({ data }) {
    const business = data.customer_type === "business";

    return (
        <dl className="grid gap-4 text-sm sm:grid-cols-2">
            <div><dt className="text-slate-500">Tipe checkout</dt><dd className="mt-1 font-bold">{business ? "Badan Usaha" : "Perorangan"}</dd></div>
            {business ? <div><dt className="text-slate-500">Perusahaan</dt><dd className="mt-1 font-bold">{data.company_name}</dd></div> : null}
            <div><dt className="text-slate-500">{business ? "Penanggung jawab" : "Nama"}</dt><dd className="mt-1 font-bold">{data.name}</dd></div>
            <div><dt className="text-slate-500">Email</dt><dd className="mt-1 break-all font-bold">{data.email}</dd></div>
            <div><dt className="text-slate-500">Telepon</dt><dd className="mt-1 font-bold">{data.phone}</dd></div>
            {business ? <>
                <div><dt className="text-slate-500">NIK</dt><dd className="mt-1 font-bold">{data.nik}</dd></div>
                <div><dt className="text-slate-500">NPWP</dt><dd className="mt-1 font-bold">{data.npwp}</dd></div>
                <div><dt className="text-slate-500">Provinsi</dt><dd className="mt-1 font-bold">{data.province}</dd></div>
                <div><dt className="text-slate-500">Kota</dt><dd className="mt-1 font-bold">{data.city}</dd></div>
                <div><dt className="text-slate-500">Kode Pos</dt><dd className="mt-1 font-bold">{data.postal_code}</dd></div>
                <div><dt className="text-slate-500">Negara</dt><dd className="mt-1 font-bold">{data.country}</dd></div>
            </> : null}
            <div className="sm:col-span-2"><dt className="text-slate-500">Alamat</dt><dd className="mt-1 whitespace-pre-line font-bold">{data.address}</dd></div>
            {data.notes ? <div className="sm:col-span-2"><dt className="text-slate-500">Catatan</dt><dd className="mt-1 whitespace-pre-line font-bold">{data.notes}</dd></div> : null}
        </dl>
    );
}

function CheckoutItemsSummary({ items }) {
    const summary = cartSummary(items);

    return (
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
            {items.map((item) => <div key={item.product.id} className="border-b border-slate-100 py-3 text-sm last:border-0"><div className="flex justify-between gap-3"><span className="font-bold">{item.product.name} × {item.quantity}</span><b>{currency.format((Number(item.product.price) || 0) * item.quantity)}</b></div></div>)}
            <div className="mt-4 flex justify-between text-lg"><b>Total</b><b className="text-emerald-700">{currency.format(summary.total)}</b></div>
        </section>
    );
}

export function CheckoutPage() {
    const items = useCartStore((state) => state.items);
    const clear = useCartStore((state) => state.clear);
    const navigate = useNavigate();
    const [form, setForm] = useState(emptyBuyerForm());
    const [preview, setPreview] = useState(false);
    const mutation = useMutation({
        mutationFn: async () => resourceData(await api.post("/checkout", {
            ...checkoutPayload(form),
            items: items.map((item) => ({ product_id: Number(item.product.id), quantity: item.quantity })),
        })),
        onSuccess: (order) => {
            localStorage.setItem("kishamarket-last-order-email", form.email.trim().toLowerCase());
            clear();
            navigate(`/order-success/${order.order_number}`, { state: { order, email: form.email.trim().toLowerCase() } });
        },
    });

    if (!items.length) {
        return <main className="mx-auto max-w-7xl px-4 py-10 lg:px-8"><Empty title="Keranjang masih kosong" action={<Link to="/products" className="rounded-xl bg-emerald-700 px-5 py-3 font-bold text-white">Lihat catalog</Link>} /></main>;
    }

    const updateForm = (patch) => setForm((current) => ({ ...current, ...patch }));

    return (
        <main className="mx-auto max-w-6xl px-4 py-6 lg:px-8">
            {!preview ? (
                <form onSubmit={(event) => { event.preventDefault(); setPreview(true); }} className="grid gap-6 lg:grid-cols-[1fr_340px]">
                    <section className="rounded-2xl border border-slate-200 bg-white p-5"><BuyerIdentityFields form={form} onChange={updateForm} showPayment /></section>
                    <aside className="h-fit"><CheckoutItemsSummary items={items} /><button className="mt-4 w-full rounded-xl bg-emerald-600 px-5 py-3 font-black text-white">Preview Order</button></aside>
                </form>
            ) : (
                <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
                    <section className="rounded-2xl border border-slate-200 bg-white p-5"><BuyerIdentitySummary data={form} /></section>
                    <aside className="h-fit"><CheckoutItemsSummary items={items} />{mutation.isError ? <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-bold text-rose-700">{errorMessage(mutation.error, "Checkout gagal.")}</p> : null}<div className="mt-4 grid gap-3"><button type="button" onClick={() => setPreview(false)} className="rounded-xl border border-slate-300 px-5 py-3 font-bold">Kembali ke Form</button><button type="button" disabled={mutation.isPending} onClick={() => mutation.mutate()} className="rounded-xl bg-emerald-600 px-5 py-3 font-black text-white disabled:bg-slate-300">{mutation.isPending ? "Memproses..." : "Buat Order"}</button></div></aside>
                </div>
            )}
        </main>
    );
}

function OrderDetail({ order, email, onCancel, cancelling = false, showEdit = true }) {
    if (!order) {
        return <div className="grid min-h-72 place-items-center rounded-2xl border border-dashed border-slate-300 text-slate-500">Pilih order untuk melihat detail.</div>;
    }

    const business = order.customer_type === "business";

    return (
        <article className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-start justify-between gap-3">
                <div><p className="text-sm text-slate-500">{order.order_number}</p><div className="mt-2"><StatusBadge status={order.status} /></div></div>
                {showEdit && order.can_edit && email ? <Link to={`/orders/${order.order_number}/edit?email=${encodeURIComponent(email)}`} title="Edit data buyer" className="grid h-10 w-10 place-items-center rounded-xl border border-slate-300 text-slate-700 hover:text-emerald-700"><Pencil size={18} /></Link> : null}
            </div>

            <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
                <div><dt className="text-slate-500">Tipe</dt><dd className="mt-1 font-bold">{business ? "Badan Usaha" : "Perorangan"}</dd></div>
                {business ? <div><dt className="text-slate-500">Perusahaan</dt><dd className="mt-1 font-bold">{order.guest_company_name}</dd></div> : null}
                <div><dt className="text-slate-500">Nama</dt><dd className="mt-1 font-bold">{order.guest_name}</dd></div>
                <div><dt className="text-slate-500">Email</dt><dd className="mt-1 break-all font-bold">{order.guest_email}</dd></div>
                <div><dt className="text-slate-500">Telepon</dt><dd className="mt-1 font-bold">{order.guest_phone}</dd></div>
                <div><dt className="text-slate-500">Tanggal</dt><dd className="mt-1 font-bold">{dateTime(order.created_at)}</dd></div>
                <div className="sm:col-span-2"><dt className="text-slate-500">Alamat</dt><dd className="mt-1 whitespace-pre-line font-bold">{order.guest_address}</dd></div>
            </dl>

            <div className="mt-6 border-t border-slate-200 pt-4">
                {(order.items ?? []).map((item) => <div key={item.id} className="flex justify-between gap-3 border-b border-slate-100 py-3 text-sm last:border-0"><div><b>{item.product_name} × {item.quantity}</b>{item.product_sku ? <p className="mt-1 text-xs text-slate-500">{item.product_sku}</p> : null}</div><b>{currency.format(item.subtotal)}</b></div>)}
                <div className="mt-4 flex justify-between text-lg"><b>Total</b><b className="text-emerald-700">{currency.format(order.total_amount)}</b></div>
            </div>

            {order.can_cancel && onCancel ? <button type="button" disabled={cancelling} onClick={() => onCancel(order)} className="mt-5 rounded-xl border border-rose-300 px-4 py-2.5 text-sm font-black text-rose-700 disabled:opacity-50">{cancelling ? "Membatalkan..." : "Batalkan Order"}</button> : null}
        </article>
    );
}

export function TrackOrderPage() {
    const client = useQueryClient();
    const [urlParams, setUrlParams] = useSearchParams();
    const initialEmail = (urlParams.get("email") ?? "").trim().toLowerCase();
    const [emailInput, setEmailInput] = useState(initialEmail);
    const [email, setEmail] = useState(initialEmail);
    const [selectedNumber, setSelectedNumber] = useState("");
    const query = useQuery({
        queryKey: ["track-orders", email],
        enabled: Boolean(email),
        queryFn: async () => collectionData(await api.get("/orders/track", { params: { email } })),
    });
    const selected = (query.data ?? []).find((order) => order.order_number === selectedNumber) ?? query.data?.[0] ?? null;
    const cancel = useMutation({
        mutationFn: async (order) => resourceData(await api.post(`/orders/${order.order_number}/cancel`, { email, cancel_reason: "Dibatalkan oleh buyer." })),
        onSuccess: async (order) => {
            setSelectedNumber(order.order_number);
            await client.invalidateQueries({ queryKey: ["track-orders", email] });
        },
    });

    useEffect(() => {
        if (query.data?.length && !query.data.some((order) => order.order_number === selectedNumber)) {
            setSelectedNumber(query.data[0].order_number);
        }
    }, [query.data, selectedNumber]);

    const submit = (event) => {
        event.preventDefault();
        const normalized = emailInput.trim().toLowerCase();
        const next = new URLSearchParams(urlParams);

        if (normalized) {
            next.set("email", normalized);
        } else {
            next.delete("email");
        }

        setUrlParams(next, { replace: true });
        setEmail(normalized);
        setSelectedNumber("");
    };

    return (
        <main className="mx-auto max-w-7xl px-4 py-6 lg:px-8">
            <form onSubmit={submit} className="relative mb-5 flex max-w-xl items-center">
                <input required type="email" value={emailInput} onChange={(event) => setEmailInput(event.target.value)} placeholder="Masukkan email untuk melihat riwayat order" className={`${fieldClass} w-full pr-14`} />
                <button type="submit" className="absolute right-2 grid h-9 w-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-emerald-700"><Search size={19} /></button>
            </form>

            {!email ? <Empty title="Masukkan email untuk melihat riwayat order" /> : query.isLoading ? <Loading /> : query.isError ? <QueryError message={errorMessage(query.error, "Riwayat order gagal dimuat.")} /> : !(query.data ?? []).length ? <Empty title="Riwayat order tidak ditemukan" /> : (
                <div className="grid gap-5 lg:grid-cols-[300px_1fr]">
                    <aside className="grid h-fit gap-2 lg:sticky lg:top-24">
                        {(query.data ?? []).map((order) => (
                            <button key={order.id} type="button" onClick={() => setSelectedNumber(order.order_number)} className={`rounded-2xl border p-4 text-left transition ${selected?.id === order.id ? "border-emerald-500 bg-emerald-50/60" : "border-slate-200 bg-white hover:border-slate-300"}`}>
                                <div className="flex items-center justify-between gap-2"><b className="text-sm">{order.order_number}</b><StatusBadge status={order.status} /></div>
                                <p className="mt-2 text-sm font-black text-emerald-700">{currency.format(order.total_amount)}</p>
                                <p className="mt-1 text-xs text-slate-500">{dateTime(order.created_at)}</p>
                            </button>
                        ))}
                    </aside>
                    <OrderDetail order={selected} email={email} onCancel={(order) => cancel.mutate(order)} cancelling={cancel.isPending} />
                </div>
            )}
        </main>
    );
}

export function OrderEditPage() {
    const { orderNumber } = useParams();
    const [params] = useSearchParams();
    const navigate = useNavigate();
    const verificationEmail = (params.get("email") ?? "").trim().toLowerCase();
    const query = useQuery({
        queryKey: ["track-orders", verificationEmail],
        enabled: Boolean(verificationEmail),
        queryFn: async () => collectionData(await api.get("/orders/track", { params: { email: verificationEmail } })),
    });
    const order = query.data?.find((item) => item.order_number === orderNumber);
    const [form, setForm] = useState(null);

    useEffect(() => {
        if (order) {
            setForm(buyerFormFromOrder(order));
        }
    }, [order]);

    const mutation = useMutation({
        mutationFn: async () => resourceData(await api.put(`/orders/track/${orderNumber}`, { ...checkoutPayload(form), email_verification: verificationEmail })),
        onSuccess: () => navigate(`/track-order?email=${encodeURIComponent(verificationEmail)}`),
    });

    if (!verificationEmail) {
        return <main className="mx-auto max-w-4xl px-4 py-10"><QueryError message="Email verifikasi tidak tersedia." /></main>;
    }

    if (query.isLoading || !form) {
        return <Loading />;
    }

    if (query.isError || !order) {
        return <main className="mx-auto max-w-4xl px-4 py-10"><QueryError message="Order tidak ditemukan." /></main>;
    }

    if (!order.can_edit) {
        return <main className="mx-auto max-w-4xl px-4 py-10"><QueryError message="Order ini tidak dapat diedit karena statusnya bukan pending." /></main>;
    }

    return (
        <main className="mx-auto max-w-4xl px-4 py-6 lg:px-8">
            <Link to={`/track-order?email=${encodeURIComponent(verificationEmail)}`} className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-slate-600"><ArrowLeft size={17} /> Kembali ke detail</Link>
            <form onSubmit={(event) => { event.preventDefault(); mutation.mutate(); }} className="rounded-2xl border border-slate-200 bg-white p-5">
                <BuyerIdentityFields form={form} onChange={(patch) => setForm((current) => ({ ...current, ...patch }))} />
                {mutation.isError ? <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-bold text-rose-700">{errorMessage(mutation.error, "Data order gagal diperbarui.")}</p> : null}
                <div className="mt-5 flex justify-end gap-3"><button type="button" onClick={() => navigate(-1)} className="rounded-xl border border-slate-300 px-5 py-3 font-bold">Batal</button><button disabled={mutation.isPending} className="rounded-xl bg-emerald-600 px-6 py-3 font-black text-white disabled:bg-slate-300">{mutation.isPending ? "Menyimpan..." : "Simpan"}</button></div>
            </form>
        </main>
    );
}

export function OrderSuccessPage() {
    const { orderNumber } = useParams();
    const location = useLocation();
    const stateOrder = location.state?.order;
    const stateEmail = location.state?.email;
    const email = stateEmail || localStorage.getItem("kishamarket-last-order-email") || "";
    const query = useQuery({
        queryKey: ["track-orders", email],
        enabled: !stateOrder && Boolean(email),
        queryFn: async () => collectionData(await api.get("/orders/track", { params: { email } })),
    });
    const order = stateOrder ?? query.data?.find((item) => item.order_number === orderNumber);

    if (!order && query.isLoading) {
        return <Loading />;
    }

    return (
        <main className="mx-auto max-w-4xl px-4 py-8 lg:px-8">
            <div className="mb-6 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-800"><CheckCircle2 size={28} /><div><b className="block text-lg">Order berhasil dibuat</b><span className="text-sm">Simpan nomor order dan email untuk melihat riwayat.</span></div></div>
            {order ? <OrderDetail order={order} email={email} showEdit={false} /> : <QueryError message="Detail order belum dapat dimuat." />}
            <div className="mt-5 flex flex-wrap gap-3"><Link to="/products" className="rounded-xl border border-slate-300 px-5 py-3 font-bold">Kembali ke Catalog</Link><Link to="/track-order" className="rounded-xl bg-emerald-600 px-5 py-3 font-black text-white">Lihat Riwayat Order</Link></div>
        </main>
    );
}
