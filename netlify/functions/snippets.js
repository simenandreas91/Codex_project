import fs from 'fs/promises';
import path from 'path';

const snippetsFile = path.join(process.cwd(), '../../../data/snippets.json');

export default async function handler(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const fileContent = await fs.readFile(snippetsFile, 'utf8');
    const allSnippets = JSON.parse(fileContent);

    const { q, type, owned, page: pageStr, limit: limitStr } = event.queryStringParameters || {};

    let filteredSnippets = [...allSnippets];

    // Filter by type
    if (type) {
      filteredSnippets = filteredSnippets.filter(snippet => snippet.type === type);
    }

    // Filter by search q (ignore owned for now, no auth)
    if (q) {
      const searchTerm = q.toLowerCase();
      filteredSnippets = filteredSnippets.filter(snippet => {
        const desc = (snippet.description || '').toLowerCase();
        const script = (snippet.script || '').toLowerCase();
        const metaStr = JSON.stringify(snippet.metadata).toLowerCase();
        const name = (snippet.name || '').toLowerCase();
        return name.includes(searchTerm) || desc.includes(searchTerm) || script.includes(searchTerm) || metaStr.includes(searchTerm);
      });
    }

    const total = filteredSnippets.length;
    const limit = Math.max(1, Math.min(parseInt(limitStr) || 12, 100));
    const page = Math.max(1, parseInt(pageStr) || 1);
    const totalPages = Math.ceil(total / limit);
    const start = (page - 1) * limit;
    const end = start + limit;
    const items = filteredSnippets.slice(start, end);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        items,
        pagination: {
          page,
          limit,
          total,
          totalPages
        }
      }),
    };
  } catch (error) {
    console.error('Error loading snippets:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to load snippets' }),
    };
  }
}
