import { IdeaItem } from '../types/idea';

export const SEED_IDEAS: IdeaItem[] = [
  {
    id: 'raft-kv-go',
    title: 'RaftSync: Distributed Consensus KV Store',
    tagline: 'High-availability distributed key-value store implementing the Raft consensus algorithm from scratch in Go.',
    language: 'Go',
    domain: 'Distributed Systems',
    complexity: 'Advanced',
    estimatedHours: '45-60 hours',
    problemStatement:
      'Standard key-value databases struggle with network partitions and node failures without distributed consensus. Building Raft teaches leader election, log replication, snapshotting, and linearizable state machines.',
    coreArchitecture:
      'A cluster of Go nodes communicating via gRPC. Each node maintains a state machine, an append-only write-ahead log (WAL) on disk, and Raft consensus timers with randomized election timeouts.',
    techStack: {
      language: 'Go 1.23',
      framework: 'Standard Library + net/rpc or gRPC',
      database: 'Custom BoltDB / LSM-Tree disk storage',
      protocols: ['gRPC', 'Protobuf v3', 'TCP/IP'],
      libraries: ['google.golang.org/grpc', 'go.uber.org/zap', 'github.com/stretchr/testify']
    },
    architectureFlow: [
      'Client issues Write(key, val) request to any cluster node via gRPC',
      'Non-leader nodes forward write request to current Raft Leader node',
      'Leader appends entry to local Write-Ahead Log (WAL) with term and index',
      'Leader sends AppendEntries RPC in parallel to follower nodes',
      'Once quorum (> N/2) acknowledges, leader commits to Badger/LSM State Machine',
      'Leader responds to client with success and piggybacks commit index on next heartbeat'
    ],
    keyChallenges: [
      {
        title: 'Split-Brain & Network Partitions',
        description: 'Preventing stale reads and divergent logs when network splits create temporary minority clusters.',
        solutionHint: 'Enforce strict majority quorum checks before serving read indexes (ReadIndex or LeaseRead).'
      },
      {
        title: 'Log Compaction & Dynamic Membership',
        description: 'Memory exhaustion as log grows indefinitely over millions of operations.',
        solutionHint: 'Implement periodic snapshotting using copy-on-write memory states and InstallSnapshot RPC.'
      },
      {
        title: 'Timer Jitter & Heartbeat Race Conditions',
        description: 'Premature elections triggered by GC pauses or scheduling delays.',
        solutionHint: 'Use randomized heartbeat intervals (150ms-300ms) with high-resolution monotonic clocks.'
      }
    ],
    mvpPhases: [
      {
        phase: 'Phase 1',
        name: 'Single-Node WAL & State Machine',
        duration: '1-2 Weeks',
        goals: ['Disk persistence', 'CRC32 checksumming', 'Linearizable key-value store'],
        deliverables: ['Binary write-ahead log file', 'In-memory SkipList or B-Tree', 'Benchmark suite']
      },
      {
        phase: 'Phase 2',
        name: 'Raft Consensus Protocol Core',
        duration: '2-3 Weeks',
        goals: ['Leader election', 'Heartbeat timers', 'Log replication quorum'],
        deliverables: ['RequestVote & AppendEntries RPCs', 'Jepsen test simulator with simulated packet drops']
      },
      {
        phase: 'Phase 3',
        name: 'Compaction, Snapshotting & CLI Client',
        duration: '1-2 Weeks',
        goals: ['InstallSnapshot RPC', 'Zero-downtime node addition', 'Production CLI'],
        deliverables: ['raftctl CLI tool', 'Prometheus metrics exporter', 'Chaos-engineering scripts']
      }
    ],
    learningOutcomes: [
      'Distributed systems consensus invariants (Safety, Liveness, Election Safety)',
      'Go goroutine concurrency, context propagation, and select-channel synchronization',
      'POSIX fsync disk durability guarantees and binary framing protocols',
      'Debugging subtle state machine split-brain scenarios with deterministic replay'
    ],
    interviewTalkingPoints: [
      'Engineered Raft log replication from scratch achieving zero data divergence under Jepsen partition tests',
      'Implemented ReadIndex optimization cutting read latency from 25ms to 1.2ms without quorum writes',
      'Structured clean decoupled interfaces between Consensus Engine, Transport, and Storage State Machine'
    ],
    tags: ['Distributed Systems', 'Raft', 'Go', 'Consensus', 'gRPC', 'Storage Engine'],
    isBookmarked: true,
    createdAt: '2026-10-01',
    codeSnippet: {
      filename: 'raft_node.go',
      language: 'go',
      code: `package raft

import (
	"context"
	"sync"
	"time"
)

type Role int
const (
	Follower Role = iota
	Candidate
	Leader
)

type RaftNode struct {
	mu        sync.RWMutex
	peers     []string
	nodeID    string
	currentTerm int
	votedFor    string
	role        Role
	logEntries  []LogEntry
	commitIndex int
	lastApplied int
	heartbeatTimer *time.Timer
}

func (r *RaftNode) RequestVote(ctx context.Context, req *VoteRequest) (*VoteResponse, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	
	if req.Term > r.currentTerm {
		r.currentTerm = req.Term
		r.role = Follower
		r.votedFor = ""
	}
	
	granted := false
	if (r.votedFor == "" || r.votedFor == req.CandidateID) && req.Term >= r.currentTerm {
		granted = true
		r.votedFor = req.CandidateID
		r.resetElectionTimeout()
	}
	return &VoteResponse{Term: r.currentTerm, VoteGranted: granted}, nil
}`
    },
    sqlSchema: `-- Ideas Schema for IdeaFactory Repository
CREATE TABLE IF NOT EXISTS ideas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  domain VARCHAR(100) NOT NULL,
  language VARCHAR(50) NOT NULL,
  complexity VARCHAR(50) NOT NULL,
  tagline TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_ideas_language_domain ON ideas(language, domain);`
  },
  {
    id: 'lsm-tree-rust',
    title: 'AnvilDB: LSM-Tree Storage Engine with WAL',
    tagline: 'Production-grade Log-Structured Merge-tree storage engine in Rust featuring bloom filters, SSTables, and concurrent compaction.',
    language: 'Rust',
    domain: 'Database Engines',
    complexity: 'Staff / Distributed',
    estimatedHours: '50-70 hours',
    problemStatement:
      'Traditional B+Tree databases experience severe write amplification on high-throughput ingest workloads. LSM-Trees convert random writes into sequential disk I/O, forming the backbone of RocksDB and Cassandra.',
    coreArchitecture:
      'Lock-free in-memory MemTable (Crossbeam SkipList) backed by an append-only WAL. Background compaction threads flush MemTables to immutable on-disk SSTables with Block-level Bloom filters and sparse indexes.',
    techStack: {
      language: 'Rust 2024 Edition',
      framework: 'Zero-framework (Pure Systems)',
      database: 'Self-implemented LSM Storage Engine',
      protocols: ['Custom Binary Frame Protocol', 'Memory Mapped Files (mmap)'],
      libraries: ['tokio', 'crossbeam-skiplist', 'crc32fast', 'parking_lot', 'memmap2']
    },
    architectureFlow: [
      'Client executes Put(key, value) via Rust API or unix domain socket',
      'Write is appended synchronously to Write-Ahead Log (WAL) with CRC32',
      'Value inserted into active in-memory Crossbeam Concurrent SkipList MemTable',
      'When MemTable exceeds 64MB, marked immutable and fresh MemTable allocated',
      'Background worker flushes immutable MemTable to Level 0 SSTable file with Bloom Filter',
      'Leveled Compaction merges overlapping SSTables from Level N into Level N+1'
    ],
    keyChallenges: [
      {
        title: 'Read Amplification Mitigation',
        description: 'Searching for a key requires probing MemTable and multiple SSTable levels on disk.',
        solutionHint: 'Inject 10-bit per key Bloom filters and binary-searchable block index trailers into SSTable footers.'
      },
      {
        title: 'Write Stall During Compaction',
        description: 'Background disk I/O saturating disk controllers causing client write latency spikes.',
        solutionHint: 'Implement token-bucket rate-limiting on compaction threads and multi-threaded tier compaction.'
      },
      {
        title: 'Crash Recovery and WAL Parsing',
        description: 'Handling torn writes and truncated log entries after sudden OS power failure.',
        solutionHint: 'Write fixed 32-byte chunk headers with length, CRC32, and block boundary delimiters.'
      }
    ],
    mvpPhases: [
      {
        phase: 'Phase 1',
        name: 'MemTable & WAL Durability',
        duration: '2 Weeks',
        goals: ['Concurrent SkipList', 'Append-only WAL with CRC32', 'Recovery on reboot'],
        deliverables: ['Working in-memory engine with crash recovery and 100K ops/sec write benchmark']
      },
      {
        phase: 'Phase 2',
        name: 'SSTable Generation & Bloom Filters',
        duration: '2-3 Weeks',
        goals: ['Immutable SSTable format', 'Fast block caching', 'Bloom filter hashing'],
        deliverables: ['SSTable builder, reader, and multi-threaded point lookups']
      },
      {
        phase: 'Phase 3',
        name: 'Leveled Compaction & CLI Engine',
        duration: '2 Weeks',
        goals: ['K-way merge iterator', 'Level 0 to Level 1 compaction', 'Embedded crate publish'],
        deliverables: ['Production Rust crate with iterator support and comprehensive microbenchmarks']
      }
    ],
    learningOutcomes: [
      'Rust memory safety, RAII file handles, and interior mutability patterns',
      'LSM-Tree compaction dynamics: Size-Tiered vs Leveled Compaction tradeoffs',
      'Zero-copy deserialization using byte slices and memory mapping (mmap)',
      'Designing cache-efficient binary file layouts with CRC integrity protection'
    ],
    interviewTalkingPoints: [
      'Implemented zero-copy SSTable block readers in Rust yielding 85,000 read ops/sec with <0.4% Bloom false-positive rate',
      'Designed lock-free WAL chunking protocol preventing torn writes under SIGKILL test harnesses',
      'Articulated deep tradeoffs between write amplification (LSM) vs read amplification (B-Tree)'
    ],
    tags: ['Rust', 'Database Engines', 'LSM-Tree', 'Storage', 'Systems', 'Performance'],
    isBookmarked: true,
    createdAt: '2026-10-02'
  },
  {
    id: 'mcp-agent-python',
    title: 'NexusMCP: Contextual AI Codebase Agent',
    tagline: 'Model Context Protocol (MCP) server & agent runtime connecting Gemini 3.8 Flash to local Git, AST parsers, and test harnesses.',
    language: 'Python',
    domain: 'AI Agents & MCP',
    complexity: 'Intermediate',
    estimatedHours: '25-35 hours',
    problemStatement:
      'LLMs lack deterministic, sandboxed visibility into real repository structure, leading to hallucinated imports and broken refactors. MCP provides standard JSON-RPC protocol contracts for agent tool calling.',
    coreArchitecture:
      'Python FastMCP server exposing tools for Treesitter AST parsing, ripgrep searching, Git diff analysis, and test runners, connected to Gemini 3.8 Flash via the Google GenAI SDK.',
    techStack: {
      language: 'Python 3.12',
      framework: 'FastMCP / MCP SDK',
      database: 'SQLite + pgvector for semantic index',
      protocols: ['JSON-RPC 2.0 over stdio/SSE', 'REST'],
      libraries: ['mcp', 'google-genai', 'tree-sitter', 'pydantic', 'pytest']
    },
    architectureFlow: [
      'Developer queries IDE agent: "Refactor database connection pool to handle reconnects"',
      'Host agent queries NexusMCP tools list via JSON-RPC protocol',
      'NexusMCP dispatches tree-sitter AST parser to locate all DB pool consumers',
      'Tool results streamed to Gemini 3.8 Flash with structured schema instructions',
      'Agent synthesizes diff, passes to NexusMCP apply_patch tool, and runs pytest test runner'
    ],
    keyChallenges: [
      {
        title: 'Context Window Budgeting',
        description: 'Large codebases quickly saturate context windows with irrelevant files.',
        solutionHint: 'Implement AST signature extraction tool that passes function headers rather than full bodies.'
      },
      {
        title: 'Deterministic Sandbox Execution',
        description: 'Preventing dangerous shell operations when allowing agent test execution.',
        solutionHint: 'Wrap test runners in bubblewrap or Docker containerized subprocesses with timeouts.'
      },
      {
        title: 'Idempotent Patch Application',
        description: 'Git patches failing to apply cleanly when LLMs generate slightly drifted line numbers.',
        solutionHint: 'Implement 3-way fuzzy merge with AST boundary validation.'
      }
    ],
    mvpPhases: [
      {
        phase: 'Phase 1',
        name: 'MCP Stdio Server & File Tools',
        duration: '1 Week',
        goals: ['MCP handshake', 'read_file, search_symbol, list_directory tools', 'Pydantic schemas'],
        deliverables: ['Working stdio MCP server testable in Claude Desktop / Cursor']
      },
      {
        phase: 'Phase 2',
        name: 'Tree-sitter AST & Gemini 3.8 Flash Integration',
        duration: '1-2 Weeks',
        goals: ['Multi-language AST parser', 'Gemini 3.8 Flash function calling loop'],
        deliverables: ['AST query tool and automated agent loop script']
      },
      {
        phase: 'Phase 3',
        name: 'Test Execution & Interactive Web Inspector',
        duration: '1 Week',
        goals: ['Sandboxed test execution', 'Web UI tool call visualizer', 'Telemetry'],
        deliverables: ['Web inspector dashboard showing live JSON-RPC tool interactions']
      }
    ],
    learningOutcomes: [
      'Model Context Protocol (MCP) specification and JSON-RPC lifecycle',
      'Google GenAI SDK structured outputs and tool declarations with Gemini 3.8 Flash',
      'Tree-sitter grammar queries and abstract syntax tree navigation in Python',
      'Building safe autonomous developer agent feedback loops'
    ],
    interviewTalkingPoints: [
      'Built production MCP server handling 15+ repository tools with sub-50ms JSON-RPC response times',
      'Integrated Gemini 3.8 Flash structured tool calls cutting hallucinated edits by 92%',
      'Designed AST-aware context pruning algorithm keeping token usage under 12k tokens per query'
    ],
    tags: ['Python', 'AI Agents & MCP', 'Gemini 3.8 Flash', 'Tree-Sitter', 'JSON-RPC'],
    isBookmarked: true,
    createdAt: '2026-10-03'
  },
  {
    id: 'ebpf-firewall-c',
    title: 'PulseWall: Zero-Overhead eBPF Packet Filter',
    tagline: 'Kernel-space DDoS protection and connection tracker in C and Zig using eBPF and XDP.',
    language: 'C++',
    domain: 'Security & Cryptography',
    complexity: 'Staff / Distributed',
    estimatedHours: '50-65 hours',
    problemStatement:
      'User-space firewalls suffer context-switch latency penalties when processing millions of packets per second. eBPF with XDP runs verified bytecode inside the Linux network driver before memory allocation.',
    coreArchitecture:
      'C/eBPF XDP hook attached to network interface ring buffer. User-space control plane in Zig/C++ monitors BPF hash maps, provides real-time CLI dashboard, and pushes dynamic IP blocklists.',
    techStack: {
      language: 'C & C++ / Zig',
      framework: 'libbpf',
      database: 'BPF Maps (BPF_MAP_TYPE_HASH, BPF_MAP_TYPE_PERCPU_ARRAY)',
      protocols: ['Ethernet', 'IPv4/IPv6', 'TCP/UDP', 'XDP'],
      libraries: ['libbpf', 'linux-headers', 'clang/llvm']
    },
    architectureFlow: [
      'NIC receives raw Ethernet frame and triggers XDP driver hook',
      'eBPF bytecode parses IP header and inspects source address',
      'Lookup performed in BPF_MAP_TYPE_HASH without entering user-space',
      'If flagged: return XDP_DROP immediately (zero packet copy, zero sk_buff alloc)',
      'If clean: return XDP_PASS; increment per-CPU packet counter telemetry',
      'User-space daemon reads telemetry and exposes Prometheus metrics endpoint'
    ],
    keyChallenges: [
      {
        title: 'BPF Verifier Constraints',
        description: 'Kernel verifier rejecting loops and unbounded pointer arithmetic.',
        solutionHint: 'Unroll bounded loops with #pragma unroll and strictly validate packet bounds before dereference.'
      },
      {
        title: 'Atomic Map Updates Without CPU Stalls',
        description: 'Locking BPF maps across 64 cores under 10M pps causes cache coherency degradation.',
        solutionHint: 'Use BPF_MAP_TYPE_PERCPU_HASH and lockless RCU read semantics.'
      },
      {
        title: 'Hardware Offload Compatibility',
        description: 'Adapting XDP drivers across Mellanox, Intel, and virtualized virtio interfaces.',
        solutionHint: 'Implement fallback chain from XDP offload -> native driver -> generic XDP.'
      }
    ],
    mvpPhases: [
      {
        phase: 'Phase 1',
        name: 'Basic XDP Drop Filter',
        duration: '1-2 Weeks',
        goals: ['libbpf build pipeline', 'XDP_DROP on CIDR blocklist', 'Kernel verifier compliance'],
        deliverables: ['Working kernel C program and minimal loader']
      },
      {
        phase: 'Phase 2',
        name: 'Stateful Connection Tracker (SYN Flood Defense)',
        duration: '2 Weeks',
        goals: ['SYN cookie validation in eBPF', 'Rate-limiting token bucket per IP'],
        deliverables: ['SYN flood mitigation benchmark reaching 12 Million pps on 10Gbps link']
      },
      {
        phase: 'Phase 3',
        name: 'Control Plane & TUI Dashboard',
        duration: '1-2 Weeks',
        goals: ['User-space controller', 'Live terminal TUI', 'Dynamic rule hot-reload'],
        deliverables: ['pulsewallctl binary with live graph of dropped packets']
      }
    ],
    learningOutcomes: [
      'Linux kernel networking architecture and XDP packet processing lifecycle',
      'eBPF verifier safety rules and ring buffer communication',
      'Low-level network protocol dissection (Ethernet, ARP, IP, TCP flags)',
      'Benchmarking packet pipelines using pktgen and MoonGen hardware testers'
    ],
    interviewTalkingPoints: [
      'Dropped 11.4 million malicious packets/sec on single core with 0% user-space CPU utilization',
      'Overcame complex BPF verifier pointer boundary checks using static verification guards',
      'Demonstrated master-level grasp of Linux memory models and kernel driver hooks'
    ],
    tags: ['C++', 'Security & Cryptography', 'eBPF', 'Linux Kernel', 'Networking', 'XDP'],
    isBookmarked: false,
    createdAt: '2026-10-04'
  },
  {
    id: 'ts-wasm-vm',
    title: 'Chisel: Minimal WebAssembly Interpreter & JIT',
    tagline: 'Step-by-step WebAssembly (Wasm) MVP runtime and stack machine written in TypeScript and Zig.',
    language: 'TypeScript',
    domain: 'Compilers & Interpreters',
    complexity: 'Advanced',
    estimatedHours: '35-45 hours',
    problemStatement:
      'Understanding modern compilers and runtimes is daunting when inspecting massive engines like V8 or Wasmer. Building a compliant Wasm binary parser and stack interpreter demystifies bytecode execution.',
    coreArchitecture:
      'TypeScript binary decoder parses .wasm sections (Type, Function, Table, Memory, Export, Code). Stack-based virtual machine executes opcodes (i32.add, br_if, call) with linear memory allocation.',
    techStack: {
      language: 'TypeScript 5.6 / Node 22',
      framework: 'Zero-framework',
      database: 'In-Memory Linear Buffer',
      protocols: ['WebAssembly Binary Specification 1.0 (MVP)'],
      libraries: ['vitest', 'zod']
    },
    architectureFlow: [
      'Load .wasm binary into Uint8Array buffer',
      'Verify 4-byte magic number (\0asm) and 4-byte version (0x01)',
      'Decode LEB128 variable-length integers to extract function signatures and code vectors',
      'Instantiate Execution Context with Value Stack, Call Frame Stack, and Linear Memory (WebAssembly.Memory)',
      'Execute bytecode loop: dispatch opcodes with type validation and instruction pointer management',
      'Output function return value back to JavaScript host runtime'
    ],
    keyChallenges: [
      {
        title: 'Structured Control Flow (block, loop, br_if)',
        description: 'Wasm uses structured control flow rather than arbitrary gotos; handling branch nesting depths.',
        solutionHint: 'Maintain a control frame stack storing label target instruction pointers and arity.'
      },
      {
        title: 'LEB128 Decoding Speed',
        description: 'Variable-length integer decoding for signed and unsigned integers.',
        solutionHint: 'Implement bitwise shift masks with immediate 1-byte early exit fast path.'
      },
      {
        title: 'Linear Memory Boundary Safety',
        description: 'Preventing buffer overflows and page boundary violations across 64KB Wasm pages.',
        solutionHint: 'Wrap ArrayBuffer in bounds-checked DataView with page-grow allocation semantics.'
      }
    ],
    mvpPhases: [
      {
        phase: 'Phase 1',
        name: 'Binary Parser & Section Decoder',
        duration: '1-2 Weeks',
        goals: ['Decode all 12 Wasm MVP sections', 'LEB128 parser', 'Pass official spec test binaries'],
        deliverables: ['wasm-dump CLI utility that prints human-readable Wat format']
      },
      {
        phase: 'Phase 2',
        name: 'Stack Machine & Arithmetic Engine',
        duration: '2 Weeks',
        goals: ['Numeric opcodes (i32, i64, f32, f64)', 'Function calls and local variables'],
        deliverables: ['Working interpreter executing Fibonacci and Factorial compiled from C']
      },
      {
        phase: 'Phase 3',
        name: 'Import/Export Host Bindings & Memory Ops',
        duration: '1 Week',
        goals: ['Linear memory load/store', 'Host imports for console.log', 'Interactive Web Debugger'],
        deliverables: ['In-browser step debugger showing instruction pointer, stack values, and memory view']
      }
    ],
    learningOutcomes: [
      'Virtual machine stack architectures vs register-based bytecode dispatchers',
      'Binary encoding specifications, LEB128 encodings, and IEEE-754 floating point representation',
      'Formal language semantics, type checking, and structured control flow blocks',
      'Bridging foreign function interfaces (FFI) between JavaScript host and guest bytecodes'
    ],
    interviewTalkingPoints: [
      'Authored compliant WebAssembly binary interpreter executing real C/Rust binaries compiled to Wasm',
      'Designed zero-allocation stack frame recycling mechanism in TypeScript',
      'Built interactive visual instruction stepper helping engineers learn bytecode execution'
    ],
    tags: ['TypeScript', 'Compilers & Interpreters', 'WebAssembly', 'Bytecode', 'Runtimes'],
    isBookmarked: false,
    createdAt: '2026-10-05'
  },
  {
    id: 'zig-async-reverse-proxy',
    title: 'Kite: Zero-Allocation HTTP/2 Reverse Proxy',
    tagline: 'High-performance HTTP/2 & WebSocket edge proxy with epoll event loop and hot-reloading in Zig.',
    language: 'Zig',
    domain: 'Networking Protocols',
    complexity: 'Advanced',
    estimatedHours: '40-55 hours',
    problemStatement:
      'NGINX and Envoy are powerful but complex codebases to study. Building a reverse proxy in Zig showcases explicit memory allocators, io_uring / epoll, and HTTP/2 HPACK header compression.',
    techStack: {
      language: 'Zig 0.13',
      framework: 'Standard Library std.net / std.os',
      database: 'In-memory routing Trie',
      protocols: ['HTTP/1.1', 'HTTP/2', 'WebSocket', 'TCP'],
      libraries: ['std.posix', 'std.crypto']
    },
    coreArchitecture:
      'Single-threaded asynchronous event loop using Linux io_uring / epoll. Uses Zig ArenaAllocator for request scopes and pooled fixed-size ring buffers to eliminate dynamic heap allocations in the hot path.',
    architectureFlow: [
      'Client initiates TLS handshake on port 443 with ALPN negotiation ("h2")',
      'Kite multiplexes incoming HTTP/2 binary frames on single TCP socket',
      'HPACK decoder decompresses header block into static buffer',
      'Radix-tree router selects healthy upstream server based on consistent hashing',
      'Zero-copy splice() pipes request payload directly to upstream backend socket',
      'Response streamed back with streaming gzip compression'
    ],
    keyChallenges: [
      {
        title: 'HPACK Dynamic Table Memory Management',
        description: 'Preventing memory amplification attacks via malicious HTTP/2 header table sizing.',
        solutionHint: 'Enforce strict 4096-byte dynamic table ceilings and LRU eviction policy.'
      },
      {
        title: 'Zero-Allocation Splicing on Linux',
        description: 'Piping data between client and upstream without copying into user-space memory.',
        solutionHint: 'Use splice() and vmsplice() system calls with Linux pipe buffers.'
      },
      {
        title: 'Zero-Downtime Configuration Reload',
        description: 'Reloading routing tables and SSL certificates without dropping active connections.',
        solutionHint: 'Pass listening socket file descriptor across fork/exec using SO_REUSEPORT and unix socket.'
      }
    ],
    mvpPhases: [
      {
        phase: 'Phase 1',
        name: 'TCP Epoll Event Loop & HTTP/1.1 Proxy',
        duration: '2 Weeks',
        goals: ['Non-blocking sockets', 'epoll / kqueue abstraction', 'Basic round-robin forwarding'],
        deliverables: ['Working HTTP/1.1 reverse proxy passing 100K requests in wrk benchmark']
      },
      {
        phase: 'Phase 2',
        name: 'HTTP/2 Frame Parser & Multiplexing',
        duration: '2-3 Weeks',
        goals: ['Frame types (HEADERS, DATA, SETTINGS, PING)', 'Stream state machine', 'HPACK'],
        deliverables: ['Full HTTP/2 multiplexing proxying 10 streams over 1 TCP connection']
      },
      {
        phase: 'Phase 3',
        name: 'Health Checks & Metrics',
        duration: '1-2 Weeks',
        goals: ['Passive/active health checks', 'Latency percentile histogram', 'Prometheus exporter'],
        deliverables: ['Production-ready binary with zero leak verification in Zig testing allocator']
      }
    ],
    learningOutcomes: [
      'Zig explicit allocator ergonomics: GeneralPurposeAllocator vs ArenaAllocator vs FixedBufferAllocator',
      'OS event notifications (epoll, io_uring) and asynchronous socket programming',
      'HTTP/2 binary framing protocol, stream prioritization, and flow control windows',
      'Zero-copy Linux kernel features (splice, sendfile, SO_REUSEPORT)'
    ],
    interviewTalkingPoints: [
      'Architected reverse proxy in Zig maintaining steady 120,000 req/sec with zero dynamic allocations in request path',
      'Designed memory leak test suite leveraging Zig built-in leak detection across 1M simulated connections',
      'Demonstrated master-level understanding of HTTP/2 multiplexing stream transitions'
    ],
    tags: ['Zig', 'Networking Protocols', 'HTTP/2', 'Reverse Proxy', 'Low Latency', 'Linux'],
    isBookmarked: false,
    createdAt: '2026-10-06'
  }
];
