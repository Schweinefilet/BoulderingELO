#!/usr/bin/env node

/**
 * Merge "Keith" account into "Keith Duong" and make Keith Duong the admin
 * All Keith's sessions will be transferred to Keith Duong
 * Usage: node merge-keith-accounts.js
 */

const bcrypt = require('bcrypt');
const { Client } = require('pg');

async function mergeAccounts() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    await client.connect();
    console.log('Connected to database\n');

    // Find both climbers
    const keithResult = await client.query(
      "SELECT id, name FROM climbers WHERE name = 'Keith'"
    );
    
    const keithDuongResult = await client.query(
      "SELECT id, name FROM climbers WHERE name = 'Keith Duong'"
    );

    if (keithResult.rows.length === 0) {
      console.log('❌ "Keith" account not found');
      process.exit(1);
    }

    if (keithDuongResult.rows.length === 0) {
      console.log('❌ "Keith Duong" account not found');
      process.exit(1);
    }

    const keithId = keithResult.rows[0].id;
    const keithDuongId = keithDuongResult.rows[0].id;

    console.log(`Found accounts:`);
    console.log(`  Keith: ID ${keithId}`);
    console.log(`  Keith Duong: ID ${keithDuongId}\n`);

    // Count sessions for each
    const keithSessions = await client.query(
      'SELECT COUNT(*) as count FROM sessions WHERE climber_id = $1',
      [keithId]
    );
    
    const keithDuongSessions = await client.query(
      'SELECT COUNT(*) as count FROM sessions WHERE climber_id = $1',
      [keithDuongId]
    );

    console.log(`Sessions:`);
    console.log(`  Keith: ${keithSessions.rows[0].count} sessions`);
    console.log(`  Keith Duong: ${keithDuongSessions.rows[0].count} sessions\n`);

    // Start transaction
    await client.query('BEGIN');

    // Transfer all Keith's sessions to Keith Duong
    const transferResult = await client.query(
      'UPDATE sessions SET climber_id = $1 WHERE climber_id = $2',
      [keithDuongId, keithId]
    );
    console.log(`✓ Transferred ${transferResult.rowCount} sessions from Keith to Keith Duong`);

    // Transfer wall counts
    const wallTransferResult = await client.query(
      'UPDATE wall_counts SET session_id = (SELECT id FROM sessions WHERE climber_id = $1 LIMIT 1) WHERE session_id IN (SELECT id FROM sessions WHERE climber_id = $2)',
      [keithDuongId, keithId]
    );
    console.log(`✓ Updated wall counts`);

    // Transfer climb counts
    const countTransferResult = await client.query(
      'UPDATE counts SET session_id = (SELECT id FROM sessions WHERE climber_id = $1 LIMIT 1) WHERE session_id IN (SELECT id FROM sessions WHERE climber_id = $2)',
      [keithDuongId, keithId]
    );
    console.log(`✓ Updated counts`);

    // Delete old Keith account
    await client.query('DELETE FROM climbers WHERE id = $1', [keithId]);
    console.log(`✓ Deleted old "Keith" account\n`);

    // Setup Keith Duong as admin with username/password
    const username = 'keith';
    const password = 'changeme123'; // User should change this!
    const hashedPassword = await bcrypt.hash(password, 10);

    await client.query(
      'UPDATE climbers SET username = $1, password = $2, role = $3 WHERE id = $4',
      [username, hashedPassword, 'admin', keithDuongId]
    );

    console.log(`✓ Setup Keith Duong as admin account:`);
    console.log(`  Username: ${username}`);
    console.log(`  Password: ${password} (CHANGE THIS!)`);
    console.log(`  Role: admin`);

    // Commit transaction
    await client.query('COMMIT');
    
    console.log('\n✅ Merge completed successfully!');
    console.log('\nFinal state:');
    console.log(`  - All sessions now belong to "Keith Duong" (ID ${keithDuongId})`);
    console.log(`  - "Keith Duong" is now the admin account`);
    console.log(`  - Login with username: keith, password: changeme123`);

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

mergeAccounts();
