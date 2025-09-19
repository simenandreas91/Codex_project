# ServiceNow Snippet Hub

A modern ServiceNow snippet catalog powered by React, Vite, Express, and SQLite. Design-driven glassmorphism surfaces, code-highlighting, and componentized flows make it effortless for teams to publish, search, and reuse artifacts such as Business Rules, Client Scripts, Script Includes, UI Policies, UI Actions, and more.

## Features

- Instant search over names, descriptions, metadata, and script bodies.
- Type-specific creation flows with rich metadata capture for every artifact.
- React + hooks architecture with modal wizardry, fullscreen script viewer, and highlight.js-powered previews.
- Glassmorphism-inspired UI shell with responsive layout, stats rail, and glowing snippet cards.
- Express + SQLite backend with session-backed auth (email/password) and owner-scoped filtering.
- Anonymous browsing, owner-only editing, and curated "My snippets" shortcuts.

## Getting started

```bash
npm install           # installs server dependencies and bootstraps client via postinstall
npm run dev           # runs the Express API (nodemon) + Vite dev server together
```

The Vite dev server runs at http://localhost:5173 and proxies `/api/*` to http://localhost:3000.

Production-style build and serve:

```bash
npm run build         # builds the React client into client/dist
npm start             # serves Express + built client on http://localhost:3000
```

Sessions live in `data/sessions.sqlite` (local to your workspace).

## Project structure

```
client/           # Vite + React front-end (source + tooling)
client/src/       # React components, hooks, utilities, and global design system
src/              # Express API, session middleware, SQLite data access
data/             # SQLite databases (created on first run)
package.json      # Backend scripts orchestrating dev/build/start
```

## Snippet types & captured fields

- **Business Rule** – application, table, timing, order, active flag, condition, script body.
- **Client Script** – application, table, trigger type, target field, active flag, script body.
- **Script Include** – application scope, accessibility, client-callable flag, script body.
- **UI Policy** – application, table, short description, evaluation conditions, script body.
- **UI Action** – application, table, action type, conditions, script body.

Every snippet records owner email, timestamps, free-form description, source script, and structured metadata tied to its artifact type.

## Development tips

- `npm run dev` combines nodemon + Vite with hot reload for both tiers.
- Server-only work? `npm run dev:server`. Client-only? `npm run dev:client`.
- The glassmorphism theme, button variants, and layout primitives live in `client/src/styles.css`.
- Highlight.js and Prettier are bundled; consider dynamic imports if you need leaner builds.
- Delete the SQLite files in `data/` to reset the local dataset.
