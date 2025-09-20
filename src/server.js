import express from 'express';
import session from 'express-session';
import connectSqlite3 from 'connect-sqlite3';
import bcrypt from 'bcryptjs';
import path from 'path';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { run, get, all } from './db.js';
import { snippetTypes } from './snippetTypes.js';

const SQLiteStore = connectSqlite3(session);

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.join(__dirname, '..', 'data');
const clientDistDir = path.join(__dirname, '..', 'client', 'dist');

const ADMIN_EMAILS = new Set(
  (process.env.ADMIN_EMAILS ?? 'simenstaabyknudsen@gmail.com')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
);

function isAdminEmail(email) {
  return ADMIN_EMAILS.has((email ?? '').toLowerCase());
}

function isAdmin(req) {
  if (!req.session?.email) {
    return false;
  }

  const flag = isAdminEmail(req.session.email);
  if (req.session.isAdmin !== flag) {
    req.session.isAdmin = flag;
  }

  return flag;
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  session({
    store: new SQLiteStore({ db: 'sessions.sqlite', dir: dataDir }),
    secret: 'servicenow-snippet-hub-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 24 * 7 }
  })
);

function sanitizeSnippet(snippet, options = {}) {
  if (!snippet) return null;
  const { currentUserId, isAdmin } = options;
  let metadata = {};
  try {
    metadata = snippet.metadata ? JSON.parse(snippet.metadata) : {};
  } catch (err) {
    metadata = {};
  }

  const canManage = Boolean(
    isAdmin || (currentUserId && snippet.user_id === currentUserId)
  );

  return {
    id: snippet.id,
    type: snippet.type,
    name: snippet.name,
    description: snippet.description,
    script: snippet.script,
    metadata,
    createdAt: snippet.created_at,
    updatedAt: snippet.updated_at,
    owner: snippet.owner_email ? { email: snippet.owner_email } : undefined,
    canManage
  };
}

async function findUserByEmail(email) {
  return get('SELECT * FROM users WHERE email = ?', [email]);
}

function requireAuth(req, res, next) {
  if (!req.session.userId) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  next();
}

app.get('/api/snippet-types', (_req, res) => {
  res.json(snippetTypes);
});

app.get('/api/session', (req, res) => {
  if (!req.session.userId) {
    res.json({ authenticated: false });
    return;
  }

  const isAdminFlag = isAdminEmail(req.session.email);
  if (req.session.isAdmin !== isAdminFlag) {
    req.session.isAdmin = isAdminFlag;
  }

  res.json({ authenticated: true, user: { id: req.session.userId, email: req.session.email, isAdmin: isAdminFlag } });
});

