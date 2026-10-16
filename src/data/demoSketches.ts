import type { DomainCategory, ProgrammingLanguage, ProjectGoal } from '../types/idea';

export interface DemoSketchSeed {
  title: string;
  pitch: string;
  estimatedHours: string;
  tags: string[];
  domain: DomainCategory;
  languages: ProgrammingLanguage[];
}

export const GOAL_REASONS: Record<ProjectGoal, string> = {
  Learning: 'Teaches core concepts you can build up one piece at a time.',
  Portfolio: 'Produces a visible, demo-able result that stands out on a portfolio.',
  'Interview Prep': 'Touches classic design trade-offs that come up in technical interviews.',
  'Real-World Tool': 'Solves a real problem you could use day to day once it is built.',
};

// Hand-written ideas used when no Gemini key is configured. Keep three or more per domain.
export const DEMO_SKETCH_POOL: DemoSketchSeed[] = [
  // CLI & DevTools
  { title: 'Git Time Machine', pitch: "A TUI that replays a repository's history as an animated timeline of file churn, authorship, and hotspots.", estimatedHours: '15-25 hours', tags: ['TUI', 'Git', 'Visualization'], domain: 'CLI & DevTools', languages: ['Rust', 'Go', 'Python'] },
  { title: 'Shell History Miner', pitch: 'Mines your shell history to suggest aliases, detect repeated command chains, and generate scripts for them.', estimatedHours: '10-20 hours', tags: ['CLI', 'Automation', 'Text Mining'], domain: 'CLI & DevTools', languages: ['Python', 'Go', 'Rust'] },
  { title: 'Dotfile Drift Detector', pitch: 'Compares dotfiles across machines over SSH and shows a three-way diff with one-key sync.', estimatedHours: '15-20 hours', tags: ['SSH', 'Diffing', 'Config'], domain: 'CLI & DevTools', languages: ['Go', 'Rust', 'Python'] },
  // Distributed Systems
  { title: 'Gossip-Powered Feature Flags', pitch: 'A feature-flag service whose nodes converge through a SWIM-style gossip protocol instead of a central database.', estimatedHours: '30-45 hours', tags: ['Gossip', 'SWIM', 'Eventual Consistency'], domain: 'Distributed Systems', languages: ['Go', 'Rust', 'Elixir'] },
  { title: 'Raft Playground', pitch: 'A Raft implementation with a web visualizer that lets you partition nodes and watch leader elections live.', estimatedHours: '35-50 hours', tags: ['Raft', 'Consensus', 'Visualization'], domain: 'Distributed Systems', languages: ['Go', 'Rust', 'TypeScript'] },
  { title: 'Distributed Rate Limiter', pitch: 'A sliding-window rate limiter shared across instances with CRDT counters and no single point of failure.', estimatedHours: '25-35 hours', tags: ['CRDT', 'Rate Limiting', 'Resilience'], domain: 'Distributed Systems', languages: ['Go', 'Rust', 'Kotlin'] },
  // Compilers & Interpreters
  { title: 'Regex-to-WASM Compiler', pitch: "Compiles regular expressions into DFAs and emits WebAssembly matchers you can benchmark against the browser's engine.", estimatedHours: '25-40 hours', tags: ['Automata', 'WebAssembly', 'Codegen'], domain: 'Compilers & Interpreters', languages: ['Rust', 'Zig', 'TypeScript'] },
  { title: 'Spreadsheet Formula Engine', pitch: 'A parser and evaluator for spreadsheet formulas with dependency tracking and incremental recalculation.', estimatedHours: '20-30 hours', tags: ['Parsing', 'Dependency Graph', 'Evaluation'], domain: 'Compilers & Interpreters', languages: ['TypeScript', 'Rust', 'Haskell'] },
  { title: 'Tiny Lisp with a Debugger', pitch: 'A small Lisp interpreter with a step debugger, call-stack viewer, and time-travel through evaluation.', estimatedHours: '20-35 hours', tags: ['Interpreter', 'Lisp', 'Debugging'], domain: 'Compilers & Interpreters', languages: ['Haskell', 'Python', 'Rust'] },
  // Networking Protocols
  { title: 'DNS Resolver from Scratch', pitch: 'A recursive DNS resolver that walks from the root servers, caches answers, and explains each hop.', estimatedHours: '20-30 hours', tags: ['DNS', 'UDP', 'Caching'], domain: 'Networking Protocols', languages: ['Go', 'Rust', 'Zig'] },
  { title: 'LAN Chat over Multicast', pitch: 'Serverless chat for a local network using UDP multicast discovery and end-to-end encrypted rooms.', estimatedHours: '15-25 hours', tags: ['Multicast', 'UDP', 'P2P'], domain: 'Networking Protocols', languages: ['Go', 'Rust', 'Elixir'] },
  { title: 'HTTP/1.1 Server Kata', pitch: 'A from-scratch HTTP/1.1 server with keep-alive, chunked encoding, and a conformance test suite.', estimatedHours: '15-25 hours', tags: ['HTTP', 'TCP', 'Testing'], domain: 'Networking Protocols', languages: ['C++', 'Zig', 'Go'] },
  // AI Agents & MCP
  { title: 'Repo Q&A MCP Server', pitch: 'An MCP server that indexes a codebase and exposes tools for symbol lookup, call graphs, and test discovery.', estimatedHours: '20-30 hours', tags: ['MCP', 'Code Search', 'Tooling'], domain: 'AI Agents & MCP', languages: ['Python', 'TypeScript', 'Go'] },
  { title: 'Agent Eval Harness', pitch: 'A harness that replays recorded tasks against an AI agent and scores tool usage, cost, and correctness.', estimatedHours: '25-35 hours', tags: ['Evaluation', 'Agents', 'Benchmarking'], domain: 'AI Agents & MCP', languages: ['Python', 'TypeScript'] },
  { title: 'Local RAG Notebook', pitch: 'Turns a folder of notes into a local retrieval-augmented assistant with citations back to the source lines.', estimatedHours: '20-30 hours', tags: ['RAG', 'Embeddings', 'Local-First'], domain: 'AI Agents & MCP', languages: ['Python', 'Rust', 'TypeScript'] },
  // Database Engines
  { title: 'Append-Only KV Store', pitch: 'A Bitcask-style key-value store with an in-memory index, crash recovery, and background compaction.', estimatedHours: '25-35 hours', tags: ['Storage', 'WAL', 'Compaction'], domain: 'Database Engines', languages: ['Rust', 'Go', 'C++', 'Zig'] },
  { title: 'SQL Query Visualizer', pitch: 'Parses SQL, builds a logical plan, and animates how rows flow through joins and filters.', estimatedHours: '20-30 hours', tags: ['SQL', 'Query Planning', 'Visualization'], domain: 'Database Engines', languages: ['TypeScript', 'Python', 'Kotlin'] },
  { title: 'Time-Series Mini Engine', pitch: 'A columnar time-series store with Gorilla compression and downsampling queries.', estimatedHours: '30-45 hours', tags: ['Time Series', 'Compression', 'Columnar'], domain: 'Database Engines', languages: ['Rust', 'Go', 'C++'] },
  // Security & Cryptography
  { title: 'Password Vault CLI', pitch: 'A local-first password vault using Argon2 key derivation, authenticated encryption, and Git-based sync.', estimatedHours: '20-30 hours', tags: ['Cryptography', 'Argon2', 'CLI'], domain: 'Security & Cryptography', languages: ['Rust', 'Go', 'Python'] },
  { title: 'Supply-Chain Auditor', pitch: 'Scans lockfiles, checks packages against advisories, and flags suspicious install scripts.', estimatedHours: '15-25 hours', tags: ['Supply Chain', 'SBOM', 'Static Analysis'], domain: 'Security & Cryptography', languages: ['Go', 'Python', 'TypeScript'] },
  { title: 'TOTP Authenticator Service', pitch: 'An RFC 6238 TOTP service with QR-code enrollment and rate-limited verification.', estimatedHours: '10-20 hours', tags: ['TOTP', '2FA', 'RFC 6238'], domain: 'Security & Cryptography', languages: ['Go', 'Kotlin', 'TypeScript', 'Python'] },
  // Real-Time & Streaming
  { title: 'Collaborative Whiteboard', pitch: 'A multiplayer whiteboard that syncs strokes with CRDTs and keeps working offline.', estimatedHours: '25-40 hours', tags: ['CRDT', 'WebSockets', 'Offline'], domain: 'Real-Time & Streaming', languages: ['TypeScript', 'Elixir', 'Rust'] },
  { title: 'Live Log Tail Dashboard', pitch: 'Streams logs from many services, parses them on the fly, and highlights anomalies in a browser dashboard.', estimatedHours: '20-30 hours', tags: ['Streaming', 'Log Parsing', 'WebSockets'], domain: 'Real-Time & Streaming', languages: ['Go', 'Elixir', 'TypeScript'] },
  { title: 'Market Data Replay Engine', pitch: 'Replays historical market data as a real-time stream with backpressure and configurable speed.', estimatedHours: '20-30 hours', tags: ['Backpressure', 'Event Streams', 'Replay'], domain: 'Real-Time & Streaming', languages: ['Rust', 'Kotlin', 'Go'] },
  // Systems & OS / eBPF
  { title: 'Process Tree Profiler', pitch: 'Uses eBPF to trace process spawns and file opens, then renders a live tree of what each command touched.', estimatedHours: '30-45 hours', tags: ['eBPF', 'Tracing', 'Linux'], domain: 'Systems & OS / eBPF', languages: ['Rust', 'Go', 'C++'] },
  { title: 'Green Thread Scheduler', pitch: 'A green-thread library with a work-stealing scheduler and benchmarks against OS threads.', estimatedHours: '25-40 hours', tags: ['Scheduling', 'Concurrency', 'Benchmarks'], domain: 'Systems & OS / eBPF', languages: ['C++', 'Zig', 'Rust'] },
  { title: 'Container from Scratch', pitch: 'A minimal container runtime built from namespaces, cgroups, and an overlay filesystem.', estimatedHours: '30-40 hours', tags: ['Namespaces', 'cgroups', 'Linux'], domain: 'Systems & OS / eBPF', languages: ['Go', 'Rust', 'C++'] },
  // Full-Stack Architecture
  { title: 'Habit Pattern Coach', pitch: 'A habit tracker that detects streak-breaking patterns and suggests realistic schedule changes.', estimatedHours: '15-25 hours', tags: ['Full-Stack', 'Analytics', 'UX'], domain: 'Full-Stack Architecture', languages: ['TypeScript', 'Kotlin', 'Swift', 'Python'] },
  { title: 'Self-Hosted Link Shortener', pitch: 'A link shortener with click analytics, QR codes, and an admin dashboard, deployable with one command.', estimatedHours: '10-20 hours', tags: ['Web', 'Analytics', 'Docker'], domain: 'Full-Stack Architecture', languages: ['Go', 'TypeScript', 'Python', 'Elixir'] },
  { title: 'Open Source Issue Matchmaker', pitch: 'Matches developers with beginner-friendly issues using their GitHub activity and preferred languages.', estimatedHours: '20-30 hours', tags: ['GitHub API', 'Recommendations', 'Full-Stack'], domain: 'Full-Stack Architecture', languages: ['TypeScript', 'Python', 'Kotlin'] },
];
