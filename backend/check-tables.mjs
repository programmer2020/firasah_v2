import { executeQuery } from './dist/helpers/database.js';

const tables = await executeQuery("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
console.log('Tables in database:');
tables.rows.forEach(t => console.log('  -', t.table_name));

// Check if fragments table exists
const fragments = await executeQuery("SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'fragments'");
console.log('\nFragments table exists:', fragments.rows[0].count === '1');
