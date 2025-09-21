import { all } from './src/db.js';

all('SELECT id, name FROM snippets WHERE name LIKE "%Department Head%" OR name LIKE "%Sync child fields%"')
  .then(rows => {
    console.log(JSON.stringify(rows, null, 2));
  })
  .catch(err => console.error(err.message));
