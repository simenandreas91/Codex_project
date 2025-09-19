# ServiceNow Snippet Hub

A VS Code-inspired dark themed web app that lets ServiceNow developers publish, search, and reuse common artifacts such as Business Rules, Client Scripts, Script Includes, and UI Policies.

## Features

- 🔍 Fast search across snippet name, description, script body, and metadata
- 🧩 Type-aware forms that capture the key fields for each ServiceNow artifact
- 💾 SQLite persistence with session-backed authentication (email + password)
- ✏️ Authenticated users can create, edit, and delete their own snippets
- 🌐 Anonymous users can browse, filter, and inspect snippet scripts and metadata

## Getting started

```bash
npm install
npm run start
```

The app launches at http://localhost:3000. Use the “Register” button to create an account, then add and manage snippets. Sessions are stored locally in `data/sessions.sqlite`.

## Project structure

```
├── public/           # Front-end (HTML/CSS/JS)
├── src/              # Express server and SQLite helpers
├── data/             # SQLite databases (created on first run)
└── package.json
```

## Snippet types & captured fields

- **Business Rule** – application, table, timing, order, active flag, condition, script body.
- **Client Script** – application, table, client trigger, target field, active flag, script body.
- **Script Include** – application scope, accessibility, client-callable flag, script body.
- **UI Policy** – application, table, short description, conditions, script body.

Each snippet also stores a rich description, the full script, owner email, and timestamps.

## Development tips

- `npm run dev` uses nodemon for auto-reload during backend development.
- The SQLite files inside `data/` can be deleted to reset the environment.
- Adjust `src/snippetTypes.js` to add new ServiceNow artifact templates or metadata fields.