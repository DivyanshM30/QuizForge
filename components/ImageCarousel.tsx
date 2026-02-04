import React, { useState } from 'react';

interface ImageCarouselProps {
  images: { src: string; alt?: string }[];
  autoSlide?: boolean;
  autoSlideInterval?: number;
}

export default function ImageCarousel({ images, autoSlide = true, autoSlideInterval = 2000 }: ImageCarouselProps) {
  const [current, setCurrent] = useState(0);

  React.useEffect(() => {
    if (!autoSlide) return;
    const interval = setInterval(() => {
      setCurrent((prev) => (prev + 1) % images.length);
    }, autoSlideInterval);
    return () => clearInterval(interval);
  }, [autoSlide, autoSlideInterval, images.length]);

  const goTo = (idx: number) => setCurrent(idx);
  const prev = () => setCurrent((prev) => (prev - 1 + images.length) % images.length);
  const next = () => setCurrent((prev) => (prev + 1) % images.length);

  return (
    <div className="relative w-full max-w-5xl mx-auto">
      <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-2xl">
        {images.map((img, idx) => (
          <img
            key={img.src}
            src={img.src}
            alt={img.alt || `Slide ${idx + 1}`}
            className={`w-full h-[28rem] object-contain transition-opacity duration-700 bg-black ${idx === current ? 'opacity-100' : 'opacity-0 absolute top-0 left-0'}`}
            style={{ minHeight: 448 }}
            loading={idx === 0 ? 'eager' : 'lazy'}
          />
        ))}
      </div>
      {/* Navigation */}
      <button onClick={prev} className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-2 z-10">
        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7" /></svg>
      </button>
      <button onClick={next} className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-2 z-10">
        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" /></svg>
      </button>
      {/* Dots */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
        {images.map((_, idx) => (
          <button
            key={idx}
            onClick={() => goTo(idx)}
            className={`w-2.5 h-2.5 rounded-full ${idx === current ? 'bg-primary-400' : 'bg-white/40'} transition-colors`}
            aria-label={`Go to slide ${idx + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
