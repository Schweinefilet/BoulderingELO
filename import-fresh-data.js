#!/usr/bin/env node

/**
 * Import fresh climbing data
 * Usage: node import-fresh-data.js
 */

const bcrypt = require('bcrypt');
const { Client } = require('pg');

const CLIMBERS = [
  { name: 'Keith Duong', username: 'keith', password: 'boulder123', role: 'admin' },
  { name: 'Unmesh', username: 'unmesh', password: 'boulder123', role: 'user' },
  { name: 'Rehan', username: 'rehan', password: 'boulder123', role: 'user' }
];

const SESSIONS = [
  // Keith Oct 31
  {
    climber: 'Keith Duong',
    date: '2024-10-31',
    notes: 'Rock Climbing session',
    wallCounts: {
      midWall: { yellow: 10, orange: 0, red: 0, black: 0, blue: 0, green: 0 },
      overhang: { yellow: 4, orange: 0, red: 0, black: 0, blue: 0, green: 0 },
      sideWall: { yellow: 4, orange: 1, red: 0, black: 0, blue: 0, green: 0 }
    }
  },
  // Keith Oct 29
  {
    climber: 'Keith Duong',
    date: '2024-10-29',
    notes: 'Session',
    wallCounts: {
      midWall: { yellow: 8, orange: 0, red: 0, black: 0, blue: 0, green: 0 },
      overhang: { yellow: 4, orange: 0, red: 0, black: 0, blue: 0, green: 0 },
      sideWall: { yellow: 3, orange: 0, red: 0, black: 0, blue: 0, green: 0 }
    }
  },
  // Unmesh Oct 31
  {
    climber: 'Unmesh',
    date: '2024-10-31',
    notes: 'Session',
    wallCounts: {
      midWall: { yellow: 5, orange: 0, red: 0, black: 0, blue: 0, green: 0 },
      overhang: { yellow: 2, orange: 0, red: 0, black: 0, blue: 0, green: 0 },
      sideWall: { yellow: 2, orange: 0, red: 0, black: 0, blue: 0, green: 0 }
    }
  },
  // Unmesh Oct 29
  {
    climber: 'Unmesh',
    date: '2024-10-29',
    notes: 'Session',
    wallCounts: {
      midWall: { yellow: 4, orange: 0, red: 0, black: 0, blue: 0, green: 0 },
      overhang: { yellow: 1, orange: 0, red: 0, black: 0, blue: 0, green: 0 },
      sideWall: { yellow: 2, orange: 0, red: 0, black: 0, blue: 0, green: 0 }
    }
  },
  // Rehan Oct 31
  {
    climber: 'Rehan',
    date: '2024-10-31',
    notes: 'Session',
    wallCounts: {
      midWall: { yellow: 10, orange: 0, red: 0, black: 0, blue: 0, green: 0 },
      overhang: { yellow: 4, orange: 0, red: 0, black: 0, blue: 0, green: 0 },
      sideWall: { yellow: 2, orange: 0, red: 0, black: 0, blue: 0, green: 0 }
    }
  }
];

function calculateScore(wallCounts) {
  const r = 0.95;
  const BASE = {
    black: 108,
    red: 36,
    orange: 12,
    yellow: 4,
    blue: 1.5,
    green: 0.5
  };
  
  // Combine all wall counts
  const totalCounts = {
    black: 0, red: 0, orange: 0, yellow: 0, blue: 0, green: 0
  };
  
  for (const wall of ['midWall', 'overhang', 'sideWall']) {
    if (wallCounts[wall]) {
      for (const color of Object.keys(totalCounts)) {
        totalCounts[color] += wallCounts[wall][color] || 0;
      }
    }
  }
  
  // Calculate score
  const ORDER = ['black', 'red', 'orange', 'yellow', 'blue', 'green'];
  let score = 0;
  let cumulative = 0;
  
  for (const color of ORDER) {
    const count = totalCounts[color];
    if (count > 0) {
      const base = BASE[color];
      const W_before = (1 - Math.pow(r, cumulative)) / (1 - r);
      const W_after = (1 - Math.pow(r, cumulative + count)) / (1 - r);
      score += base * (W_after - W_before);
      cumulative += count;
    }
  }
  
  return score;
}

async function importFreshData() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    await client.connect();
    console.log('Connected to database\n');

    // Create climbers with accounts
    console.log('Creating climbers...');
    const climberMap = {};
    
    for (const climber of CLIMBERS) {
      const hashedPassword = await bcrypt.hash(climber.password, 10);
      const result = await client.query(
        'INSERT INTO climbers (name, username, password, role) VALUES ($1, $2, $3, $4) RETURNING id',
        [climber.name, climber.username, hashedPassword, climber.role]
      );
      climberMap[climber.name] = result.rows[0].id;
      console.log(`✓ Created ${climber.name} (${climber.role})`);
    }

    // Create sessions
    console.log('\nCreating sessions...');
    let sessionCount = 0;
    
    for (const session of SESSIONS) {
      const climberId = climberMap[session.climber];
      const score = calculateScore(session.wallCounts);
      
      // Insert session
      const sessionResult = await client.query(
        'INSERT INTO sessions (climber_id, date, score, notes, status) VALUES ($1, $2, $3, $4, $5) RETURNING id',
        [climberId, session.date, score, session.notes, 'approved']
      );
      const sessionId = sessionResult.rows[0].id;
      
      // Insert wall counts
      for (const wall of ['midWall', 'overhang', 'sideWall']) {
        const counts = session.wallCounts[wall];
        await client.query(
          'INSERT INTO wall_counts (session_id, wall, green, blue, yellow, orange, red, black) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
          [sessionId, wall, counts.green, counts.blue, counts.yellow, counts.orange, counts.red, counts.black]
        );
      }
      
      // Insert total counts
      const totalCounts = {
        black: 0, red: 0, orange: 0, yellow: 0, blue: 0, green: 0
      };
      for (const wall of ['midWall', 'overhang', 'sideWall']) {
        for (const color of Object.keys(totalCounts)) {
          totalCounts[color] += session.wallCounts[wall][color] || 0;
        }
      }
      
      await client.query(
        'INSERT INTO counts (session_id, green, blue, yellow, orange, red, black) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [sessionId, totalCounts.green, totalCounts.blue, totalCounts.yellow, totalCounts.orange, totalCounts.red, totalCounts.black]
      );
      
      console.log(`✓ ${session.climber} - ${session.date} (Score: ${score.toFixed(2)})`);
      sessionCount++;
    }

    console.log('\n✅ Import completed successfully!');
    console.log(`\nSummary:`);
    console.log(`  - ${CLIMBERS.length} climbers created`);
    console.log(`  - ${sessionCount} sessions imported`);
    console.log(`\nLogin credentials (all users):`);
    console.log(`  Password: boulder123`);
    console.log(`\nAccounts:`);
    CLIMBERS.forEach(c => {
      console.log(`  - ${c.name}: username="${c.username}", role=${c.role}`);
    });
    console.log(`\n⚠️  Please change passwords after first login!`);

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

importFreshData();