app.post('/api/register', async (req, res) => {
  const { email, password } = req.body;
  const normalizedEmail = (email ?? '').trim().toLowerCase();

  if (!normalizedEmail || !password) {
    res.status(400).json({ error: 'Email and password are required' });
    return;
  }

  const existing = await findUserByEmail(normalizedEmail);
  if (existing) {
    res.status(409).json({ error: 'User already exists' });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const result = await run('INSERT INTO users (email, password_hash) VALUES (?, ?)', [normalizedEmail, passwordHash]);
  req.session.userId = result.id;
  req.session.email = normalizedEmail;
  req.session.isAdmin = isAdminEmail(normalizedEmail);
  res.status(201).json({ id: result.id, email: normalizedEmail, isAdmin: req.session.isAdmin });
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  const normalizedEmail = (email ?? '').trim().toLowerCase();

  if (!normalizedEmail || !password) {
    res.status(400).json({ error: 'Email and password are required' });
    return;
  }

  const user = await findUserByEmail(normalizedEmail);
  if (!user) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  req.session.userId = user.id;
  req.session.email = user.email;
  req.session.isAdmin = isAdminEmail(user.email);
  res.json({ id: user.id, email: user.email, isAdmin: req.session.isAdmin });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

app.get('/api/snippets', async (req, res) => {
  const { q, type, owned } = req.query;
  const params = [];
  const filters = [];

  if (owned === 'true') {
    if (!req.session.userId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    params.push(req.session.userId);
    filters.push('snippets.user_id = ?');
  }

  if (q) {
    const likeQuery = `%${q}%`;
    params.push(likeQuery, likeQuery, likeQuery, likeQuery);
    filters.push('(snippets.name LIKE ? OR snippets.description LIKE ? OR snippets.script LIKE ? OR snippets.metadata LIKE ?)');
  }

  if (type) {
    params.push(type);
    filters.push('snippets.type = ?');
  }

  const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  const rows = await all(
    `SELECT snippets.*, users.email AS owner_email
     FROM snippets
     JOIN users ON users.id = snippets.user_id
     ${whereClause}
     ORDER BY snippets.updated_at DESC` ,
    params
  );

  const sessionContext = { currentUserId: req.session.userId, isAdmin: isAdmin(req) };
  res.json(rows.map((row) => sanitizeSnippet(row, sessionContext)));
});

app.get('/api/snippets/:id', async (req, res) => {
  const snippet = await get(
    `SELECT snippets.*, users.email AS owner_email
     FROM snippets
     JOIN users ON users.id = snippets.user_id
     WHERE snippets.id = ?`,
    [req.params.id]
  );

  if (!snippet) {
    res.status(404).json({ error: 'Snippet not found' });
    return;
  }

  const sessionContext = { currentUserId: req.session.userId, isAdmin: isAdmin(req) };
  res.json(sanitizeSnippet(snippet, sessionContext));
});

app.post('/api/snippets', requireAuth, async (req, res) => {
  const { type, name, description, script, metadata = {} } = req.body;

  if (!type || !name) {
    res.status(400).json({ error: 'Type and name are required' });
    return;
  }

  const metaJson = JSON.stringify(metadata);
  const now = new Date().toISOString();
  const result = await run(
    `INSERT INTO snippets (user_id, type, name, description, script, metadata, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)` ,
    [req.session.userId, type, name, description ?? '', script ?? '', metaJson, now, now]
  );

  const created = await get(
    `SELECT snippets.*, users.email AS owner_email
     FROM snippets JOIN users ON users.id = snippets.user_id WHERE snippets.id = ?`,
    [result.id]
  );

  const sessionContext = { currentUserId: req.session.userId, isAdmin: isAdmin(req) };
  res.status(201).json(sanitizeSnippet(created, sessionContext));
});

app.put('/api/snippets/:id', requireAuth, async (req, res) => {
  const existing = await get('SELECT * FROM snippets WHERE id = ?', [req.params.id]);
  if (!existing) {
    res.status(404).json({ error: 'Snippet not found' });
    return;
  }

  if (!isAdmin(req) && existing.user_id !== req.session.userId) {
    res.status(403).json({ error: 'Not allowed to update this snippet' });
    return;
  }

  const { type, name, description, script, metadata = {} } = req.body;
  const metaJson = JSON.stringify(metadata);
  const now = new Date().toISOString();
  await run(
    `UPDATE snippets SET type = ?, name = ?, description = ?, script = ?, metadata = ?, updated_at = ? WHERE id = ?`,
    [type ?? existing.type, name ?? existing.name, description ?? '', script ?? '', metaJson, now, req.params.id]
  );

  const updated = await get(
    `SELECT snippets.*, users.email AS owner_email
     FROM snippets JOIN users ON users.id = snippets.user_id WHERE snippets.id = ?`,
    [req.params.id]
  );

  const sessionContext = { currentUserId: req.session.userId, isAdmin: isAdmin(req) };
  res.json(sanitizeSnippet(updated, sessionContext));
});

app.delete('/api/snippets/:id', requireAuth, async (req, res) => {
  const existing = await get('SELECT * FROM snippets WHERE id = ?', [req.params.id]);
  if (!existing) {
    res.status(404).json({ error: 'Snippet not found' });
    return;
  }

  if (!isAdmin(req) && existing.user_id !== req.session.userId) {
    res.status(403).json({ error: 'Not allowed to delete this snippet' });
    return;
  }

  await run('DELETE FROM snippets WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
});

app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

if (existsSync(clientDistDir)) {
  app.use(express.static(clientDistDir));
}

app.use((req, res, next) => {
  if (req.method !== 'GET') {
    next();
    return;
  }

  if (existsSync(path.join(clientDistDir, 'index.html'))) {
    res.sendFile(path.join(clientDistDir, 'index.html'));
  } else {
    res.status(503).send('Frontend build not found. Run "npm run build:client" to generate it.');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`ServiceNow Snippet Hub listening on http://localhost:${PORT}`);
});









