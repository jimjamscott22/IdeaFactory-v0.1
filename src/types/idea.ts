export type ComplexityLevel = 'Beginner' | 'Intermediate' | 'Advanced' | 'Staff / Distributed';

export type DomainCategory =
  | 'CLI & DevTools'
  | 'Distributed Systems'
  | 'Compilers & Interpreters'
  | 'Networking Protocols'
  | 'AI Agents & MCP'
  | 'Database Engines'
  | 'Security & Cryptography'
  | 'Real-Time & Streaming'
  | 'Systems & OS / eBPF'
  | 'Full-Stack Architecture';

export type ProgrammingLanguage =
  | 'Rust'
  | 'Go'
  | 'Python'
  | 'TypeScript'
  | 'C++'
  | 'Zig'
  | 'Elixir'
  | 'Kotlin'
  | 'Swift'
  | 'Haskell'
  | 'Any Language';

export interface TechStackConfig {
  language: string;
  framework?: string;
  database?: string;
  protocols: string[];
  libraries: string[];
}

export interface MvpPhase {
  phase: string;
  name: string;
  duration: string;
  goals: string[];
  deliverables: string[];
}

export interface TechnicalChallenge {
  title: string;
  description: string;
  solutionHint: string;
}

export interface IdeaItem {
  id: string;
  title: string;
  tagline: string;
  language: ProgrammingLanguage;
  domain: DomainCategory;
  complexity: ComplexityLevel;
  estimatedHours: string;
  problemStatement: string;
  coreArchitecture: string;
  techStack: TechStackConfig;
  architectureFlow: string[];
  keyChallenges: TechnicalChallenge[];
  mvpPhases: MvpPhase[];
  learningOutcomes: string[];
  interviewTalkingPoints: string[];
  tags: string[];
  isBookmarked?: boolean;
  createdAt: string;
  codeSnippet?: {
    filename: string;
    language: string;
    code: string;
  };
  sqlSchema?: string;
  dockerCompose?: string;
}

export type ChatRole =
  | 'system_architect'
  | 'principal_engineer'
  | 'code_reviewer'
  | 'interview_coach';

export interface ChatMessage {
  id: string;
  role: 'user' | 'model' | 'system';
  content: string;
  timestamp: string;
  modelUsed?: string;
}

export interface McpToolCall {
  tool: string;
  params: Record<string, any>;
  result?: any;
  executedAt: string;
}
