import React from 'react';
import {
  Sparkles,
  Lightbulb,
  FileCode2,
  Database,
  Network,
  MessageSquareCode,
  PlusCircle,
  Terminal,
  LogOut,
  UploadCloud,
} from 'lucide-react';
import type { User } from 'firebase/auth';

export type ActiveTab = 'ideas' | 'generator' | 'refiner' | 'repository' | 'architecture' | 'chat';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  repositoryCount: number;
  onNewBrainstorm: () => void;
  hasActiveIdea: boolean;
  llmLabel: string;
  user?: User | null;
  token?: string | null;
  onConnectDrive?: () => void;
  onDisconnectDrive?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  repositoryCount,
  onNewBrainstorm,
  hasActiveIdea,
  llmLabel,
  user,
  token,
  onConnectDrive,
  onDisconnectDrive,
}) => {

  const navItems: { id: ActiveTab; label: string; icon: React.ReactNode; count?: number }[] = [
    {
      id: 'ideas',
      label: 'Ideas',
      icon: <Lightbulb className="w-4 h-4 text-yellow-300" />,
    },
    {
      id: 'generator',
      label: 'Generator',
      icon: <Sparkles className="w-4 h-4 text-emerald-400" />,
    },
    {
      id: 'refiner',
      label: 'Spec Refiner',
      icon: <FileCode2 className="w-4 h-4 text-cyan-400" />,
    },
    {
      id: 'repository',
      label: 'Repository',
      icon: <Database className="w-4 h-4 text-indigo-400" />,
      count: repositoryCount,
    },
    {
      id: 'architecture',
      label: 'Architecture & MCP',
      icon: <Network className="w-4 h-4 text-amber-400" />,
    },
    {
      id: 'chat',
      label: 'AI Architect Chat',
      icon: <MessageSquareCode className="w-4 h-4 text-purple-400" />,
    },
  ];

  return (
    <header className="sticky top-0 z-50 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Editorial Title */}
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setActiveTab('generator')}
              className="flex items-center space-x-2.5 text-left group focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded-md"
            >
              <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-inner group-hover:border-emerald-400/50 transition-colors">
                <Terminal className="w-5 h-5" />
              </div>
              <div>
                <span className="text-base font-semibold tracking-tight text-slate-100 flex items-center gap-1.5">
                  IdeaFactory
                  <span className="text-[10px] font-mono text-emerald-400/90 uppercase tracking-widest px-1.5 py-0.5 rounded bg-emerald-950/50 border border-emerald-800/40">
                    {llmLabel}
                  </span>
                </span>
                <p className="text-[11px] text-slate-400 tracking-normal hidden sm:block">
                  Software Spec Generator, Refiner & Repository
                </p>
              </div>
            </button>
          </div>

          {/* Navigation Tabs (Functional segment controls with proper focus states) */}
          <nav className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800/80 overflow-x-auto max-w-[55%] lg:max-w-none">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
                    isActive
                      ? 'bg-slate-800 text-slate-100 shadow-sm border border-slate-700/60 font-semibold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                  {item.count !== undefined && (
                    <span className="ml-0.5 text-[10px] text-slate-400 font-mono bg-slate-950/80 px-1.5 py-0.2 rounded border border-slate-800">
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Actions */}
          <div className="flex items-center space-x-2">
            {user && token ? (
              <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'Google Account'}
                    referrerPolicy="no-referrer"
                    className="w-5 h-5 rounded-full border border-slate-700"
                  />
                ) : (
                  <UploadCloud className="w-3.5 h-3.5 text-emerald-400" />
                )}
                <span className="text-slate-300 font-medium hidden md:inline truncate max-w-[110px]" title={user.email || ''}>
                  {user.displayName || user.email?.split('@')[0] || 'Drive Connected'}
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" title="Google Drive Connected" />
                {onDisconnectDrive && (
                  <button
                    onClick={onDisconnectDrive}
                    className="ml-1 text-slate-500 hover:text-rose-400 p-0.5 rounded transition-colors"
                    title="Sign out of Google"
                    aria-label="Sign out of Google"
                  >
                    <LogOut className="w-3 h-3" />
                  </button>
                )}
              </div>
            ) : (
              onConnectDrive && (
                <button
                  onClick={onConnectDrive}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-emerald-400"
                  title="Connect Google Drive to save and sync specs"
                >
                  <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 48 48">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                  </svg>
                  <span className="hidden sm:inline">Connect Drive</span>
                </button>
              )
            )}
            <button
              onClick={onNewBrainstorm}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-950 shadow-sm transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 active:scale-95"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">New Spec</span>
              <span className="sm:hidden">New</span>
            </button>
          </div>

        </div>
      </div>
    </header>
  );
};
