# OmniChat AI

A production-grade, multi-model AI chat application built with React, TypeScript, and Firebase. OmniChat integrates Google Gemini, OpenAI, and other providers into a seamless, glassmorphism UI.

## Features

-   **Multi-Model Support**: Switch between Gemini, GPT-4o, Claude, and more.
-   **Multi-Modal**: Support for text, images, files, and video generation (Veo).
-   **Voice Interface**: Real-time speech-to-text and text-to-speech.
-   **Gamification**: XP system, levels, streaks, and achievements.
-   **Collaboration**: Shared workspaces and real-time updates.
-   **Analytics**: Dashboard for tracking token usage and costs.
-   **Search**: Full-text search across conversations and messages.
-   **PWA**: Installable on mobile and desktop.

## Tech Stack

-   **Frontend**: React 18, TypeScript, Tailwind CSS
-   **State Management**: React Context (Global), React Query (Server), Local State
-   **Backend/BaaS**: Firebase (Auth, Firestore, Storage)
-   **AI Integration**: Google GenAI SDK, Custom Fetch Interceptors
-   **Visualization**: Recharts, Mermaid.js
-   **Math**: KaTeX

## Getting Started

### Prerequisites

-   Node.js v18+
-   Firebase Project
-   Google Gemini API Key

### Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/your-org/omnichat.git
    cd omnichat
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

3.  Configure Environment Variables:
    Create a `.env` file in the root directory:
    ```env
    API_KEY=your_gemini_api_key
    OPENAI_API_KEY=your_openai_key
    ```
    *Note: For Firebase, update `services/firebase.ts` config object.*

4.  Start Development Server:
    ```bash
    npm start
    ```

## Project Structure

```
src/
├── components/       # UI Components (Chat, Layout, Modals)
├── contexts/         # Global State Providers
├── hooks/            # Custom React Hooks
├── services/         # API & Firebase Services
├── types/            # TypeScript Definitions
├── utils/            # Helper Functions
├── constants/        # Static Data
├── App.tsx           # Main Entry Component
└── index.tsx         # Root Render
```

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## License

MIT