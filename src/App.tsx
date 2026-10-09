import React, { useState, useEffect } from 'react';
import { Navbar, ActiveTab } from './components/Navbar';
import { GeneratorView } from './components/GeneratorView';
import { RefinerView } from './components/RefinerView';
import { RepositoryView } from './components/RepositoryView';
import { ArchitectureView } from './components/ArchitectureView';
import { ChatbotView } from './components/ChatbotView';
import { IdeaDetailModal } from './components/IdeaDetailModal';
import { IdeaItem } from './types/idea';
import { SEED_IDEAS } from './data/seedIdeas';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('generator');
  const [ideas, setIdeas] = useState<IdeaItem[]>(SEED_IDEAS);
  const [currentIdea, setCurrentIdea] = useState<IdeaItem | null>(SEED_IDEAS[0]);
  const [inspectingIdea, setInspectingIdea] = useState<IdeaItem | null>(null);
  const [chatIdeaContext, setChatIdeaContext] = useState<IdeaItem | null>(SEED_IDEAS[0]);

  // Load ideas from backend API on mount
  useEffect(() => {
    fetch('/api/ideas')
      .then((res) => res.json())
      .then((data) => {
        if (data.ideas && data.ideas.length > 0) {
          setIdeas(data.ideas);
          if (!currentIdea) {
            setCurrentIdea(data.ideas[0]);
          }
        }
      })
      .catch((err) => {
        console.warn('Could not fetch ideas from server, using pre-seeded catalog:', err);
      });
  }, []);

  const handleToggleBookmark = async (targetIdea: IdeaItem) => {
    const updatedStatus = !targetIdea.isBookmarked;
    const updatedIdea: IdeaItem = { ...targetIdea, isBookmarked: updatedStatus };

    setIdeas((prev) =>
      prev.map((item) => (item.id === targetIdea.id ? updatedIdea : item))
    );

    if (currentIdea && currentIdea.id === targetIdea.id) {
      setCurrentIdea(updatedIdea);
    }
    if (inspectingIdea && inspectingIdea.id === targetIdea.id) {
      setInspectingIdea(updatedIdea);
    }

    try {
      await fetch(`/api/ideas/${targetIdea.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isBookmarked: updatedStatus }),
      });
    } catch (err) {
      console.error('Failed to update bookmark on server:', err);
    }
  };

  const handleDeleteIdea = async (id: string) => {
    setIdeas((prev) => prev.filter((item) => item.id !== id));
    if (currentIdea && currentIdea.id === id) {
      setCurrentIdea(ideas.find((i) => i.id !== id) || null);
    }
    if (chatIdeaContext && chatIdeaContext.id === id) {
      setChatIdeaContext(null);
    }

    try {
      await fetch(`/api/ideas/${id}`, { method: 'DELETE' });
    } catch (err) {
      console.error('Failed to delete idea on server:', err);
    }
  };

  const handleAddNewManualIdea = (newIdea: IdeaItem) => {
    setIdeas((prev) => [newIdea, ...prev]);
    setCurrentIdea(newIdea);
    setActiveTab('generator');
  };

  const handleOpenInRefiner = (idea: IdeaItem) => {
    setCurrentIdea(idea);
    setActiveTab('refiner');
  };

  const handleOpenInChat = (idea: IdeaItem) => {
    setChatIdeaContext(idea);
    setActiveTab('chat');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* Top Application Bar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        repositoryCount={ideas.length}
        onNewBrainstorm={() => {
          setActiveTab('generator');
        }}
        hasActiveIdea={!!currentIdea}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {activeTab === 'generator' && (
          <GeneratorView
            currentIdea={currentIdea}
            setCurrentIdea={(idea) => {
              setCurrentIdea(idea);
              // Auto update list
              setIdeas((prev) => {
                const existingIdx = prev.findIndex((i) => i.id === idea.id);
                if (existingIdx >= 0) {
                  const updated = [...prev];
                  updated[existingIdx] = idea;
                  return updated;
                }
                return [idea, ...prev];
              });
            }}
            onOpenInRefiner={handleOpenInRefiner}
            onOpenInChat={handleOpenInChat}
            onToggleBookmark={handleToggleBookmark}
            isBookmarked={!!currentIdea?.isBookmarked}
          />
        )}

        {activeTab === 'refiner' && (
          <RefinerView
            idea={currentIdea}
            onUpdateIdea={(updated) => {
              setCurrentIdea(updated);
              setIdeas((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
            }}
            allIdeas={ideas}
            onSelectIdea={(selected) => setCurrentIdea(selected)}
            onOpenInChat={handleOpenInChat}
          />
        )}

        {activeTab === 'repository' && (
          <RepositoryView
            ideas={ideas}
            onSelectIdea={(idea) => setInspectingIdea(idea)}
            onOpenInRefiner={handleOpenInRefiner}
            onOpenInChat={handleOpenInChat}
            onToggleBookmark={handleToggleBookmark}
            onDeleteIdea={handleDeleteIdea}
            onAddNewManualIdea={handleAddNewManualIdea}
          />
        )}

        {activeTab === 'architecture' && <ArchitectureView />}

        {activeTab === 'chat' && (
          <ChatbotView
            currentIdeaContext={chatIdeaContext}
            onSelectIdeaContext={setChatIdeaContext}
            allIdeas={ideas}
          />
        )}
      </main>

      {/* Modal Inspector */}
      {inspectingIdea && (
        <IdeaDetailModal
          idea={inspectingIdea}
          onClose={() => setInspectingIdea(null)}
          onOpenInRefiner={handleOpenInRefiner}
          onOpenInChat={handleOpenInChat}
          onToggleBookmark={handleToggleBookmark}
        />
      )}

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-300">IdeaFactory</span>
            <span>—</span>
            <span>Software Concept Engine & Technical Spec Repository</span>
          </div>

          <div className="flex items-center gap-4 text-[11px] font-mono text-slate-400">
            <span>Powered by Gemini 3.8 Flash</span>
            <span aria-hidden="true">·</span>
            <span>Model Context Protocol (MCP)</span>
            <span aria-hidden="true">·</span>
            <span>PostgreSQL</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
