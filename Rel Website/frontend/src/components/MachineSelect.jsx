import { useState, useRef, useEffect } from 'react';
import api from '../api';
import { ChevronsUpDown, X } from 'lucide-react';

let cachedMachines = null;

/**
 * MachineSelect
 * Autocomplete input for Machine #.
 * - Type a machine number or description to filter suggestions.
 * - Select from the dropdown or type a custom value manually.
 * - Arrow Up/Down navigates; Enter selects; Escape closes.
 * - Shows the description badge next to the selected machine number.
 * - Data is fetched from the backend API (managed via Settings).
 */
export default function MachineSelect({ value, onChange, className = '', disabled = false }) {
  const [machines, setMachines] = useState(cachedMachines || []);
  const [query, setQuery] = useState(value || '');
  const [open, setOpen] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const containerRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    if (!cachedMachines) {
      api.getMachines().then(data => {
        cachedMachines = data.machines;
        setMachines(data.machines);
      }).catch(() => {});
    }
  }, []);

  // Sync query when value changes externally
  useEffect(() => {
    setQuery(value || '');
  }, [value]);

  // Reset highlight when list changes
  useEffect(() => {
    setHighlightIdx(-1);
  }, [query]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
        if (query !== value) onChange(query);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [query, value, onChange]);

  useEffect(() => {
    if (disabled) {
      setOpen(false);
      setHighlightIdx(-1);
    }
  }, [disabled]);

  const filtered = query.trim() === ''
    ? machines
    : machines.filter(m =>
        m.machine_no.toLowerCase().includes(query.toLowerCase()) ||
        m.description.toLowerCase().includes(query.toLowerCase())
      );

  const matched = machines.find(m => m.machine_no === value);

  const handleSelect = (machine) => {
    if (disabled) return;
    setQuery(machine.machine_no);
    onChange(machine.machine_no);
    setOpen(false);
    setHighlightIdx(-1);
  };

  const handleInputChange = (e) => {
    if (disabled) return;
    setQuery(e.target.value);
    onChange(e.target.value);
    setOpen(true);
  };

  const handleClear = () => {
    if (disabled) return;
    setQuery('');
    onChange('');
    setOpen(false);
    setHighlightIdx(-1);
  };

  const handleKeyDown = (e) => {
    if (disabled) return;
    if (!open || filtered.length === 0) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { setOpen(true); return; }
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIdx(i => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIdx(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightIdx >= 0 && highlightIdx < filtered.length) {
        handleSelect(filtered[highlightIdx]);
      } else {
        // Accept typed value as-is
        onChange(query);
        setOpen(false);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
      setHighlightIdx(-1);
    }
  };

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightIdx >= 0 && listRef.current) {
      const item = listRef.current.children[highlightIdx];
      item?.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightIdx]);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Input row */}
      <div className="relative flex items-center">
        <input
          type="text"
          value={query}
          disabled={disabled}
          onChange={handleInputChange}
          onFocus={() => !disabled && setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search or type machine #"
          className="w-full border border-slate-200 rounded-lg pl-3 pr-8 py-2.5 bg-slate-50
            focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-sm transition-all disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
        />
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled}
          onClick={() => (value ? handleClear() : setOpen(o => !o))}
          className="absolute right-2.5 text-slate-400 hover:text-slate-600 transition-colors disabled:cursor-not-allowed disabled:text-slate-300"
        >
          {value ? <X className="w-3.5 h-3.5" /> : <ChevronsUpDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Description badge when a known machine is selected */}
      {matched && !open && (
        <p className="mt-1 text-xs text-blue-600 font-medium px-1 truncate">
          {matched.description}
        </p>
      )}

      {/* Dropdown */}
      {!disabled && open && (
        <div ref={listRef} className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg
          max-h-60 overflow-y-auto text-sm ring-1 ring-slate-100">
          {filtered.length === 0 ? (
            <div className="px-4 py-3 text-slate-400 text-xs text-center">
              No machine found — value will be saved as typed.
            </div>
          ) : (
            filtered.map((m, idx) => (
              <button
                key={m.id ?? m.machine_no}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); handleSelect(m); }}
                onMouseEnter={() => setHighlightIdx(idx)}
                className={`w-full flex items-center justify-between px-4 py-2.5 transition-colors text-left
                  ${idx === highlightIdx ? 'bg-blue-100' : value === m.machine_no ? 'bg-blue-50' : 'hover:bg-blue-50'}`}
              >
                <span className="font-mono font-semibold text-slate-800 text-xs">{m.machine_no}</span>
                <span className="text-xs text-slate-500 ml-3 truncate max-w-[55%] text-right">{m.description}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

/** Call this to bust the cache after adding/deleting machines in Settings */
export function invalidateMachineCache() {
  cachedMachines = null;
}
