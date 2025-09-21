import path from 'path';
import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import { db, run, get } from '../src/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SOURCE_REPO = 'ServiceNowDevProgram/code-snippets';
const REPO_ROOT = path.join(__dirname, '..', 'tmp', 'code-snippets');
const DEFAULT_OWNER_EMAIL = process.env.SNIPPET_SEED_EMAIL ?? 'library@servicenow.dev';
const DEFAULT_OWNER_PASSWORD = process.env.SNIPPET_SEED_PASSWORD ?? 'changeme';
const SCRIPT_EXTENSIONS = new Set(['.js', '.jss', '.ts']);

const CATEGORY_CONFIG = [
  {
    label: 'Client Scripts',
    type: 'client_script',
    directory: 'Client Scripts',
    buildMetadata: buildClientScriptMetadata
  },
  {
    label: 'UI Actions',
    type: 'ui_action',
    directory: 'UI Actions',
    buildMetadata: buildUiActionMetadata
  },
  {
    label: 'Script Includes',
    type: 'script_include',
    directory: 'Script Includes',
    buildMetadata: buildScriptIncludeMetadata
  },
  {
    label: 'Scheduled Jobs',
    type: 'scheduled_job',
    directory: 'Scheduled Jobs',
    buildMetadata: buildScheduledJobMetadata
  },
  {
    label: 'Inbound Actions',
    type: 'inbound_action',
    directory: 'Inbound Actions',
    buildMetadata: buildInboundActionMetadata
  },
  {
    label: 'Fix scripts',
    type: 'fix_script',
    directory: 'Fix scripts',
    buildMetadata: buildFixScriptMetadata
  },
  {
    label: 'Service Portal Widgets',
    type: 'service_portal_widget',
    directory: 'Service Portal Widgets',
    buildMetadata: buildWidgetMetadata,
    readFiles: readWidgetFiles
  },
  {
    label: 'Mail Scripts',
    type: 'mail_script',
    directory: 'Mail Scripts',
    buildMetadata: buildMailScriptMetadata
  }
];

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

