import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowRight, Building2, CheckCircle2, Clock3, Headphones, Menu, MessageCircle, Minus, PackageCheck, Plus, Search, ShieldCheck, ShoppingBag, ShoppingCart, Sparkles, Star, Trash2, X, } from "lucide-react";
import { Link, NavLink, Outlet, useNavigate, useParams, useSearchParams } from "react-router-dom";
import company from "@/data/companyProfile.json";
import { Empty, fieldClass, Loading, productPrice, QueryError, StatusBadge, variantDescription, } from "@/components/Common";
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
function safeRating(product) {
    return Number(product.rating) || 0;
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
        return <div className={`grid place-items-center bg-slate-100 text-xs font-bold text-slate-400 ${fallbackClassName}`}>Tanpa gambar</div>;
    }

    return <img src={src} alt={alt} className={className} onError={() => setFailed(true)}/>;
}
export function PublicHeader() {
    const [open, setOpen] = useState(false);
    const items = useCartStore((state) => state.items);
    const navigate = useNavigate();
    const [params] = useSearchParams();
    const [search, setSearch] = useState(params.get("search") ?? "");
    const summary = cartSummary(items);
    const submit = (event) => {
        event.preventDefault();
        navigate(search.trim() ? `/products?search=${encodeURIComponent(search.trim())}` : "/products");
        setOpen(false);
    };
    return (<header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 shadow-[0_8px_30px_rgba(15,23,42,0.04)] backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 lg:px-8">
        <Link to="/" className="flex shrink-0 items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-700 text-sm font-black text-white shadow-lg shadow-emerald-700/20">K</span>
          <span className="hidden sm:block">
            <strong className="block text-base font-black leading-none text-slate-950">{company.shortName}</strong>
            <small className="mt-1 block text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">{company.tagline}</small>
          </span>
        </Link>

        <form onSubmit={submit} className="hidden min-w-0 flex-1 items-center rounded-2xl border border-slate-200 bg-slate-100/75 px-2 md:flex">
          <Search size={18} className="ml-2 shrink-0 text-slate-400"/>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari produk, layanan, kategori, atau SKU" className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm outline-none"/>
          <button className="rounded-xl bg-slate-950 px-4 py-2 text-xs font-black text-white">Cari</button>
        </form>

        <nav className="hidden items-center gap-5 text-sm font-bold text-slate-600 xl:flex">
          <NavLink to="/" className={({ isActive }) => isActive ? "text-emerald-700" : "transition hover:text-slate-950"}>Beranda</NavLink>
          <NavLink to="/products" className={({ isActive }) => isActive ? "text-emerald-700" : "transition hover:text-slate-950"}>Katalog</NavLink>
          <a href="/#company-profile" className="transition hover:text-slate-950">Profil Perusahaan</a>
        </nav>

        <Link to="/track-order" title="Cari dan lacak order" aria-label="Cari dan lacak order" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:border-emerald-600 hover:text-emerald-700">
          <Search size={19}/>
        </Link>

        <Link to="/cart" title="Keranjang" className="relative grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-950 text-white transition hover:bg-emerald-700">
          <ShoppingCart size={19}/>
          {summary.quantity > 0 ? (<span className="absolute -right-1.5 -top-1.5 min-w-5 rounded-full bg-rose-500 px-1 text-center text-[10px] font-black leading-5 text-white ring-2 ring-white">{summary.quantity}</span>) : null}
        </Link>

        <button type="button" onClick={() => setOpen((value) => !value)} className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 xl:hidden">
          {open ? <X size={20}/> : <Menu size={20}/>}
        </button>
      </div>

      {open ? (<div className="border-t border-slate-200 bg-white px-4 py-4 xl:hidden">
          <form onSubmit={submit} className="flex items-center rounded-xl border border-slate-200 bg-slate-50 px-2 md:hidden">
            <Search size={18} className="ml-2 text-slate-400"/>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari produk..." className="min-w-0 flex-1 bg-transparent px-3 py-2.5 outline-none"/>
            <button className="rounded-lg bg-slate-950 px-3 py-2 text-xs font-black text-white">Cari</button>
          </form>
          <div className="mt-3 grid gap-1 text-sm font-bold text-slate-700">
            <Link to="/" onClick={() => setOpen(false)} className="rounded-xl px-3 py-2.5 hover:bg-slate-100">Beranda</Link>
            <Link to="/products" onClick={() => setOpen(false)} className="rounded-xl px-3 py-2.5 hover:bg-slate-100">Katalog</Link>
            <a href="/#company-profile" onClick={() => setOpen(false)} className="rounded-xl px-3 py-2.5 hover:bg-slate-100">Profil Perusahaan</a>
            <Link to="/track-order" onClick={() => setOpen(false)} className="rounded-xl px-3 py-2.5 hover:bg-slate-100">Cari Order</Link>
          </div>
        </div>) : null}
    </header>);
}
function WhatsAppFloatingLinks() {
    return (<div className="fixed bottom-5 right-4 z-[70] flex flex-col items-end gap-2 sm:bottom-7 sm:right-7">
      {company.whatsappLinks.map((item, index) => {
            const href = `https://wa.me/${item.number}?text=${encodeURIComponent(item.message)}`;
            return (<a key={item.number} href={href} target="_blank" rel="noreferrer" className={`group flex items-center gap-2 rounded-full px-3 py-3 text-white shadow-xl transition hover:-translate-y-0.5 ${index === 0 ? "bg-emerald-600" : "bg-slate-950"}`} aria-label={`Chat WhatsApp ${item.label}`}>
            <span className="max-w-0 overflow-hidden whitespace-nowrap text-xs font-black opacity-0 transition-all duration-300 group-hover:max-w-40 group-hover:pr-1 group-hover:opacity-100">{item.label}</span>
            <MessageCircle size={21} fill="currentColor"/>
          </a>);
        })}
    </div>);
}
export function PublicLayout() {
    return (<div className="min-h-screen bg-[#f5f7f6] text-slate-900">
      <PublicHeader />
      <Outlet />
      <footer className="mt-20 border-t border-slate-800 bg-slate-950 text-slate-300">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 md:grid-cols-[1.3fr_1fr_1fr] lg:px-8">
          <div>
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-600 font-black text-white">K</span>
              <div><h2 className="font-black text-white">{company.name}</h2><p className="text-xs uppercase tracking-wider text-slate-500">{company.tagline}</p></div>
            </div>
            <p className="mt-5 max-w-md text-sm leading-7 text-slate-400">{company.description}</p>
          </div>
          <div><h3 className="font-black text-white">Kontak perusahaan</h3><p className="mt-4 text-sm leading-7 text-slate-400">{company.phone}<br />{company.email}<br />{company.address}</p></div>
          <div><h3 className="font-black text-white">Jam operasional</h3><p className="mt-4 text-sm leading-7 text-slate-400">{company.hours}</p><Link to="/track-order" className="mt-5 inline-flex items-center gap-2 text-sm font-black text-emerald-400">Cari status order <ArrowRight size={16}/></Link></div>
        </div>
        <div className="border-t border-slate-800 px-4 py-5 text-center text-xs text-slate-500">© {new Date().getFullYear()} {company.shortName}. Marketplace internal perusahaan.</div>
      </footer>
      <WhatsAppFloatingLinks />
    </div>);
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
            return;
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
        setNotice("Ditambahkan ke cart");
    };
    const confirm = (selected, quantity) => {
        add(product, selected, quantity);
        setModalOpen(false);
        if (action === "checkout") {
            navigate("/checkout");
            return;
        }
        setNotice("Ditambahkan ke cart");
    };
    return (<>
      <article className="group relative overflow-hidden rounded-[1.4rem] border border-slate-200 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.06)] transition duration-300 hover:-translate-y-1.5 hover:shadow-[0_20px_55px_rgba(15,23,42,0.12)]">
        {notice ? <span className="absolute left-3 top-3 z-10 rounded-full bg-slate-950 px-3 py-1.5 text-[11px] font-black text-white shadow-lg">{notice}</span> : null}
        <Link to={`/products/${product.slug}`} className="relative block aspect-[4/3] overflow-hidden bg-slate-100">
          <SafeImage src={productImageUrls(product)[0]} alt={product.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" fallbackClassName="h-full w-full"/>
          <span className="absolute bottom-3 left-3 rounded-full bg-white/90 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-emerald-800 backdrop-blur">{product.type === "service" ? "Layanan" : "Produk"}</span>
        </Link>
        <div className="p-4">
          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-emerald-700">{product.category?.name ?? "Katalog internal"}</p>
          <Link to={`/products/${product.slug}`} className="mt-2 block line-clamp-2 min-h-12 text-base font-black leading-6 text-slate-950">{product.name}</Link>
          <div className="mt-2 flex items-center gap-1 text-xs text-amber-500"><Star size={14} fill="currentColor"/><span className="font-black">{safeRating(product).toFixed(1)}</span><span className="text-slate-400">({Number(product.review_count) || 0})</span></div>
          <p className="mt-3 text-lg font-black text-emerald-700">{productPrice(product)}</p>
          <p className="mt-1 text-xs text-slate-500">{requiresVariantSelection(product) ? `${activeVariants(product).length} pilihan variant` : variant?.available ? "Tersedia" : "Tidak tersedia"}</p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button disabled={!product.available} onClick={() => begin("cart")} className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-emerald-700 px-3 py-2.5 text-xs font-black text-emerald-800 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-40"><ShoppingCart size={15}/>Cart</button>
            <button disabled={!product.available} onClick={() => begin("checkout")} className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-950 px-3 py-2.5 text-xs font-black text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"><ShoppingBag size={15}/>Checkout</button>
          </div>
        </div>
      </article>

      <VariantSelectionModal open={modalOpen} product={product} initialVariantId={variant?.id} checkoutMode={action === "checkout"} title={action === "checkout" ? "Pilih variant sebelum checkout" : "Pilih variant untuk cart"} onClose={() => setModalOpen(false)} onConfirm={confirm}/>
    </>);
}
function CapabilityIcon({ index }) {
    const icons = [PackageCheck, Building2, ShieldCheck, Headphones, Clock3, Sparkles];
    const Icon = icons[index % icons.length];
    return <Icon size={20}/>;
}
export function HomePage() {
    const categories = useQuery({
        queryKey: ["categories"],
        queryFn: async () => collectionData(await api.get("/categories")),
        retry: false,
    });
    const featured = useQuery({
        queryKey: ["featured"],
        queryFn: async () => paginatedData(await api.get("/products", { params: { featured: 1, per_page: 8 } })).data,
        retry: false,
    });
    return (<main>
      <section className="relative overflow-hidden bg-slate-950 text-white">
        <div className="portfolio-grid absolute inset-0 opacity-20"/>
        <div className="absolute -right-24 top-0 h-96 w-96 rounded-full bg-emerald-500/20 blur-3xl"/>
        <div className="absolute -bottom-36 left-1/3 h-96 w-96 rounded-full bg-teal-400/10 blur-3xl"/>
        <div className="relative mx-auto grid max-w-7xl gap-12 px-4 py-20 lg:grid-cols-[1.25fr_.75fr] lg:px-8 lg:py-28">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-emerald-300"><Sparkles size={15}/> Marketplace internal perusahaan</span>
            <h1 className="mt-7 max-w-4xl text-4xl font-black leading-[1.08] sm:text-5xl lg:text-7xl">{company.heroTitle}</h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-slate-300 sm:text-lg">{company.heroSubtitle}</p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link to="/products" className="inline-flex items-center gap-2 rounded-2xl bg-emerald-500 px-6 py-3.5 font-black text-slate-950 transition hover:bg-emerald-400">Jelajahi katalog <ArrowRight size={18}/></Link>
              <a href="#company-profile" className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/5 px-6 py-3.5 font-black text-white transition hover:bg-white/10">Profil perusahaan</a>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 shadow-2xl backdrop-blur-xl sm:p-8">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-300">Company portfolio</p>
            <h2 className="mt-4 text-2xl font-black">{company.name}</h2>
            <p className="mt-4 text-sm leading-7 text-slate-300">{company.portfolioIntro}</p>
            <div className="mt-7 grid grid-cols-2 gap-3">
              {company.metrics.map((metric) => <div key={metric.label} className="rounded-2xl border border-white/10 bg-white/[0.05] p-4"><strong className="block text-xl font-black text-white">{metric.value}</strong><span className="mt-1 block text-xs text-slate-400">{metric.label}</span></div>)}
            </div>
          </div>
        </div>
      </section>

      <section id="company-profile" className="mx-auto max-w-7xl scroll-mt-24 px-4 py-20 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[.85fr_1.15fr] lg:items-start">
          <div className="lg:sticky lg:top-28">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-700">Tentang perusahaan</p>
            <h2 className="mt-4 text-4xl font-black leading-tight text-slate-950">Mendukung pekerjaan dengan proses yang lebih profesional.</h2>
            <p className="mt-5 leading-8 text-slate-600">{company.description}</p>
            <div className="mt-7 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm font-black text-slate-950">Informasi perusahaan</p><p className="mt-3 text-sm leading-7 text-slate-600">{company.address}<br />{company.email}<br />{company.hours}</p></div>
          </div>
          <div>
            <div className="grid gap-4 md:grid-cols-3">
              {company.values.map((value, index) => <article key={value.title} className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm"><span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-100 font-black text-emerald-800">0{index + 1}</span><h3 className="mt-5 text-lg font-black">{value.title}</h3><p className="mt-3 text-sm leading-6 text-slate-600">{value.description}</p></article>)}
            </div>
            <div className="mt-5 rounded-[1.8rem] bg-emerald-800 p-7 text-white sm:p-9">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-200">Kapabilitas</p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {company.capabilities.map((capability, index) => <div key={capability} className="flex items-center gap-3 rounded-xl bg-white/10 px-4 py-3 text-sm font-bold"><span className="text-emerald-300"><CapabilityIcon index={index}/></span>{capability}</div>)}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-16 lg:px-8">
          <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-700">Ruang lingkup</p><h2 className="mt-3 text-3xl font-black">Kategori kebutuhan</h2></div><Link to="/products" className="inline-flex items-center gap-2 font-black text-emerald-700">Semua katalog <ArrowRight size={17}/></Link></div>
          {categories.isLoading ? <Loading /> : categories.isError ? <div className="mt-8"><QueryError message={errorMessage(categories.error, "Kategori belum dapat dimuat.")}/></div> : <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{categories.data?.map((category, index) => <Link key={category.id} to={`/products?category=${category.slug}`} className="group rounded-2xl border border-slate-200 bg-slate-50 p-5 transition hover:border-emerald-600 hover:bg-emerald-50"><div className="flex items-center justify-between"><span className="grid h-10 w-10 place-items-center rounded-xl bg-white font-black text-emerald-700 shadow-sm">{String(index + 1).padStart(2, "0")}</span><ArrowRight size={18} className="text-slate-300 transition group-hover:translate-x-1 group-hover:text-emerald-700"/></div><h3 className="mt-5 font-black text-slate-950">{category.name}</h3><p className="mt-2 text-sm text-slate-500">{category.products_count ?? 0} produk atau layanan</p></Link>)}</div>}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-700">Pilihan perusahaan</p><h2 className="mt-3 text-3xl font-black">Produk & layanan unggulan</h2><p className="mt-3 max-w-2xl text-slate-600">Tambahkan ke cart atau lanjut checkout langsung dari card. Produk dengan beberapa variant akan menampilkan modal pilihan.</p></div><Link to="/products" className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-black">Lihat lebih banyak <ArrowRight size={16}/></Link></div>
        {featured.isLoading ? <Loading /> : featured.isError ? <div className="mt-8"><QueryError message={errorMessage(featured.error, "Produk unggulan belum dapat dimuat.")}/></div> : featured.data?.length ? <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{featured.data.map((product) => <ProductCard key={product.id} product={product}/>)}</div> : <div className="mt-8"><Empty title="Belum ada produk unggulan"/></div>}
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-20 lg:px-8">
        <div className="rounded-[2rem] bg-slate-950 px-6 py-10 text-white sm:px-10 lg:flex lg:items-center lg:justify-between">
          <div><p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-300">Pesanan sudah dibuat?</p><h2 className="mt-3 text-3xl font-black">Cari status order tanpa login.</h2><p className="mt-3 text-slate-400">Gunakan nomor order dan nomor HP yang dipakai saat checkout.</p></div>
          <Link to="/track-order" className="mt-7 inline-flex items-center gap-2 rounded-2xl bg-white px-6 py-3.5 font-black text-slate-950 lg:mt-0"><Search size={18}/> Cari order</Link>
        </div>
      </section>
    </main>);
}
export function ProductsPage() {
    const [params, setParams] = useSearchParams();
    const categories = useQuery({ queryKey: ["categories"], queryFn: async () => collectionData(await api.get("/categories")) });
    const products = useQuery({
        queryKey: ["products", params.toString()],
        queryFn: async () => paginatedData(await api.get("/products", { params: Object.fromEntries(params.entries()) })),
        retry: false,
    });
    const update = (key, value) => { const next = new URLSearchParams(params); value ? next.set(key, value) : next.delete(key); next.delete("page"); setParams(next); };
    return (<main className="mx-auto max-w-7xl px-4 py-12 lg:px-8">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-700">Katalog internal</p>
      <h1 className="mt-3 text-4xl font-black">Produk & Layanan</h1>
      <div className="mt-7 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-4">
        <input value={params.get("search") ?? ""} onChange={(event) => update("search", event.target.value)} placeholder="Cari produk..." className={fieldClass}/>
        <select value={params.get("category") ?? ""} onChange={(event) => update("category", event.target.value)} className={fieldClass}><option value="">Semua kategori</option>{categories.data?.map((category) => <option key={category.id} value={category.slug}>{category.name}</option>)}</select>
        <select value={params.get("type") ?? ""} onChange={(event) => update("type", event.target.value)} className={fieldClass}><option value="">Produk & layanan</option><option value="product">Produk</option><option value="service">Layanan</option></select>
        <select value={params.get("sort") ?? ""} onChange={(event) => update("sort", event.target.value)} className={fieldClass}><option value="">Terbaru</option><option value="name">Nama</option><option value="price_asc">Harga termurah</option><option value="price_desc">Harga termahal</option></select>
      </div>
      {products.isLoading ? <Loading /> : products.isError ? <div className="mt-8"><QueryError message={errorMessage(products.error, "Katalog belum dapat dimuat.")}/></div> : products.data?.data.length ? <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{products.data.data.map((product) => <ProductCard key={product.id} product={product}/>)}</div> : <div className="mt-8"><Empty title="Produk tidak ditemukan"/></div>}
    </main>);
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
    if (query.isLoading)
        return <Loading />;
    if (query.isError)
        return <main className="mx-auto max-w-4xl px-4 py-16"><QueryError message={errorMessage(query.error, "Detail produk belum dapat dimuat.")}/></main>;
    if (!query.data)
        return <main className="mx-auto max-w-4xl px-4 py-16"><Empty title="Produk tidak ditemukan"/></main>;
    const product = query.data;
    const maxQuantity = selected?.track_stock ? Math.max(1, selected.stock ?? 1) : 99;
    const submit = (destination) => {
        if (!selected?.available)
            return;
        add(product, selected, quantity);
        navigate(destination === "checkout" ? "/checkout" : "/cart");
    };
    return (<main className="mx-auto max-w-7xl px-4 py-12 lg:px-8">
      <div className="grid gap-10 lg:grid-cols-2">
        <div><div className="aspect-square overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm"><SafeImage src={productImageUrls(product)[0]} alt={product.name} className="h-full w-full object-cover" fallbackClassName="h-full w-full"/></div>{productImageUrls(product).length > 1 ? <div className="mt-3 flex gap-3 overflow-x-auto pb-2">{productImageUrls(product).map((url) => <SafeImage key={url} src={url} alt={product.name} className="h-20 w-20 shrink-0 rounded-xl border border-slate-200 object-cover" fallbackClassName="h-20 w-20 shrink-0 rounded-xl border"/>)}</div> : null}</div>
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-700">{product.category?.name ?? "Katalog internal"}</p>
          <h1 className="mt-3 text-4xl font-black leading-tight">{product.name}</h1>
          <div className="mt-3 flex items-center gap-2 text-amber-500"><Star fill="currentColor" size={18}/><b>{safeRating(product).toFixed(1)}</b><span className="text-sm text-slate-400">({Number(product.review_count) || 0} ulasan)</span></div>
          <p className="mt-6 text-3xl font-black text-emerald-700">{currency.format(Number(selected?.price ?? product.price) || 0)}</p>
          <p className="mt-6 whitespace-pre-line leading-8 text-slate-600">{product.description || "Informasi produk belum tersedia."}</p>

          <div className="mt-8"><h3 className="font-black">Pilih variant</h3><div className="mt-3 grid gap-3 sm:grid-cols-2">{activeVariants(product).map((variant) => <button key={variant.id} type="button" disabled={!variant.available} onClick={() => { setSelected(variant); setQuantity(1); }} className={`rounded-2xl border p-4 text-left transition ${selected?.id === variant.id ? "border-emerald-600 bg-emerald-50" : "border-slate-200 bg-white hover:border-slate-400"} disabled:cursor-not-allowed disabled:opacity-50`}><b>{variant.name}</b><small className="mt-1 block leading-5 text-slate-500">{variantDescription(variant)}</small><span className="mt-2 block font-black text-emerald-700">{currency.format(Number(variant.price) || 0)}</span><small className={variant.available ? "text-emerald-600" : "text-rose-600"}>{variant.available ? variant.track_stock ? `Stok ${variant.stock ?? 0}` : "Tersedia" : "Tidak tersedia"}</small></button>)}</div></div>

          <div className="mt-6 flex items-center justify-between rounded-2xl bg-slate-100 p-4"><div><p className="text-xs font-bold uppercase text-slate-500">Jumlah</p><p className="mt-1 text-sm text-slate-600">Subtotal {currency.format((Number(selected?.price) || 0) * quantity)}</p></div><div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-1"><button type="button" onClick={() => setQuantity((value) => Math.max(1, value - 1))} className="rounded-lg p-2 hover:bg-slate-100"><Minus size={17}/></button><b className="min-w-8 text-center">{quantity}</b><button type="button" onClick={() => setQuantity((value) => Math.min(maxQuantity, value + 1))} className="rounded-lg p-2 hover:bg-slate-100"><Plus size={17}/></button></div></div>
          <div className="mt-6 grid grid-cols-2 gap-3"><button disabled={!selected?.available} onClick={() => submit("cart")} className="rounded-2xl border border-emerald-700 py-4 font-black text-emerald-800 disabled:opacity-40"><ShoppingCart className="mr-2 inline" size={18}/>Tambah cart</button><button disabled={!selected?.available} onClick={() => submit("checkout")} className="rounded-2xl bg-slate-950 py-4 font-black text-white transition hover:bg-emerald-700 disabled:bg-slate-300"><ShoppingBag className="mr-2 inline" size={18}/>Checkout</button></div>
        </div>
      </div>
    </main>);
}
export function CartPage() {
    const items = useCartStore((state) => state.items);
    const update = useCartStore((state) => state.update);
    const remove = useCartStore((state) => state.remove);
    const replaceVariant = useCartStore((state) => state.replaceVariant);
    const [editingItem, setEditingItem] = useState(null);
    const summary = cartSummary(items);
    if (!items.length)
        return <main className="mx-auto max-w-4xl px-4 py-16"><Empty title="Keranjang masih kosong" action={<Link to="/products" className="rounded-xl bg-emerald-700 px-5 py-3 font-bold text-white">Belanja sekarang</Link>}/></main>;
    return (<main className="mx-auto max-w-6xl px-4 py-12 lg:px-8">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-700">Pesanan sementara</p>
      <h1 className="mt-3 text-4xl font-black">Keranjang</h1>
      <div className="mt-7 grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          {items.map((item) => (<article key={item.variant.id} className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-slate-100"><SafeImage src={productImageUrls(item.product)[0]} alt={item.product.name} className="h-full w-full object-cover" fallbackClassName="h-full w-full"/></div>
              <div className="min-w-0 flex-1">
                <h2 className="font-black">{item.product.name}</h2>
                <p className="mt-1 text-sm text-slate-500">{item.variant.name} · {item.variant.sku}</p>
                <p className="mt-1 text-xs text-slate-400">{variantDescription(item.variant)}</p>
                <p className="mt-2 font-black text-emerald-700">{currency.format(Number(item.variant.price) || 0)}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button type="button" onClick={() => update(item.variant.id, item.quantity - 1)} className="rounded-lg border border-slate-200 p-2"><Minus size={16}/></button>
                  <b className="min-w-7 text-center">{item.quantity}</b>
                  <button type="button" onClick={() => update(item.variant.id, item.quantity + 1)} className="rounded-lg border border-slate-200 p-2"><Plus size={16}/></button>
                  {requiresVariantSelection(item.product) ? <button type="button" onClick={() => setEditingItem(item)} className="ml-1 rounded-lg bg-slate-100 px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-200">Ganti variant</button> : null}
                  <button type="button" onClick={() => remove(item.variant.id)} className="ml-auto rounded-lg p-2 text-rose-600 hover:bg-rose-50"><Trash2 size={19}/></button>
                </div>
              </div>
            </article>))}
        </div>
        <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:sticky lg:top-24"><h2 className="text-xl font-black">Ringkasan</h2><div className="mt-5 flex justify-between text-sm"><span>Total item</span><b>{summary.quantity}</b></div><div className="mt-3 flex justify-between text-lg"><span>Total</span><b className="text-emerald-700">{currency.format(summary.total)}</b></div><Link to="/checkout" className="mt-6 flex items-center justify-center gap-2 rounded-xl bg-slate-950 py-3 font-black text-white transition hover:bg-emerald-700"><ShoppingBag size={18}/>Checkout</Link></aside>
      </div>

      <VariantSelectionModal open={Boolean(editingItem)} product={editingItem?.product ?? null} initialVariantId={editingItem?.variant.id} title="Ganti variant di cart" confirmLabel="Gunakan variant ini" onClose={() => setEditingItem(null)} onConfirm={(variant) => {
            if (!editingItem)
                return;
            replaceVariant(editingItem.variant.id, editingItem.product, variant, editingItem.quantity);
            setEditingItem(null);
        }}/>
    </main>);
}
export function CheckoutPage() {
    const items = useCartStore((state) => state.items);
    const clear = useCartStore((state) => state.clear);
    const navigate = useNavigate();
    const summary = cartSummary(items);
    const [form, setForm] = useState({ name: "", division: "", phone: "", address: "", notes: "", payment_method: "internal_billing" });
    const mutation = useMutation({ mutationFn: async () => resourceData(await api.post("/checkout", { ...form, items: items.map((item) => ({ product_id: item.product.id, product_variant_id: item.variant.id, quantity: item.quantity })) })), onSuccess: (order) => { clear(); navigate(`/order-success/${order.order_number}`, { state: { order, phone: order.guest_phone } }); } });
    if (!items.length)
        return <main className="mx-auto max-w-4xl px-4 py-16"><Empty title="Keranjang kosong" action={<Link to="/products" className="rounded-xl bg-emerald-700 px-5 py-3 font-black text-white">Kembali ke katalog</Link>}/></main>;
    return (<main className="mx-auto max-w-5xl px-4 py-12 lg:px-8">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-700">Guest checkout</p>
      <h1 className="mt-3 text-4xl font-black">Selesaikan pesanan</h1>
      <form onSubmit={(event) => { event.preventDefault(); mutation.mutate(); }} className="mt-7 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <input required placeholder="Nama lengkap" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className={fieldClass}/>
          <input required placeholder="Divisi / Unit Kerja" value={form.division} onChange={(event) => setForm({ ...form, division: event.target.value })} className={fieldClass}/>
          <input required placeholder="No. HP" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} className={fieldClass}/>
          <textarea required placeholder="Alamat pengiriman" rows={4} value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} className={fieldClass}/>
          <textarea placeholder="Catatan" rows={3} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} className={fieldClass}/>
          <select value={form.payment_method} onChange={(event) => setForm({ ...form, payment_method: event.target.value })} className={fieldClass}><option value="internal_billing">Internal Billing</option><option value="bank_transfer">Transfer Manual</option><option value="cod">COD</option></select>
          {mutation.isError ? <p className="rounded-xl bg-rose-50 p-3 text-rose-700">{errorMessage(mutation.error)}</p> : null}
        </div>
        <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:sticky lg:top-24"><h2 className="font-black">Ringkasan pesanan</h2>{items.map((item) => <div key={item.variant.id} className="mt-4 border-b border-slate-100 pb-4 text-sm"><div className="flex justify-between gap-3"><span className="font-bold">{item.product.name} × {item.quantity}</span><b>{currency.format((Number(item.variant.price) || 0) * item.quantity)}</b></div><p className="mt-1 text-xs text-slate-500">{item.variant.name}</p></div>)}<div className="mt-5 flex justify-between text-lg"><b>Total</b><b className="text-emerald-700">{currency.format(summary.total)}</b></div><button disabled={mutation.isPending} className="mt-6 w-full rounded-xl bg-slate-950 py-3 font-black text-white transition hover:bg-emerald-700 disabled:bg-slate-300">{mutation.isPending ? "Memproses..." : "Buat Order"}</button></aside>
      </form>
    </main>);
}
export function OrderSuccessPage() {
    const { orderNumber } = useParams();
    return <main className="mx-auto max-w-2xl px-4 py-20 text-center"><CheckCircle2 className="mx-auto text-emerald-600" size={72}/><h1 className="mt-6 text-3xl font-black">Order berhasil dibuat</h1><p className="mt-3 text-slate-500">Simpan nomor order untuk melacak atau mengubah data selama status masih pending.</p><div className="mt-6 rounded-2xl border border-emerald-200 bg-white p-5 text-2xl font-black text-emerald-700 shadow-sm">{orderNumber}</div><Link to="/track-order" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-6 py-3 font-bold text-white"><Search size={17}/>Lacak Order</Link></main>;
}
export function TrackOrderPage() {
    const [lookup, setLookup] = useState({ order_number: "", phone: "" });
    const [order, setOrder] = useState(null);
    const [edit, setEdit] = useState({ name: "", division: "", phone: "", address: "", notes: "" });
    const [cancelReason, setCancelReason] = useState("");
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const load = async () => { setError(""); setMessage(""); try {
        const result = resourceData(await api.get("/orders/track", { params: lookup }));
        setOrder(result);
        setEdit({ name: result.guest_name, division: result.guest_division, phone: result.guest_phone, address: result.guest_address, notes: result.guest_notes ?? "" });
    }
    catch (exception) {
        setOrder(null);
        setError(errorMessage(exception, "Order tidak ditemukan."));
    } };
    const save = async () => { if (!order)
        return; setError(""); try {
        const result = resourceData(await api.put(`/orders/track/${order.order_number}`, { phone_verification: lookup.phone, ...edit }));
        setOrder(result);
        setLookup({ order_number: result.order_number, phone: result.guest_phone });
        setMessage("Data order berhasil diperbarui.");
    }
    catch (exception) {
        setError(errorMessage(exception));
    } };
    const cancel = async () => { if (!order || !confirm("Batalkan order ini?"))
        return; setError(""); try {
        const result = resourceData(await api.post(`/orders/${order.order_number}/cancel`, { phone: lookup.phone, cancel_reason: cancelReason }));
        setOrder(result);
        setMessage("Order berhasil dibatalkan");
    }
    catch (exception) {
        setError(errorMessage(exception));
    } };
    return (<main className="mx-auto max-w-4xl px-4 py-12 lg:px-8">
      <div className="text-center"><span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-emerald-100 text-emerald-700"><Search size={25}/></span><p className="mt-5 text-xs font-black uppercase tracking-[0.2em] text-emerald-700">Order search</p><h1 className="mt-3 text-4xl font-black">Cari & kelola order</h1><p className="mx-auto mt-3 max-w-xl text-slate-600">Masukkan nomor order dan nomor HP yang sama seperti saat checkout.</p></div>
      <form onSubmit={(event) => { event.preventDefault(); void load(); }} className="mt-8 grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-[1fr_1fr_auto]"><input required placeholder="INV-20260722-001" value={lookup.order_number} onChange={(event) => setLookup({ ...lookup, order_number: event.target.value })} className={fieldClass}/><input required placeholder="Nomor HP saat checkout" value={lookup.phone} onChange={(event) => setLookup({ ...lookup, phone: event.target.value })} className={fieldClass}/><button className="rounded-xl bg-slate-950 px-5 py-3 font-black text-white transition hover:bg-emerald-700">Cari</button></form>
      {error ? <p className="mt-4 rounded-xl bg-rose-50 p-4 text-rose-700">{error}</p> : null}
      {message ? <p className="mt-4 rounded-xl bg-emerald-50 p-4 font-bold text-emerald-700">{message}</p> : null}
      {order ? <div className="mt-6 grid gap-6 lg:grid-cols-2"><section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex items-center justify-between"><div><p className="text-sm text-slate-500">{order.order_number}</p><h2 className="text-xl font-black">Detail Order</h2></div><StatusBadge status={order.status}/></div><p className="mt-3 text-sm text-slate-500">Dibuat {dateTime(order.created_at)}</p><div className="mt-5 space-y-3">{order.items.map((item) => <div key={item.id} className="border-b border-slate-100 pb-3"><div className="flex justify-between gap-3"><b>{item.product_name} × {item.quantity}</b><b>{currency.format(Number(item.subtotal) || 0)}</b></div><small className="text-slate-500">{item.variant_name} · {item.product_sku}</small></div>)}</div><div className="mt-5 flex justify-between text-lg"><b>Total</b><b className="text-emerald-700">{currency.format(Number(order.total_amount) || 0)}</b></div>{order.cancel_reason ? <p className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">Alasan batal: {order.cancel_reason}</p> : null}</section><section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-xl font-black">Data Buyer</h2><div className="mt-4 grid gap-3"><input disabled={order.status !== "pending"} value={edit.name} onChange={(event) => setEdit({ ...edit, name: event.target.value })} className={fieldClass}/><input disabled={order.status !== "pending"} value={edit.division} onChange={(event) => setEdit({ ...edit, division: event.target.value })} className={fieldClass}/><input disabled={order.status !== "pending"} value={edit.phone} onChange={(event) => setEdit({ ...edit, phone: event.target.value })} className={fieldClass}/><textarea disabled={order.status !== "pending"} rows={3} value={edit.address} onChange={(event) => setEdit({ ...edit, address: event.target.value })} className={fieldClass}/><textarea disabled={order.status !== "pending"} rows={3} value={edit.notes} onChange={(event) => setEdit({ ...edit, notes: event.target.value })} className={fieldClass}/>{order.status === "pending" ? <><button type="button" onClick={() => void save()} className="rounded-xl bg-emerald-700 py-3 font-black text-white">Simpan Perubahan</button><textarea placeholder="Alasan pembatalan (opsional)" value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} className={fieldClass}/><button type="button" onClick={() => void cancel()} className="rounded-xl bg-rose-600 py-3 font-black text-white">Cancel Order</button></> : <p className="text-sm text-slate-500">Data tidak dapat diubah setelah order diproses.</p>}</div></section></div> : null}
    </main>);
}
