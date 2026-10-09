import React, { useState } from 'react';
import {
  Network,
  Database,
  Cpu,
  Server,
  Container,
  Code2,
  Play,
  Terminal,
  Copy,
  Check,
  CheckCircle2,
  ArrowRight,
  ExternalLink,
  Download,
  Zap,
} from 'lucide-react';
import { downloadFile } from '../utils/export';

export const ArchitectureView: React.FC = () => {
  const [activeLayer, setActiveLayer] = useState<
    'overview' | 'postgres' | 'backend' | 'intelligence' | 'mcp' | 'docker'
  >('overview');

  // SQL Query Runner State
  const [sqlQuery, setSqlQuery] = useState('SELECT id, title, language, complexity FROM ideas LIMIT 5;');
  const [sqlResult, setSqlResult] = useState<any>(null);
  const [isExecutingSql, setIsExecutingSql] = useState(false);

  // MCP Tool Runner State
  const [selectedMcpTool, setSelectedMcpTool] = useState('check_duplicates');
  const [mcpParam, setMcpParam] = useState('RaftSync');
  const [mcpOutput, setMcpOutput] = useState<any>(null);
  const [isCallingMcp, setIsCallingMcp] = useState(false);

  const [copiedKey, setCopiedKey] = useState('');

  const handleCopy = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(''), 2000);
  };

  const handleExecuteSql = async (q = sqlQuery) => {
    setIsExecutingSql(true);
    try {
      const res = await fetch('/api/simulate-sql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q }),
      });
      const data = await res.json();
      setSqlResult(data);
    } catch (err: any) {
      console.error('SQL execution failed:', err);
    } finally {
      setIsExecutingSql(false);
    }
  };

  const handleExecuteMcp = async () => {
    setIsCallingMcp(true);
    try {
      let params: any = {};
      if (selectedMcpTool === 'check_duplicates') {
        params = { title: mcpParam };
      } else if (selectedMcpTool === 'search_by_stack') {
        params = { language: mcpParam };
      } else if (selectedMcpTool === 'list_ideas') {
        params = { limit: 5 };
      }

      const res = await fetch('/api/mcp-invoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool: selectedMcpTool, params }),
      });
      const data = await res.json();
      setMcpOutput(data);
    } catch (err: any) {
      console.error('MCP invocation failed:', err);
    } finally {
      setIsCallingMcp(false);
    }
  };

  const DOCKER_COMPOSE_CONTENT = `version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: ideafactory-db
    environment:
      POSTGRES_USER: ideafactory
      POSTGRES_PASSWORD: ideafactory_secret
      POSTGRES_DB: ideafactory_db
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ideafactory -d ideafactory_db"]
      interval: 5s
      timeout: 5s
      retries: 5

  backend-api:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: ideafactory-backend
    ports:
      - "8080:8080"
    environment:
      - DATABASE_URL=postgres://ideafactory:ideafactory_secret@postgres:5432/ideafactory_db?sslmode=disable
      - INTELLIGENCE_SERVICE_URL=http://intelligence-engine:5000
    depends_on:
      postgres:
        condition: service_healthy

  intelligence-engine:
    build:
      context: ./intelligence
      dockerfile: Dockerfile
    container_name: ideafactory-intelligence
    ports:
      - "5000:5000"
    environment:
      - GEMINI_API_KEY=\${GEMINI_API_KEY}
      - GEMINI_MODEL=gemini-3.8-flash
      - DATABASE_URL=postgres://ideafactory:ideafactory_secret@postgres:5432/ideafactory_db
    depends_on:
      postgres:
        condition: service_healthy

volumes:
  pgdata:
`;

  const PYTHON_GEMINI_CODE = `"""
IdeaFactory Intelligence Engine: Gemini 3.8 Flash Service
Updated from local Ollama to Gemini 3.8 Flash for ultra-fast, structured JSON generation.
"""

import os
from pydantic import BaseModel, Field
from typing import List, Optional
from google import genai
from google.genai import types

# Initialize client using Google GenAI SDK
client = genai.Client(
    api_key=os.environ.get("GEMINI_API_KEY"),
    http_options={"headers": {"User-Agent": "aistudio-build"}}
)

MODEL_NAME = "gemini-3.8-flash"

class TechStack(BaseModel):
    language: str
    framework: Optional[str] = None
    database: Optional[str] = None
    protocols: List[str]
    libraries: List[str]

class TechnicalChallenge(BaseModel):
    title: str
    description: str
    solution_hint: str

class ProjectIdea(BaseModel):
    title: str = Field(description="Architectural project name")
    tagline: str = Field(description="One-sentence technical pitch")
    domain: str
    complexity: str
    problem_statement: str
    core_architecture: str
    tech_stack: TechStack
    architecture_flow: List[str]
    key_challenges: List[TechnicalChallenge]
    learning_outcomes: List[str]
    tags: List[str]

def generate_project_idea(language: str, complexity: str, domain: str, focus: str = "") -> ProjectIdea:
    """Generates a strictly structured project specification using Gemini 3.8 Flash."""
    prompt = f"""
    Generate an authentic, architect-grade software project idea.
    Language: {language}
    Complexity: {complexity}
    Domain: {domain}
    Focus: {focus or 'Modern distributed or systems architecture'}
    """
    
    response = client.models.generate_content(
        model=MODEL_NAME,
        contents=prompt,
        config=types.GenerateContentConfig(
            system_instruction="You are the lead architect at IdeaFactory. Return deterministic, realistic specs.",
            response_mime_type="application/json",
            response_schema=ProjectIdea,
            temperature=0.7,
        )
    )
    
    # Parse strictly into Pydantic model
    return ProjectIdea.model_validate_json(response.text)
`;

  const GO_API_CODE = `package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"os"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	_ "github.com/lib/pq"
)

type Server struct {
	db     *sql.DB
	router *chi.Mux
}

func main() {
	dbURL := os.Getenv("DATABASE_URL")
	db, err := sql.Open("postgres", dbURL)
	if err != nil {
		log.Fatalf("Failed to connect to postgres: %v", err)
	}
	defer db.Close()

	s := &Server{db: db, router: chi.NewRouter()}
	s.routes()

	log.Println("IdeaFactory Go Backend running on :8080")
	http.ListenAndServe(":8080", s.router)
}

func (s *Server) routes() {
	s.router.Use(middleware.Logger)
	s.router.Use(middleware.Recoverer)

	s.router.Get("/api/v1/ideas", s.handleListIdeas)
	s.router.Post("/api/v1/ideas", s.handleCreateIdea)
	s.router.Get("/api/v1/ideas/{id}", s.handleGetIdea)
	s.router.Post("/api/v1/generate", s.handleProxyGenerate)
}
`;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Editorial Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-amber-400 mb-1.5 uppercase tracking-wider">
            <span>Systems Architecture</span>
            <span>·</span>
            <span>IdeaFactory Technical Spec</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-100 flex items-center gap-2.5">
            <span>Architecture & MCP Inspector</span>
          </h1>
          <p className="mt-1 text-sm text-slate-400 max-w-2xl">
            Live interactive blueprint of IdeaFactory's multi-tier stack: PostgreSQL schema, Go/Rust concurrency API, Gemini 3.8 Flash Intelligence Engine, Model Context Protocol (MCP) server, and Docker infrastructure.
          </p>
        </div>

        <button
          onClick={() => downloadFile('docker-compose.yml', DOCKER_COMPOSE_CONTENT, 'text/yaml')}
          className="px-3.5 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-medium flex items-center gap-1.5 transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Docker Compose</span>
        </button>
      </div>

      {/* Layer Navigation Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs border-b border-slate-800">
        {[
          { id: 'overview', label: '1. Architecture Topology', icon: <Network className="w-3.5 h-3.5 text-amber-400" /> },
          { id: 'postgres', label: '2. PostgreSQL Layer & SQL Runner', icon: <Database className="w-3.5 h-3.5 text-cyan-400" /> },
          { id: 'backend', label: '3. Go / Rust API Gateway', icon: <Server className="w-3.5 h-3.5 text-emerald-400" /> },
          { id: 'intelligence', label: '4. Gemini 3.8 Flash Engine (Python)', icon: <Cpu className="w-3.5 h-3.5 text-purple-400" /> },
          { id: 'mcp', label: '5. Model Context Protocol (MCP)', icon: <Code2 className="w-3.5 h-3.5 text-rose-400" /> },
          { id: 'docker', label: '6. Docker & Infrastructure', icon: <Container className="w-3.5 h-3.5 text-blue-400" /> },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveLayer(tab.id as any)}
            className={`px-3.5 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeLayer === tab.id
                ? 'bg-slate-800 text-slate-100 border border-slate-700 font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* LAYER 1: OVERVIEW TOPOLOGY */}
      {activeLayer === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono text-cyan-400">Layer 1 · Storage</span>
                <Database className="w-4 h-4 text-cyan-400" />
              </div>
              <h3 className="text-sm font-bold text-slate-100">PostgreSQL Relational DB</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Relational schema structuring <code className="text-cyan-300">ideas</code>, <code className="text-cyan-300">tags</code>, and <code className="text-cyan-300">tech_stacks</code> with JSONB columns for flexible AST and phase schemas.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono text-emerald-400">Layer 2 · Traffic</span>
                <Server className="w-4 h-4 text-emerald-400" />
              </div>
              <h3 className="text-sm font-bold text-slate-100">Go or Rust Backend API</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Ultra-lightweight, high-concurrency API server handling CRUD operations and coordinating requests between client, database, and AI pipelines.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono text-purple-400">Layer 3 · Intelligence</span>
                <Zap className="w-4 h-4 text-purple-400" />
              </div>
              <h3 className="text-sm font-bold text-slate-100">Gemini 3.8 Flash Service</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Updated from local Ollama to <span className="text-purple-300 font-semibold">Gemini 3.8 Flash</span> via Google GenAI SDK for deterministic JSON schemas and reasoning depth.
              </p>
            </div>
          </div>

          {/* Interactive Topology Diagram */}
          <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Interactive System Dataflow Topology
            </h3>

            <div className="p-6 rounded-xl bg-slate-950 border border-slate-800/80 font-mono text-xs text-slate-300 space-y-4">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 rounded-lg bg-slate-900/80 border border-slate-800">
                <div className="text-center md:text-left">
                  <span className="text-emerald-400 font-semibold">[React Client / UI]</span>
                  <p className="text-[11px] text-slate-400 mt-0.5">Generator, Refiner & Chat</p>
                </div>
                <div className="text-slate-600 flex items-center gap-1 text-xs">
                  <span>─── HTTP / SSE ───►</span>
                </div>
                <div className="text-center">
                  <span className="text-emerald-400 font-semibold">[Go/Rust API Gateway]</span>
                  <p className="text-[11px] text-slate-400 mt-0.5">Port 8080 · Routing & Auth</p>
                </div>
                <div className="text-slate-600 flex items-center gap-1 text-xs">
                  <span>─── gRPC / SQL ───►</span>
                </div>
                <div className="text-center md:text-right">
                  <span className="text-cyan-400 font-semibold">[PostgreSQL 16]</span>
                  <p className="text-[11px] text-slate-400 mt-0.5">Port 5432 · Relational Store</p>
                </div>
              </div>

              <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 rounded-lg bg-slate-900/80 border border-slate-800">
                <div className="text-center md:text-left">
                  <span className="text-rose-400 font-semibold">[MCP Server]</span>
                  <p className="text-[11px] text-slate-400 mt-0.5">JSON-RPC Context Protocol</p>
                </div>
                <div className="text-slate-600 flex items-center gap-1 text-xs">
                  <span>◄─── Tool Call ───►</span>
                </div>
                <div className="text-center">
                  <span className="text-purple-400 font-semibold">[Gemini 3.8 Flash Agent]</span>
                  <p className="text-[11px] text-slate-400 mt-0.5">Pydantic & Google GenAI SDK</p>
                </div>
                <div className="text-slate-600 flex items-center gap-1 text-xs">
                  <span>◄─── Deduplication ───►</span>
                </div>
                <div className="text-center md:text-right">
                  <span className="text-cyan-400 font-semibold">[PostgreSQL Memory]</span>
                  <p className="text-[11px] text-slate-400 mt-0.5">Prior Concept Deduplication</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* LAYER 2: POSTGRESQL & SQL RUNNER */}
      {activeLayer === 'postgres' && (
        <div className="space-y-6">
          <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-3">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Database className="w-4 h-4 text-cyan-400" />
              <span>PostgreSQL Relational Schema Definition</span>
            </h3>
            <p className="text-xs text-slate-400">
              The database model satisfies Phase 1 requirements: relational integrity between projects, tags, and tech stacks.
            </p>

            <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-[11px] text-slate-300 overflow-x-auto leading-relaxed">
{`-- PostgreSQL 16 Schema for IdeaFactory
CREATE TABLE IF NOT EXISTS ideas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    tagline TEXT NOT NULL,
    language VARCHAR(50) NOT NULL,
    domain VARCHAR(100) NOT NULL,
    complexity VARCHAR(50) NOT NULL,
    problem_statement TEXT NOT NULL,
    core_architecture TEXT NOT NULL,
    tech_stack JSONB NOT NULL,
    architecture_flow JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tags (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS idea_tags (
    idea_id UUID REFERENCES ideas(id) ON DELETE CASCADE,
    tag_id INT REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (idea_id, tag_id)
);

CREATE INDEX idx_ideas_language ON ideas(language);
CREATE INDEX idx_ideas_domain ON ideas(domain);
CREATE INDEX idx_ideas_gin_stack ON ideas USING GIN (tech_stack);`}
            </pre>
          </div>

          {/* Interactive Virtual SQL Runner */}
          <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Terminal className="w-4 h-4 text-cyan-400" />
                <span>Interactive PostgreSQL Query Sandbox</span>
              </h3>
              <div className="flex gap-1.5 text-[11px]">
                <button
                  onClick={() => {
                    const q = 'SELECT id, title, language, complexity FROM ideas LIMIT 5;';
                    setSqlQuery(q);
                    handleExecuteSql(q);
                  }}
                  className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200"
                >
                  Query Ideas
                </button>
                <button
                  onClick={() => {
                    const q = 'SELECT * FROM tags LIMIT 10;';
                    setSqlQuery(q);
                    handleExecuteSql(q);
                  }}
                  className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200"
                >
                  Query Tags
                </button>
              </div>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={sqlQuery}
                onChange={(e) => setSqlQuery(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-cyan-300 focus:outline-none focus:ring-1 focus:ring-cyan-400"
              />
              <button
                onClick={() => handleExecuteSql()}
                disabled={isExecutingSql}
                className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-semibold text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Execute</span>
              </button>
            </div>

            {/* Results Table */}
            {sqlResult && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <span>Rows: {sqlResult.rowCount}</span>
                  <span>Execution Time: {sqlResult.executionTimeMs} ms</span>
                </div>
                <div className="bg-slate-950 border border-slate-800 rounded-lg overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-slate-900/70 border-b border-slate-800 text-slate-400 text-[11px]">
                      <tr>
                        {sqlResult.fields?.map((f: string) => (
                          <th key={f} className="py-2 px-3">
                            {f}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80 text-slate-300">
                      {sqlResult.rows?.map((row: any, rIdx: number) => (
                        <tr key={rIdx} className="hover:bg-slate-900/40">
                          {sqlResult.fields?.map((f: string) => (
                            <td key={f} className="py-2 px-3 text-[11px]">
                              {typeof row[f] === 'object' ? JSON.stringify(row[f]) : String(row[f])}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* LAYER 3: GO / RUST BACKEND */}
      {activeLayer === 'backend' && (
        <div className="space-y-6">
          <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Server className="w-4 h-4 text-emerald-400" />
                <span>Go High-Concurrency API Service</span>
              </h3>
              <button
                onClick={() => handleCopy('go_code', GO_API_CODE)}
                className="px-2.5 py-1 text-xs rounded bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200 flex items-center gap-1"
              >
                {copiedKey === 'go_code' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>Copy Code</span>
              </button>
            </div>
            <p className="text-xs text-slate-400">
              Handles fast REST routing, SQL connection pooling, and dispatches generation requests to the Python / Gemini 3.8 Flash intelligence worker.
            </p>
            <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-[11px] text-slate-300 overflow-x-auto leading-relaxed max-h-96">
              {GO_API_CODE}
            </pre>
          </div>
        </div>
      )}

      {/* LAYER 4: GEMINI 3.8 FLASH INTELLIGENCE ENGINE (PYTHON) */}
      {activeLayer === 'intelligence' && (
        <div className="space-y-6">
          <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Zap className="w-4 h-4 text-purple-400" />
                <span>Python Intelligence Engine (Gemini 3.8 Flash)</span>
              </h3>
              <button
                onClick={() => handleCopy('py_code', PYTHON_GEMINI_CODE)}
                className="px-2.5 py-1 text-xs rounded bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200 flex items-center gap-1"
              >
                {copiedKey === 'py_code' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>Copy Python Service</span>
              </button>
            </div>

            {/* Note highlighting the user-requested change */}
            <div className="p-3.5 rounded-xl bg-purple-950/30 border border-purple-800/50 text-xs text-purple-200 leading-relaxed flex items-start gap-2.5">
              <Zap className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-purple-300">Phase 2 Updated: Gemini 3.8 Flash Integration.</span>
                <p className="text-[11px] text-purple-300/80 mt-0.5">
                  Replaced local Ollama with Gemini 3.8 Flash (`gemini-3.8-flash`). This delivers sub-second inference, guaranteed deterministic Pydantic JSON schemas, and deep multi-disciplinary systems reasoning without requiring 24GB VRAM local GPU hardware.
                </p>
              </div>
            </div>

            <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-[11px] text-slate-300 overflow-x-auto leading-relaxed max-h-96">
              {PYTHON_GEMINI_CODE}
            </pre>
          </div>
        </div>
      )}

      {/* LAYER 5: MODEL CONTEXT PROTOCOL (MCP) */}
      {activeLayer === 'mcp' && (
        <div className="space-y-6">
          <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Code2 className="w-4 h-4 text-rose-400" />
                <span>Model Context Protocol (MCP) Server Sandbox</span>
              </h3>
              <p className="mt-1 text-xs text-slate-400">
                Phase 3 implementation: Enables the AI Agent to inspect existing concepts in PostgreSQL to avoid duplicates and ensure novelty before generating new architectures.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[
                { id: 'check_duplicates', name: 'check_duplicates', desc: 'Checks if idea title exists in PostgreSQL store' },
                { id: 'search_by_stack', name: 'search_by_stack', desc: 'Returns projects matching given language/stack' },
                { id: 'list_ideas', name: 'list_ideas', desc: 'Queries catalog summary via MCP tool contract' },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    setSelectedMcpTool(t.id);
                    if (t.id === 'check_duplicates') setMcpParam('RaftSync');
                    if (t.id === 'search_by_stack') setMcpParam('Rust');
                    if (t.id === 'list_ideas') setMcpParam('5');
                  }}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    selectedMcpTool === t.id
                      ? 'bg-slate-800 text-slate-100 border-rose-500/50'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-900'
                  }`}
                >
                  <div className="font-mono text-xs font-semibold text-rose-300">{t.name}</div>
                  <div className="text-[11px] text-slate-400 mt-1">{t.desc}</div>
                </button>
              ))}
            </div>

            {/* Test Tool Action */}
            <div className="flex gap-2 pt-2">
              <input
                type="text"
                value={mcpParam}
                onChange={(e) => setMcpParam(e.target.value)}
                placeholder="Parameter value..."
                className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:ring-1 focus:ring-rose-400"
              />
              <button
                onClick={handleExecuteMcp}
                disabled={isCallingMcp}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-slate-100 font-semibold text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Call MCP Tool</span>
              </button>
            </div>

            {/* Output */}
            {mcpOutput && (
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="text-[11px] font-mono text-slate-400 flex items-center justify-between">
                  <span>JSON-RPC 2.0 Response</span>
                  <span className="text-emerald-400">status: 200 OK</span>
                </div>
                <pre className="text-xs font-mono text-emerald-300 overflow-x-auto leading-relaxed">
                  {JSON.stringify(mcpOutput, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}

      {/* LAYER 6: DOCKER & INFRASTRUCTURE */}
      {activeLayer === 'docker' && (
        <div className="space-y-6">
          <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Container className="w-4 h-4 text-blue-400" />
                <span>docker-compose.yml (Production Ready)</span>
              </h3>
              <button
                onClick={() => handleCopy('docker_code', DOCKER_COMPOSE_CONTENT)}
                className="px-2.5 py-1 text-xs rounded bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200 flex items-center gap-1"
              >
                {copiedKey === 'docker_code' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>Copy YAML</span>
              </button>
            </div>
            <p className="text-xs text-slate-400">
              Containerizes PostgreSQL 16, the Go/Rust API Gateway, and the Python Gemini 3.8 Flash intelligence service with persistent volumes and healthchecks.
            </p>
            <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-[11px] text-slate-300 overflow-x-auto leading-relaxed max-h-96">
              {DOCKER_COMPOSE_CONTENT}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};
