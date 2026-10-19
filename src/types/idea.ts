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

export type ProjectGoal = 'Learning' | 'Portfolio' | 'Interview Prep' | 'Real-World Tool';

export type DomainChoice = DomainCategory | 'Any Domain';

export type IdeaCount = 3 | 5 | 8;

export interface IdeaSketch {
  id: string;
  title: string;
  pitch: string;
  whyItFits: string;
  estimatedHours: string;
  tags: string[];
  language: ProgrammingLanguage;
  domain: DomainCategory;
  complexity: ComplexityLevel;
  goal: ProjectGoal;
}

export interface GenerateIdeasRequest {
  language: ProgrammingLanguage;
  complexity: ComplexityLevel;
  domain: DomainChoice;
  goal: ProjectGoal;
  count: IdeaCount;
  avoidTitles: string[];
  model?: string;
}

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

export type ChatRole =
  | 'system_architect'
  | 'principal_engineer'
  | 'code_reviewer'
  | 'interview_coach';

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
  isDraft?: boolean;
  goal?: ProjectGoal;
  createdAt: string;
  codeSnippet?: {
    filename: string;
    language: string;
    code: string;
  };
  sqlSchema?: string;
  dockerCompose?: string;
}

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
