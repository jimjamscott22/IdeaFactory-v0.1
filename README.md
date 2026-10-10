# IdeaFactory

IdeaFactory turns software project ideas into structured technical specifications. Choose a language, domain, and difficulty level, then explore architecture, implementation phases, technical challenges, and interview talking points. Refine a concept with AI assistance, discuss it with an architecture assistant, and export the results for use outside the app.

This repository contains a React and TypeScript frontend with an Express backend. It supports Google Gemini through the server-side Google GenAI SDK and includes a demo mode that works without an API key.

## Features

| Workspace | What you can do |
| --- | --- |
| **Generator** | Generate a project specification using language, complexity, domain, optional constraints, and a custom prompt. |
| **Spec Refiner** | Request starter code, PostgreSQL DDL, failure analysis, an implementation roadmap, or interview preparation for a selected idea. |
| **Repository** | Browse seeded and generated ideas, search and filter the catalog, switch between grid and table views, bookmark ideas, and delete entries. |
| **Architecture & MCP** | Explore illustrative architecture examples and run simulated SQL queries and repository tool calls. |
| **AI Architect Chat** | Discuss a selected project with a systems architect, principal engineer, code reviewer, or interview coach persona. |

Export individual specifications as Markdown or GitHub issue template text, download refinement output, or export the currently filtered catalog as JSON. GitHub exports download a file; they do not create an issue in GitHub.

The generator offers Rust, Go, Python, TypeScript, C++, Zig, Elixir, Kotlin, Swift, Haskell, and an “Any Language” option. Domains range from CLI tools and database engines to distributed systems, networking, compilers, security, and AI agents.

## Current implementation

IdeaFactory is a prototype with working local UI and HTTP endpoints. These details matter when running or extending it:

- **Storage is temporary.** The Express process keeps the catalog in memory and initializes it from `src/data/seedIdeas.ts` on startup. Generated ideas, bookmark changes, and deletions are lost when the server restarts. Export anything you want to retain; there is currently no catalog import workflow.
- **Demo mode uses canned responses.** With `GEMINI_API_KEY` unset or empty, generation, refinement, and chat return local sample output. Demo generation uses a fixed template and does not provide genuine AI reasoning about custom prompts or constraints.
- **PostgreSQL and MCP are simulations.** The SQL runner matches query text against canned behaviors; it does not execute SQL. The MCP sandbox dispatches ordinary HTTP requests to local handlers; it is not a standards-compliant MCP server or an automatic Gemini tool integration.
- **Architecture examples are illustrative.** Go/Rust services, Python AI services, database schemas, and Docker Compose content shown in the Architecture view are examples embedded in the frontend. The executable backend in this repository is `server.ts`.
- **Access controls are not implemented.** The catalog is shared by clients of the same server process. There are no user accounts, authentication, or API rate limits. The server binds to `0.0.0.0`; account for that before exposing it beyond local development.

## Getting started

### Requirements

- Node.js **22.12 or newer** and npm. Node.js 24 is a suitable baseline. The installed Vite toolchain also supports Node.js 20.19+, but the commands below use `tsx` to run the TypeScript backend consistently.
- A Gemini API key if you want live AI responses. No key, database, Docker installation, or MCP client is required for demo mode.

### Run locally

```bash
git clone https://github.com/jimjamscott22/IdeaFactory-v0.1.git
cd IdeaFactory-v0.1
npm ci
npm run dev
```

Open **http://localhost:3000**. Express serves the API and mounts Vite as middleware for the frontend, so one command starts the entire development app.

To try demo mode, leave `GEMINI_API_KEY` unset. A placeholder value counts as a configured key and will cause the server to attempt real Gemini calls.

### Enable live Gemini responses

Copy the environment template:

```bash
cp .env.example .env
```

Edit `.env` and replace the `GEMINI_API_KEY` placeholder with your own key. Restart the server after changing it; the Gemini client is initialized at startup. Keep the key on the server and out of frontend code. `.env` is excluded from Git.

The model selector and backend allowlist currently contain these IDs:

```text
gemini-3.8-flash          (default)
gemini-3.5-flash
gemini-3.1-flash-lite
gemini-3.1-pro-preview
```

These are the IDs configured in the source, not a guarantee that your Gemini account can use them. Live requests depend on provider availability, access, and quota. If a model is unavailable, update the allowlist and default in `server.ts` and the selectors in the generator, refiner, and chat components together. Requests with an unrecognized model ID fall back to the configured default.

### Environment variables

| Variable | Purpose | Default |
| --- | --- | --- |
| `GEMINI_API_KEY` | Enables server-side Gemini calls. Unset or empty enables demo responses. | Unset |
| `PORT` | Port used by the Express server. | `3000` |
| `NODE_ENV` | Set to `production` to serve the built frontend from `dist/` instead of Vite middleware. | Development behavior when unset |
| `DISABLE_HMR` | Set to `true` to disable Vite hot module replacement and file watching. | HMR enabled |
| `APP_URL` | Included in the environment template for hosting integrations; currently unused by the application code. | Unset |

