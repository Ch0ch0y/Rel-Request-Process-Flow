import { useState, useRef, useEffect } from 'react';
import { X, ChevronDown } from 'lucide-react';

export default function BoxLocationSelector({
  value = '',
  onChange,
  options = [],
  onAddCustom,
  placeholder = 'Select or enter box location…',
  disabled = false,
  className = '',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchText, setSearchText] = useState(value);
  const [customValue, setCustomValue] = useState('');
  const containerRef = useRef(null);

  useEffect(() => { setSearchText(value); }, [value]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) setIsOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = options.filter(opt => opt.toLowerCase().includes(searchText.toLowerCase()));

  const handleSelect = (option) => { onChange(option); setSearchText(option); setIsOpen(false); };

  const handleAddCustom = () => {
    if (customValue.trim()) {
      if (onAddCustom) onAddCustom(customValue.trim());
      onChange(customValue.trim());
      setCustomValue('');
      setSearchText(customValue.trim());
      setIsOpen(false);
    }
  };

  const handleClear = (e) => { e.stopPropagation(); onChange(''); setSearchText(''); };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`relative w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 cursor-pointer transition-colors ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-slate-400 dark:hover:border-slate-500'}`}
      >
        <input
          type="text"
          value={searchText}
          onChange={(e) => { setSearchText(e.target.value); setIsOpen(true); }}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full bg-transparent text-sm outline-none placeholder-slate-400 dark:placeholder-slate-500"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 pointer-events-none">
          {value && !disabled && (
            <button onClick={handleClear} className="pointer-events-auto p-1 hover:bg-slate-100 dark:hover:bg-slate-600 rounded">
              <X className="w-3.5 h-3.5 text-slate-400" />
            </button>
          )}
          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg shadow-lg">
          {filtered.length > 0 && (
            <div className="max-h-40 overflow-y-auto border-b border-slate-200 dark:border-slate-600">
              {filtered.map((option) => (
                <button key={option} onClick={() => handleSelect(option)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-100 transition-colors">
                  {option}
                </button>
              ))}
            </div>
          )}
          <div className="p-2 border-t border-slate-200 dark:border-slate-600">
            <div className="flex gap-2">
              <input type="text" value={customValue} onChange={(e) => setCustomValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddCustom(); }}
                placeholder="Enter custom…"
                className="flex-1 px-2 py-1 text-xs border border-slate-300 dark:border-slate-500 rounded bg-white dark:bg-slate-600 text-slate-800 dark:text-slate-100 outline-none focus:border-emerald-500" />
              <button onClick={handleAddCustom} disabled={!customValue.trim()}
                className="px-2 py-1 text-xs bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded font-medium transition-colors">
                Add
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
