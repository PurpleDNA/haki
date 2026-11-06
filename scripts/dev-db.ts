// A local Postgres that needs no Docker. It runs PGlite and accepts one connection at a time,
// so set DATABASE_MAX_CONNECTIONS=1 in .env.local.
import { PGlite } from '@electric-sql/pglite';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';

const port = Number(process.env.PORT ?? 5433);
const pg = await PGlite.create(process.env.PGLITE_DIR ?? '.pglite');
const server = new PGLiteSocketServer({ db: pg, port, host: '127.0.0.1' });
await server.start();
console.log(`Local database ready on 127.0.0.1:${port}`);
