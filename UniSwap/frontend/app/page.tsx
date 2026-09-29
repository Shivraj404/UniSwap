"use client";

import { AnimatedTabsHover } from "@/components/animated-tabs-hover";
import { ListingModal } from "@/components/listing-modal";
import { ThemeToggle } from "@/components/theme-toggle";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

type Listing = {
  _id: string;
  title: string;
  description?: string;
  price: number;
  category: string;
  condition?: string;
  images?: string[];
  location?: string;
  status?: string;
  createdAt?: string;
  seller?: {
    name?: string;
    email?: string;
    college?: string;
    phone?: string;
  };
};

function timeAgo(dateString?: string) {
  if (!dateString) return "";
  const diffMs = Date.now() - new Date(dateString).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return mins <= 1 ? "Just now" : `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateString).toLocaleDateString();
}

function isNewListing(dateString?: string) {
  if (!dateString) return false;
  return Date.now() - new Date(dateString).getTime() < 1000 * 60 * 60 * 24 * 3; // 3 days
}

// Matches the backend Listing model's category enum exactly —
// keeping these in sync avoids filters that silently return nothing.
const categories = [
  { name: "Books", emoji: "📚" },
  { name: "Electronics", emoji: "💻" },
  { name: "Furniture", emoji: "🪑" },
  { name: "Stationery", emoji: "✏️" },
  { name: "Clothing", emoji: "👕" },
];

const categoryEmoji: Record<string, string> = {
  Books: "📚",
  Electronics: "💻",
  Furniture: "🪑",
  Stationery: "✏️",
  Clothing: "👕",
  Other: "📦",
};

export default function Home() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [allListings, setAllListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [user, setUser] = useState<any>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [pendingOrderCount, setPendingOrderCount] = useState(0);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      setIsLoggedIn(true);
      fetch(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => {
          if (!res.ok) throw new Error("Invalid token");
          return res.json();
        })
        .then((data) => setUser(data.user))
        .catch(() => {
          localStorage.removeItem("token");
          setIsLoggedIn(false);
          setUser(null);
        });

      // Badge count for orders placed on this seller's listings that
      // they haven't dealt with yet — the only way today a seller
      // finds out someone ordered is by opening My Orders, so surface
      // a count right in the nav instead of making them go check blind.
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
    }
  }, []);

  const fetchListings = async (searchValue = "", categoryValue = "") => {
    try {
      setLoading(true);
      setError("");
      const params = new URLSearchParams();
      if (searchValue.trim()) params.append("search", searchValue.trim());
      if (categoryValue) params.append("category", categoryValue);
      const url = `${API_URL}/listings${params.toString() ? `?${params.toString()}` : ""}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch listings");
      const data = await response.json();
      setListings(data.listings || []);
    } catch (err) {
      console.error("Listings error:", err);
      setError("Unable to load listings. Make sure the backend is running.");
      setListings([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchListings();
    // Separate, always-unfiltered fetch purely so category counts stay
    // accurate even while a search/category filter is active above.
    fetch(`${API_URL}/listings`)
      .then((res) => (res.ok ? res.json() : { listings: [] }))
      .then((data) => setAllListings(data.listings || []))
      .catch(() => setAllListings([]));
  }, []);

  const handleSearch = () => fetchListings(search, selectedCategory);

  const handleCategory = (category: string) => {
    const newCategory = selectedCategory === category ? "" : category;
    setSelectedCategory(newCategory);
    fetchListings(search, newCategory);
  };

  const quickSearch = (value: string) => {
    setSearch(value);
    setSelectedCategory("");
    fetchListings(value, "");
  };

  // Live counts per category from whatever is currently loaded, so the
  // Categories section reflects real inventory instead of static copy.
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const l of allListings) {
      counts[l.category] = (counts[l.category] || 0) + 1;
    }
    return counts;
  }, [allListings]);

  const goToCategory = (categoryName: string) => {
    handleCategory(categoryName);
    document.getElementById("marketplace")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <main className="min-h-screen bg-paper text-ink">
      {/* ================= NAVBAR ================= */}
      <header className="sticky top-0 z-50 border-b border-line bg-paper/95 backdrop-blur">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/uniswap-logo.png"
              alt="UniSwap"
              width={44}
              height={44}
              priority
              className="h-10 w-10 rounded-lg object-cover"
            />
            <div className="hidden sm:block leading-tight">
              <div className="font-display text-xl font-semibold tracking-tight">
                UniSwap
              </div>
              <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-faint">
                Student to student marketplace
              </div>
            </div>
          </Link>

          <nav className="hidden items-center md:flex">
            <AnimatedTabsHover />
          </nav>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            {isLoggedIn ? (
              <>
                <Link
                  href="/orders"
                  className="relative hidden rounded-md px-3 py-2 text-sm font-medium text-ink-soft transition hover:text-brand sm:block"
                >
                  My Orders
                  {pendingOrderCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-paper">
                      {pendingOrderCount}
                    </span>
                  )}
                </Link>
                <Link
                  href="/profile"
                  className="hidden items-center gap-2 sm:flex"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-sm font-semibold text-paper">
                    {user?.name?.charAt(0)?.toUpperCase() || "U"}
                  </div>
                  <span className="text-sm font-medium text-ink-soft">
                    {user?.name || "Student"}
                  </span>
                </Link>
                <button
                  onClick={() => {
                    localStorage.removeItem("token");
                    localStorage.removeItem("user");
                    setUser(null);
                    setIsLoggedIn(false);
                  }}
                  className="rounded-md border border-line px-4 py-2 text-sm font-medium text-ink-soft transition hover:border-danger hover:text-danger"
                >
                  Log out
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="hidden rounded-md px-3 py-2 text-sm font-medium text-ink-soft transition hover:text-brand sm:block"
                >
                  Log in
                </Link>
                <Link
                  href="/register"
                  className="rounded-md bg-brand px-4 py-2.5 text-sm font-semibold text-paper transition hover:bg-brand-dark"
                >
                  Join UniSwap
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {isLoggedIn && pendingOrderCount > 0 && (
        <Link
          href="/orders?tab=selling"
          className="flex items-center justify-center gap-2 bg-accent px-6 py-2.5 text-sm font-semibold text-ink transition hover:bg-accent/90"
        >
          🔔 You have {pendingOrderCount} new order{pendingOrderCount > 1 ? "s" : ""} on your listings — view them →
        </Link>
      )}

      {/* ================= HERO ================= */}
      <section className="border-b border-line">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 py-16 lg:grid-cols-[1fr_0.9fr] lg:py-20">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 border-b-2 border-accent pb-1">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">
                Built for students, by students
              </span>
            </div>

            <h1 className="font-display max-w-xl text-5xl font-medium leading-[1.05] tracking-tight sm:text-6xl">
              Buy, sell and swap
              <span className="block italic text-brand">
                within your campus.
              </span>
            </h1>

            <p className="mt-6 max-w-lg text-base leading-7 text-ink-soft">
              Find affordable books, electronics, furniture and more from
              students around you — and give what you no longer need a
              second life.
            </p>

            <div className="mt-8 flex max-w-xl flex-col gap-3 sm:flex-row">
              <div className="flex flex-1 items-center rounded-md border border-line bg-surface px-4 focus-within:border-brand">
                <span className="mr-3 text-ink-faint">⌕</span>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  placeholder="Search textbooks, laptops, furniture…"
                  className="w-full bg-transparent py-3.5 text-sm outline-none placeholder:text-ink-faint"
                />
              </div>
              <button
                onClick={handleSearch}
                className="rounded-md bg-ink px-7 py-3.5 text-sm font-semibold text-paper transition hover:bg-brand-dark"
              >
                Search
              </button>
            </div>

            <p className="mt-3 text-sm text-ink-faint">
              Try{" "}
              <button
                onClick={() => quickSearch("mathematics")}
                className="font-medium text-brand hover:underline"
              >
                mathematics books
              </button>{" "}
              or{" "}
              <button
                onClick={() => quickSearch("laptop")}
                className="font-medium text-brand hover:underline"
              >
                laptops
              </button>
            </p>

            <div className="mt-7 flex flex-wrap gap-2">
              {categories.map((category) => (
                <button
                  key={category.name}
                  onClick={() => handleCategory(category.name)}
                  className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                    selectedCategory === category.name
                      ? "border-brand bg-brand text-paper"
                      : "border-line bg-surface text-ink-soft hover:border-brand hover:text-brand"
                  }`}
                >
                  {category.emoji} {category.name}
                </button>
              ))}
            </div>
          </div>

          <div className="relative hidden lg:block">
            <div className="absolute -top-4 -left-4 z-10 rounded-md border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-ink-soft shadow-sm">
              From the campus
            </div>
            <div className="overflow-hidden rounded-lg border border-line">
              <Image
                src="/uniswap-hero.png"
                alt="UniSwap student marketplace"
                width={1200}
                height={800}
                priority
                className="h-auto w-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ================= CATEGORIES ================= */}
      <section id="categories" className="rule px-6 py-16">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">
            Browse
          </p>
          <h2 className="font-display mt-2 text-3xl font-medium">
            Shop by category
          </h2>
          <p className="mt-2 text-ink-soft">
            Jump straight to what you're after — counts reflect what's live right now.
          </p>

          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {categories.map((category) => (
              <button
                key={category.name}
                onClick={() => goToCategory(category.name)}
                className={`flex flex-col items-center gap-2 rounded-lg border p-5 text-center transition ${
                  selectedCategory === category.name
                    ? "border-brand bg-brand-soft"
                    : "border-line bg-surface duration-200 hover:-translate-y-0.5 hover:border-brand hover:shadow-sm"
                }`}
              >
                <span className="text-3xl">{category.emoji}</span>
                <span className="font-medium text-ink">{category.name}</span>
                <span className="text-xs text-ink-faint">
                  {categoryCounts[category.name] || 0} listed
                </span>
              </button>
            ))}
            <button
              onClick={() => goToCategory("Other")}
              className={`flex flex-col items-center gap-2 rounded-lg border p-5 text-center transition ${
                selectedCategory === "Other"
                  ? "border-brand bg-brand-soft"
                  : "border-line bg-surface duration-200 hover:-translate-y-0.5 hover:border-brand hover:shadow-sm"
              }`}
            >
              <span className="text-3xl">📦</span>
              <span className="font-medium text-ink">Other</span>
              <span className="text-xs text-ink-faint">
                {categoryCounts["Other"] || 0} listed
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* ================= MARKETPLACE ================= */}
      <section id="marketplace" className="px-6 py-16">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">
                Marketplace
              </p>
              <h2 className="font-display mt-2 text-3xl font-medium">
                Live listings
              </h2>
              <p className="mt-2 text-ink-soft">
                Discover items listed by students on your campus.
              </p>
            </div>

            <Link
              href={isLoggedIn ? "/sell" : "/login"}
              className="w-fit rounded-md bg-ink px-6 py-3 text-sm font-semibold text-paper transition hover:bg-brand-dark"
            >
              + Sell an item
            </Link>
          </div>

          {(search || selectedCategory) && (
            <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-line pt-6">
              <span className="text-sm text-ink-faint">Showing results for:</span>
              {search && (
                <span className="rounded-full bg-brand-soft px-3 py-1 text-sm font-medium text-brand">
                  "{search}"
                </span>
              )}
              {selectedCategory && (
                <span className="rounded-full bg-accent-soft px-3 py-1 text-sm font-medium text-accent">
                  {selectedCategory}
                </span>
              )}
              <button
                onClick={() => {
                  setSearch("");
                  setSelectedCategory("");
                  fetchListings();
                }}
                className="text-sm font-medium text-ink-faint hover:text-danger"
              >
                Clear filters
              </button>
            </div>
          )}

          {loading ? (
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4].map((item) => (
                <div key={item} className="h-72 animate-pulse rounded-lg border border-line bg-surface" />
              ))}
            </div>
          ) : error ? (
            <div className="mt-10 rounded-lg border border-danger/30 bg-danger-soft p-8 text-center">
              <h3 className="font-display text-lg font-semibold text-danger">
                Unable to load listings
              </h3>
              <p className="mt-2 text-sm text-danger">{error}</p>
              <button
                onClick={() => fetchListings(search, selectedCategory)}
                className="mt-5 rounded-md bg-danger px-5 py-2 text-sm font-semibold text-paper hover:opacity-90"
              >
                Try again
              </button>
            </div>
          ) : listings.length === 0 ? (
            <div className="mt-10 rounded-lg border border-dashed border-line bg-surface px-6 py-16 text-center">
              <h3 className="font-display text-xl font-medium">No listings found</h3>
              <p className="mt-2 text-ink-soft">Try another search or category.</p>
              <button
                onClick={() => {
                  setSearch("");
                  setSelectedCategory("");
                  fetchListings();
                }}
                className="mt-5 rounded-md bg-brand px-5 py-3 text-sm font-semibold text-paper hover:bg-brand-dark"
              >
                Show all listings
              </button>
            </div>
          ) : (
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {listings.map((listing) => (
                <div
                  key={listing._id}
                  onClick={() => setSelectedListing(listing)}
                  className="group cursor-pointer overflow-hidden rounded-lg border border-line bg-surface transition duration-200 hover:-translate-y-1 hover:border-brand hover:shadow-md"
                >
                  <div className="relative flex h-44 items-center justify-center overflow-hidden border-b border-line bg-paper">
                    {listing.images && listing.images.length > 0 && listing.images[0] ? (
                      <Image
                        src={listing.images[0]}
                        alt={listing.title}
                        fill
                        className="object-contain transition duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <span className="text-6xl">
                        {categoryEmoji[listing.category] || "📦"}
                      </span>
                    )}
                    <div className="absolute left-3 top-3 flex gap-1.5">
                      <span className="rounded-full border border-line bg-surface/90 px-2.5 py-1 text-xs font-medium text-ink-soft">
                        {listing.category}
                      </span>
                      {isNewListing(listing.createdAt) && (
                        <span className="rounded-full bg-accent px-2.5 py-1 text-xs font-semibold text-ink">
                          New
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="p-5">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="line-clamp-2 min-h-[2.6rem] font-medium text-ink">
                        {listing.title}
                      </h3>
                    </div>
                    {listing.description && (
                      <p className="mt-1.5 line-clamp-2 text-sm text-ink-faint">
                        {listing.description}
                      </p>
                    )}
                    {listing.createdAt && (
                      <p className="mt-1.5 text-xs text-ink-faint">
                        Posted {timeAgo(listing.createdAt)}
                      </p>
                    )}

                    <div className="mt-4 flex items-end justify-between border-t border-line pt-4">
                      <div>
                        <p className="text-xs text-ink-faint">Price</p>
                        <span className="font-display text-xl font-semibold">
                          ₹{listing.price}
                        </span>
                      </div>
                      <button
                        onClick={() => setSelectedListing(listing)}
                        className="rounded-md bg-brand px-3.5 py-2 text-sm font-semibold text-paper transition hover:bg-brand-dark"
                      >
                        Buy Now
                      </button>
                    </div>

                    {listing.seller && (
                      <div className="mt-4 border-t border-line pt-3">
                        <p className="text-xs text-ink-faint">Listed by</p>
                        <p className="text-sm font-medium text-ink-soft">
                          {listing.seller.name || "Student"}
                        </p>
                        {listing.seller.college && (
                          <p className="text-xs text-ink-faint">{listing.seller.college}</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ================= HOW IT WORKS ================= */}
      <section id="how-it-works" className="rule px-6 py-16">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">
            Simple &amp; local
          </p>
          <h2 className="font-display mt-2 text-3xl font-medium">
            How UniSwap works
          </h2>
          <p className="mt-3 max-w-xl text-ink-soft">
            Everything you need to buy, sell and reuse items within your
            student community.
          </p>

          <div className="mt-10 grid gap-10 md:grid-cols-3">
            {[
              { number: "01", title: "Find what you need", text: "Search for books, gadgets, furniture and other useful items around your campus." },
              { number: "02", title: "Connect with students", text: "View listings and message the student selling the item directly." },
              { number: "03", title: "Swap or buy", text: "Meet safely on campus and give a useful item a second life." },
            ].map((step) => (
              <div key={step.number} className="border-l-2 border-line pl-6">
                <span className="font-display text-3xl font-medium text-accent">
                  {step.number}
                </span>
                <h3 className="font-display mt-3 text-xl font-medium">{step.title}</h3>
                <p className="mt-2 leading-6 text-ink-soft">{step.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= TRUST & SAFETY ================= */}
      <section className="rule bg-brand-soft/40 px-6 py-16">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">
            Stay safe
          </p>
          <h2 className="font-display mt-2 text-3xl font-medium">
            Buying and selling safely on campus
          </h2>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: "📍", title: "Meet in public", text: "Choose busy, well-lit campus spots — a library entrance or hostel gate, not an empty room." },
              { icon: "🔍", title: "Check before you pay", text: "Inspect the item in person and confirm it matches the listing before handing over cash." },
              { icon: "💵", title: "Cash on delivery only", text: "UniSwap doesn't move money between accounts — pay only in person, at pickup." },
              { icon: "🚩", title: "Report anything odd", text: "If a listing or user feels off, use the report option instead of continuing the deal." },
            ].map((tip) => (
              <div key={tip.title} className="rounded-lg border border-line bg-surface p-6">
                <span className="text-2xl">{tip.icon}</span>
                <h3 className="font-display mt-3 text-lg font-medium">{tip.title}</h3>
                <p className="mt-2 text-sm leading-6 text-ink-soft">{tip.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= FAQ ================= */}
      <section className="rule px-6 py-16">
        <div className="mx-auto max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">
            Questions
          </p>
          <h2 className="font-display mt-2 text-3xl font-medium">
            Frequently asked questions
          </h2>

          <div className="mt-8 divide-y divide-line border-y border-line">
            {[
              { q: "Is UniSwap free to use?", a: "Yes — listing an item, browsing, and messaging sellers are all free." },
              { q: "How does payment work?", a: "Cash on Delivery only. You confirm an order online, then pay in person when you meet the seller to pick up the item — UniSwap never handles the money." },
              { q: "What if an item is already sold?", a: "Sold items are automatically removed from the marketplace the moment an order is placed on them, so you should never see a listing that's no longer available." },
              { q: "Can I sell to students outside my college?", a: "UniSwap is built around in-person pickup, so it works best within the same campus or city — always agree on a realistic meeting point before ordering." },
              { q: "What happens if I need to cancel an order?", a: "Sellers can cancel an order from their Orders page, which automatically relists the item so it's available to other buyers again." },
            ].map((item) => (
              <details key={item.q} className="group py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between font-medium text-ink">
                  {item.q}
                  <span className="ml-4 text-ink-faint transition group-open:rotate-45">+</span>
                </summary>
                <p className="mt-2 text-sm leading-6 text-ink-soft">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ================= FOOTER ================= */}
      <footer className="bg-ink px-6 py-10 text-paper">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-6 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <Image
              src="/uniswap-logo.png"
              alt="UniSwap"
              width={40}
              height={40}
              className="h-9 w-9 rounded-lg object-cover"
            />
            <div>
              <p className="font-display text-lg font-medium">UniSwap</p>
              <p className="text-sm text-paper/60">Student to student marketplace</p>
            </div>
          </div>
          <p className="text-sm text-paper/60">From students. For a better campus.</p>
        </div>
      </footer>

      {selectedListing && (
        <ListingModal
          listing={selectedListing}
          onClose={() => setSelectedListing(null)}
        />
      )}
    </main>
  );
}
