// Creates the first admin: npm run create-admin -- "Full Name" email@example.com "password"
import { config } from 'dotenv';
import { connect } from '../src/server/db';
import { hashPassword } from '../src/server/passwords';

config({ path: '.env.local' });
config();
const [name, email, password] = process.argv.slice(2);
if (!name || !email || !password || password.length < 10) {
  console.error('Usage: npm run create-admin -- "Full Name" email@example.com "password of 10+ characters"');
  process.exit(1);
}
const sql = connect(process.env.DATABASE_URL!, 1);
await sql`insert into staff (name, email, password_hash, role) values (${name}, ${email.toLowerCase()}, ${await hashPassword(password)}, 'admin')`;
await sql.end();
console.log(`Admin created: ${email}`);
