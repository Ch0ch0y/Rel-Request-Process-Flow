import { useState, useMemo } from 'react';
import { Search, X, User, CheckCircle2 } from 'lucide-react';

const EMPLOYEES = [
  { id: '250296', name: 'Allyza Nicole Humirang',     position: 'Rel Engr' },
  { id: '145084', name: 'Arcega, Johnrey',             position: 'REL ES' },
  { id: '252523', name: 'Balcita, Jeriel',             position: 'REL ES' },
  { id: '175089', name: 'Barrera, Marissa',            position: 'REL ES' },
  { id: '105294', name: 'Bermiso, Ricky',              position: 'FA ES P3' },
  { id: '947241', name: 'Celia Corpuz',                position: 'Manager' },
  { id: '240168', name: 'Clarence Joshua Ramirez',     position: 'FA Engr' },
  { id: '105445', name: 'Conrado Hidalgo',             position: 'Sr. FA Engr' },
  { id: '175074', name: 'Cruz, Jasthine Mae',          position: 'REL ES' },
  { id: '155252', name: 'De Mesa, Rosemarie',          position: 'REL ES' },
  { id: '175198', name: 'Del Rosario, Wowie',          position: 'FA ES P3' },
  { id: '250125', name: 'Dela Rosa, Rowell',           position: 'FA ES P3' },
  { id: '175075', name: 'Delos Santos, Charito',       position: 'FA ES P3' },
  { id: '155253', name: 'Delos Santos, Chlarissa',     position: 'REL ES' },
  { id: '180966', name: 'Eduardo Visca',               position: 'REL ES' },
  { id: '982308', name: 'Esmeria, Erwin',              position: 'FA ES P3' },
  { id: '175082', name: 'Foronda, Georjan',            position: 'FA ES P3' },
  { id: '631090', name: 'Francis Niño R. Villanueva', position: 'Apprentice Engineer' },
  { id: '175081', name: 'Hatulan, Irving',             position: 'FA ES P3' },
  { id: '993404', name: 'Lea Dalanon',                 position: 'FA Operation Engr' },
  { id: '960853', name: 'Loreta Veran',                position: 'Sr. Rel Engr' },
  { id: '240427', name: 'Monterosa, Shaira',           position: 'FA ES P3' },
  { id: '175087', name: 'Ortiz, Van Joven',            position: 'FA ES P3' },
  { id: '240097', name: 'Pamela Satur',                position: 'Rel Engr' },
  { id: '981931', name: 'Reggie Quito',                position: 'REL ES' },
  { id: '155420', name: 'Reig, Leonito',               position: 'REL ES' },
  { id: '250158', name: 'Remigio, Alcen',              position: 'FA ES P3' },
  { id: '230076', name: 'Rizano, Jan Mark',            position: 'REL ES' },
  { id: '155389', name: 'Roy Tiquis',                  position: 'REL ES' },
  { id: '202544', name: 'Salazar, Jeronel',            position: 'FA ES P3' },
  { id: '145087', name: 'Santiago, Kimberly Rose',     position: 'REL ES' },
  { id: '250136', name: 'Semillano, Adrian',           position: 'REL ES' },
  { id: '240167', name: 'Shelah Mae Perez',            position: 'Rel Engr' },
  { id: '175083', name: 'Supapo, Bryane',              position: 'FA ES P3' },
  { id: '250135', name: 'Trinidad, Maricel',           position: 'REL ES' },
  { id: '175088', name: 'Velitario, Madelyn',          position: 'REL ES' },
];

export default function TechnicianSelectModal({ open, onConfirm, onCancel }) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(null);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    if (!q) return EMPLOYEES;
    return EMPLOYEES.filter(e =>
      e.id.includes(q) ||
      e.name.toLowerCase().includes(q) ||
      e.position.toLowerCase().includes(q)
    );
  }, [query]);

  if (!open) return null;

  const handleConfirm = () => {
    if (!selected) return;
    onConfirm({ employee_id: selected.id, employee_name: selected.name, employee_position: selected.position });
    setQuery('');
    setSelected(null);
  };

  const handleCancel = () => {
    setQuery('');
    setSelected(null);
    onCancel();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60" onClick={handleCancel} />
      <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <User className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h2 className="font-heading text-base font-bold text-slate-900 dark:text-white">Select Your Name</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Choose your employee record to continue</p>
            </div>
          </div>
          <button onClick={handleCancel} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              autoFocus
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search by name, ID, or position…"
              className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 outline-none transition-all"
            />
          </div>
        </div>

        {/* Employee list */}
        <div className="overflow-y-auto flex-1 py-1">
          {filtered.length === 0 ? (
            <p className="text-center py-8 text-sm text-slate-400">No employees found.</p>
          ) : (
            filtered.map(emp => {
              const isSelected = selected?.id === emp.id;
              return (
                <button
                  key={emp.id}
                  type="button"
                  onClick={() => setSelected(emp)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                    isSelected
                      ? 'bg-amber-50 dark:bg-amber-900/20 border-l-2 border-amber-500'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800 border-l-2 border-transparent'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                    isSelected ? 'bg-amber-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                  }`}>
                    {isSelected ? <CheckCircle2 className="w-4 h-4" /> : emp.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{emp.name}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{emp.id} · {emp.position}</div>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3">
          {selected ? (
            <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 min-w-0">
              <CheckCircle2 className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
              <span className="truncate font-medium">{selected.name}</span>
            </div>
          ) : (
            <span className="text-xs text-slate-400">No employee selected</span>
          )}
          <div className="flex gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={handleCancel}
              className="px-3 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!selected}
              className="px-4 py-1.5 text-sm font-medium text-white bg-amber-500 hover:bg-amber-400 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
