#!/usr/bin/env node

/**
 * Create an admin account for BoulderingELO
 * Usage: node create-admin.js <username> <password> <fullName>
 * Example: node create-admin.js keith mypassword "Keith Chambers"
 */

require('dotenv').config();
const bcrypt = require('bcrypt');
const { Client } = require('pg');

const args = process.argv.slice(2);
if (args.length < 3) {
  console.error('Usage: node create-admin.js <username> <password> <fullName>');
  console.error('Example: node create-admin.js keith mypassword "Keith Chambers"');
  process.exit(1);
}

const [username, password, fullName] = args;

async function createAdmin() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    await client.connect();
    console.log('Connected to database');

    // Check if user already exists
    const existingUser = await client.query(
      'SELECT id, username FROM climbers WHERE username = $1',
      [username]
    );

    if (existingUser.rows.length > 0) {
      console.log(`User "${username}" already exists with ID ${existingUser.rows[0].id}`);
      console.log('Updating role to admin and resetting password...');
      
      const hashedPassword = await bcrypt.hash(password, 10);
      await client.query(
        'UPDATE climbers SET password = $1, role = $2 WHERE username = $3',
        [hashedPassword, 'admin', username]
      );
      
      console.log(`✓ Updated user "${username}" to admin role`);
    } else {
      // Create new admin user
      const hashedPassword = await bcrypt.hash(password, 10);
      const result = await client.query(
        'INSERT INTO climbers (name, username, password, role) VALUES ($1, $2, $3, $4) RETURNING id',
        [fullName, username, hashedPassword, 'admin']
      );
      
      console.log(`✓ Created admin user "${username}" with ID ${result.rows[0].id}`);
    }

    console.log('\nAdmin credentials:');
    console.log(`  Username: ${username}`);
    console.log(`  Password: ${password}`);
    console.log(`  Name: ${fullName}`);
    console.log(`  Role: admin`);

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

createAdmin();
