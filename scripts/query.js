import { db } from '../src/db.js';

try {
  const rows = db.prepare('SELECT * FROM snippets LIMIT 5').all();
  console.log('Sample rows count:', rows.length);
  if (rows.length > 0) {
    console.log('Sample row:', JSON.stringify(rows[0], null, 2));
  }

  const total = db.prepare('SELECT COUNT(*) as count FROM snippets').get();
  console.log('Total snippets:', total ? total.count : 'Error querying total');

  const mail = db.prepare('SELECT COUNT(*) as count FROM snippets WHERE type = "mail_script"').get();
  console.log('Mail scripts:', mail ? mail.count : 'Error querying mail scripts');

  const widgets = db.prepare('SELECT COUNT(*) as count FROM snippets WHERE type = "service_portal_widget"').get();
  console.log('Service Portal Widgets:', widgets ? widgets.count : 'Error querying widgets');

  // Check if table exists
  const tableInfo = db.prepare('SELECT name FROM sqlite_master WHERE type="table" AND name="snippets"').get();
  console.log('Snippets table exists:', !!tableInfo);
} catch (error) {
  console.error('DB query error:', error.message);
}

db.close();