function parseKeyValueMap(markdown) {
  const map = new Map();
  if (!markdown) return map;
  const lines = markdown.split(/\r?\n/);
  const pattern = /^[-*•\u2022\u2023\u25E6\u25AA\u25CF\s]*([A-Za-z0-9 _/#()]+?)\s*[:=]\s*(.+)$/;
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const match = line.match(pattern);
    if (match) {
      const key = match[1].trim().toLowerCase();
      const value = match[2].trim();
      if (key) {
        map.set(key, value);
      }
    }
  }
  return map;
}

function getValue(map, keys) {
  for (const key of keys) {
    const value = map.get(key.toLowerCase());
    if (value !== undefined) {
      return value;
    }
  }
  return undefined;
}

function parseBoolean(value, fallback) {
  if (value === undefined || value === null) return fallback;
  const normalized = value.toString().trim().toLowerCase();
  if (['true', 'yes', 'y', '1', 'active', 'checked', 'on'].includes(normalized)) {
    return true;
  }
  if (['false', 'no', 'n', '0', 'inactive', 'unchecked', 'off'].includes(normalized)) {
    return false;
  }
  return fallback;
}

function normalizeTableValue(value) {
  if (!value) return 'Unknown';
  const trimmed = value.trim();
  if (!trimmed) return 'Unknown';
  const lower = trimmed.toLowerCase();
  const firstWord = lower.split(/\s+/)[0];
  const discouragedStarts = ['select', 'choose', 'set', 'this', 'any'];
  if (discouragedStarts.includes(firstWord)) {
    return 'Unknown';
  }
  if (/^[A-Za-z0-9_.]+$/.test(trimmed)) {
    return trimmed;
  }
  const quoted = trimmed.match(/[\"'`\[]([A-Za-z0-9_.]+)[\"'`\]]/);
  if (quoted) {
    return quoted[1];
  }
  const simple = trimmed.match(/([A-Za-z0-9_.]+)/);
  if (simple) {
    const candidate = simple[1];
    if (!discouragedStarts.includes(candidate.toLowerCase())) {
      return candidate;
    }
  }
  return trimmed.length > 40 ? 'Unknown' : trimmed;
}

function extractTableFromText(text) {
  if (!text) return undefined;
  const mapMatch = text.match(/table(?:\s+name)?\s*[:=\-]?\s*[`'\"]?([A-Za-z0-9_.]+)/i);
  if (mapMatch) return mapMatch[1];
  const onMatch = text.match(/on\s+(?:the\s+)?([A-Za-z0-9_]+)\s+table/i);
  if (onMatch) return onMatch[1];
  return undefined;
}

function combineScripts(dirPath, entries) {
  if (!entries.length) return '';
  const sorted = [...entries].sort((a, b) => a.name.localeCompare(b.name));
  const parts = [];
  for (const entry of sorted) {
    const header = sorted.length > 1 ? `// File: ${entry.name}\n` : '';
    parts.push(header + entry.content.trim());
  }
  return parts.join('\n\n').trim();
}

async function readScriptFiles(dirPath, dirents) {
  const scripts = [];
  for (const entry of dirents) {
    if (!entry.isFile()) continue;
    const ext = path.extname(entry.name).toLowerCase();
    if (!SCRIPT_EXTENSIONS.has(ext)) continue;
    const content = await fs.readFile(path.join(dirPath, entry.name), 'utf8');
    scripts.push({ name: entry.name, content });
  }
  return scripts;
}

function normalizeClientScriptType(value) {
  if (!value) return 'Unspecified';
  const normalized = value.trim().toLowerCase();
  const map = new Map([
    ['onload', 'onLoad'],
    ['on load', 'onLoad'],
    ['onchange', 'onChange'],
    ['on change', 'onChange'],
    ['onsubmit', 'onSubmit'],
    ['on submit', 'onSubmit'],
    ['oncelledit', 'onCellEdit'],
    ['on cell edit', 'onCellEdit']
  ]);
  return map.get(normalized) ?? 'Unspecified';
}

function normalizeInboundType(value) {
  if (!value) return 'Unspecified';
  const normalized = value.trim().toLowerCase();
  if (normalized.includes('reply')) return 'Reply';
  if (normalized.includes('forward')) return 'Forward';
  if (normalized.includes('new')) return 'New';
  return 'Unspecified';
}

function inferFrequencyFromText(value) {
  if (!value) return undefined;
  const text = value.toString().toLowerCase();
  if (text.includes('daily')) return 'Daily';
  if (text.includes('weekly')) return 'Weekly';
  if (text.includes('monthly')) return 'Monthly';
  if (text.includes('hour')) return 'Hourly';
  if (text.includes('quarter')) return 'Quarterly';
  if (text.includes('year')) return 'Yearly';
  if (text.includes('cron')) return value.trim();
  return undefined;
}

function detectApplication(map, readme) {
  const value = getValue(map, ['application', 'scope']);
  if (value) {
    return value;
  }
  if (readme && /scoped/i.test(readme)) {
    const match = readme.match(/application\s+([A-Za-z0-9_]+)/i);
    if (match) return match[1];
  }
  return 'Global';
}

function buildClientScriptMetadata({ readme, scriptContent }) {
  const map = parseKeyValueMap(readme);
  const application = detectApplication(map, readme);
  const tableValue = getValue(map, ['table']) ?? extractTableFromText(readme);
  const table = normalizeTableValue(tableValue);
  const type = normalizeClientScriptType(getValue(map, ['type', 'script type']));
  const field = getValue(map, ['field', 'target field', 'field name']);
  const active = parseBoolean(getValue(map, ['active']), true);

  const metadata = { application, table, type, active };
  if (field) {
    metadata.field = field;
  }

  return metadata;
}

function buildUiActionMetadata({ readme, scriptContent }) {
  const map = parseKeyValueMap(readme);
  const loweredReadme = readme ?? '';
  const application = detectApplication(map, readme);
  const tableValue = getValue(map, ['table']) ?? extractTableFromText(readme);
  const table = normalizeTableValue(tableValue);
  const showInsert = parseBoolean(getValue(map, ['show insert']), true);
  const showUpdate = parseBoolean(getValue(map, ['show update']), true);
  let client = parseBoolean(getValue(map, ['client']), false);
  if (!map.has('client') && /client callable/i.test(loweredReadme)) {
    client = true;
  }
  const formLink = parseBoolean(getValue(map, ['form link', 'display as form link']), false);
  const onClick = getValue(map, ['onclick', 'on click']);
  const condition = getValue(map, ['condition']) ?? '';

  return {
    application,
    table,
    showInsert,
    showUpdate,
    client,
    formLink,
    onClick,
    condition
  };
}

function buildScriptIncludeMetadata({ readme, scriptContent }) {
  const map = parseKeyValueMap(readme);
  const application = detectApplication(map, readme);
  let accessibleFrom = getValue(map, ['accessible from', 'scope']) ?? 'All application scopes';
  accessibleFrom = accessibleFrom.toLowerCase().includes('this application')
    ? 'This application scope only'
    : 'All application scopes';
  let clientCallable = parseBoolean(getValue(map, ['client callable']), false);
  if (!map.has('client callable') && /client callable/i.test(readme ?? '')) {
    clientCallable = true;
  }
  if (!clientCallable && /GlideAjax/i.test(scriptContent ?? '')) {
    clientCallable = true;
  }
  return {
    application,
    accessibleFrom,
    clientCallable
  };
}

function buildScheduledJobMetadata({ readme }) {
  const map = parseKeyValueMap(readme);
  const application = detectApplication(map, readme);
  const frequencyRaw = getValue(map, ['frequency', 'run frequency', 'schedule', 'when']) ?? inferFrequencyFromText(readme);
  const runFrequency = inferFrequencyFromText(frequencyRaw);
  const runAs = getValue(map, ['run as', 'run as user', 'execute as']) ?? '';
  const active = parseBoolean(getValue(map, ['active']), true);
  const condition =
    getValue(map, ['condition', 'filter', 'encoded query', 'query']) ?? '';

  const metadata = {
    application,
    active
  };
  if (runFrequency) metadata.runFrequency = runFrequency;
  if (runAs) metadata.runAs = runAs;
  if (condition) metadata.condition = condition;
  return metadata;
}

function buildInboundActionMetadata({ readme }) {
  const map = parseKeyValueMap(readme);
  const application = detectApplication(map, readme);
  const tableValue = getValue(map, ['table', 'target table']) ?? extractTableFromText(readme);
  const table = normalizeTableValue(tableValue);
  const type = normalizeInboundType(getValue(map, ['type', 'action type']));
  const stopProcessing = parseBoolean(getValue(map, ['stop processing']), false);
  const active = parseBoolean(getValue(map, ['active']), true);
  const condition = getValue(map, ['condition', 'criteria']) ?? '';

  return {
    application,
    targetTable: table,
    type,
    stopProcessing,
    active,
    condition
  };
}

function buildFixScriptMetadata({ readme }) {
  const map = parseKeyValueMap(readme);
  const application = detectApplication(map, readme);
  let runContext = getValue(map, ['run context', 'usage', 'context']);
  if (!runContext && readme) {
    if (/post[- ]clone/i.test(readme)) {
      runContext = 'Post-clone';
    } else if (/background script/i.test(readme)) {
      runContext = 'Background script';
    } else if (/fix script/i.test(readme)) {
      runContext = 'Fix script';
    }
  }
  const notes = summarizeReadme(readme).slice(0, 400);
  const metadata = { application };
  if (runContext) metadata.runContext = runContext;
  if (notes) metadata.notes = notes;
  return metadata;
}

async function readWidgetFiles(snippetDir, entries) {
  const widgetFiles = {};
  const fileNames = {
    html: ['HTML Template.html', 'html.html', 'template.html'],
    css: ['CSS-SCSS.scss', 'css.css', 'styles.scss', 'style.css'],
    client: ['client controller.js', 'client_script.js', 'client.js'],
    server: ['server script.js', 'server_script.js', 'server.js']
  };

  for (const [key, possibleNames] of Object.entries(fileNames)) {
    for (const name of possibleNames) {
      const entry = entries.find(e => e.isFile() && e.name.toLowerCase() === name.toLowerCase());
      if (entry) {
        const content = await fs.readFile(path.join(snippetDir, entry.name), 'utf8');
        widgetFiles[key] = { name: entry.name, content: content.trim() };
        break;
      }
    }
  }

  return widgetFiles;
}

function buildWidgetMetadata({ readme, widgetFiles, directorySegments }) {
  const map = parseKeyValueMap(readme);
  const application = detectApplication(map, readme) || 'Global';
  const name = directorySegments[directorySegments.length - 1].replace(/%20/g, ' ').trim();
  const id = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

  const metadata = {
    application,
    name,
    id,
    active: parseBoolean(getValue(map, ['active']), true)
  };

  if (widgetFiles.html) metadata.html_template = widgetFiles.html.content;
  if (widgetFiles.css) metadata.css = widgetFiles.css.content;
  if (widgetFiles.client) metadata.client_script = widgetFiles.client.content;
  if (widgetFiles.server) metadata.server_script = widgetFiles.server.content;

  return metadata;
}

function buildMailScriptMetadata({ readme, scriptContent, scriptFiles, directorySegments }) {
  const map = parseKeyValueMap(readme);
  const application = detectApplication(map, readme) || 'Global';
  const tableValue = getValue(map, ['table']) ?? extractTableFromText(readme) ?? extractTableFromText(scriptContent);
  const table = normalizeTableValue(tableValue) || 'incident';
  const active = parseBoolean(getValue(map, ['active']), true);

  return {
    application,
    table,
    active
  };
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

async function importCategory({ label, type, directory, buildMetadata, readFiles = readScriptFiles }, ownerId) {
  const sourceDir = path.join(REPO_ROOT, directory);
  try {
    await fs.access(sourceDir);
  } catch (error) {
    console.warn(`Skipping ${label} - directory not found at ${sourceDir}`);
    return { created: 0, updated: 0, skipped: [] };
  }

  const dirents = await fs.readdir(sourceDir, { withFileTypes: true });
  const subdirectories = dirents.filter((entry) => entry.isDirectory());

  let created = 0;
  let updated = 0;
  const skipped = [];

  for (const dirent of subdirectories) {
    const snippetDir = path.join(sourceDir, dirent.name);
    const entries = await fs.readdir(snippetDir, { withFileTypes: true });
    const files = await readFiles(snippetDir, entries);

    if (type === 'service_portal_widget' && Object.keys(files).length === 0) {
      skipped.push(dirent.name);
      continue;
    }

    if (type !== 'service_portal_widget' && !files.length) {
      skipped.push(dirent.name);
      continue;
    }

    let script = '';
    let fileList = [];
    if (type === 'service_portal_widget') {
      // Combine widget files with headers for script field
      const orderedKeys = ['html', 'css', 'client', 'server'];
      const parts = [];
      for (const key of orderedKeys) {
        if (files[key]) {
          const header = `// ${key.toUpperCase()} from ${files[key].name}\n`;
          parts.push(header + files[key].content);
          fileList.push(files[key].name);
        }
      }
      script = parts.join('\n\n---\n\n');
    } else {
      script = combineScripts(snippetDir, files);
      fileList = files.map(f => f.name);
    }

    if (!script) {
      skipped.push(dirent.name);
      continue;
    }

    const readmeEntry = entries.find((entry) => entry.isFile() && entry.name.toLowerCase() === 'readme.md');
    const readme = readmeEntry ? await fs.readFile(path.join(snippetDir, readmeEntry.name), 'utf8') : '';

    const directorySegments = [directory, dirent.name];
    const metadataInput = type === 'service_portal_widget' 
      ? { readme, widgetFiles: files, directorySegments }
      : { readme, scriptContent: script, scriptFiles: files, directorySegments };
    const metadata = buildMetadata(metadataInput);

    metadata.application = metadata.application ?? 'Global';
    metadata.source = {
      repo: SOURCE_REPO,
      directory: directorySegments.join('/'),
      scriptFiles: fileList,
      webUrl: `https://github.com/${SOURCE_REPO}/tree/main/${encodeSegments(directorySegments)}`,
      rawUrl: fileList.length === 1
        ? `https://raw.githubusercontent.com/${SOURCE_REPO}/main/${encodeSegments([...directorySegments, fileList[0]])}`
        : undefined
    };

    const description = summarizeReadme(readme);
    const now = new Date().toISOString();
    const metadataJson = JSON.stringify(metadata);

    const existing = await get('SELECT id FROM snippets WHERE type = ? AND name = ?', [type, dirent.name]);

    if (existing) {
      await run(
        `UPDATE snippets SET description = ?, script = ?, metadata = ?, updated_at = ? WHERE id = ?`,
        [description, script, metadataJson, now, existing.id]
      );
      updated += 1;
    } else {
      await run(
        `INSERT INTO snippets (user_id, type, name, description, script, metadata, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)` ,
        [ownerId, type, dirent.name, description, script, metadataJson, now, now]
      );
      created += 1;
    }
  }

  return { created, updated, skipped };
}

async function main() {
  const ownerId = await ensureOwner(DEFAULT_OWNER_EMAIL, DEFAULT_OWNER_PASSWORD);
  const results = [];

  for (const category of CATEGORY_CONFIG) {
    const outcome = await importCategory(category, ownerId);
    results.push({ category: category.label, ...outcome });
  }

  for (const { category, created, updated, skipped } of results) {
    console.log(`${category}: ${created} added, ${updated} updated, ${skipped.length} skipped.`);
    if (skipped.length) {
      console.log(`  Skipped: ${skipped.join(', ')}`);
    }
  }
}

main()
  .catch((err) => {
    console.error('Failed to import snippets:', err);
    process.exitCode = 1;
  })
  .finally(() => {
    db.close();
  });
