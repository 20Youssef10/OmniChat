# Architecture Overview

OmniChat AI utilizes a modern, client-side architecture powered by React and Firebase.

## High-Level Diagram

```mermaid
graph TD
    User[User] --> UI[React UI]
    UI --> Context[App Context (Global State)]
    UI --> Query[React Query (Server State)]
    
    Query --> API[API Service]
    Query --> FB[Firebase Service]
    
    API --> Gemini[Google Gemini API]
    API --> OpenAI[OpenAI API]
    
    FB --> Auth[Firebase Auth]
    FB --> Firestore[Cloud Firestore]
    FB --> Storage[Firebase Storage]
```

## State Management

1.  **Global UI State (`AppContext`)**:
    -   Handles Sidebar visibility, Modals, User Auth state, and active Model selection.
    -   Implemented using React Context API to avoid prop drilling for layout-level data.

2.  **Data State (`React Query`)**:
    -   Manages async operations like generating AI responses.
    -   Handles loading states (`isPending`), error states, and caching.

3.  **Real-time Data (`Firebase Listeners`)**:
    -   Chat history and messages use `onSnapshot` for real-time synchronization across devices.
    -   Logic encapsulated in `useChat` hook.

## Directory Structure Strategy

-   **`components/`**: Atomic design principles.
    -   `Chat/`: Specific to chat functionality.
    -   `Layout/`: Wrappers and structural elements.
    -   `Shared/`: Reusable buttons, inputs.
-   **`services/`**: Pure TypeScript modules handling external communications.
    -   `http.ts`: Base HTTP client with interceptors.
    -   `apiService.ts`: AI provider logic.
    -   `firebase.ts`: Database interactions.
-   **`hooks/`**: Business logic extraction.
    -   `useChat.ts`: Complex chat orchestration.

## Key Design Patterns

-   **Optimistic UI**: Messages appear immediately before confirming with the DB.
-   **Lazy Loading**: Heavy modals (Analytics, Projects) are imported using `React.lazy` to improve initial load time.
-   **Compound Components**: Used in complex UI elements like Modals.
-   **Service Layer**: API calls are decoupled from UI components.