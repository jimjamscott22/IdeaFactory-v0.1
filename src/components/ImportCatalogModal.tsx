import React, { useState, useRef, ChangeEvent, DragEvent } from 'react';
import {
  Upload,
  FileJson,
  AlertTriangle,
  CheckCircle2,
  X,
  RefreshCw,
  Layers,
  Sparkles,
  GitMerge,
  CopyPlus,
  Trash2,
} from 'lucide-react';
import {
  IdeaItem,
  CatalogImportMode,
  CatalogValidationSummary,
  CatalogImportResult,
} from '../types/idea';
import { validateAndParseCatalogJson, importCatalog } from '../lib/ideasApi';

interface ImportCatalogModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingIdeas: IdeaItem[];
  onImportSuccess: (result: CatalogImportResult) => void;
}

export const ImportCatalogModal: React.FC<ImportCatalogModalProps> = ({
  isOpen,
  onClose,
  existingIdeas,
  onImportSuccess,
}) => {
  const [dragOver, setDragOver] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [selectedFileSize, setSelectedFileSize] = useState<string | null>(null);
  const [rawJsonText, setRawJsonText] = useState<string>('');
  const [validation, setValidation] = useState<CatalogValidationSummary | null>(null);
  const [importMode, setImportMode] = useState<CatalogImportMode>('merge');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const processFile = (file: File) => {
    if (!file.name.toLowerCase().endsWith('.json')) {
      setErrorMessage('Please choose a valid .json file.');
      return;
    }

    setErrorMessage(null);
    setSelectedFileName(file.name);
    setSelectedFileSize(`${(file.size / 1024).toFixed(1)} KB`);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setRawJsonText(text);
      const summary = validateAndParseCatalogJson(text, existingIdeas);
      setValidation(summary);
    };
    reader.onerror = () => {
      setErrorMessage('Failed to read the selected file.');
    };
    reader.readAsText(file);
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleReset = () => {
    setSelectedFileName(null);
    setSelectedFileSize(null);
    setRawJsonText('');
    setValidation(null);
    setErrorMessage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleExecuteImport = async () => {
    if (!validation || !validation.isValid || validation.parsedIdeas.length === 0) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const result = await importCatalog({
        mode: importMode,
        ideas: validation.parsedIdeas,
      });
      onImportSuccess(result);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Import operation failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="import-catalog-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
    >
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Upload className="w-4 h-4" />
            </div>
            <div>
              <h2 id="import-catalog-title" className="text-base font-semibold text-slate-100">
                Import Catalog Backup
              </h2>
              <p className="text-xs text-slate-400">
                Restore concepts and specifications from an exported JSON catalog.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {/* File Picker / Drag Zone */}
          {!selectedFileName ? (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                dragOver
                  ? 'border-indigo-400 bg-indigo-500/5'
                  : 'border-slate-700/80 hover:border-slate-600 bg-slate-950/40'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={handleFileChange}
              />
              <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-300">
                <FileJson className="w-6 h-6 text-indigo-400" />
              </div>
              <p className="text-sm font-medium text-slate-200">
                Drop your catalog JSON file here, or{' '}
                <span className="text-indigo-400 underline underline-offset-2">browse files</span>
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Accepts files exported from IdeaFactory (up to 10MB)
              </p>
            </div>
          ) : (
            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                  <FileJson className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-200">{selectedFileName}</p>
                  <p className="text-xs text-slate-500 font-mono tabular-nums">{selectedFileSize}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleReset}
                className="text-xs text-slate-400 hover:text-slate-200 px-2.5 py-1.5 rounded-lg bg-slate-800/70 hover:bg-slate-800 transition-colors"
              >
                Change File
              </button>
            </div>
          )}

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-rose-200">Validation Issue</p>
                <p className="mt-0.5">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Validation Errors List if JSON is invalid */}
          {validation && !validation.isValid && validation.errors.length > 0 && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 space-y-2">
              <div className="flex items-center gap-2 text-rose-300 text-xs font-semibold">
                <AlertTriangle className="w-4 h-4" />
                <span>The file could not be validated:</span>
              </div>
              <ul className="list-disc list-inside text-xs text-rose-300/90 space-y-1">
                {validation.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Validation Success & Inspection Diff */}
          {validation && validation.isValid && (
            <div className="space-y-4">
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800/60">
                  <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Schema Verified & Ready for Restore</span>
                  </div>
                  <span className="text-xs font-mono tabular-nums text-slate-400">
                    {validation.parsedIdeas.length}{' '}
                    {validation.parsedIdeas.length === 1 ? 'idea' : 'ideas'} found
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="bg-slate-900/90 border border-slate-800/80 rounded-lg p-2.5">
                    <span className="text-slate-500 block text-[11px]">Total Items</span>
                    <span className="font-mono tabular-nums text-sm font-semibold text-slate-100">
                      {validation.parsedIdeas.length}
                    </span>
                  </div>
                  <div className="bg-slate-900/90 border border-slate-800/80 rounded-lg p-2.5">
                    <span className="text-slate-500 block text-[11px]">Full Specs</span>
                    <span className="font-mono tabular-nums text-sm font-semibold text-indigo-400">
                      {validation.fullSpecsCount}
                    </span>
                  </div>
                  <div className="bg-slate-900/90 border border-slate-800/80 rounded-lg p-2.5">
                    <span className="text-slate-500 block text-[11px]">Quick Drafts</span>
                    <span className="font-mono tabular-nums text-sm font-semibold text-amber-400">
                      {validation.draftsCount}
                    </span>
                  </div>
                  <div className="bg-slate-900/90 border border-slate-800/80 rounded-lg p-2.5">
                    <span className="text-slate-500 block text-[11px]">Duplicate Matches</span>
                    <span
                      className={`font-mono tabular-nums text-sm font-semibold ${
                        validation.duplicateCount > 0 ? 'text-amber-400' : 'text-emerald-400'
                      }`}
                    >
                      {validation.duplicateCount}
                    </span>
                  </div>
                </div>

                {/* Languages breakdown (Zero-Pill discipline) */}
                {validation.languages.length > 0 && (
                  <div className="pt-1 flex items-center gap-2 text-xs text-slate-400 flex-wrap">
                    <span className="text-slate-500">Languages:</span>
                    {validation.languages.map((lang, idx) => (
                      <React.Fragment key={lang}>
                        <span className="font-medium text-slate-300">{lang}</span>
                        {idx < validation.languages.length - 1 && (
                          <span aria-hidden="true" className="text-slate-600">
                            ·
                          </span>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                )}
              </div>

              {/* Conflict Resolution Strategy Selector */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-300">
                  Conflict Resolution Strategy
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setImportMode('merge')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      importMode === 'merge'
                        ? 'bg-indigo-600/10 border-indigo-500/50 text-indigo-200 ring-1 ring-indigo-500/30'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1 text-xs font-semibold text-slate-200">
                      <GitMerge className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Merge & Update</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Updates matching ideas, appends new ones, and preserves local bookmarks.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setImportMode('append')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      importMode === 'append'
                        ? 'bg-indigo-600/10 border-indigo-500/50 text-indigo-200 ring-1 ring-indigo-500/30'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1 text-xs font-semibold text-slate-200">
                      <CopyPlus className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Keep Both</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Creates new copies with fresh IDs without modifying any existing items.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setImportMode('replace')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      importMode === 'replace'
                        ? 'bg-rose-500/10 border-rose-500/50 text-rose-200 ring-1 ring-rose-500/30'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1 text-xs font-semibold text-slate-200">
                      <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                      <span>Replace All</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Replaces the current catalog completely with the imported backup.
                    </p>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-900/80">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 rounded-lg bg-slate-800/80 hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!validation?.isValid || isSubmitting}
            onClick={handleExecuteImport}
            className={`px-5 py-2 text-xs font-medium rounded-lg flex items-center gap-2 transition-all ${
              validation?.isValid && !isSubmitting
                ? importMode === 'replace'
                  ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/20'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Restoring Catalog...</span>
              </>
            ) : (
              <>
                <Upload className="w-3.5 h-3.5" />
                <span>
                  {importMode === 'replace'
                    ? 'Wipe & Restore Catalog'
                    : importMode === 'append'
                    ? 'Append Ideas to Catalog'
                    : 'Merge & Restore Catalog'}
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
