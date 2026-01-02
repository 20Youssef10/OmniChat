# Contributing to OmniChat AI

We love your input! We want to make contributing to OmniChat AI as easy and transparent as possible, whether it's:

-   Reporting a bug
-   Discussing the current state of the code
-   Submitting a fix
-   Proposing new features

## Development Process

1.  **Fork the repo** and create your branch from `main`.
2.  **Install dependencies** using `npm install`.
3.  **Make your changes**. Ensure you follow the coding style.
4.  **Test your changes**.
5.  **Issue a Pull Request**.

## Coding Standards

-   **TypeScript**: We use Strict Mode. No `any` types allowed in production code.
-   **Styling**: Use Tailwind CSS utility classes. Avoid custom CSS files unless necessary.
-   **State**: Use `useAppStore` for global UI state and `useQuery` for server data.
-   **Components**: Functional components only. Use `React.memo` for expensive renders.
-   **Comments**: Add JSDoc comments to all exported functions and interfaces.

## Commit Messages

We follow the Conventional Commits specification:

-   `feat: add new voice feature`
-   `fix: resolve sidebar overlapping issue`
-   `docs: update readme`
-   `refactor: optimize chat hook`

## Pull Requests

-   Document new code with JSDoc.
-   Update `README.md` if you change functionality.
-   Ensure all types are valid.