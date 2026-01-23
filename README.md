# Thx for fix: pls fix + AI comments + Voice mode. 

A replica of the Pls Fix browser extension with an added AI Comments feature.

AI Comments: 

https://github.com/user-attachments/assets/0cb17e06-84d1-4b66-92fe-7e568ae3bbbe

Voice mode:

https://github.com/user-attachments/assets/8b09d8b7-1d9e-4705-90c0-a07c70b2e219




**What the AI analyzes:**

- **Style Review** - Checks if changes match the existing design system
- **Smart Suggestions** - Recommends improvements and catches potential problems
- **Risk Detection** - Warns about CSS cascade issues, responsive breakpoints, and accessibility concerns
- **PR Score** - Overall quality rating (0-100) based on code consistency and best practices

## Features

- **Visual Element Selection**: Click on any element on a webpage to select it
- **Live Editing**: Edit text content by double-clicking
- **Property Editor**: Modify fonts, colors, sizes, padding, and margins via a visual sidebar
- **Change Tracking**: All changes are tracked and can be reverted
- **GitHub Integration**: Connect to your GitHub repos and create PRs with your changes
- **🆕 AI Comments**: Get AI-powered code review on your changes before creating a PR

### Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           AI Comments Flow                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐            │
│  │  Extension   │────▶│   Backend    │────▶│  AI Package  │            │
│  │  (AI Tab)    │ SSE │   API        │     │              │            │
│  └──────────────┘     └──────────────┘     └──────┬───────┘            │
│                                                    │                     │
│                                                    ▼                     │
│                                            ┌──────────────┐             │
│                                            │  LLM Provider│             │
│                                            │ (OpenAI/Claude)            │
│                                            └──────────────┘             │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### PR Scoring Criteria

| Score                 | Description                                      |
| --------------------- | ------------------------------------------------ |
| **Code Consistency**  | Does the change match surrounding code patterns? |
| **Reuse Score**       | Does it leverage existing utilities?             |
| **AI Detection Risk** | Would a reviewer flag this as AI-generated?      |
| **Cascade Risk**      | Will CSS changes affect other elements?          |
| **Responsive Score**  | Are breakpoints handled correctly?               |
| **Semantic Score**    | Is semantic HTML preserved?                      |
| **Intent Alignment**  | Does it match user intent?                       |

### Risk Categories

- **Cascade**: CSS cascade effects on other elements
- **Responsive**: Mobile/tablet breakpoint issues
- **Accessibility**: A11y concerns
- **Performance**: Performance implications
- **Semantic**: HTML structure issues
- **Design Consistency**: Design system alignment

## Project Structure

```
├── extension/          # Chrome Extension (Manifest V3)
│   ├── src/
│   │   ├── background/     # Service worker
│   │   ├── content/        # Content script for DOM manipulation
│   │   ├── sidepanel/      # React sidebar UI
│   │   └── shared/         # Shared types and utilities
│   ├── manifest.json
│   └── package.json
│
├── backend/            # Node.js API Server
│   ├── src/
│   │   ├── config/         # Passport configuration
│   │   ├── middleware/     # Auth middleware
│   │   ├── routes/         # API routes (includes /api/ai-comments)
│   │   └── services/       # GitHub service
│   ├── prisma/
│   │   └── schema.prisma   # Database schema
│   └── package.json
│
├── packages/
│   └── ai-comments/    # @plsfix/ai-comments npm package
│       ├── src/
│       │   ├── analyzer/       # ChangeAnalyzer
│       │   ├── providers/      # OpenAI, Anthropic
│       │   ├── prompts/        # Handlebars templates
│       │   ├── scoring/        # ScoringEngine
│       │   └── utils/          # Confidence, streaming
│       └── package.json
│
└── demo/               # Demo page for E2E testing
    └── index.html
```

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL database
- GitHub OAuth App credentials

### 1. Setup AI Comments Package

```bash
cd packages/ai-comments

# Install dependencies
npm install

# Build the package
npm run build
```

### 2. Setup Backend

