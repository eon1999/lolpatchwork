import type { Metadata } from "next";
import GalleryFeed from "@/components/GalleryFeed";

export const metadata: Metadata = { title: "Gallery" };

export default function GalleryPage() {
  return (
    <div className="py-8">
      <h1 className="font-display text-3xl tracking-wide text-gold-bright">THE GALLERY</h1>
      <p className="mb-6 mt-1 text-xs text-muted">
        everything humanity has assembled here so far
      </p>
      <GalleryFeed />
    </div>
  );
}
