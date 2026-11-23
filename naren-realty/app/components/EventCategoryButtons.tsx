"use client";

import { EVENT_CATEGORIES } from "./eventCategories";

type Props = {
  selected: string;
  onSelect: (category: string) => void;
  className?: string;
};

export default function EventCategoryButtons({ selected, onSelect, className = "" }: Props) {
  return (
    <nav aria-label="Event categories" className={"flex flex-wrap gap-2 " + className}>
      {EVENT_CATEGORIES.map((item) => {
        const active = selected === item.key;
        return (
          <button
            key={item.key}
            type="button"
            aria-pressed={active}
            onClick={() => onSelect(active ? "" : item.key)}
            className={"shrink-0 rounded-full border px-3.5 py-2 text-xs font-bold transition sm:px-4 sm:py-2.5 sm:text-sm " + (active
              ? "border-[#A71930] bg-[#A71930] text-white shadow-sm"
              : "border-[#A71930] bg-white text-[#A71930] hover:bg-[#A71930] hover:text-white")}
          >
            {item.title}
          </button>
        );
      })}
    </nav>
  );
}