For example, on macOS or Linux:

```bash
PORT=3001 npm run dev
```

## Typical workflow

1. Open **Generator**, choose the project parameters, and generate a specification. You can also start by inspecting a seeded idea in **Repository**.
2. Review its overview, architecture flow, challenges, roadmap, and interview notes.
3. Open it in **Spec Refiner** to request a more detailed artifact, or in **AI Architect Chat** to discuss design decisions with project context attached.
4. Bookmark useful ideas for the current server session and export specifications or catalog entries before restarting the backend.
5. Use **Architecture & MCP** to experiment with the sample schema and tool interfaces, keeping their simulated behavior in mind.

## Development commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Run the Express backend and Vite development middleware through `tsx`. |
| `npm run lint` | Run TypeScript checking with `tsc --noEmit`; this is not an ESLint check. |
| `npm run build` | Build the frontend into `dist/`. |
| `npm run preview` | Preview the frontend build with Vite. It does not start the Express API. |
| `npm start` | Run `node server.ts`; this depends on the Node runtime's TypeScript support and module resolution. Prefer the explicit `tsx` command below for the full app. |
| `npm run clean` | Remove generated `dist/` and `server.js` files. |

### Serve a production frontend build

```bash
npm run build
NODE_ENV=production npx tsx server.ts
```

Open **http://localhost:3000**. This serves the compiled frontend and the API from the same Express process. `tsx` is installed as a development dependency, so this command requires an installation that includes development dependencies. The build script does not compile or bundle the backend.

`npm run preview` alone is useful for inspecting static layout, but generation, refinement, chat, and repository updates require the backend.

### Verification

Run the available checks before submitting a change:

```bash
npm run lint
npm run build
```

There is currently no automated test suite or `npm test` script. For a basic API smoke check while the development server is running:

```bash
curl http://localhost:3000/api/ideas

curl -X POST http://localhost:3000/api/generate-idea \
  -H 'Content-Type: application/json' \
  -d '{"language":"Rust","complexity":"Advanced","domain":"Distributed Systems"}'
```

The second request adds an idea to the in-memory catalog. With a real key configured, it makes a Gemini request.

## API overview

All endpoints use JSON and are implemented in `server.ts`.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/api/generate-idea` | Generate and add an idea; accepts `language`, `complexity`, `domain`, `customPrompt`, `constraints`, and `model`. |
| `POST` | `/api/refine-idea` | Refine an `idea` using `refinementType`, optional `customQuestion`, and `model`. |
| `POST` | `/api/chat` | Respond to `messages` with a selected `role`, optional `currentIdeaContext`, and `model`. |
| `GET` | `/api/ideas` | Return the current catalog and total count. |
| `POST` | `/api/ideas` | Add an idea to the current catalog. |
| `PUT` | `/api/ideas/:id` | Merge supplied fields into an existing idea. |
| `DELETE` | `/api/ideas/:id` | Remove an idea from the current catalog. |
| `POST` | `/api/mcp-invoke` | Simulate `list_ideas`, `search_by_stack`, `check_duplicates`, or `get_idea_by_id` with a `tool` and `params`. |
| `POST` | `/api/simulate-sql` | Return simulated query results for a supplied `query` string. |

## Project structure

```text
.
├── server.ts                     # Express API, Gemini integration, in-memory storage
├── src/
│   ├── App.tsx                   # View navigation and shared idea state
│   ├── main.tsx                  # React entry point
│   ├── index.css                 # Global styles and Tailwind imports
│   ├── components/
│   │   ├── GeneratorView.tsx
│   │   ├── RefinerView.tsx
│   │   ├── RepositoryView.tsx
│   │   ├── ArchitectureView.tsx
│   │   ├── ChatbotView.tsx
│   │   ├── IdeaDetailModal.tsx
│   │   └── Navbar.tsx
│   ├── data/seedIdeas.ts          # Initial project catalog
│   ├── types/idea.ts              # Idea, chat, and tool-call types
│   └── utils/export.ts           # Markdown, issue-template, and download helpers
├── .env.example                  # Environment template
├── package.json                  # Dependencies and npm scripts
├── package-lock.json             # Locked dependency versions
├── tsconfig.json                 # TypeScript configuration
└── vite.config.ts                # React and Tailwind build configuration
```

The frontend uses React 19, Tailwind CSS 4, Lucide icons, and Motion. Vite handles frontend development and builds; Express and the Google GenAI SDK handle backend requests.

## Contributing

Keep changes focused and consistent with the existing components and shared types. Update this README when changing setup, configuration, API behavior, or storage. Run the TypeScript check and frontend build, then exercise the affected workflow through the full Express app. Distinguish demo-mode checks from live Gemini verification in your change description.

## License

This repository currently has no license file. Add an explicit license before distributing it under open-source terms.
