#!/usr/bin/env node
/**
 * One-time script to clear the expiredSections setting from the database
 * Run with: node clear-expired-sections.js
 */

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function clearExpiredSections() {
  try {
    console.log('Connecting to database...');
    
    // Delete the expiredSections setting
    const result = await pool.query(
      "DELETE FROM settings WHERE key = 'expiredSections' RETURNING *"
    );
    
    if (result.rowCount > 0) {
      console.log('✅ Cleared expiredSections setting from database');
      console.log('   Previous value:', result.rows[0].value);
    } else {
      console.log('ℹ️  No expiredSections setting found (already clean)');
    }
    
    // Also clear any wall totals that might be zeroed
    console.log('\nChecking wall totals...');
    const totalsResult = await pool.query(
      "SELECT value FROM settings WHERE key = 'wallTotals'"
    );
    
    if (totalsResult.rows.length > 0) {
      const wallTotals = totalsResult.rows[0].value;
      console.log('Current wall totals:', JSON.stringify(wallTotals, null, 2));
    }
    
    console.log('\n✅ Done! The expired sections feature has been completely removed.');
    console.log('   Mini Overhang and Mini Garage should now count normally.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

clearExpiredSections();
