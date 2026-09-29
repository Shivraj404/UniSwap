"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

// Must match backend models/Listing.js enums exactly
const CATEGORIES = ["Books", "Electronics", "Furniture", "Stationery", "Clothing", "Other"];
const CONDITIONS = ["New", "Like New", "Good", "Fair", "Used"];
const MAX_IMAGES = 5;

type PreviewImage = { file: File; url: string };

type Listing = {
  _id: string;
  title: string;
  description: string;
  price: number;
  category: string;
  condition: string;
  location: string;
  images: string[];
  seller: { _id: string; name?: string };
};

export default function EditListingPage() {
  const router = useRouter();
  const params = useParams();
  const listingId = params.id as string;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [checking, setChecking] = useState(true);
  const [notAllowed, setNotAllowed] = useState(false);
  const [listing, setListing] = useState<Listing | null>(null);
  const [newImages, setNewImages] = useState<PreviewImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    async function load() {
      try {
        const [meRes, listingRes] = await Promise.all([
          fetch(`${API_URL}/auth/me`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API_URL}/listings/${listingId}`),
        ]);
        if (!meRes.ok || !listingRes.ok) throw new Error("Failed to load");

        const me = await meRes.json();
        const data = await listingRes.json();

        // Client-side check purely for UX (fast redirect, no flash of a
        // form the user can't use) — the backend re-checks ownership on
        // every PUT/DELETE regardless, since that's the real boundary.
        if (String(data.listing.seller?._id) !== String(me.user._id)) {
          setNotAllowed(true);
        } else {
          setListing(data.listing);
        }
      } catch {
        setNotAllowed(true);
      } finally {
        setChecking(false);
      }
    }
    load();
  }, [listingId, router]);

  useEffect(() => {
    return () => newImages.forEach((img) => URL.revokeObjectURL(img.url));
  }, [newImages]);

  const handleFilesSelected = (fileList: FileList | null) => {
    if (!fileList) return;
    const incoming = Array.from(fileList).slice(0, MAX_IMAGES - newImages.length);
    const withPreviews = incoming.map((file) => ({ file, url: URL.createObjectURL(file) }));
    setNewImages((prev) => [...prev, ...withPreviews].slice(0, MAX_IMAGES));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeNewImage = (index: number) => {
    setNewImages((prev) => {
      URL.revokeObjectURL(prev[index].url);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const form = new FormData(e.currentTarget);
    const payload = new FormData();
    payload.append("title", String(form.get("title") || ""));
    payload.append("description", String(form.get("description") || ""));
    payload.append("price", String(form.get("price") || ""));
    payload.append("category", String(form.get("category") || ""));
    payload.append("condition", String(form.get("condition") || ""));
    payload.append("location", String(form.get("location") || ""));
    // Only send images if the seller picked new ones — the backend keeps
    // the existing photos untouched when no new files are attached.
    newImages.forEach((img) => payload.append("images", img.file));

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/listings/${listingId}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
        body: payload,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to update listing");
      setSuccess(true);
      setTimeout(() => router.push("/profile"), 1200);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  if (checking) return null;

  if (notAllowed) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-paper px-6 text-center text-ink">
        <div>
          <h1 className="font-display text-2xl font-medium">You can't edit this listing</h1>
          <p className="mt-2 text-ink-soft">This listing either doesn't exist or belongs to another student.</p>
          <Link href="/profile" className="mt-5 inline-block font-semibold text-brand hover:underline">
            ← Back to your profile
          </Link>
        </div>
      </main>
    );
  }

  if (!listing) return null;

  return (
    <main className="min-h-screen bg-paper px-6 py-12 text-ink">
      <div className="mx-auto max-w-2xl">
        <Link href="/profile" className="text-sm font-medium text-ink-faint hover:text-brand">
          ← Back to profile
        </Link>

        <h1 className="font-display mt-4 text-3xl font-medium">Edit listing</h1>
        <p className="mt-2 text-ink-soft">Update the details below — only you can see or change this.</p>

        {success && (
          <div className="mt-6 rounded-md border border-brand/30 bg-brand-soft p-4 text-sm font-medium text-brand">
            Listing updated — redirecting to your profile…
          </div>
        )}
        {error && (
          <div className="mt-6 rounded-md border border-danger/30 bg-danger-soft p-4 text-sm font-medium text-danger">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <Field label="Current photos">
            {listing.images && listing.images.length > 0 ? (
              <div className="grid grid-cols-5 gap-3">
                {listing.images.map((src) => (
                  <div key={src} className="relative aspect-square overflow-hidden rounded-md border border-line bg-surface">
                    <Image src={src} alt="" fill className="object-contain" />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-ink-faint">No photos on this listing yet.</p>
            )}
          </Field>

          <Field label={`Replace photos (optional, up to ${MAX_IMAGES})`}>
            <div className="grid grid-cols-5 gap-3">
              {newImages.map((img, i) => (
                <div key={img.url} className="relative aspect-square overflow-hidden rounded-md border border-line">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.url} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeNewImage(i)}
                    className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-ink/80 text-xs text-paper"
                    aria-label="Remove image"
                  >
                    ×
                  </button>
                </div>
              ))}
              {newImages.length < MAX_IMAGES && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex aspect-square flex-col items-center justify-center gap-1 rounded-md border border-dashed border-line text-ink-faint transition hover:border-brand hover:text-brand"
                >
                  <span className="text-xl leading-none">+</span>
                  <span className="text-[11px]">Add</span>
                </button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => handleFilesSelected(e.target.files)}
            />
            <p className="!mt-2 text-xs text-ink-faint">
              {newImages.length > 0
                ? "These will replace all current photos when you save."
                : "Leave empty to keep your current photos unchanged."}
            </p>
          </Field>

          <Field label="Title">
            <input name="title" required defaultValue={listing.title} className={inputClass} />
          </Field>

          <Field label="Description">
            <textarea name="description" required rows={4} defaultValue={listing.description} className={inputClass} />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Category">
              <select name="category" required defaultValue={listing.category} className={inputClass}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Condition">
              <select name="condition" required defaultValue={listing.condition} className={inputClass}>
                {CONDITIONS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Price (₹)">
              <input name="price" type="number" min="0" required defaultValue={listing.price} className={inputClass} />
            </Field>
            <Field label="Pickup location">
              <input name="location" required defaultValue={listing.location} className={inputClass} />
            </Field>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-brand py-3.5 font-semibold text-paper transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Saving…" : "Save changes"}
          </button>
        </form>
      </div>
    </main>
  );
}

const inputClass =
  "w-full rounded-md border border-line bg-surface px-4 py-3 text-sm outline-none transition focus:border-brand";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-ink-soft">{label}</span>
      {children}
    </label>
  );
}
