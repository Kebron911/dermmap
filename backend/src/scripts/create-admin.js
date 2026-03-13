/**
 * Admin Bootstrap Script — Issue 21
 *
 * Creates an admin user on a fresh database where no admin exists yet.
 * Idempotent: running twice with the same email does nothing (ON CONFLICT DO NOTHING).
 *
 * Usage:
 *   node src/scripts/create-admin.js <name> <email> <password>
 *
 * Example:
 *   node src/scripts/create-admin.js "System Admin" admin@dermmap.com "SecureP@ss1234"
 */

import { randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';
import pool from '../db/pool.js';

const [,, name, email, password] = process.argv;

if (!name || !email || !password) {
  console.error('Usage: node src/scripts/create-admin.js <name> <email> <password>');
  process.exit(1);
}

if (password.length < 12) {
  console.error('Error: Password must be at least 12 characters (HIPAA requirement).');
  process.exit(1);
}

async function createAdmin() {
  const userId = randomUUID();
  const passwordHash = await bcrypt.hash(password, 12);

  const result = await pool.query(
    `INSERT INTO users (id, name, email, password_hash, role)
     VALUES ($1, $2, $3, $4, 'admin')
     ON CONFLICT (email) DO NOTHING
     RETURNING id`,
    [userId, name, email, passwordHash]
  );

  if (result.rowCount === 0) {
    console.log(`Admin user with email "${email}" already exists. No changes made.`);
  } else {
    console.log(`Admin user created: ${email} (id: ${result.rows[0].id})`);
  }

  await pool.end();
}

createAdmin().catch((err) => {
  console.error('Failed to create admin:', err.message);
  process.exit(1);
});
