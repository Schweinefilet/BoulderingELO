#!/usr/bin/env node

const API_URL = 'https://bouldering-elo-api.onrender.com';

async function addClimber(name) {
  const response = await fetch(`${API_URL}/api/climbers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name })
  });
  return await response.json();
}

async function addSession(climberId, date, wallCounts, notes = '') {
  const response = await fetch(`${API_URL}/api/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ climberId, date, wallCounts, notes })
  });
  return await response.json();
}

async function main() {
  console.log('Adding climbers...');
  
  // Add climbers
  const keith = await addClimber('Keith');
  const unmesh = await addClimber('Unmesh');
  const rehan = await addClimber('Rehan');
  
  console.log('Climbers added:', { keith, unmesh, rehan });
  console.log('\nAdding sessions...');
  
  // Keith Oct 31
  await addSession(keith.id, '2025-10-31', {
    overhang: { green: 0, blue: 0, yellow: 4, orange: 0, red: 0, black: 0 },
    midWall: { green: 0, blue: 0, yellow: 10, orange: 0, red: 0, black: 0 },
    sideWall: { green: 0, blue: 0, yellow: 4, orange: 1, red: 0, black: 0 }
  }, 'Rock Climbing');
  console.log('✓ Keith Oct 31');
  
  // Keith Oct 29
  await addSession(keith.id, '2025-10-29', {
    overhang: { green: 0, blue: 0, yellow: 4, orange: 0, red: 0, black: 0 },
    midWall: { green: 0, blue: 0, yellow: 8, orange: 0, red: 0, black: 0 },
    sideWall: { green: 0, blue: 0, yellow: 3, orange: 0, red: 0, black: 0 }
  });
  console.log('✓ Keith Oct 29');
  
  // Unmesh Oct 31
  await addSession(unmesh.id, '2025-10-31', {
    overhang: { green: 0, blue: 0, yellow: 2, orange: 0, red: 0, black: 0 },
    midWall: { green: 0, blue: 0, yellow: 5, orange: 0, red: 0, black: 0 },
    sideWall: { green: 0, blue: 0, yellow: 2, orange: 0, red: 0, black: 0 }
  });
  console.log('✓ Unmesh Oct 31');
  
  // Unmesh Oct 29
  await addSession(unmesh.id, '2025-10-29', {
    overhang: { green: 0, blue: 0, yellow: 1, orange: 0, red: 0, black: 0 },
    midWall: { green: 0, blue: 0, yellow: 4, orange: 0, red: 0, black: 0 },
    sideWall: { green: 0, blue: 0, yellow: 2, orange: 0, red: 0, black: 0 }
  });
  console.log('✓ Unmesh Oct 29');
  
  // Rehan Oct 31
  await addSession(rehan.id, '2025-10-31', {
    overhang: { green: 0, blue: 0, yellow: 4, orange: 0, red: 0, black: 0 },
    midWall: { green: 0, blue: 0, yellow: 10, orange: 0, red: 0, black: 0 },
    sideWall: { green: 0, blue: 0, yellow: 2, orange: 0, red: 0, black: 0 }
  });
  console.log('✓ Rehan Oct 31');
  
  console.log('\n✅ All data imported successfully!');
  console.log('Visit https://schweinefilet.github.io/BoulderingELO/ to see it');
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
