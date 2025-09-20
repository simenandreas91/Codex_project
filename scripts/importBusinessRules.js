import path from 'path';
import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import { db, run, get } from '../src/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SOURCE_REPO = 'ServiceNowDevProgram/code-snippets';
const DEFAULT_SOURCE_DIR = path.join(__dirname, '..', 'tmp', 'code-snippets', 'Business Rules');
const SCRIPT_EXTENSIONS = new Set(['.js', '.jss']);
const DEFAULT_OWNER_EMAIL = process.env.SNIPPET_SEED_EMAIL ?? 'library@servicenow.dev';
const DEFAULT_OWNER_PASSWORD = process.env.SNIPPET_SEED_PASSWORD ?? 'changeme';
const KNOWN_TIMINGS = new Set(['before', 'after', 'async', 'display']);

function encodeSegments(segments) {
  return segments.map((segment) => encodeURIComponent(segment)).join('/');
}

function summarizeReadme(markdown) {
  if (!markdown) return '';
  const text = markdown
    .replace(/\r/g, '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[[^\]]*\]\(([^)]*)\)/g, '$1')
    .replace(/[#>*_`]/g, '')
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 3)
    .join(' ');

  if (text.length > 400) {
    return `${text.slice(0, 397).trimEnd()}...`;
  }
  return text;
}

function getLeadingCommentBlock(script) {
  if (!script) return '';
  const match = script.match(/^\s*(?:\/\/.*\n|\/\*[\s\S]*?\*\/\s*)+/);
  return match ? match[0] : '';
}

function extractWhen(script, readme) {
  const areas = [getLeadingCommentBlock(script)];
  if (readme) areas.push(readme);

  for (const area of areas) {
    if (!area) continue;
    const labeled = area.match(/when(?:\s+to\s+run)?\s*[:=\-]?\s*[`'\"]?([A-Za-z ]+)/i);
    if (labeled) {
      const candidate = labeled[1].trim().toLowerCase();
      const normalized = candidate.split(/\s+/)[0];
      if (KNOWN_TIMINGS.has(normalized)) {
        return normalized;
      }
    }
  }

  for (const area of areas) {
    if (!area) continue;
    if (/\bbefore\b/i.test(area)) return 'before';
    if (/\bafter\b/i.test(area)) return 'after';
    if (/\bdisplay\b/i.test(area)) return 'display';
    if (/\basync\b/i.test(area)) return 'async';
  }

  return undefined;
}

function extractTable(script, readme) {
  const areas = [getLeadingCommentBlock(script)];
  if (readme) areas.push(readme);

  for (const area of areas) {
    if (!area) continue;
    const sanitized = area.replace(/\*\*/g, '');
    const onMatch = sanitized.match(/on [`'\"]([A-Za-z0-9_.]+)/i);
    if (onMatch) return onMatch[1];
    const tableMatch = sanitized.match(/\btable(?:\s+name)?\b\s*[:=\-]?\s*[`'\"]?([A-Za-z0-9_.]+)/i);
    if (tableMatch) return tableMatch[1];
  }

  return undefined;
}

function buildMetadata({ scriptContent, readme, directorySegments, scriptFile }) {
  const metadata = {
    application: 'Global',
    active: true,
    source: {
      repo: SOURCE_REPO,
      directory: directorySegments.join('/'),
      scriptFile,
      webUrl: `https://github.com/${SOURCE_REPO}/tree/main/${encodeSegments(directorySegments)}`,
      rawUrl: `https://raw.githubusercontent.com/${SOURCE_REPO}/main/${encodeSegments([...directorySegments, scriptFile])}`
    }
  };

  const when = extractWhen(scriptContent, readme);
  if (when) metadata.when = when;

  const table = extractTable(scriptContent, readme);
  if (table) metadata.table = table;

  return metadata;
}

async function ensureOwner(email, password) {
  const existing = await get('SELECT id FROM users WHERE email = ?', [email]);
  if (existing) {
    return existing.id;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const result = await run('INSERT INTO users (email, password_hash) VALUES (?, ?)', [email, passwordHash]);
  return result.id;
}

async function loadBusinessRule(dirPath, directorySegments) {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  const files = entries.filter((entry) => entry.isFile());
  const scriptEntry = files.find((entry) => SCRIPT_EXTENSIONS.has(path.extname(entry.name).toLowerCase()));

  if (!scriptEntry) {
    console.warn(`Skipping ${directorySegments.join('/')} - no script file found.`);
    return null;
  }

  const scriptPath = path.join(dirPath, scriptEntry.name);
  const scriptContent = (await fs.readFile(scriptPath, 'utf8')).trim();
  const readmeEntry = files.find((entry) => entry.name.toLowerCase() === 'readme.md');
  const readme = readmeEntry ? await fs.readFile(path.join(dirPath, readmeEntry.name), 'utf8') : '';

  return {
    name: directorySegments[directorySegments.length - 1],
    description: summarizeReadme(readme),
    script: scriptContent,
    metadata: buildMetadata({ scriptContent, readme, directorySegments, scriptFile: scriptEntry.name })
  };
}

async function importBusinessRules(sourceDir, ownerId) {
  const directoryEntries = await fs.readdir(sourceDir, { withFileTypes: true });
  const directories = directoryEntries.filter((entry) => entry.isDirectory());

  let created = 0;
  let updated = 0;
  const skipped = [];

  for (const dir of directories) {
    const directorySegments = ['Business Rules', dir.name];
    const snippet = await loadBusinessRule(path.join(sourceDir, dir.name), directorySegments);

    if (!snippet) {
      skipped.push(dir.name);
      continue;
    }

    const now = new Date().toISOString();
    const metadataJson = JSON.stringify(snippet.metadata);

    const existing = await get('SELECT id FROM snippets WHERE type = ? AND name = ?', ['business_rule', snippet.name]);

    if (existing) {
      await run(
        `UPDATE snippets SET description = ?, script = ?, metadata = ?, updated_at = ? WHERE id = ?`,
        [snippet.description, snippet.script, metadataJson, now, existing.id]
      );
      updated += 1;
    } else {
      await run(
        `INSERT INTO snippets (user_id, type, name, description, script, metadata, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)` ,
        [ownerId, 'business_rule', snippet.name, snippet.description, snippet.script, metadataJson, now, now]
      );
      created += 1;
    }
  }

  return { created, updated, skipped };
}

async function main() {
  const sourceDir = process.argv[2] ? path.resolve(process.argv[2]) : DEFAULT_SOURCE_DIR;
  try {
    await fs.access(sourceDir);
  } catch (err) {
    throw new Error(`Business Rules directory not found at ${sourceDir}`);
  }

  const ownerEmail = DEFAULT_OWNER_EMAIL;
  const ownerPassword = DEFAULT_OWNER_PASSWORD;

  const ownerId = await ensureOwner(ownerEmail, ownerPassword);
  const { created, updated, skipped } = await importBusinessRules(sourceDir, ownerId);

  console.log(`Business Rules import complete: ${created} added, ${updated} updated, ${skipped.length} skipped.`);
  if (skipped.length) {
    console.log('Skipped entries:', skipped.join(', '));
  }
}

main()
  .catch((err) => {
    console.error('Failed to import Business Rules snippets:', err);
    process.exitCode = 1;
  })
  .finally(() => {
    db.close();
  });
