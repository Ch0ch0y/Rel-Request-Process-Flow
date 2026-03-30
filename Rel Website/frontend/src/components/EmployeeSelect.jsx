import { useState, useEffect, useRef } from 'react';
import api from '../api';
import { Search, X, User } from 'lucide-react';

let cachedEmployees = null;

/** Call this to bust the cache after adding/deleting employees in Settings */
export function invalidateEmployeeCache() {
  cachedEmployees = null;
}

export default function EmployeeSelect({ value, onChange, highlightRequired = false }) {
  const [employees, setEmployees] = useState(cachedEmployees || []);
  const [query, setQuery] = useState(value || '');
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!cachedEmployees) {
      api.get('/employees').then(data => {
        cachedEmployees = data.employees;
        setEmployees(data.employees);
      }).catch(() => {});
    }
  }, []);

  // Sync external value changes
  useEffect(() => {
    setQuery(value || '');
  }, [value]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const selectedEmployee = employees.find(e => e.id === value);

  const filtered = employees.filter(emp => {
    const q = query.toLowerCase();
    return emp.id.toLowerCase().includes(q) || emp.name.toLowerCase().includes(q);
  });

  function handleSelect(emp) {
    setQuery(emp.id);
    onChange(emp.id);
    setOpen(false);
    setHighlighted(-1);
  }

  function handleClear() {
    setQuery('');
    onChange('');
    setOpen(false);
    inputRef.current?.focus();
  }

  function handleInputChange(e) {
    const v = e.target.value;
    setQuery(v);
    onChange(v);
    setOpen(true);
    setHighlighted(-1);
  }

  function handleKeyDown(e) {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        setOpen(true);
        e.preventDefault();
      }
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlighted(h => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlighted(h => Math.max(h - 1, 0));
    } else if (e.key === 'Enter' && highlighted >= 0 && filtered[highlighted]) {
      e.preventDefault();
      handleSelect(filtered[highlighted]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search ID or name..."
          className={`w-full border rounded-lg pl-8 pr-8 py-2.5 bg-slate-50 focus:bg-white focus:ring-2 text-sm ${
            highlightRequired
              ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
              : 'border-slate-200 focus:border-blue-500 focus:ring-blue-200'
          }`}
        />
        {query && (
          <button type="button" onClick={handleClear}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Show selected employee name below the input */}
      {selectedEmployee && (
        <p className="mt-1 text-xs text-blue-600 font-medium flex items-center gap-1">
          <User className="w-3 h-3" />
          {selectedEmployee.name} — {selectedEmployee.position}
        </p>
      )}

      {open && filtered.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full max-h-52 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-lg">
          {filtered.map((emp, idx) => (
            <li
              key={emp.id}
              onClick={() => handleSelect(emp)}
              onMouseEnter={() => setHighlighted(idx)}
              className={`flex items-center justify-between px-3 py-2 cursor-pointer text-sm transition-colors
                ${idx === highlighted ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50 text-slate-700'}`}
            >
              <div>
                <span className="font-semibold">{emp.id}</span>
                <span className="mx-1.5 text-slate-300">|</span>
                <span>{emp.name}</span>
              </div>
              <span className="text-xs text-slate-400 ml-2 whitespace-nowrap">{emp.position}</span>
            </li>
          ))}
        </ul>
      )}

      {open && query && filtered.length === 0 && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg px-3 py-3 text-sm text-slate-400 text-center">
          No matching employee found
        </div>
      )}
    </div>
  );
}
