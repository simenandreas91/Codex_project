import { run } from './src/db.js';

Promise.all([
  run('DELETE FROM snippets WHERE id = 1'),
  run('DELETE FROM snippets WHERE id = 2')
])
  .then(results => {
    console.log('Deleted:', results.map(r => ({id: r.id, changes: r.changes})));
  })
  .catch(err => console.error(err.message));
