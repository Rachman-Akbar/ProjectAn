import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Boxes, Eye, LayoutDashboard, LogOut, Menu, Package, Pencil, Plus, ReceiptText, RefreshCw, Trash2, Users, X, } from "lucide-react";
import { Link, Navigate, NavLink, Outlet, useNavigate } from "react-router-dom";
import { Empty, fieldClass, Loading, StatusBadge } from "@/components/Common";
import { ProductForm } from "@/components/admin/ProductForm";
import { OrderCreateForm } from "@/components/admin/OrderCreateForm";
import { api, collectionData, errorMessage, paginatedData, resourceData } from "@/lib/api";
import { currency, dateTime } from "@/lib/format";
import { useAuthStore } from "@/stores/authStore";
export function ProtectedRoute() {
    const { user, checked, loading, load } = useAuthStore();
    useEffect(() => {
        if (!checked && !loading) {
            void load();
        }
    }, [checked, loading, load]);
    if (!checked || loading) {
        return <Loading label="Memeriksa sesi..."/>;
    }
    return user ? <Outlet /> : <Navigate to="/admin/login" replace/>;
}
export function AdminOnlyRoute() {
    const user = useAuthStore((state) => state.user);
    const role = String(user?.role ?? "").trim().toLowerCase();

    return role === "admin" ? <Outlet /> : <Navigate to="/admin" replace />;
}
export function AdminLoginPage() {
    const navigate = useNavigate();
    const { login, loading, user } = useAuthStore();
    const [email, setEmail] = useState("admin@company.local");
    const [password, setPassword] = useState("12345678");
    const [remember, setRemember] = useState(false);
    const [error, setError] = useState("");
    useEffect(() => {
        if (user) {
            navigate("/admin", { replace: true });
        }
    }, [user, navigate]);
    const submit = async (event) => {
        event.preventDefault();
        setError("");
        try {
            await login(email, password, remember);
            navigate("/admin");
        }
        catch (exception) {
            setError(errorMessage(exception, "Login gagal."));
        }
    };
    return (<main className="flex min-h-screen items-center justify-center bg-slate-950 p-4">
      <form onSubmit={submit} className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl">
        <h1 className="text-3xl font-black">Login Dashboard</h1>
        <p className="mt-2 text-slate-500">Akses admin dan seller.</p>

        {error ? (<p className="mt-4 rounded-xl bg-rose-50 p-3 text-rose-700">{error}</p>) : null}

        <div className="mt-6 grid gap-4">
          <input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} className={fieldClass}/>
          <input type="password" required value={password} onChange={(event) => setPassword(event.target.value)} className={fieldClass}/>
          <label className="text-sm">
            <input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)}/>{" "}
            Ingat sesi login
          </label>
          <button disabled={loading} className="rounded-xl bg-emerald-600 py-3 font-black text-white disabled:bg-slate-300">
            {loading ? "Masuk..." : "Login"}
          </button>
          <Link to="/" className="text-center text-sm font-bold text-emerald-700">
            Kembali ke marketplace
          </Link>
        </div>
      </form>
    </main>);
}
function AdminNavLink({ to, icon, children, onClick, }) {
    return (<NavLink to={to} end={to === "/admin"} onClick={onClick} className={({ isActive }) => `flex items-center gap-3 rounded-xl px-4 py-3 font-bold ${isActive ? "bg-emerald-600 text-white" : "text-slate-300 hover:bg-slate-800"}`}>
      {icon}
      {children}
    </NavLink>);
}
export function AdminLayout() {
    const [open, setOpen] = useState(false);
    const { user, logout } = useAuthStore();
    const navigate = useNavigate();
    const role = String(user?.role ?? "").trim().toLowerCase();
    const isAdmin = role === "admin";
    const close = () => setOpen(false);

    const signOut = async () => {
        await logout();
        navigate("/admin/login", { replace: true });
    };

    const sidebar = (
        <aside className="flex h-full w-72 flex-col bg-slate-950 p-5">
            <div className="mb-8">
                <p className="text-xl font-black text-white">KishaMarket</p>
                <p className="text-sm text-slate-400">
                    {user?.name ?? "User"} · {role || "tanpa role"}
                </p>
            </div>

            <nav className="grid gap-2">
                <AdminNavLink to="/admin" icon={<LayoutDashboard />} onClick={close}>
                    Dashboard
                </AdminNavLink>
                <AdminNavLink to="/admin/categories" icon={<Boxes />} onClick={close}>
                    Kategori
                </AdminNavLink>
                <AdminNavLink to="/admin/products" icon={<Package />} onClick={close}>
                    Produk
                </AdminNavLink>
                <AdminNavLink to="/admin/orders" icon={<ReceiptText />} onClick={close}>
                    Order
                </AdminNavLink>
                {isAdmin ? (
                    <AdminNavLink to="/admin/users" icon={<Users />} onClick={close}>
                        User
                    </AdminNavLink>
                ) : null}
            </nav>

            <button
                type="button"
                onClick={() => void signOut()}
                className="mt-auto flex items-center gap-3 rounded-xl px-4 py-3 font-bold text-rose-300 hover:bg-slate-800"
            >
                <LogOut /> Logout
            </button>
        </aside>
    );

    return (
        <div className="min-h-screen bg-slate-100 lg:flex">
            <div className="hidden lg:block">{sidebar}</div>

            {open ? (
                <div className="fixed inset-0 z-50 flex bg-black/50 lg:hidden">
                    <div>{sidebar}</div>
                    <button type="button" aria-label="Tutup menu" onClick={close} className="flex-1" />
                </div>
            ) : null}

            <main className="min-w-0 flex-1">
                <header className="flex items-center justify-between border-b bg-white px-4 py-3 lg:px-8">
                    <button type="button" onClick={() => setOpen(true)} className="lg:hidden">
                        <Menu />
                    </button>
                    <div className="ml-auto text-sm font-bold text-slate-500">{user?.email}</div>
                </header>

                <div className="p-4 lg:p-8">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
export function AdminDashboardPage() {
    const query = useQuery({
        queryKey: ["admin-dashboard"],
        queryFn: async () => resourceData(await api.get("/admin/dashboard")),
        retry: false,
    });

    if (query.isLoading) {
        return <Loading />;
    }

    if (query.isError) {
        return (
            <div>
                <h1 className="text-3xl font-black">Dashboard</h1>
                <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-5">
                    <p className="font-black text-rose-700">Dashboard gagal memuat data</p>
                    <p className="mt-2 text-sm text-rose-600">
                        {errorMessage(query.error, "Data dashboard belum dapat dimuat.")}
                    </p>
                    <button
                        type="button"
                        onClick={() => void query.refetch()}
                        className="mt-4 rounded-xl bg-rose-600 px-4 py-2 font-black text-white"
                    >
                        Coba Lagi
                    </button>
                </div>
            </div>
        );
    }

    const cards = [
        ["Produk", query.data?.products],
        ["Kategori", query.data?.categories],
        ["User", query.data?.users],
        ["Produk Terbit", query.data?.published_products],
        ["Order Pending", query.data?.pending_orders],
        ["Total Order", query.data?.orders],
        ["Pendapatan", currency.format(Number(query.data?.revenue) || 0)],
    ];

    return (
        <div>
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h1 className="text-3xl font-black">Dashboard</h1>
                <button
                    type="button"
                    onClick={() => void query.refetch()}
                    className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-3 font-bold"
                >
                    <RefreshCw size={18} /> Refresh
                </button>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {cards.map(([label, value]) => (
                    <div key={String(label)} className="rounded-2xl border bg-white p-5">
                        <p className="text-sm font-bold text-slate-500">{label}</p>
                        <p className="mt-2 text-3xl font-black">
                            {typeof value === "string"
                                ? value
                                : Number(value ?? 0).toLocaleString("id-ID")}
                        </p>
                    </div>
                ))}
            </div>

            <div className="mt-6 rounded-2xl border bg-white p-5">
                <h2 className="text-xl font-black">Order Terbaru</h2>
                {query.data?.latest_orders?.length ? (
                    <div className="mt-4 overflow-x-auto">
                        <table className="w-full min-w-[700px]">
                            <thead>
                                <tr className="border-b text-left">
                                    <th className="pb-3">Nomor</th>
                                    <th className="pb-3">Buyer</th>
                                    <th className="pb-3">Status</th>
                                    <th className="pb-3">Total</th>
                                    <th className="pb-3">Tanggal</th>
                                </tr>
                            </thead>
                            <tbody>
                                {query.data.latest_orders.map((order) => (
                                    <tr key={order.id} className="border-b last:border-b-0">
                                        <td className="py-3 font-bold">{order.order_number}</td>
                                        <td className="py-3">{order.guest_name ?? "-"}</td>
                                        <td className="py-3"><StatusBadge status={order.status} /></td>
                                        <td className="py-3">{currency.format(Number(order.total_amount) || 0)}</td>
                                        <td className="py-3">{dateTime(order.created_at)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p className="mt-4 text-sm text-slate-500">Belum ada order.</p>
                )}
            </div>
        </div>
    );
}
function Pagination({ meta, onPage, }) {
    if (!meta || meta.last_page <= 1) {
        return null;
    }
    return (<div className="mt-5 flex items-center justify-between gap-3 rounded-xl border bg-white p-3">
      <button disabled={meta.current_page <= 1} onClick={() => onPage(meta.current_page - 1)} className="rounded-lg border px-4 py-2 font-bold disabled:opacity-40">
        Sebelumnya
      </button>
      <span className="text-sm font-bold text-slate-500">
        Halaman {meta.current_page} dari {meta.last_page} · {meta.total} data
      </span>
      <button disabled={meta.current_page >= meta.last_page} onClick={() => onPage(meta.current_page + 1)} className="rounded-lg border px-4 py-2 font-bold disabled:opacity-40">
        Berikutnya
      </button>
    </div>);
}
const blankCategory = () => ({
    name: "",
    slug: "",
    description: "",
    sort_order: "0",
    is_active: true,
});
export function AdminCategoriesPage() {
    const client = useQueryClient();
    const [editing, setEditing] = useState(null);
    const [open, setOpen] = useState(false);
    const [form, setForm] = useState(blankCategory());
    const [image, setImage] = useState(null);
    const [error, setError] = useState("");
    const query = useQuery({
        queryKey: ["admin-categories"],
        queryFn: async () => collectionData(await api.get("/admin/categories")),
    });
    const start = (category) => {
        setEditing(category ?? null);
        setForm(category
            ? {
                name: category.name,
                slug: category.slug,
                description: category.description ?? "",
                sort_order: String(category.sort_order),
                is_active: category.is_active,
            }
            : blankCategory());
        setImage(null);
        setError("");
        setOpen(true);
    };
    const save = async (event) => {
        event.preventDefault();
        setError("");
        const body = new FormData();
        body.append("name", form.name);
        body.append("slug", form.slug);
        body.append("description", form.description);
        body.append("sort_order", form.sort_order);
        body.append("is_active", form.is_active ? "1" : "0");
        if (image) {
            body.append("image", image);
        }
        try {
            if (editing) {
                await api.post(`/admin/categories/${editing.id}`, body);
            }
            else {
                await api.post("/admin/categories", body);
            }
            await client.invalidateQueries({ queryKey: ["admin-categories"] });
            await client.invalidateQueries({ queryKey: ["categories"] });
            await client.invalidateQueries({ queryKey: ["products"] });
            setOpen(false);
        }
        catch (exception) {
            setError(errorMessage(exception));
        }
    };
    const remove = async (category) => {
        if (!confirm(`Hapus kategori ${category.name}?`)) {
            return;
        }
        try {
            await api.delete(`/admin/categories/${category.id}`);
            await client.invalidateQueries({ queryKey: ["admin-categories"] });
            await client.invalidateQueries({ queryKey: ["categories"] });
            await client.invalidateQueries({ queryKey: ["products"] });
        }
        catch (exception) {
            alert(errorMessage(exception, "Kategori gagal dihapus."));
        }
    };
    return (<div>
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-black">Kategori</h1>
        <button onClick={() => start()} className="rounded-xl bg-emerald-600 px-4 py-3 font-black text-white">
          Tambah
        </button>
      </div>

      {query.isLoading ? (<Loading />) : (<div className="mt-6 overflow-x-auto rounded-2xl border bg-white">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="bg-slate-50 text-left">
                <th className="p-4">Nama</th>
                <th>Slug</th>
                <th>Urutan</th>
                <th>Produk</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {query.data?.map((category) => (<tr key={category.id} className="border-t">
                  <td className="p-4 font-bold">{category.name}</td>
                  <td>{category.slug}</td>
                  <td>{category.sort_order ?? 0}</td>
                  <td>{category.products_count ?? 0}</td>
                  <td>{category.is_active ? "Aktif" : "Nonaktif"}</td>
                  <td className="text-right">
                    <button onClick={() => start(category)} className="p-2">
                      <Pencil />
                    </button>
                    <button onClick={() => void remove(category)} className="p-2 text-rose-600">
                      <Trash2 />
                    </button>
                  </td>
                </tr>))}
            </tbody>
          </table>
        </div>)}

      {open ? (<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form onSubmit={save} className="w-full max-w-xl rounded-2xl bg-white p-6">
            <div className="flex justify-between">
              <h2 className="text-xl font-black">{editing ? "Edit" : "Tambah"} Kategori</h2>
              <button type="button" onClick={() => setOpen(false)}>
                <X />
              </button>
            </div>

            {error ? (<p className="mt-3 rounded-xl bg-rose-50 p-3 text-rose-700">{error}</p>) : null}

            <div className="mt-5 grid gap-4">
              <input required placeholder="Nama" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className={fieldClass}/>
              <input placeholder="Slug otomatis jika kosong" value={form.slug} onChange={(event) => setForm({ ...form, slug: event.target.value })} className={fieldClass}/>
              <textarea placeholder="Deskripsi" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className={fieldClass}/>
              <input type="number" min="0" value={form.sort_order} onChange={(event) => setForm({ ...form, sort_order: event.target.value })} className={fieldClass}/>
              <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => setImage(event.target.files?.[0] ?? null)}/>
              <label>
                <input type="checkbox" checked={form.is_active} onChange={(event) => setForm({ ...form, is_active: event.target.checked })}/>{" "}
                Aktif
              </label>
              <button className="rounded-xl bg-emerald-600 py-3 font-black text-white">
                Simpan Kategori
              </button>
            </div>
          </form>
        </div>) : null}
    </div>);
}
export function AdminProductsPage() {
    const client = useQueryClient();
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [editing, setEditing] = useState(null);
    const [formOpen, setFormOpen] = useState(false);
    const categories = useQuery({
        queryKey: ["admin-categories"],
        queryFn: async () => collectionData(await api.get("/admin/categories")),
    });
    const products = useQuery({
        queryKey: ["admin-products", search, page],
        queryFn: async () => paginatedData(await api.get("/admin/products", {
            params: { search, page, per_page: 20 },
        })),
    });
    const openCreate = () => {
        setEditing(null);
        setFormOpen(true);
    };
    const openEdit = (product) => {
        setEditing(product);
        setFormOpen(true);
    };
    const remove = async (product) => {
        if (!confirm(`Hapus produk ${product.name}?`)) {
            return;
        }
        try {
            await api.delete(`/admin/products/${product.id}`);
            await client.invalidateQueries({ queryKey: ["admin-products"] });
            await client.invalidateQueries({ queryKey: ["products"] });
            await client.invalidateQueries({ queryKey: ["featured"] });
            await client.invalidateQueries({ queryKey: ["product"] });
        }
        catch (exception) {
            alert(errorMessage(exception, "Produk gagal dihapus."));
        }
    };
    return (<div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-black">Produk</h1>
        <button onClick={openCreate} className="rounded-xl bg-emerald-600 px-4 py-3 font-black text-white">
          Tambah Produk
        </button>
      </div>

      <div className="mt-5 rounded-2xl border bg-white p-4">
        <input value={search} onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
        }} placeholder="Cari nama, kategori, brand, atau SKU" className={`${fieldClass} w-full`}/>
      </div>

      {products.isLoading ? (<Loading />) : products.data?.data.length ? (<div className="mt-6 overflow-x-auto rounded-2xl border bg-white">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="bg-slate-50 text-left">
                <th className="p-4">Produk</th>
                <th>Kategori</th>
                <th>SKU</th>
                <th>Harga</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {products.data.data.map((product) => (<tr key={product.id} className="border-t">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 overflow-hidden rounded-lg bg-slate-100">
                        {product.thumbnail ? (<img src={product.thumbnail} alt={product.name} className="h-full w-full object-cover"/>) : null}
                      </div>
                      <div>
                        <b>{product.name}</b>
                        <small className="block text-slate-400">{product.slug}</small>
                      </div>
                    </div>
                  </td>
                  <td>{product.category?.name ?? "-"}</td>
                  <td>
                    {product.sku ?? "-"}
                    <small className="block text-slate-400">
                      {product.track_stock ? `Stok ${product.stock ?? 0}` : "Stok tidak dipantau"}
                    </small>
                  </td>
                  <td>{currency.format(product.price ?? 0)}</td>
                  <td>
                    {product.status} · {product.is_active ? "aktif" : "nonaktif"}
                  </td>
                  <td className="text-right">
                    <button onClick={() => openEdit(product)} className="p-2">
                      <Pencil />
                    </button>
                    <button onClick={() => void remove(product)} className="p-2 text-rose-600">
                      <Trash2 />
                    </button>
                  </td>
                </tr>))}
            </tbody>
          </table>
        </div>) : (<div className="mt-6">
          <Empty title="Produk tidak ditemukan"/>
        </div>)}

      <Pagination meta={products.data?.meta} onPage={setPage}/>

      {formOpen ? (<ProductForm product={editing} categories={categories.data ?? []} onClose={() => setFormOpen(false)} onSaved={async () => {
                await client.invalidateQueries({ queryKey: ["admin-products"] });
                await client.invalidateQueries({ queryKey: ["products"] });
                await client.invalidateQueries({ queryKey: ["featured"] });
                await client.invalidateQueries({ queryKey: ["product"] });
            }}/>) : null}
    </div>);
}
const blankUser = () => ({
    name: "",
    email: "",
    password: "",
    role: "seller",
    phone: "",
    department: "",
    is_active: true,
});
export function AdminUsersPage() {
    const client = useQueryClient();
    const [search, setSearch] = useState("");
    const [role, setRole] = useState("");
    const [page, setPage] = useState(1);
    const [editing, setEditing] = useState(null);
    const [open, setOpen] = useState(false);
    const [form, setForm] = useState(blankUser());
    const [error, setError] = useState("");
    const query = useQuery({
        queryKey: ["admin-users", search, role, page],
        queryFn: async () => paginatedData(await api.get("/admin/users", {
            params: { search, role, page, per_page: 20 },
        })),
        retry: false,
    });
    const start = (user) => {
        setEditing(user ?? null);
        setForm(user
            ? {
                name: user.name,
                email: user.email,
                password: "",
                role: user.role,
                phone: user.phone ?? "",
                department: user.department ?? "",
                is_active: user.is_active,
            }
            : blankUser());
        setError("");
        setOpen(true);
    };
    const save = async (event) => {
        event.preventDefault();
        setError("");
        try {
            const payload = {
                ...form,
                password: form.password || null,
                phone: form.phone || null,
                department: form.department || null,
            };
            if (editing) {
                await api.put(`/admin/users/${editing.id}`, payload);
            }
            else {
                await api.post("/admin/users", payload);
            }
            await client.invalidateQueries({ queryKey: ["admin-users"] });
            setOpen(false);
        }
        catch (exception) {
            setError(errorMessage(exception));
        }
    };
    const remove = async (user) => {
        if (!confirm(`Hapus user ${user.name}?`)) {
            return;
        }
        try {
            await api.delete(`/admin/users/${user.id}`);
            await client.invalidateQueries({ queryKey: ["admin-users"] });
        }
        catch (exception) {
            alert(errorMessage(exception, "User gagal dihapus."));
        }
    };
    return (<div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-black">Manajemen User</h1>
        <button onClick={() => start()} className="rounded-xl bg-emerald-600 px-4 py-3 font-black text-white">
          Tambah User
        </button>
      </div>

      <div className="mt-5 grid gap-3 rounded-2xl border bg-white p-4 md:grid-cols-2">
        <input value={search} onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
        }} placeholder="Cari nama, email, HP, atau departemen" className={fieldClass}/>
        <select value={role} onChange={(event) => {
            setRole(event.target.value);
            setPage(1);
        }} className={fieldClass}>
          <option value="">Semua role</option>
          <option value="admin">Admin</option>
          <option value="seller">Seller</option>
        </select>
      </div>

      {query.isLoading ? (<Loading />) : query.isError ? (
        <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-5">
          <p className="font-black text-rose-700">Data user gagal dimuat</p>
          <p className="mt-2 text-sm text-rose-600">
            {errorMessage(query.error, "Data user belum dapat dimuat.")}
          </p>
          <button type="button" onClick={() => void query.refetch()} className="mt-4 rounded-xl bg-rose-600 px-4 py-2 font-black text-white">
            Coba Lagi
          </button>
        </div>
      ) : (<div className="mt-6 overflow-x-auto rounded-2xl border bg-white">
          <table className="w-full min-w-[800px]">
            <thead>
              <tr className="bg-slate-50 text-left">
                <th className="p-4">Nama</th>
                <th>Email</th>
                <th>Role</th>
                <th>Departemen</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {query.data?.data.map((user) => (<tr key={user.id} className="border-t">
                  <td className="p-4 font-bold">
                    {user.name}
                    <small className="block text-slate-400">{user.phone ?? "-"}</small>
                  </td>
                  <td>{user.email}</td>
                  <td>{user.role}</td>
                  <td>{user.department ?? "-"}</td>
                  <td>{user.is_active ? "Aktif" : "Nonaktif"}</td>
                  <td className="text-right">
                    <button onClick={() => start(user)} className="p-2">
                      <Pencil />
                    </button>
                    <button onClick={() => void remove(user)} className="p-2 text-rose-600">
                      <Trash2 />
                    </button>
                  </td>
                </tr>))}
            </tbody>
          </table>
        </div>)}

      <Pagination meta={query.data?.meta} onPage={setPage}/>

      {open ? (<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form onSubmit={save} className="w-full max-w-xl rounded-2xl bg-white p-6">
            <div className="flex justify-between">
              <h2 className="text-xl font-black">{editing ? "Edit" : "Tambah"} User</h2>
              <button type="button" onClick={() => setOpen(false)}>
                <X />
              </button>
            </div>

            {error ? (<p className="mt-3 rounded-xl bg-rose-50 p-3 text-rose-700">{error}</p>) : null}

            <div className="mt-5 grid gap-4">
              <input required placeholder="Nama" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className={fieldClass}/>
              <input required type="email" placeholder="Email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} className={fieldClass}/>
              <input required={!editing} type="password" minLength={8} placeholder={editing ? "Kosongkan jika tidak diubah" : "Password minimal 8 karakter"} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} className={fieldClass}/>
              <select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })} className={fieldClass}>
                <option value="admin">Admin</option>
                <option value="seller">Seller</option>
              </select>
              <input placeholder="No. HP" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} className={fieldClass}/>
              <input placeholder="Department" value={form.department} onChange={(event) => setForm({ ...form, department: event.target.value })} className={fieldClass}/>
              <label>
                <input type="checkbox" checked={form.is_active} onChange={(event) => setForm({ ...form, is_active: event.target.checked })}/>{" "}
                Aktif
              </label>
              <button className="rounded-xl bg-emerald-600 py-3 font-black text-white">
                Simpan User
              </button>
            </div>
          </form>
        </div>) : null}
    </div>);
}
export function AdminOrdersPage() {
    const client = useQueryClient();
    const [filters, setFilters] = useState({ search: "", status: "", date_from: "", date_to: "" });
    const [page, setPage] = useState(1);
    const [selected, setSelected] = useState(null);
    const [detailError, setDetailError] = useState("");
    const [createOpen, setCreateOpen] = useState(false);
    const query = useQuery({
        queryKey: ["admin-orders", filters, page],
        queryFn: async () => paginatedData(await api.get("/admin/orders", { params: { ...filters, page, per_page: 20 } })),
    });

    const openDetail = async (order) => {
        setDetailError("");
        try {
            setSelected(resourceData(await api.get(`/admin/orders/${order.id}`)));
        } catch (exception) {
            alert(errorMessage(exception, "Detail order gagal dimuat."));
        }
    };

    const updateSelected = (patch) => setSelected((current) => current ? { ...current, ...patch } : current);

    const saveSelected = async () => {
        if (!selected) {
            return;
        }

        setDetailError("");
        try {
            const result = resourceData(await api.put(`/admin/orders/${selected.id}`, {
                customer_type: selected.customer_type,
                guest_email: selected.guest_email,
                guest_name: selected.guest_name,
                guest_phone: selected.guest_phone,
                guest_address: selected.guest_address,
                guest_nik: selected.customer_type === "business" ? selected.guest_nik : null,
                guest_npwp: selected.customer_type === "business" ? selected.guest_npwp : null,
                guest_province: selected.customer_type === "business" ? selected.guest_province : null,
                guest_city: selected.customer_type === "business" ? selected.guest_city : null,
                guest_company_name: selected.customer_type === "business" ? selected.guest_company_name : null,
                guest_postal_code: selected.customer_type === "business" ? selected.guest_postal_code : null,
                guest_country: selected.customer_type === "business" ? selected.guest_country : null,
                guest_notes: selected.guest_notes,
                status: selected.status,
                payment_status: selected.payment_status,
                payment_method: selected.payment_method,
                cancel_reason: selected.cancel_reason,
                admin_notes: selected.admin_notes,
            }));
            setSelected(result);
            await client.invalidateQueries({ queryKey: ["admin-orders"] });
            await client.invalidateQueries({ queryKey: ["admin-dashboard"] });
        } catch (exception) {
            setDetailError(errorMessage(exception));
        }
    };

    const remove = async (order) => {
        if (!confirm(`Hapus order ${order.order_number}?`)) {
            return;
        }

        try {
            await api.delete(`/admin/orders/${order.id}`);
            await client.invalidateQueries({ queryKey: ["admin-orders"] });
            await client.invalidateQueries({ queryKey: ["admin-dashboard"] });
            if (selected?.id === order.id) {
                setSelected(null);
            }
        } catch (exception) {
            alert(errorMessage(exception, "Order gagal dihapus."));
        }
    };

    return (
        <div>
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h1 className="text-3xl font-black">Order</h1>
                <div className="flex gap-2">
                    <button type="button" onClick={() => void query.refetch()} className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-3 font-bold"><RefreshCw size={18} /> Refresh</button>
                    <button type="button" onClick={() => setCreateOpen(true)} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 font-black text-white"><Plus size={18} /> Tambah Order</button>
                </div>
            </div>

            <div className="mt-5 grid gap-3 rounded-2xl border bg-white p-4 md:grid-cols-4">
                <input value={filters.search} onChange={(event) => { setFilters((current) => ({ ...current, search: event.target.value })); setPage(1); }} placeholder="Nomor order, email, nama, perusahaan" className={fieldClass} />
                <select value={filters.status} onChange={(event) => { setFilters((current) => ({ ...current, status: event.target.value })); setPage(1); }} className={fieldClass}>
                    <option value="">Semua status</option>
                    {['pending', 'confirmed', 'processing', 'completed', 'cancelled'].map((status) => <option key={status} value={status}>{status}</option>)}
                </select>
                <input type="date" value={filters.date_from} onChange={(event) => { setFilters((current) => ({ ...current, date_from: event.target.value })); setPage(1); }} className={fieldClass} />
                <input type="date" value={filters.date_to} onChange={(event) => { setFilters((current) => ({ ...current, date_to: event.target.value })); setPage(1); }} className={fieldClass} />
            </div>

            {query.isLoading ? <Loading /> : query.data?.data.length ? (
                <div className="mt-6 overflow-x-auto rounded-2xl border bg-white">
                    <table className="w-full min-w-[960px]">
                        <thead><tr className="bg-slate-50 text-left"><th className="p-4">Order</th><th>Buyer</th><th>Total</th><th>Status</th><th>Pembayaran</th><th>Tanggal</th><th /></tr></thead>
                        <tbody>
                            {query.data.data.map((order) => (
                                <tr key={order.id} className="border-t">
                                    <td className="p-4 font-black">{order.order_number}</td>
                                    <td><b>{order.guest_name}</b><small className="block text-slate-500">{order.guest_email}</small>{order.guest_company_name ? <small className="block text-slate-500">{order.guest_company_name}</small> : null}</td>
                                    <td className="font-black text-emerald-700">{currency.format(order.total_amount)}</td>
                                    <td><StatusBadge status={order.status} /></td>
                                    <td>{order.payment_status} · {order.payment_method}</td>
                                    <td>{dateTime(order.created_at)}</td>
                                    <td className="text-right"><button type="button" onClick={() => void openDetail(order)} className="p-2"><Eye /></button><button type="button" onClick={() => void remove(order)} className="p-2 text-rose-600"><Trash2 /></button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : <div className="mt-6"><Empty title="Order tidak ditemukan" /></div>}

            <Pagination meta={query.data?.meta} onPage={setPage} />

            {createOpen ? <OrderCreateForm onClose={() => setCreateOpen(false)} onSaved={async () => { await client.invalidateQueries({ queryKey: ["admin-orders"] }); await client.invalidateQueries({ queryKey: ["admin-dashboard"] }); }} /> : null}

            {selected ? (
                <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 p-4">
                    <div className="mx-auto my-4 w-full max-w-4xl rounded-2xl bg-white p-6">
                        <div className="flex justify-between gap-3">
                            <div><p className="text-sm text-slate-500">{selected.order_number}</p><h2 className="text-2xl font-black">Detail Order</h2></div>
                            <button type="button" onClick={() => setSelected(null)}><X /></button>
                        </div>

                        {detailError ? <p className="mt-3 rounded-xl bg-rose-50 p-3 text-rose-700">{detailError}</p> : null}

                        <div className="mt-5 grid gap-5 lg:grid-cols-2">
                            <section className="grid gap-3">
                                <select value={selected.customer_type ?? "individual"} onChange={(event) => updateSelected({ customer_type: event.target.value })} className={fieldClass}><option value="individual">Perorangan</option><option value="business">Badan Usaha</option></select>
                                {selected.customer_type === "business" ? <>
                                    <input required placeholder="Perusahaan" value={selected.guest_company_name ?? ""} onChange={(event) => updateSelected({ guest_company_name: event.target.value })} className={fieldClass} />
                                    <input required inputMode="numeric" maxLength={16} pattern="[0-9]{16}" placeholder="NIK" value={selected.guest_nik ?? ""} onChange={(event) => updateSelected({ guest_nik: event.target.value })} className={fieldClass} />
                                    <input required placeholder="NPWP" value={selected.guest_npwp ?? ""} onChange={(event) => updateSelected({ guest_npwp: event.target.value })} className={fieldClass} />
                                    <input required placeholder="Negara" value={selected.guest_country ?? ""} onChange={(event) => updateSelected({ guest_country: event.target.value })} className={fieldClass} />
                                    <input required placeholder="Provinsi" value={selected.guest_province ?? ""} onChange={(event) => updateSelected({ guest_province: event.target.value })} className={fieldClass} />
                                    <input required placeholder="Kota" value={selected.guest_city ?? ""} onChange={(event) => updateSelected({ guest_city: event.target.value })} className={fieldClass} />
                                    <input required placeholder="Kode Pos" value={selected.guest_postal_code ?? ""} onChange={(event) => updateSelected({ guest_postal_code: event.target.value })} className={fieldClass} />
                                </> : null}
                                <input type="email" value={selected.guest_email} onChange={(event) => updateSelected({ guest_email: event.target.value })} className={fieldClass} />
                                <input value={selected.guest_name} onChange={(event) => updateSelected({ guest_name: event.target.value })} className={fieldClass} />
                                <input value={selected.guest_phone} onChange={(event) => updateSelected({ guest_phone: event.target.value })} className={fieldClass} />
                                <textarea rows={3} value={selected.guest_address} onChange={(event) => updateSelected({ guest_address: event.target.value })} className={fieldClass} />
                                <textarea rows={3} value={selected.guest_notes ?? ""} onChange={(event) => updateSelected({ guest_notes: event.target.value })} placeholder="Catatan buyer" className={fieldClass} />
                                <textarea rows={3} value={selected.admin_notes ?? ""} onChange={(event) => updateSelected({ admin_notes: event.target.value })} placeholder="Catatan internal admin" className={fieldClass} />
                                <select value={selected.status} onChange={(event) => updateSelected({ status: event.target.value })} className={fieldClass}>{['pending', 'confirmed', 'processing', 'completed', 'cancelled'].map((status) => <option key={status} value={status}>{status}</option>)}</select>
                                <select value={selected.payment_status} onChange={(event) => updateSelected({ payment_status: event.target.value })} className={fieldClass}><option value="unpaid">Unpaid</option><option value="paid">Paid</option></select>
                                <select value={selected.payment_method} onChange={(event) => updateSelected({ payment_method: event.target.value })} className={fieldClass}><option value="internal_billing">Internal Billing</option><option value="bank_transfer">Transfer Manual</option><option value="cod">COD</option></select>
                                {selected.status === "cancelled" ? <textarea rows={2} value={selected.cancel_reason ?? ""} onChange={(event) => updateSelected({ cancel_reason: event.target.value })} placeholder="Alasan pembatalan" className={fieldClass} /> : null}
                                <button type="button" onClick={() => void saveSelected()} className="rounded-xl bg-emerald-600 py-3 font-black text-white">Simpan Perubahan</button>
                            </section>

                            <section>
                                <h3 className="font-black">Item Order</h3>
                                <div className="mt-3 space-y-3">
                                    {(selected.items ?? []).map((item) => <div key={item.id} className="rounded-xl border p-4"><div className="flex justify-between gap-3"><b>{item.product_name} × {item.quantity}</b><b>{currency.format(item.subtotal)}</b></div>{item.product_sku ? <p className="mt-1 text-sm text-slate-500">{item.product_sku}</p> : null}</div>)}
                                </div>
                                <div className="mt-5 flex justify-between text-lg"><b>Total</b><b className="text-emerald-700">{currency.format(selected.total_amount)}</b></div>
                                <h3 className="mt-6 font-black">Riwayat Status</h3>
                                <div className="mt-3 space-y-3">
                                    {selected.status_histories?.map((history) => <div key={history.id} className="border-l-4 border-emerald-500 pl-3 text-sm"><b>{history.from_status ?? "baru"} → {history.to_status}</b><p className="text-slate-500">{history.notes ?? "-"} · {history.changed_by?.name ?? "Guest/System"} · {dateTime(history.created_at)}</p></div>)}
                                </div>
                            </section>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
