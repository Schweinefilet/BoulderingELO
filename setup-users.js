#!/usr/bin/env node

/**
 * Setup user accounts for existing climbers
 * Usage: node setup-users.js
 */

const bcrypt = require('bcrypt');
const { Client } = require('pg');

// Default user credentials - change these!
const USERS = [
  { name: 'Keith', username: 'keith', password: 'changeme123', role: 'admin' },
  { name: 'Unmesh', username: 'unmesh', password: 'changeme123', role: 'user' },
  { name: 'Rehan', username: 'rehan', password: 'changeme123', role: 'user' }
];

async function setupUsers() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    await client.connect();
    console.log('Connected to database');

    for (const user of USERS) {
      // Find climber by name
      const result = await client.query(
        'SELECT id FROM climbers WHERE name = $1',
        [user.name]
      );

      if (result.rows.length === 0) {
        console.log(`⚠ Climber "${user.name}" not found in database, skipping`);
        continue;
      }

      const climberId = result.rows[0].id;
      const hashedPassword = await bcrypt.hash(user.password, 10);

      // Update climber with username, password, and role
      await client.query(
        'UPDATE climbers SET username = $1, password = $2, role = $3 WHERE id = $4',
        [user.username, hashedPassword, user.role, climberId]
      );

      console.log(`✓ Setup account for ${user.name}:`);
      console.log(`  Username: ${user.username}`);
      console.log(`  Password: ${user.password}`);
      console.log(`  Role: ${user.role}`);
      console.log();
    }

    console.log('✓ All users setup complete!');
    console.log('\n⚠ IMPORTANT: Users should change their passwords after first login');

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

setupUsers();
