import { db, get } from '../src/db.js';

try {
  const rest = db.prepare('SELECT COUNT(*) as count FROM snippets WHERE type = "rest_message_v2"').get();
  console.log('RESTMessageV2 scripts count:', rest ? rest.count : 'Error querying');
} catch (error) {
  console.error('Query error:', error.message);
} finally {
  db.close();
}
