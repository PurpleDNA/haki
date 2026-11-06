import { config } from 'dotenv';
import { connect } from '../src/server/db';
import { migrate } from '../src/server/migrate';

config({ path: '.env.local' });
config();
const sql = connect(process.env.DATABASE_URL!, 1);
await migrate(sql);
await sql.end();
console.log('Migrations applied');
