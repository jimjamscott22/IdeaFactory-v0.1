import React from 'react';
import {
  Sparkles,
  FileCode2,
  Database,
  Network,
  MessageSquareCode,
  PlusCircle,
  Terminal,
} from 'lucide-react';

export type ActiveTab = 'generator' | 'refiner' | 'repository' | 'architecture' | 'chat';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  repositoryCount: number;
  onNewBrainstorm: () => void;
  hasActiveIdea: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  repositoryCount,
  onNewBrainstorm,
  hasActiveIdea,
}) => {
  const navItems: { id: ActiveTab; label: string; icon: React.ReactNode; count?: number }[] = [
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
                    Gemini 3.8 Flash
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
