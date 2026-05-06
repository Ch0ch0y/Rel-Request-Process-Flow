import { useMemo, useRef, useState } from 'react';
import { Eye, FileSpreadsheet, Loader2, Trash2, Upload, X } from 'lucide-react';

export const SAT_DATA_FILE_KEY = 'sat_data_file';

const SHEET_PREVIEW_ROW_LIMIT = 200;

function formatFileSize(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return 'Excel attachment';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function extractFilename(url) {
  if (typeof url !== 'string' || !url) return 'SAT data workbook';
  const cleaned = url.split('?')[0].split('#')[0];
  const parts = cleaned.split('/');
  return parts[parts.length - 1] || 'SAT data workbook';
}

function normalizeFileData(fileData) {
  if (!fileData) return null;
  if (typeof fileData === 'string') {
    return {
      url: fileData,
      name: extractFilename(fileData),
      size: null,
    };
  }
  if (typeof fileData !== 'object' || typeof fileData.url !== 'string') return null;
  return {
    ...fileData,
    name: fileData.name || fileData.original_filename || fileData.filename || extractFilename(fileData.url),
    size: Number.isFinite(fileData.size) ? fileData.size : null,
  };
}

function getCellValue(row, index) {
  const value = row[index];
  if (value === null || value === undefined) return '';
  return String(value);
}

function buildSheetPreview(XLSX, workbook) {
  return workbook.SheetNames.map((sheetName) => {
    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: '',
      blankrows: false,
      raw: false,
    });
    const maxColumns = rows.reduce((count, row) => Math.max(count, Array.isArray(row) ? row.length : 0), 0);
    return {
      name: sheetName,
      rows: rows.slice(0, SHEET_PREVIEW_ROW_LIMIT),
      rowCount: rows.length,
      maxColumns,
      truncated: rows.length > SHEET_PREVIEW_ROW_LIMIT,
    };
  });
}

const initialPreviewState = {
  open: false,
  loading: false,
  error: '',
  sheets: [],
  activeSheet: 0,
};

