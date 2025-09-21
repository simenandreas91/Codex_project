import fs from 'fs/promises';
import path from 'path';
import { all, get } from './src/db.js';

const dataDir = path.join(process.cwd(), 'data');
const snippetsFile = path.join(dataDir, 'snippets.json');

async function exportSnippets() {
  try {
    // Get all snippets with owner email
    const rows = await all(`
      SELECT snippets.*, users.email AS owner_email
      FROM snippets
      LEFT JOIN users ON users.id = snippets.user_id
      ORDER BY snippets.updated_at DESC
    `, []);

    // Sanitize without session context (no canManage for now)
    const sanitized = rows.map(row => ({
      id: row.id,
      type: row.type,
      name: row.name,
      description: row.description || '',
      script: row.script || '',
      metadata: row.metadata ? JSON.parse(row.metadata) : {},
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      owner: row.owner_email ? { email: row.owner_email } : undefined,
      canManage: false // Static, no auth
    }));

    await fs.writeFile(snippetsFile, JSON.stringify(sanitized, null, 2));
    console.log(`Exported ${sanitized.length} snippets to ${snippetsFile}`);
  } catch (error) {
    console.error('Export failed:', error);
  }
}

exportSnippets();
