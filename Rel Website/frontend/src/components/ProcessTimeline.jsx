import { useState } from 'react';
import { CheckCircle2, Circle, Clock, AlertTriangle, PauseCircle, ChevronRight, Pencil, Trash2, Check, X, Lock } from 'lucide-react';

const statusConfig = {
  completed: { icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-100', border: 'border-emerald-500', label: 'Done',       rowBg: 'bg-emerald-50',  rowBorder: 'border-emerald-200', textColor: 'text-emerald-700' },
  in_progress: { icon: Clock,         color: 'text-blue-500',    bg: 'bg-blue-100',    border: 'border-blue-500',    label: 'In Queue',   rowBg: 'bg-blue-50',     rowBorder: 'border-blue-200',    textColor: 'text-blue-700'    },
  hold:        { icon: PauseCircle,   color: 'text-orange-500',  bg: 'bg-orange-100',  border: 'border-orange-500',  label: 'Hold',       rowBg: 'bg-orange-50',   rowBorder: 'border-orange-200',  textColor: 'text-orange-700'  },
  pending:     { icon: Circle,        color: 'text-slate-400',   bg: 'bg-slate-100',   border: 'border-slate-300',   label: 'Pending',    rowBg: 'bg-slate-50',    rowBorder: 'border-slate-200',   textColor: 'text-slate-600'   },
  failed:      { icon: AlertTriangle, color: 'text-red-500',     bg: 'bg-red-100',     border: 'border-red-500',     label: 'Failed',     rowBg: 'bg-red-50',      rowBorder: 'border-red-200',     textColor: 'text-red-700'     },
};

export default function ProcessTimeline({ steps, currentStep, onStepClick, selectedStepNumber, compact = false, canManage = false, onRenameStep, onDeleteStep, isStepLocked, onSetSATType }) {
  const [editingIdx, setEditingIdx] = useState(null);
  const [editValue, setEditValue] = useState('');

  const startRename = (e, step) => {
    e.stopPropagation();
    setEditingIdx(step.step_number);
    setEditValue(step.step_name);
  };

  const commitRename = (e, step) => {
    e.stopPropagation();
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== step.step_name) onRenameStep?.(step, trimmed);
    setEditingIdx(null);
  };

  const cancelRename = (e) => {
    e.stopPropagation();
    setEditingIdx(null);
  };

  const handleDelete = (e, step) => {
    e.stopPropagation();
    onDeleteStep?.(step);
  };

  if (!steps || steps.length === 0) return null;

  if (compact) {
    const completed = steps.filter(s => s.status === 'completed').length;
    const pct = Math.round((completed / steps.length) * 100);
    return (
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs text-slate-500">
          <span>{completed}/{steps.length} steps</span>
          <span>{pct}%</span>
        </div>
        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-600 rounded-full transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      {steps.map((step, i) => {
        const config = statusConfig[step.status] || statusConfig.pending;
        const Icon = config.icon;
        const isActive = step.step_number === (selectedStepNumber || currentStep);
        const locked = isStepLocked ? isStepLocked(step) : false;

        return (
          <div
            key={step.step_number}
            className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg transition-all group border
              ${isActive
                ? `${config.rowBg} ${config.rowBorder} shadow-sm ring-1 ring-inset ${config.rowBorder}`
                : `${config.rowBg} ${config.rowBorder} hover:brightness-95`}
              ${step.status === 'in_progress' ? 'animate-status-pulse' : ''}
              ${locked ? 'opacity-60' : ''}
            `}
          >
            {/* Status icon + connector */}
            <div className="flex-shrink-0 relative cursor-pointer" onClick={() => onStepClick?.(step)}>
              {locked ? (
                <Lock className="w-5 h-5 text-slate-400" />
              ) : (
                <Icon className={`w-5 h-5 ${config.color}`} />
              )}
              {i < steps.length - 1 && (
                <div className={`absolute top-7 left-2.5 w-0.5 h-3 ${
                  step.status === 'completed' ? 'bg-emerald-300' : 'bg-slate-200'
                }`} />
              )}
            </div>

            {/* Name / rename input */}
            {editingIdx === step.step_number ? (
              <div className="flex-1 flex items-center gap-1" onClick={e => e.stopPropagation()}>
                <input
                  autoFocus
                  value={editValue}
                  onChange={e => setEditValue(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') commitRename(e, step); if (e.key === 'Escape') cancelRename(e); }}
                  className="flex-1 border border-blue-300 rounded px-2 py-0.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
                <button onClick={e => commitRename(e, step)} className="p-0.5 rounded hover:bg-emerald-100 text-emerald-600">
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button onClick={cancelRename} className="p-0.5 rounded hover:bg-slate-100 text-slate-400">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onStepClick?.(step)}>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className={`text-sm font-medium ${isActive ? `${config.textColor} font-semibold` : config.textColor}`}>
                    {step.step_number}. {step.step_name}
                  </p>
                  {step.step_name?.toUpperCase() === 'SAT' && (() => {
                    const satType = step.custom_fields?.sat_type;
                    const styles = {
                      Prior: 'bg-amber-100 text-amber-700 border-amber-300 hover:bg-amber-200',
                      Post:  'bg-blue-100  text-blue-700  border-blue-300  hover:bg-blue-200',
                    };
                    const next = satType === 'Prior' ? 'Post' : satType === 'Post' ? null : 'Prior';
                    return (
                      <button
                        type="button"
                        onClick={e => { e.stopPropagation(); if (canManage) onSetSATType?.(step, next); }}
                        title={canManage ? (satType ? `Click to set ${next ?? 'clear'}` : 'Click to set Prior/Post') : undefined}
                        className={`inline-flex items-center px-1.5 py-0.5 rounded-full border text-[10px] font-semibold leading-none transition-colors ${
                          satType
                            ? styles[satType]
                            : canManage
                              ? 'bg-slate-100 text-slate-400 border-slate-200 hover:bg-slate-200 border-dashed'
                              : 'hidden'
                        }`}>
                        {satType ?? '＋'}
                      </button>
                    );
                  })()}
                </div>
                {step.completed_at && (
                  <p className="text-xs text-slate-400 mt-0.5">
                    {new Date(step.completed_at).toLocaleDateString()}
                  </p>
                )}
              </div>
            )}

            {/* Edit / Delete actions (only when canManage and not renaming) */}
            {canManage && editingIdx !== step.step_number && (
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                <button onClick={e => startRename(e, step)}
                  className="p-1 rounded hover:bg-blue-100 text-slate-300 hover:text-blue-600 transition-colors"
                  title="Rename step">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button onClick={e => handleDelete(e, step)}
                  className="p-1 rounded hover:bg-red-100 text-slate-300 hover:text-red-500 transition-colors"
                  title="Delete step">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Nav chevron (when not managing) */}
            {!canManage && editingIdx !== step.step_number && (
              <ChevronRight className="w-4 h-4 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
            )}
          </div>
        );
      })}
    </div>
  );
}