export default function SatDataFileControl({ fileData, canUpdate, uploading, onUpload, onRemove }) {
  const fileInputRef = useRef(null);
  const normalizedFile = useMemo(() => normalizeFileData(fileData), [fileData]);
  const [previewState, setPreviewState] = useState(initialPreviewState);

  const closePreview = () => setPreviewState(initialPreviewState);

  const openPreview = async () => {
    if (!normalizedFile?.url) return;

    setPreviewState({
      open: true,
      loading: true,
      error: '',
      sheets: [],
      activeSheet: 0,
    });

    try {
      const response = await fetch(normalizedFile.url);
      if (!response.ok) {
        throw new Error(`Preview failed: ${response.status}`);
      }

      const [xlsxModule, buffer] = await Promise.all([
        import('xlsx'),
        response.arrayBuffer(),
      ]);
      const XLSX = xlsxModule.default || xlsxModule;
      const workbook = XLSX.read(buffer, { type: 'array' });
      const sheets = buildSheetPreview(XLSX, workbook);

      setPreviewState({
        open: true,
        loading: false,
        error: sheets.length ? '' : 'No worksheet data found in this file.',
        sheets,
        activeSheet: 0,
      });
    } catch (error) {
      setPreviewState({
        open: true,
        loading: false,
        error: error.message || 'Failed to preview SAT data file.',
        sheets: [],
        activeSheet: 0,
      });
    }
  };

  const activeSheet = previewState.sheets[previewState.activeSheet] || null;
  const columnCount = Math.max(activeSheet?.maxColumns || 0, 1);

  return (
    <>
      <div className="space-y-2 sm:max-w-md">
        <div className="flex flex-wrap items-center justify-end gap-2">
          {normalizedFile && (
            <button
              type="button"
              onClick={openPreview}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:border-blue-300 hover:text-blue-700"
            >
              <Eye className="h-4 w-4" />
              View SAT Data
            </button>
          )}

          {canUpdate && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                disabled={uploading}
                onChange={onUpload}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {normalizedFile ? 'Replace SAT Data' : 'Import SAT Data'}
              </button>
            </>
          )}
        </div>

        {normalizedFile ? (
          <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div className="rounded-xl bg-emerald-100 p-2 text-emerald-700">
                <FileSpreadsheet className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-800" title={normalizedFile.name}>
                  {normalizedFile.name}
                </p>
                <p className="text-xs text-slate-500">{formatFileSize(normalizedFile.size)}</p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 text-xs font-medium text-slate-500">
              {normalizedFile.url && (
                <a
                  href={normalizedFile.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition-colors hover:text-blue-700"
                >
                  Open original
                </a>
              )}
              {canUpdate && (
                <button
                  type="button"
                  onClick={onRemove}
                  className="inline-flex items-center gap-1 text-red-600 transition-colors hover:text-red-700"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Remove
                </button>
              )}
            </div>
          </div>
        ) : (
          <p className="text-right text-xs text-slate-400">Attach one Excel file for SAT-specific data or observations.</p>
        )}
      </div>

      {previewState.open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/80 p-4" onClick={closePreview}>
          <div
            className="relative flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">SAT Data Preview</p>
                <h3 className="mt-1 truncate font-heading text-xl font-bold text-slate-900">{normalizedFile?.name || 'SAT data workbook'}</h3>
                <p className="mt-1 text-xs text-slate-500">
                  {previewState.loading
                    ? 'Reading workbook...'
                    : previewState.sheets.length
                      ? `${previewState.sheets.length} sheet${previewState.sheets.length === 1 ? '' : 's'} available`
                      : 'Workbook preview'}
                </p>
              </div>

              <div className="flex items-center gap-3">
                {normalizedFile?.url && (
                  <a
                    href={normalizedFile.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hidden text-sm font-medium text-blue-600 transition-colors hover:text-blue-700 sm:inline"
                  >
                    Open original
                  </a>
                )}
                <button
                  type="button"
                  onClick={closePreview}
                  className="rounded-full p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
                  title="Close preview"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {previewState.loading ? (
              <div className="flex flex-1 items-center justify-center gap-3 px-6 py-16 text-slate-500">
                <Loader2 className="h-5 w-5 animate-spin" />
                Reading workbook...
              </div>
            ) : previewState.error ? (
              <div className="m-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {previewState.error}
              </div>
            ) : (
              <>
                {previewState.sheets.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto border-b border-slate-200 px-5 py-3">
                    {previewState.sheets.map((sheet, index) => (
                      <button
                        key={sheet.name}
                        type="button"
                        onClick={() => setPreviewState((current) => ({ ...current, activeSheet: index }))}
                        className={`rounded-full px-3 py-1.5 text-sm font-semibold transition-colors ${
                          previewState.activeSheet === index
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {sheet.name}
                      </button>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3 text-xs text-slate-500">
                  <p>
                    Sheet: <span className="font-semibold text-slate-700">{activeSheet?.name || '-'}</span>
                  </p>
                  <p>
                    Rows: <span className="font-semibold text-slate-700">{activeSheet?.rowCount || 0}</span>
                    {activeSheet?.truncated ? ` (showing first ${SHEET_PREVIEW_ROW_LIMIT})` : ''}
                  </p>
                </div>

                <div className="overflow-auto px-5 py-4">
                  {activeSheet?.rows?.length ? (
                    <div className="overflow-auto rounded-2xl border border-slate-200">
                      <table className="min-w-full border-collapse text-sm">
                        <tbody>
                          {activeSheet.rows.map((row, rowIndex) => (
                            <tr key={`${activeSheet.name}-${rowIndex}`} className={rowIndex === 0 ? 'bg-slate-50' : 'bg-white'}>
                              <td className="sticky left-0 border-b border-r border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-400">
                                {rowIndex + 1}
                              </td>
                              {Array.from({ length: columnCount }).map((_, columnIndex) => (
                                <td
                                  key={`${activeSheet.name}-${rowIndex}-${columnIndex}`}
                                  className="min-w-[8rem] border-b border-r border-slate-200 px-3 py-2 align-top text-slate-700"
                                >
                                  {getCellValue(row, columnIndex) || <span className="text-slate-200">-</span>}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-400">
                      This worksheet does not contain previewable rows.
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}