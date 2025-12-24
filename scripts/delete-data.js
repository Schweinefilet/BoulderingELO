#!/usr/bin/env node

const API_URL = 'https://bouldering-elo-api.onrender.com';

async function listClimbers() {
  const response = await fetch(`${API_URL}/api/climbers`);
  return await response.json();
}

async function listSessions() {
  const response = await fetch(`${API_URL}/api/sessions`);
  return await response.json();
}

async function deleteSession(id) {
  const response = await fetch(`${API_URL}/api/sessions/${id}`, {
    method: 'DELETE'
  });
  return await response.json();
}

async function deleteClimber(id) {
  const response = await fetch(`${API_URL}/api/climbers/${id}`, {
    method: 'DELETE'
  });
  return await response.json();
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage:');
    console.log('  node delete-data.js list-climbers');
    console.log('  node delete-data.js list-sessions');
    console.log('  node delete-data.js delete-session <id>');
    console.log('  node delete-data.js delete-climber <id>');
    console.log('\nExamples:');
    console.log('  node delete-data.js list-climbers          # Show all climbers with IDs');
    console.log('  node delete-data.js list-sessions          # Show all sessions with IDs');
    console.log('  node delete-data.js delete-session 5       # Delete session with ID 5');
    console.log('  node delete-data.js delete-climber 2       # Delete climber 2 (and all their sessions)');
    return;
  }
  
  const command = args[0];
  
  switch (command) {
    case 'list-climbers': {
      const climbers = await listClimbers();
      console.log('\n=== Climbers ===');
      climbers.forEach(c => {
        console.log(`ID: ${c.id} - ${c.name}`);
      });
      break;
    }
    
    case 'list-sessions': {
      const sessions = await listSessions();
      const climbers = await listClimbers();
      console.log('\n=== Sessions ===');
      sessions.forEach(s => {
        const climber = climbers.find(c => c.id === s.climberId);
        const totalClimbs = s.green + s.blue + s.yellow + s.orange + s.red + s.black;
        console.log(`ID: ${s.id} - ${climber?.name || 'Unknown'} on ${s.date} - ${totalClimbs} climbs - Score: ${s.score.toFixed(2)}`);
      });
      break;
    }
    
    case 'delete-session': {
      const id = parseInt(args[1]);
      if (isNaN(id)) {
        console.error('Error: Please provide a valid session ID');
        return;
      }
      const result = await deleteSession(id);
      console.log(result);
      break;
    }
    
    case 'delete-climber': {
      const id = parseInt(args[1]);
      if (isNaN(id)) {
        console.error('Error: Please provide a valid climber ID');
        return;
      }
      console.log('⚠️  Warning: This will also delete all sessions for this climber!');
      const result = await deleteClimber(id);
      console.log(result);
      break;
    }
    
    default:
      console.error(`Unknown command: ${command}`);
      console.log('Run without arguments to see usage');
  }
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
