import React, { useState } from 'react';
import {
  X,
  UploadCloud,
  CheckCircle2,
  ExternalLink,
  AlertTriangle,
  Folder,
  FileText,
  RefreshCw,
  LogOut,
  User as UserIcon,
} from 'lucide-react';
import { User } from 'firebase/auth';
import { googleSignIn, logout } from '../lib/auth';
import { uploadSpecToDrive, DriveUploadResult } from '../lib/googleDrive';

interface SaveToDriveModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  defaultFilename: string;
  content: string;
  mimeType?: string;
  description?: string;
  user: User | null;
  token: string | null;
  onAuthChange: (user: User | null, token: string | null) => void;
}

export const SaveToDriveModal: React.FC<SaveToDriveModalProps> = ({
  isOpen,
  onClose,
  title,
  defaultFilename,
  content,
  mimeType = 'text/markdown',
  description,
  user,
  token,
  onAuthChange,
}) => {
  const [filename, setFilename] = useState(defaultFilename);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<DriveUploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSignIn = async () => {
    setIsSigningIn(true);
    setError(null);
    try {
      const res = await googleSignIn();
      if (res) {
        onAuthChange(res.user, res.accessToken);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to authenticate with Google');
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    await logout();
    onAuthChange(null, null);
    setUploadResult(null);
  };

  const handleSaveToDrive = async () => {
    if (!token) {
      setError('Please sign in with Google first.');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const result = await uploadSpecToDrive({
        token,
        filename: filename.trim() || defaultFilename,
        content,
        mimeType,
        description: description || `Technical specification for ${title}`,
        folderName: 'IdeaFactory Specs',
      });
      setUploadResult(result);
    } catch (err: any) {
      console.error('Drive upload failed:', err);
      setError(err.message || 'Failed to save specification to Google Drive');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="drive-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
    >
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <UploadCloud className="w-4 h-4" />
            </div>
            <div>
              <h2 id="drive-modal-title" className="text-base font-semibold text-slate-100">
                Save to Google Drive
              </h2>
              <p className="text-xs text-slate-400">
                Export and sync specification documents directly to your Drive.
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
        <div className="p-6 space-y-4">
          {/* Auth State Card */}
          {user && token ? (
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <div className="flex items-center gap-3">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'Google Account'}
                    referrerPolicy="no-referrer"
                    className="w-8 h-8 rounded-full border border-slate-700"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-300">
                    <UserIcon className="w-4 h-4" />
                  </div>
                )}
                <div>
                  <p className="text-xs font-semibold text-slate-200">
                    {user.displayName || 'Google Account Connected'}
                  </p>
                  <p className="text-[11px] text-slate-400">{user.email}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleSignOut}
                className="text-xs text-slate-400 hover:text-rose-400 p-1.5 rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-1"
                title="Disconnect Google Account"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 text-center space-y-3">
              <p className="text-xs text-slate-300 leading-relaxed">
                Connect your Google Account to create and manage files in your Google Drive with permission.
              </p>
              <button
                type="button"
                onClick={handleSignIn}
                disabled={isSigningIn}
                className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-medium text-xs shadow-sm transition-all active:scale-[0.99] disabled:opacity-60"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                </svg>
                <span>{isSigningIn ? 'Connecting to Google...' : 'Sign in with Google'}</span>
              </button>
            </div>
          )}

          {/* Destination Details */}
          <div className="space-y-3 bg-slate-950/50 p-4 rounded-xl border border-slate-800/80 text-xs">
            <div>
              <label className="block text-slate-400 mb-1 font-medium">File Name</label>
              <div className="relative">
                <FileText className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={filename}
                  onChange={(e) => setFilename(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-400 font-mono"
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-slate-400 pt-1">
              <span className="flex items-center gap-1.5">
                <Folder className="w-3.5 h-3.5 text-amber-400" />
                <span>Target Folder:</span>
              </span>
              <span className="font-mono text-slate-200">IdeaFactory Specs/</span>
            </div>
          </div>

          {/* Success State */}
          {uploadResult && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 space-y-2">
              <div className="flex items-center gap-2 font-semibold text-emerald-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  {uploadResult.isUpdate
                    ? 'Successfully updated existing file in Google Drive!'
                    : 'Successfully saved file to Google Drive!'}
                </span>
              </div>
              <p className="text-[11px] text-emerald-300/90">
                Saved as <code className="font-mono">{uploadResult.name}</code> inside the{' '}
                <span className="font-medium text-emerald-200">IdeaFactory Specs</span> folder.
              </p>
              {uploadResult.webViewLink && (
                <div className="pt-1">
                  <a
                    href={uploadResult.webViewLink}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-semibold text-xs transition-colors"
                  >
                    <span>Open in Google Drive</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-rose-200">Operation Error</p>
                <p className="mt-0.5">{error}</p>
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
            Close
          </button>

          {user && token ? (
            <button
              type="button"
              disabled={isUploading || !filename.trim()}
              onClick={handleSaveToDrive}
              className={`px-4 py-2 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all ${
                !isUploading && filename.trim()
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-slate-950 shadow-md shadow-emerald-600/20 active:scale-95'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              {isUploading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving to Drive...</span>
                </>
              ) : (
                <>
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>Confirm & Save to Drive</span>
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSignIn}
              disabled={isSigningIn}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-950 flex items-center gap-1.5 transition-colors"
            >
              <span>Sign in to Save</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
