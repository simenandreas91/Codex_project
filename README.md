# ServiceNow Snippet Hub

A VS Code-inspired dark themed web app for ServiceNow developers. The UI now runs on a modern React + Vite stack backed by an Express/SQLite API, so teams can publish, search, and reuse common artifacts such as Business Rules, Client Scripts, Script Includes, UI Policies, and UI Actions.

## Features

- Fast search across snippet name, description, script body, and metadata.
- Type-aware forms that capture the key fields for each ServiceNow artifact.
- Modern React UI with componentized modals, hooks, and highlight.js code previews.
- SQLite persistence with session-backed authentication (email + password).
- Authenticated users can create, edit, and delete their own snippets.
- Anonymous users can browse, filter, and inspect snippet scripts and metadata.

## Getting started

```bash
npm install           # installs server deps + client via postinstall
npm run dev           # runs nodemon (API) + Vite (client) together
```

Open http://localhost:5173 for the React client (API proxied to http://localhost:3000).

For a production-style build:

```bash
npm run build         # builds the React bundle into client/dist
npm start             # serves the built assets from Express on http://localhost:3000
```

Sessions are stored locally in `data/sessions.sqlite`.

## Project structure

```
client/           # Vite + React front-end (source + tooling)
client/src/       # React components, hooks, utilities, global styles
src/              # Express server and SQLite helpers
data/             # SQLite databases (created on first run)
package.json      # Backend scripts for dev/build/start
```

## Snippet types & captured fields

- **Business Rule** - application, table, timing, order, active flag, condition, script body.
- **Client Script** - application, table, client trigger, target field, active flag, script body.
- **Script Include** - application scope, accessibility, client-callable flag, script body.
- **UI Policy** - application, table, short description, conditions, script body.
- **UI Action** - application, table, action type, condition, script body.

Each snippet also stores a rich description, the full script, owner email, and timestamps.

## Development tips

- `npm run dev` runs the API (nodemon) and React client (Vite) with hot reload.
- Need server-only changes? Use `npm run dev:server`. Client-only? `npm run dev:client`.
- The SQLite files inside `data/` can be deleted to reset the environment.