```bash
cd backend

# Install dependencies
npm install

# Create .env file with your credentials
cat > .env << 'EOF'
PORT=3001
NODE_ENV=development
DATABASE_URL="postgresql://user:password@localhost:5432/plsfix?schema=public"
SESSION_SECRET=your-session-secret
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
GITHUB_CALLBACK_URL=http://localhost:3001/auth/github/callback
FRONTEND_URL=http://localhost:3000

# AI Comments Configuration (choose one provider)
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-your-openai-api-key
# Or for Anthropic:
# LLM_PROVIDER=anthropic
# ANTHROPIC_API_KEY=sk-ant-your-anthropic-key

AI_COMMENTS_MODEL=gpt-4o
AI_COMMENTS_MAX_TOKENS=2000
EOF

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma db push

# Start the server
npm run dev
```

### 3. Build Extension

```bash
cd extension

# Install dependencies
npm install

# Build the extension
npm run build

# For development with watch mode
npm run dev
```

### 4. Load Extension in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top right
3. Click "Load unpacked"
4. Select the `extension/dist` folder
5. The extension icon should appear in your toolbar

### 5. Create GitHub OAuth App

1. Go to GitHub Settings > Developer settings > OAuth Apps
2. Click "New OAuth App"
3. Fill in:
   - Application name: `plsfix (local)`
   - Homepage URL: `http://localhost:3001`
   - Authorization callback URL: `http://localhost:3001/auth/github/callback`
4. Copy the Client ID and Client Secret to your `.env` file

## Usage

1. **Navigate to any website** you want to edit
2. **Click the extension icon** to open the side panel
3. **Click on elements** on the page to select them
4. **Edit properties** in the Design tab (text, fonts, colors, spacing)
5. **Double-click** elements to edit text content inline
6. **Review changes** in the Changes tab
7. **Get AI feedback** in the AI tab - analyze your changes for risks and best practices
8. **Connect a GitHub repo** and create a pull request

### Demo Page

For E2E testing of the AI Comments feature, open the demo page:

```bash
# Serve the demo page
cd demo
python -m http.server 8000
# or
npx serve .

# Navigate to http://localhost:8000
```

## Tech Stack

### Extension

- **React 18** - UI components
- **Styled Components** - CSS-in-JS styling
- **MobX State Tree** - State management
- **TypeScript** - Type safety
- **Webpack** - Bundling

### Backend

- **Node.js + Express** - API server
- **Prisma** - ORM for PostgreSQL
- **Passport.js** - GitHub OAuth authentication
- **Octokit** - GitHub API client

## API Endpoints

### Auth

- `GET /auth/github` - Initiate GitHub OAuth
- `GET /auth/github/callback` - OAuth callback
- `GET /auth/me` - Get current user

### Repositories

- `GET /api/repos` - List user's GitHub repos
- `GET /api/repos/:owner/:repo/branches` - List branches
- `POST /api/repos/connect` - Connect repo to website
- `GET /api/repos/connected` - List connected repos

### Changes

- `POST /api/changes` - Save changes
- `GET /api/changes/:projectId` - Get changes for project
- `DELETE /api/changes/:changeId` - Delete a change

### Pull Requests

- `POST /api/pull-requests` - Create a PR
- `GET /api/pull-requests` - List PRs
- `GET /api/pull-requests/:prId` - Get PR details

### AI Comments

- `POST /api/ai-comments/analyze` - Analyze changes (SSE streaming)
- `POST /api/ai-comments/analyze-single` - Analyze a single change
- `GET /api/ai-comments/health` - Check AI service configuration

## Development

### Extension Development

```bash
cd extension
npm run dev  # Watch mode - rebuilds on changes
```

After making changes, go to `chrome://extensions/` and click the refresh icon on the extension.

### Backend Development

```bash
cd backend
npm run dev  # Runs with tsx watch
```

### Database Changes

```bash
cd backend
npx prisma migrate dev --name your_migration_name
```

## Design System

### Colors

- Primary Text: `#130F18`
- Secondary Text: `#646464`
- Primary Action (Mint): `#10B981`
- Selection Border: `#3B82F6`
- Background: `#FFFFFF`

### Typography

- Font: SF Pro Text / Inter
- Sizes: 11px (xs), 12px (sm), 13px (base), 14px (md)

## Credits

This project is a clone of [Pls Fix](https://jam.dev/plsfix) by Jam.dev, built for learning purposes.

## License

MIT
