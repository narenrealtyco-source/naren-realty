"use client";

import { useCallback, useEffect, useRef, useState, type UIEvent } from "react";
import Image from "next/image";

export default function PropertyPhotoGallery({ title, photos, videoUrl }: { title: string; photos: string[]; videoUrl?: string }) {
  const railRef = useRef<HTMLDivElement>(null);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [failedPhotos, setFailedPhotos] = useState<Set<number>>(() => new Set());
  const actualPhotos = photos.filter((photo) => typeof photo === "string" && photo.trim());
  const sidePhotos = actualPhotos
    .map((photo, index) => ({ photo, index }))
    .filter(({ index }) => index !== photoIndex)
    .slice(0, 4);
  const sideGrid = sidePhotos.length === 1
    ? "grid-cols-1 grid-rows-1"
    : sidePhotos.length === 2 ? "grid-cols-1 grid-rows-2" : "grid-cols-2 grid-rows-2";

  function selectPhoto(index: number) {
    setPhotoIndex(index);
    const rail = railRef.current;
    if (rail && rail.clientWidth > 0) rail.scrollTo({ left: index * rail.clientWidth, behavior: "smooth" });
  }

  function openPhoto(index = photoIndex) {
    selectPhoto(index);
    setLightboxOpen(true);
  }

  const movePhoto = useCallback((direction: -1 | 1) => {
    setPhotoIndex((current) => {
      const next = (current + direction + actualPhotos.length) % actualPhotos.length;
      const rail = railRef.current;
      if (rail && rail.clientWidth > 0) rail.scrollTo({ left: next * rail.clientWidth, behavior: "smooth" });
      return next;
    });
  }, [actualPhotos.length]);

  function onMobileScroll(event: UIEvent<HTMLDivElement>) {
    const rail = event.currentTarget;
    if (!rail.clientWidth) return;
    const nextIndex = Math.min(actualPhotos.length - 1, Math.round(rail.scrollLeft / rail.clientWidth));
    setPhotoIndex((current) => current === nextIndex ? current : nextIndex);
  }

  function markPhotoFailed(index: number) {
    setFailedPhotos((current) => new Set(current).add(index));
  }

  useEffect(() => {
    if (!lightboxOpen) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setLightboxOpen(false);
      if (event.key === "ArrowLeft" && actualPhotos.length > 1) movePhoto(-1);
      if (event.key === "ArrowRight" && actualPhotos.length > 1) movePhoto(1);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [lightboxOpen, movePhoto, actualPhotos.length]);

  function photoImage(index: number, className: string) {
    return failedPhotos.has(index)
      ? <span className="flex h-full min-h-32 w-full items-center justify-center bg-slate-100 text-sm font-medium text-slate-500">Photo unavailable</span>
      : <Image
        src={actualPhotos[index]}
        alt={`${title}, photo ${index + 1}`}
        width={1200}
        height={900}
        unoptimized
        decoding="async"
        loading={index === 0 ? "eager" : "lazy"}
        onError={() => markPhotoFailed(index)}
        className={className}
      />;
  }

  if (!actualPhotos.length) {
    return <div className="flex aspect-[4/3] items-center justify-center rounded-2xl bg-slate-100 px-5 text-center text-sm font-medium text-slate-500">No property photos available</div>;
  }

  return (
    <>
      {videoUrl && <section aria-label="Property video" className="mb-3 overflow-hidden rounded-2xl border border-slate-200 bg-black shadow-sm"><video src={videoUrl} controls playsInline preload="metadata" aria-label={`${title} property video`} className="max-h-[32rem] w-full bg-black" /></section>}
      <section aria-label="Property photo gallery" className="relative overflow-hidden rounded-2xl bg-[#10243A] shadow-sm">
        <div ref={railRef} onScroll={onMobileScroll} className="flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain lg:hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {actualPhotos.map((_, index) => (
            <button key={`${index}-${actualPhotos[index]}`} type="button" onClick={() => openPhoto(index)} aria-label={`Open photo ${index + 1} of ${actualPhotos.length}`} className="relative min-w-full snap-center">
              {photoImage(index, "aspect-[4/3] w-full object-cover")}
            </button>
          ))}
        </div>

        <div className={`hidden gap-3 lg:grid ${actualPhotos.length > 1 ? "lg:grid-cols-[minmax(0,1.7fr)_minmax(18rem,1fr)]" : "lg:grid-cols-1"}`}>
          <button type="button" onClick={() => openPhoto(photoIndex)} aria-label={`Open photo ${photoIndex + 1} of ${actualPhotos.length}`} className="min-w-0 overflow-hidden">
            {photoImage(photoIndex, "aspect-[4/3] w-full object-cover transition-transform duration-300 hover:scale-[1.02] lg:aspect-auto lg:h-[31rem]")}
          </button>
          {sidePhotos.length > 0 && (
            <div className={`grid min-w-0 gap-3 ${sideGrid}`}>
              {sidePhotos.map(({ photo, index }) => (
                <button key={`${index}-${photo}`} type="button" onClick={() => openPhoto(index)} aria-label={`Open photo ${index + 1} of ${actualPhotos.length}`} className="min-h-0 min-w-0 overflow-hidden">
                  {photoImage(index, "h-full min-h-32 w-full object-cover transition-transform duration-300 hover:scale-[1.03]")}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 bg-gradient-to-t from-slate-950/60 to-transparent p-3 pt-10 sm:p-5 lg:p-6">
          <p aria-live="polite" className="text-sm font-semibold text-white">{photoIndex + 1} / {actualPhotos.length} photos</p>
          <button type="button" onClick={() => openPhoto()} className="pointer-events-auto rounded-lg border border-white/40 bg-slate-950/70 px-4 py-2.5 text-sm font-bold text-white backdrop-blur transition hover:bg-slate-950">
            View All Photos
          </button>
        </div>

        {actualPhotos.length > 1 && (
          <div className="absolute right-3 top-3 flex gap-2 lg:hidden">
            <button type="button" onClick={() => movePhoto(-1)} aria-label="Previous photo" className="flex size-10 items-center justify-center rounded-full bg-slate-950/65 text-xl text-white backdrop-blur">‹</button>
            <button type="button" onClick={() => movePhoto(1)} aria-label="Next photo" className="flex size-10 items-center justify-center rounded-full bg-slate-950/65 text-xl text-white backdrop-blur">›</button>
          </div>
        )}
      </section>

      {actualPhotos.length > 1 && (
        <div className="mt-3 flex justify-center gap-2 lg:hidden" aria-label="Choose property photo">
          {actualPhotos.map((_, index) => (
            <button key={index} type="button" onClick={() => selectPhoto(index)} aria-label={`Show photo ${index + 1}`} aria-current={photoIndex === index} className={`h-2 rounded-full transition-all ${photoIndex === index ? "w-6 bg-[#10243A]" : "w-2 bg-slate-300"}`} />
          ))}
        </div>
      )}

      {lightboxOpen && (
        <div role="dialog" aria-modal="true" aria-label={`${title} photos`} className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-slate-950/95 p-3 text-white sm:p-6" onMouseDown={(event) => { if (event.target === event.currentTarget) setLightboxOpen(false); }}>
          <div className="flex w-full max-w-7xl items-center justify-between gap-4 py-2">
            <p className="min-w-0 truncate text-sm font-semibold sm:text-base">{title}</p>
            <div className="flex shrink-0 items-center gap-3">
              <span className="text-sm tabular-nums">{photoIndex + 1} / {actualPhotos.length}</span>
              <button type="button" onClick={() => setLightboxOpen(false)} aria-label="Close photo viewer" className="flex size-11 items-center justify-center rounded-full bg-white/10 text-2xl hover:bg-white/20">&times;</button>
            </div>
          </div>
          <div className="flex min-h-0 w-full max-w-7xl flex-1 items-center justify-center gap-2 sm:gap-5">
            {actualPhotos.length > 1 && <button type="button" onClick={() => movePhoto(-1)} aria-label="Previous photo" className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white/10 text-2xl hover:bg-white/20 sm:size-12">‹</button>}
            <div className="flex h-full min-h-0 min-w-0 flex-1 items-center justify-center">
              {photoImage(photoIndex, "max-h-full max-w-full object-contain")}
            </div>
            {actualPhotos.length > 1 && <button type="button" onClick={() => movePhoto(1)} aria-label="Next photo" className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white/10 text-2xl hover:bg-white/20 sm:size-12">›</button>}
          </div>
          {actualPhotos.length > 1 && (
            <div className="mt-3 flex max-w-full gap-2 overflow-x-auto py-1">
              {actualPhotos.map((_, index) => (
                <button key={index} type="button" onClick={() => selectPhoto(index)} aria-label={`View photo ${index + 1}`} aria-current={photoIndex === index} className={`h-16 w-20 shrink-0 overflow-hidden rounded-md border-2 ${photoIndex === index ? "border-amber-400" : "border-transparent"}`}>
                  {photoImage(index, "h-full w-full object-cover")}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
