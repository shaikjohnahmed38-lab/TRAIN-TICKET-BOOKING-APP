import React, { useEffect, useId, useRef, useState } from 'react';
import { MapPin } from 'lucide-react';
import type { Language, Station } from '../types/railway';

interface StationAutocompleteProps {
  label: string;
  placeholder: string;
  stations: Station[];
  selectedCode: string;
  onSelect: (station: Station) => void;
  language: Language;
  excludeCode?: string;
}

export const StationAutocomplete: React.FC<StationAutocompleteProps> = ({
  label,
  placeholder,
  stations,
  selectedCode,
  onSelect,
  language,
  excludeCode,
}) => {
  const inputId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedStation = stations.find((s) => s.code === selectedCode) ?? null;

  const formatStationDisplay = (s: Station) =>
    `${language === 'te' ? s.nameTe : s.nameEn} (${s.code})`;

  const [query, setQuery] = useState<string>(
    selectedStation ? formatStationDisplay(selectedStation) : ''
  );
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (selectedStation) {
      setQuery(formatStationDisplay(selectedStation));
    }
  }, [selectedCode, language, stations]);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        if (selectedStation) {
          setQuery(formatStationDisplay(selectedStation));
        }
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [selectedStation, language]);

  const trimmed = query.trim().toLowerCase();
  const filtered = stations.filter((s) => {
    if (excludeCode && s.code === excludeCode) return false;
    if (!trimmed || (selectedStation && query === formatStationDisplay(selectedStation))) {
      return true;
    }
    return (
      s.code.toLowerCase().includes(trimmed) ||
      s.nameEn.toLowerCase().includes(trimmed) ||
      s.nameTe.toLowerCase().includes(trimmed) ||
      s.city.toLowerCase().includes(trimmed)
    );
  });

  return (
    <div ref={containerRef} className="relative">
      <label
        htmlFor={inputId}
        className="block text-xs font-semibold text-slate-600 mb-1.5"
      >
        {label}
      </label>
      <div className="relative">
        <MapPin className="w-4 h-4 text-blue-700 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          id={inputId}
          type="text"
          role="combobox"
          aria-expanded={isOpen}
          aria-autocomplete="list"
          value={query}
          placeholder={placeholder}
          onFocus={() => {
            setIsOpen(true);
            setQuery('');
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          className="w-full h-11 pl-10 pr-3 text-sm font-medium text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-colors"
        />
      </div>

      {isOpen && (
        <ul
          role="listbox"
          className="absolute z-50 left-0 right-0 mt-1.5 max-h-64 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-lg py-1"
        >
          {filtered.length === 0 ? (
            <li className="px-3.5 py-2.5 text-sm text-slate-500">
              No AP/Telangana stations match "{query}".
            </li>
          ) : (
            filtered.map((station) => (
              <li key={station.code}>
                <button
                  type="button"
                  onClick={() => {
                    onSelect(station);
                    setQuery(formatStationDisplay(station));
                    setIsOpen(false);
                  }}
                  className={`w-full px-3.5 py-2.5 text-left flex items-center justify-between gap-3 hover:bg-blue-50 transition-colors ${
                    station.code === selectedCode ? 'bg-blue-50/70' : ''
                  }`}
                >
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-900 truncate">
                      {language === 'te' ? station.nameTe : station.nameEn}
                    </div>
                    <div className="text-xs text-slate-500 truncate">
                      {station.city} · {station.state === 'TS' ? 'Telangana' : 'Andhra Pradesh'}
                    </div>
                  </div>
                  <span className="font-mono-tabular text-xs font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded shrink-0">
                    {station.code}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
};
