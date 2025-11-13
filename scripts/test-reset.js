#!/usr/bin/env node
// Simple integration script to exercise the reset -> list audits -> undo flow
// Usage:
// ADMIN_TOKEN=ey... API_URL=http://localhost:3000 TEST_WALL="Garage Wall" node scripts/test-reset.js

const API_URL = process.env.API_URL || 'http://localhost:3000';
const TOKEN = process.env.ADMIN_TOKEN || process.env.TOKEN;
const WALL = process.env.TEST_WALL || 'Garage Wall';

if (!TOKEN) {
  console.error('ERROR: ADMIN_TOKEN (or TOKEN) environment variable required');
  process.exit(1);
}

async function fetchJson(path, opts = {}) {
  const res = await fetch(`${API_URL}${path}`, opts);
  const text = await res.text();
  try { return { ok: res.ok, status: res.status, data: JSON.parse(text) } } catch (e) { return { ok: res.ok, status: res.status, data: text } }
}

(async function main(){
  console.log('API URL:', API_URL);
  console.log('Testing reset flow for wall:', WALL);

  try {
    console.log('\n1) Calling POST /api/admin/reset-wall');
    const resetRes = await fetchJson('/api/admin/reset-wall', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${TOKEN}` },
      body: JSON.stringify({ wall: WALL })
    });

    if (!resetRes.ok) {
      console.error('Reset failed:', resetRes.status, resetRes.data);
      process.exit(2);
    }

    console.log('Reset response:', JSON.stringify(resetRes.data, null, 2));
    const auditId = resetRes.data.auditId;

    // Wait a moment for server-side writes
    await new Promise(r => setTimeout(r, 800));

    console.log('\n2) Fetching audits via GET /api/admin/reset-audits');
    const auditsRes = await fetchJson('/api/admin/reset-audits', { headers: { 'Authorization': `Bearer ${TOKEN}` } });
    if (!auditsRes.ok) {
      console.error('Failed to fetch audits:', auditsRes.status, auditsRes.data);
    } else {
      console.log('Audits:', JSON.stringify(auditsRes.data, null, 2));
    }

    if (!auditId) {
      console.warn('No auditId returned from reset. Aborting undo step.');
      process.exit(0);
    }

    console.log(`\n3) Undoing reset by auditId: ${auditId}`);
    const undoRes = await fetchJson('/api/admin/reset-wall/undo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${TOKEN}` },
      body: JSON.stringify({ auditId })
    });

    if (!undoRes.ok) {
      console.error('Undo failed:', undoRes.status, undoRes.data);
      process.exit(3);
    }

    console.log('Undo response:', JSON.stringify(undoRes.data, null, 2));
    console.log('\nTest flow complete.');
    process.exit(0);
  } catch (err) {
    console.error('Unexpected error:', err);
    process.exit(4);
  }
})();
