"use client";

import { useMemo, useState } from "react";
import { PUNE_LOCALITIES } from "../lib/properties";

type Props = {
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
};

export default function MultiLocalitySelect({ value, onChange, placeholder = "Search and add service locations" }: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const suggestions = useMemo(() => {
    const term = query.trim().toLowerCase();
    return PUNE_LOCALITIES
      .filter((item) => !value.some((selected) => selected.toLowerCase() === item.toLowerCase()))
      .filter((item) => !term || item.toLowerCase().includes(term))
      .slice(0, 8);
  }, [query, value]);

  function add(location: string) {
    const clean = location.trim().replace(/\s+/g, " ");
    if (!clean || value.some((item) => item.toLowerCase() === clean.toLowerCase())) return;
    onChange([...value, clean]);
    setQuery("");
    setOpen(false);
  }

  return (
    <div className="sm:col-span-2">
      <label className="mb-1.5 block text-sm font-semibold text-slate-700">Service areas <span className="text-rose-600">*</span></label>
      <div className="rounded-lg border border-slate-300 p-2.5 focus-within:border-teal-600 focus-within:ring-2 focus-within:ring-teal-100">
        <div className="mb-2 flex flex-wrap gap-2">
          {value.map((location) => (
            <span key={location} className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-800">
              {location}
              <button type="button" aria-label={`Remove ${location}`} onClick={() => onChange(value.filter((item) => item !== location))} className="text-teal-700 hover:text-rose-700">×</button>
            </span>
          ))}
          {value.length === 0 && <span className="px-1 py-1 text-xs text-slate-500">Select one or more areas</span>}
        </div>
        <input
          value={query}
          onChange={(event) => { setQuery(event.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              if (suggestions[0] && query.trim()) add(suggestions[0]);
              else if (query.trim()) add(query);
            }
            if (event.key === "Escape") setOpen(false);
          }}
          placeholder={placeholder}
          autoComplete="off"
          className="w-full border-0 bg-transparent p-1 text-sm outline-none placeholder:text-slate-400"
        />
      </div>
      {open && (suggestions.length > 0 || query.trim()) && (
        <div className="relative z-20">
          <div className="absolute left-0 right-0 top-1 max-h-52 overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
            {suggestions.map((location) => (
              <button key={location} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => add(location)} className="block w-full px-3 py-2 text-left text-sm hover:bg-teal-50">{location}</button>
            ))}
            {query.trim() && !PUNE_LOCALITIES.some((item) => item.toLowerCase() === query.trim().toLowerCase()) && (
              <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => add(query)} className="block w-full border-t border-slate-100 px-3 py-2 text-left text-sm font-semibold text-teal-700 hover:bg-teal-50">Add "{query.trim()}"</button>
            )}
          </div>
        </div>
      )}
      <p className="mt-1.5 text-xs text-slate-500">Search Pune localities or add another city/area. You can select multiple locations.</p>
    </div>
  );
}
