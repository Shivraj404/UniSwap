"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

type User = {
  name?: string;
  email?: string;
  college?: string;
  phone?: string;
  department?: string;
  year?: string;
};

type MyListing = {
  _id: string;
  title: string;
  price: number;
  category: string;
  status: "available" | "sold";
  images?: string[];
};

const menuItems = [
  { title: "Privacy & Security", description: "Manage your account security" },
];

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState<User>({});
  const [pendingOrderCount, setPendingOrderCount] = useState(0);
  const [myListings, setMyListings] = useState<MyListing[]>([]);
  const [loadingListings, setLoadingListings] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadMyListings = () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    setLoadingListings(true);
    fetch(`${API_URL}/listings/mine`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : { listings: [] }))
      .then((data) => setMyListings(data.listings || []))
      .catch(() => setMyListings([]))
      .finally(() => setLoadingListings(false));
  };

  const handleDeleteListing = async (id: string) => {
    if (!confirm("Delete this listing? This can't be undone.")) return;
    setDeletingId(id);
    try {
      const token = localStorage.getItem("token");
      await fetch(`${API_URL}/listings/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      setMyListings((prev) => prev.filter((l) => l._id !== id));
    } finally {
      setDeletingId(null);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    // Fetch the real profile from the backend rather than trusting the
    // localStorage snapshot, which may be stale or missing fields
    // (the login response doesn't include everything, e.g. department/year).
    fetch(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Session expired");
        return res.json();
      })
      .then((data) => {
        setUser(data.user);
        setForm(data.user);
        localStorage.setItem("user", JSON.stringify(data.user));
      })
      .catch(() => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        router.push("/login");
      })
      .finally(() => setLoading(false));

    fetch(`${API_URL}/orders/selling`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : { orders: [] }))
      .then((data) => {
        const pending = (data.orders || []).filter(
          (o: any) => o.status === "pending"
        );
        setPendingOrderCount(pending.length);
      })
      .catch(() => setPendingOrderCount(0));

    loadMyListings();
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/";
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/auth/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to update profile");
      setUser(data.user);
      localStorage.setItem("user", JSON.stringify(data.user));
      setEditing(false);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-paper text-ink-soft">
        Loading profile…
      </main>
    );
  }

  const displayName = user?.name || "Student";
  const email = user?.email || "";
  const college = user?.college || "Add your college";

  return (
    <main className="min-h-screen bg-paper text-ink">
      {/* NAVBAR */}
      <header className="sticky top-0 z-40 border-b border-line bg-paper/95 backdrop-blur">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/uniswap-logo.png"
              alt="UniSwap"
              width={44}
              height={44}
              className="h-10 w-10 rounded-lg object-cover"
            />
            <div className="hidden sm:block">
              <div className="font-display text-xl font-medium">UniSwap</div>
              <div className="text-[10px] font-medium uppercase tracking-widest text-ink-faint">
                Student marketplace
              </div>
            </div>
          </Link>

          <nav className="hidden items-center gap-8 md:flex">
            <Link href="/" className="text-sm font-medium text-ink-soft hover:text-brand">Marketplace</Link>
            <Link href="/request-item" className="text-sm font-medium text-ink-soft hover:text-brand">Request an Item</Link>
            <Link href="/orders" className="relative text-sm font-medium text-ink-soft hover:text-brand">
              My Orders
              {pendingOrderCount > 0 && (
                <span className="absolute -right-3 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-paper">
                  {pendingOrderCount}
                </span>
              )}
            </Link>
            <Link href="/#how-it-works" className="text-sm font-medium text-ink-soft hover:text-brand">How it works</Link>
          </nav>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold">{displayName}</p>
              <p className="text-xs text-ink-faint">Student</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand font-semibold text-paper">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <button
              onClick={handleLogout}
              className="hidden rounded-md border border-line px-4 py-2 text-sm font-medium text-ink-soft transition hover:border-danger hover:text-danger sm:block"
            >
              Log out
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-10">
        {/* BREADCRUMB */}
        <div className="mb-8 flex items-center gap-2 text-sm">
          <Link href="/" className="font-medium text-ink-faint hover:text-brand">Marketplace</Link>
          <span className="text-ink-faint">/</span>
          <span className="font-medium text-ink-soft">Profile</span>
        </div>

        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">Account</p>
          <h1 className="font-display mt-2 text-4xl font-medium">Your profile</h1>
          <p className="mt-2 text-lg text-ink-soft">Manage your UniSwap account and marketplace activity.</p>
        </div>

        {pendingOrderCount > 0 && (
          <Link
            href="/orders?tab=selling"
            className="mb-8 flex items-center justify-between rounded-lg border border-accent/30 bg-accent-soft px-6 py-4 transition hover:border-accent"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-sm font-bold text-paper">
                {pendingOrderCount}
              </span>
              <p className="font-medium text-ink">
                You have {pendingOrderCount} new order{pendingOrderCount > 1 ? "s" : ""} on your listings
              </p>
            </div>
            <span className="text-sm font-semibold text-accent">View orders →</span>
          </Link>
        )}

        {/* PROFILE CARD */}
        <section className="rounded-lg border border-line bg-surface p-8">
          {!editing ? (
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-5">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-brand-soft font-display text-3xl font-medium text-brand">
                  {displayName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="font-display text-2xl font-medium">{displayName}</h2>
                  <p className="mt-1 text-sm text-ink-soft">{email}</p>
                  <p className="mt-1 text-sm font-medium text-ink-soft">{college}</p>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-faint">
                    <span>📱 {user?.phone || "No phone number added"}</span>
                    {user?.department && <span>🎓 {user.department}</span>}
                    {user?.year && <span>Year {user.year}</span>}
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  setForm(user || {});
                  setEditing(true);
                }}
                className="w-fit rounded-md border border-line px-5 py-2.5 text-sm font-semibold text-ink-soft transition hover:border-brand hover:text-brand"
              >
                Edit profile
              </button>
            </div>
          ) : (
            <div>
              <h2 className="font-display text-xl font-medium">Edit profile</h2>

              {error && (
                <div className="mt-4 rounded-md border border-danger/30 bg-danger-soft p-3 text-sm font-medium text-danger">
                  {error}
                </div>
              )}

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <EditField
                  label="Full name"
                  value={form.name || ""}
                  onChange={(v) => setForm({ ...form, name: v })}
                />
                <EditField
                  label="Mobile number"
                  value={form.phone || ""}
                  onChange={(v) => setForm({ ...form, phone: v })}
                  placeholder="98765 43210"
                />
                <EditField
                  label="College"
                  value={form.college || ""}
                  onChange={(v) => setForm({ ...form, college: v })}
                />
                <EditField
                  label="Department"
                  value={form.department || ""}
                  onChange={(v) => setForm({ ...form, department: v })}
                  placeholder="Computer Engineering"
                />
                <EditField
                  label="Year"
                  value={form.year || ""}
                  onChange={(v) => setForm({ ...form, year: v })}
                  placeholder="3rd Year"
                />
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="rounded-md bg-brand px-6 py-2.5 text-sm font-semibold text-paper transition hover:bg-brand-dark disabled:opacity-60"
                >
                  {saving ? "Saving…" : "Save changes"}
                </button>
                <button
                  onClick={() => {
                    setEditing(false);
                    setError("");
                  }}
                  className="rounded-md border border-line px-6 py-2.5 text-sm font-semibold text-ink-soft transition hover:border-ink"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </section>

        {/* LISTINGS */}
        <section className="mt-10">
          <div className="mb-5 flex items-end justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">Marketplace</p>
              <h2 className="font-display mt-1 text-2xl font-medium">My Listings</h2>
            </div>
            <Link href="/" className="text-sm font-semibold text-brand hover:underline">
              View marketplace →
            </Link>
          </div>

          {loadingListings ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {[1, 2].map((i) => (
                <div key={i} className="h-24 animate-pulse rounded-lg border border-line bg-surface" />
              ))}
            </div>
          ) : myListings.length === 0 ? (
            <div className="rounded-lg border border-dashed border-line bg-surface px-6 py-14 text-center">
              <h3 className="font-display text-xl font-medium">No listings yet</h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-ink-soft">
                Have books, electronics, furniture or other items you no longer
                need? List them on UniSwap and help another student.
              </p>
              <Link
                href="/sell"
                className="mt-6 inline-flex rounded-md bg-brand px-6 py-3 font-semibold text-paper transition hover:bg-brand-dark"
              >
                + Sell an item
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {myListings.map((listing) => (
                <div
                  key={listing._id}
                  className="flex items-center gap-4 rounded-lg border border-line bg-surface p-4"
                >
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md border border-line bg-paper">
                    {listing.images?.[0] ? (
                      <Image src={listing.images[0]} alt={listing.title} fill className="object-contain" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xl">📦</div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-ink">{listing.title}</p>
                    <p className="text-sm text-ink-faint">₹{listing.price} · {listing.category}</p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      listing.status === "sold" ? "bg-danger-soft text-danger" : "bg-brand-soft text-brand"
                    }`}
                  >
                    {listing.status === "sold" ? "Sold" : "Available"}
                  </span>
                  <Link
                    href={`/listings/${listing._id}/edit`}
                    className="rounded-md border border-line px-3 py-2 text-xs font-semibold text-ink-soft transition hover:border-brand hover:text-brand"
                  >
                    Edit
                  </Link>
                  <button
                    onClick={() => handleDeleteListing(listing._id)}
                    disabled={deletingId === listing._id}
                    className="rounded-md border border-line px-3 py-2 text-xs font-semibold text-ink-soft transition hover:border-danger hover:text-danger disabled:opacity-50"
                  >
                    {deletingId === listing._id ? "…" : "Delete"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ACCOUNT SETTINGS */}
        <section className="mt-10">
          <div className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">Settings</p>
            <h2 className="font-display mt-1 text-2xl font-medium">Account</h2>
          </div>

          <div className="overflow-hidden rounded-lg border border-line bg-surface">
            <Link
              href="/orders?tab=selling"
              className="flex w-full items-center justify-between border-b border-line p-5 text-left transition hover:bg-paper"
            >
              <div>
                <p className="font-medium text-ink">Incoming orders</p>
                <p className="mt-1 text-sm text-ink-faint">
                  {pendingOrderCount > 0
                    ? `${pendingOrderCount} order${pendingOrderCount > 1 ? "s" : ""} waiting on you`
                    : "See orders placed on your listings"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {pendingOrderCount > 0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1.5 text-xs font-bold text-paper">
                    {pendingOrderCount}
                  </span>
                )}
                <span className="text-ink-faint">→</span>
              </div>
            </Link>
            {menuItems.map((item) => (
              <button
                key={item.title}
                className="flex w-full items-center justify-between border-b border-line p-5 text-left transition hover:bg-paper"
              >
                <div>
                  <p className="font-medium text-ink">{item.title}</p>
                  <p className="mt-1 text-sm text-ink-faint">{item.description}</p>
                </div>
                <span className="text-ink-faint">→</span>
              </button>
            ))}
            <button
              onClick={handleLogout}
              className="flex w-full items-center justify-between p-5 text-left transition hover:bg-danger-soft"
            >
              <div>
                <p className="font-medium text-danger">Log out</p>
                <p className="mt-1 text-sm text-ink-faint">Sign out of your UniSwap account</p>
              </div>
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}

function EditField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-ink-soft">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-md border border-line bg-surface px-4 py-2.5 text-sm outline-none transition focus:border-brand"
      />
    </label>
  );
}