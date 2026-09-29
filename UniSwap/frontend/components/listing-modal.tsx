"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

export type ListingDetail = {
  _id: string;
  title: string;
  description?: string;
  price: number;
  category: string;
  condition?: string;
  images?: string[];
  location?: string;
  status?: string;
  seller?: {
    name?: string;
    email?: string;
    college?: string;
    phone?: string;
  };
};

const categoryEmoji: Record<string, string> = {
  Books: "📚",
  Electronics: "💻",
  Furniture: "🪑",
  Stationery: "✏️",
  Clothing: "👕",
  Other: "📦",
};

export function ListingModal({
  listing,
  onClose,
}: {
  listing: ListingDetail;
  onClose: () => void;
}) {
  const images = listing.images?.filter(Boolean) || [];
  const [activeImage, setActiveImage] = useState(0);

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="grid max-h-[90vh] w-full max-w-3xl grid-cols-1 overflow-y-auto rounded-lg border border-line bg-surface sm:grid-cols-2"
      >
        {/* IMAGE SIDE */}
        <div className="relative flex flex-col bg-paper">
          <div className="relative flex h-64 items-center justify-center overflow-hidden sm:h-full">
            {images.length > 0 ? (
              <Image
                src={images[activeImage]}
                alt={listing.title}
                fill
                className="object-contain"
              />
            ) : (
              <span className="text-7xl">
                {categoryEmoji[listing.category] || "📦"}
              </span>
            )}
            <button
              onClick={onClose}
              className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-surface/90 text-ink shadow-sm sm:hidden"
              aria-label="Close"
            >
              ×
            </button>
          </div>
          {images.length > 1 && (
            <div className="flex gap-2 border-t border-line p-3">
              {images.map((img, i) => (
                <button
                  key={img}
                  onClick={() => setActiveImage(i)}
                  className={`relative h-12 w-12 overflow-hidden rounded-md border ${
                    i === activeImage ? "border-brand" : "border-line"
                  }`}
                >
                  <Image src={img} alt="" fill className="object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* DETAILS SIDE */}
        <div className="relative p-6 sm:p-8">
          <button
            onClick={onClose}
            className="absolute right-5 top-5 hidden h-8 w-8 items-center justify-center rounded-full border border-line text-ink-faint transition hover:border-danger hover:text-danger sm:flex"
            aria-label="Close"
          >
            ×
          </button>

          <span className="inline-block rounded-full border border-line px-2.5 py-1 text-xs font-medium text-ink-soft">
            {listing.category}
            {listing.condition ? ` · ${listing.condition}` : ""}
          </span>

          <h2 className="font-display mt-3 text-2xl font-medium leading-tight">
            {listing.title}
          </h2>

          <p className="font-display mt-3 text-3xl font-semibold text-brand">
            ₹{listing.price}
          </p>

          {listing.description && (
            <p className="mt-4 text-sm leading-6 text-ink-soft">
              {listing.description}
            </p>
          )}

          {listing.location && (
            <p className="mt-4 flex items-center gap-2 text-sm text-ink-soft">
              <span aria-hidden>📍</span> {listing.location}
            </p>
          )}

          <div className="mt-6 border-t border-line pt-5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-faint">
              Seller
            </p>
            <p className="mt-2 font-medium text-ink">
              {listing.seller?.name || "Student"}
            </p>
            {listing.seller?.college && (
              <p className="text-sm text-ink-faint">{listing.seller.college}</p>
            )}
          </div>

          <div className="mt-6 flex flex-col gap-3">
            <Link
              href={`/checkout/${listing._id}`}
              className="rounded-md bg-brand py-3 text-center text-sm font-semibold text-paper transition hover:bg-brand-dark"
            >
              Buy Now · Cash on Delivery
            </Link>
            <div className="flex flex-col gap-3 sm:flex-row">
              {listing.seller?.phone ? (
                <a
                  href={`tel:${listing.seller.phone}`}
                  className="flex-1 rounded-md border border-line py-2.5 text-center text-sm font-semibold text-ink-soft transition hover:border-brand hover:text-brand"
                >
                  Call {listing.seller.phone}
                </a>
              ) : (
                <span className="flex-1 rounded-md border border-line py-2.5 text-center text-sm font-medium text-ink-faint">
                  No phone number on file
                </span>
              )}
              {listing.seller?.email && (
                <a
                  href={`mailto:${listing.seller.email}?subject=${encodeURIComponent(
                    "UniSwap: " + listing.title
                  )}`}
                  className="flex-1 rounded-md border border-line py-2.5 text-center text-sm font-semibold text-ink-soft transition hover:border-brand hover:text-brand"
                >
                  Email seller
                </a>
              )}
            </div>
          </div>

          <p className="mt-4 text-xs text-ink-faint">
            UniSwap only supports Cash on Delivery — pay in person when the
            item is handed over, or contact the seller first to arrange details.
          </p>
        </div>
      </div>
    </div>
  );
}
