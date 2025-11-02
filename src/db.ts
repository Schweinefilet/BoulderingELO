import { Pool } from 'pg';
import bcrypt from 'bcrypt';
import { Counts, Climber, Session, WallCounts } from './types';

// Parse DATABASE_URL manually to avoid issues with special characters in password
const dbUrl = process.env.DATABASE_URL || '';
let poolConfig: any = {};

if (dbUrl.startsWith('postgresql://') || dbUrl.startsWith('postgres://')) {
  try {
    const url = new URL(dbUrl);
    poolConfig = {
      user: url.username,
      password: decodeURIComponent(url.password),
      host: url.hostname,
      port: parseInt(url.port) || 5432,
      database: url.pathname.slice(1),
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
      connectionTimeoutMillis: 5000,
    };
    console.log('Database config:', { ...poolConfig, password: '***' });
  } catch (e) {
    console.error('Failed to parse DATABASE_URL:', e);
    poolConfig = { connectionString: dbUrl };
  }
} else {
  poolConfig = { connectionString: dbUrl };
}

const pool = new Pool(poolConfig);

// Initialize database tables
export async function initDB() {
  // Add password and role columns to climbers table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS climbers (
      id SERIAL PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      username TEXT UNIQUE,
      password TEXT,
      role TEXT DEFAULT 'user',
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  
  await pool.query(`
    CREATE TABLE IF NOT EXISTS sessions (
      id SERIAL PRIMARY KEY,
      climber_id INTEGER REFERENCES climbers(id),
      date TEXT NOT NULL,
      score REAL NOT NULL,
      notes TEXT,
      status TEXT DEFAULT 'approved',
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  
  await pool.query(`
    CREATE TABLE IF NOT EXISTS counts (
      session_id INTEGER PRIMARY KEY REFERENCES sessions(id) ON DELETE CASCADE,
      green INTEGER DEFAULT 0,
      blue INTEGER DEFAULT 0,
      yellow INTEGER DEFAULT 0,
      orange INTEGER DEFAULT 0,
      red INTEGER DEFAULT 0,
      black INTEGER DEFAULT 0
    )
  `);
  
  await pool.query(`
    CREATE TABLE IF NOT EXISTS wall_counts (
      session_id INTEGER PRIMARY KEY REFERENCES sessions(id) ON DELETE CASCADE,
      overhang_green INTEGER DEFAULT 0,
      overhang_blue INTEGER DEFAULT 0,
      overhang_yellow INTEGER DEFAULT 0,
      overhang_orange INTEGER DEFAULT 0,
      overhang_red INTEGER DEFAULT 0,
      overhang_black INTEGER DEFAULT 0,
      midwall_green INTEGER DEFAULT 0,
      midwall_blue INTEGER DEFAULT 0,
      midwall_yellow INTEGER DEFAULT 0,
      midwall_orange INTEGER DEFAULT 0,
      midwall_red INTEGER DEFAULT 0,
      midwall_black INTEGER DEFAULT 0,
      sidewall_green INTEGER DEFAULT 0,
      sidewall_blue INTEGER DEFAULT 0,
      sidewall_yellow INTEGER DEFAULT 0,
      sidewall_orange INTEGER DEFAULT 0,
      sidewall_red INTEGER DEFAULT 0,
      sidewall_black INTEGER DEFAULT 0
    )
  `);
  
  // Video reviews table for red/black climbs
  await pool.query(`
    CREATE TABLE IF NOT EXISTS video_reviews (
      id SERIAL PRIMARY KEY,
      session_id INTEGER REFERENCES sessions(id) ON DELETE CASCADE,
      video_url TEXT NOT NULL,
      color TEXT NOT NULL,
      wall TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      votes JSONB DEFAULT '[]',
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  
  // Add columns if they don't exist (migration-safe)
  await pool.query(`
    DO $$ 
    BEGIN 
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='climbers' AND column_name='username') THEN
        ALTER TABLE climbers ADD COLUMN username TEXT UNIQUE;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='climbers' AND column_name='password') THEN
        ALTER TABLE climbers ADD COLUMN password TEXT;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='climbers' AND column_name='role') THEN
        ALTER TABLE climbers ADD COLUMN role TEXT DEFAULT 'user';
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sessions' AND column_name='status') THEN
        ALTER TABLE sessions ADD COLUMN status TEXT DEFAULT 'approved';
      END IF;
    END $$;
  `);
}

export async function getClient() {
  return pool.connect();
}

export async function addClimber(name: string, username?: string, password?: string, role: string = 'user') {
  const existing = await pool.query('SELECT * FROM climbers WHERE name = $1', [name]);
  if (existing.rows.length > 0) return existing.rows[0] as Climber;
  
  const result = await pool.query(
    'INSERT INTO climbers (name, username, password, role) VALUES ($1, $2, $3, $4) RETURNING *',
    [name, username || null, password || null, role]
  );
  return result.rows[0] as Climber;
}

export async function listClimbers() {
  const result = await pool.query('SELECT * FROM climbers ORDER BY name');
  return result.rows as Climber[];
}

export async function addSession(session: Session & { score: number }, counts: Counts, wallCounts?: WallCounts) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const sessionResult = await client.query(
      'INSERT INTO sessions (climber_id, date, score, notes) VALUES ($1, $2, $3, $4) RETURNING *',
      [session.climberId, session.date, session.score, session.notes || null]
    );
    const sessionId = sessionResult.rows[0].id;
    
    await client.query(
      'INSERT INTO counts (session_id, green, blue, yellow, orange, red, black) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [sessionId, counts.green, counts.blue, counts.yellow, counts.orange, counts.red, counts.black]
    );
    
    if (wallCounts) {
      await client.query(
        `INSERT INTO wall_counts (
          session_id,
          overhang_green, overhang_blue, overhang_yellow, overhang_orange, overhang_red, overhang_black,
          midwall_green, midwall_blue, midwall_yellow, midwall_orange, midwall_red, midwall_black,
          sidewall_green, sidewall_blue, sidewall_yellow, sidewall_orange, sidewall_red, sidewall_black
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)`,
        [
          sessionId,
          wallCounts.overhang.green, wallCounts.overhang.blue, wallCounts.overhang.yellow,
          wallCounts.overhang.orange, wallCounts.overhang.red, wallCounts.overhang.black,
          wallCounts.midWall.green, wallCounts.midWall.blue, wallCounts.midWall.yellow,
          wallCounts.midWall.orange, wallCounts.midWall.red, wallCounts.midWall.black,
          wallCounts.sideWall.green, wallCounts.sideWall.blue, wallCounts.sideWall.yellow,
          wallCounts.sideWall.orange, wallCounts.sideWall.red, wallCounts.sideWall.black
        ]
      );
    }
    
    await client.query('COMMIT');
    return { id: sessionId, ...session };
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

export async function getSessions(filter?: { from?: string; to?: string; climberId?: number }) {
  let query = `
    SELECT s.*, c.green, c.blue, c.yellow, c.orange, c.red, c.black,
           w.overhang_green, w.overhang_blue, w.overhang_yellow, w.overhang_orange, w.overhang_red, w.overhang_black,
           w.midwall_green, w.midwall_blue, w.midwall_yellow, w.midwall_orange, w.midwall_red, w.midwall_black,
           w.sidewall_green, w.sidewall_blue, w.sidewall_yellow, w.sidewall_orange, w.sidewall_red, w.sidewall_black
    FROM sessions s
    LEFT JOIN counts c ON s.id = c.session_id
    LEFT JOIN wall_counts w ON s.id = w.session_id
    WHERE 1=1
  `;
  const params: any[] = [];
  let paramCount = 1;
  
  if (filter?.climberId) {
    query += ` AND s.climber_id = $${paramCount++}`;
    params.push(filter.climberId);
  }
  if (filter?.from) {
    query += ` AND s.date >= $${paramCount++}`;
    params.push(filter.from);
  }
  if (filter?.to) {
    query += ` AND s.date <= $${paramCount++}`;
    params.push(filter.to);
  }
  
  query += ' ORDER BY s.date DESC';
  
  const result = await pool.query(query, params);
  return result.rows.map((row: any) => ({
    id: row.id,
    climberId: row.climber_id,
    date: row.date,
    score: row.score,
    notes: row.notes,
    green: row.green,
    blue: row.blue,
    yellow: row.yellow,
    orange: row.orange,
    red: row.red,
    black: row.black,
    wallCounts: row.overhang_green !== null ? {
      overhang: {
        green: row.overhang_green,
        blue: row.overhang_blue,
        yellow: row.overhang_yellow,
        orange: row.overhang_orange,
        red: row.overhang_red,
        black: row.overhang_black
      },
      midWall: {
        green: row.midwall_green,
        blue: row.midwall_blue,
        yellow: row.midwall_yellow,
        orange: row.midwall_orange,
        red: row.midwall_red,
        black: row.midwall_black
      },
      sideWall: {
        green: row.sidewall_green,
        blue: row.sidewall_blue,
        yellow: row.sidewall_yellow,
        orange: row.sidewall_orange,
        red: row.sidewall_red,
        black: row.sidewall_black
      }
    } : undefined
  }));
}

export async function getSessionById(id: number) {
  const result = await pool.query(`
    SELECT s.*, c.green, c.blue, c.yellow, c.orange, c.red, c.black,
           w.overhang_green, w.overhang_blue, w.overhang_yellow, w.overhang_orange, w.overhang_red, w.overhang_black,
           w.midwall_green, w.midwall_blue, w.midwall_yellow, w.midwall_orange, w.midwall_red, w.midwall_black,
           w.sidewall_green, w.sidewall_blue, w.sidewall_yellow, w.sidewall_orange, w.sidewall_red, w.sidewall_black
    FROM sessions s
    LEFT JOIN counts c ON s.id = c.session_id
    LEFT JOIN wall_counts w ON s.id = w.session_id
    WHERE s.id = $1
  `, [id]);
  
  if (result.rows.length === 0) return null;
  
  const row = result.rows[0];
  return {
    id: row.id,
    climberId: row.climber_id,
    date: row.date,
    score: row.score,
    notes: row.notes,
    green: row.green,
    blue: row.blue,
    yellow: row.yellow,
    orange: row.orange,
    red: row.red,
    black: row.black,
    wallCounts: row.overhang_green !== null ? {
      overhang: {
        green: row.overhang_green,
        blue: row.overhang_blue,
        yellow: row.overhang_yellow,
        orange: row.overhang_orange,
        red: row.overhang_red,
        black: row.overhang_black
      },
      midWall: {
        green: row.midwall_green,
        blue: row.midwall_blue,
        yellow: row.midwall_yellow,
        orange: row.midwall_orange,
        red: row.midwall_red,
        black: row.midwall_black
      },
      sideWall: {
        green: row.sidewall_green,
        blue: row.sidewall_blue,
        yellow: row.sidewall_yellow,
        orange: row.sidewall_orange,
        red: row.sidewall_red,
        black: row.sidewall_black
      }
    } : undefined
  };
}

export async function leaderboard(from?: string, to?: string) {
  let query = `
    SELECT DISTINCT ON (c.id) 
      c.name as climber, 
      s.score as total_score
    FROM sessions s
    JOIN climbers c ON s.climber_id = c.id
    WHERE 1=1
  `;
  const params: any[] = [];
  let paramCount = 1;
  
  if (from) {
    query += ` AND s.date >= $${paramCount++}`;
    params.push(from);
  }
  if (to) {
    query += ` AND s.date <= $${paramCount++}`;
    params.push(to);
  }
  
  query += ' ORDER BY c.id, s.date DESC';
  
  const result = await pool.query(query, params);
  const leaderboard = result.rows.map((row: any) => ({
    climber: row.climber,
    total_score: parseFloat(row.total_score)
  }));
  
  // Sort by score descending
  leaderboard.sort((a, b) => b.total_score - a.total_score);
  
  return leaderboard;
}

export async function deleteSession(id: number) {
  const result = await pool.query('DELETE FROM sessions WHERE id = $1 RETURNING id', [id]);
  return (result.rowCount ?? 0) > 0;
}

export async function deleteClimber(id: number) {
  // This will also delete all sessions due to foreign key constraint
  const result = await pool.query('DELETE FROM climbers WHERE id = $1 RETURNING id', [id]);
  return (result.rowCount ?? 0) > 0;
}

// User authentication functions
export async function getClimberByUsername(username: string) {
  const result = await pool.query('SELECT * FROM climbers WHERE username = $1', [username]);
  return result.rows.length > 0 ? result.rows[0] : null;
}

export async function updateClimberPassword(climberId: number, password: string) {
  await pool.query('UPDATE climbers SET password = $1 WHERE id = $2', [password, climberId]);
}

export async function setClimberRole(climberId: number, role: string) {
  await pool.query('UPDATE climbers SET role = $1 WHERE id = $2', [role, climberId]);
}

export async function updateClimberUsername(climberId: number, username: string) {
  await pool.query('UPDATE climbers SET username = $1 WHERE id = $2', [username.toLowerCase(), climberId]);
}

// Video review functions
export async function addVideoReview(sessionId: number, videoUrl: string, color: string, wall: string) {
  const result = await pool.query(
    'INSERT INTO video_reviews (session_id, video_url, color, wall) VALUES ($1, $2, $3, $4) RETURNING *',
    [sessionId, videoUrl, color, wall]
  );
  return result.rows[0];
}

export async function getVideoReviews(status?: string) {
  let query = 'SELECT vr.*, s.climber_id, c.name as climber_name, s.date FROM video_reviews vr JOIN sessions s ON vr.session_id = s.id JOIN climbers c ON s.climber_id = c.id';
  const params: any[] = [];
  
  if (status) {
    query += ' WHERE vr.status = $1';
    params.push(status);
  }
  
  query += ' ORDER BY vr.created_at DESC';
  
  const result = await pool.query(query, params);
  return result.rows;
}

export async function voteOnVideo(reviewId: number, climberId: number, vote: 'up' | 'down') {
  const review = await pool.query('SELECT votes FROM video_reviews WHERE id = $1', [reviewId]);
  if (review.rows.length === 0) return null;
  
  const votes = review.rows[0].votes || [];
  const existingVoteIndex = votes.findIndex((v: any) => v.climberId === climberId);
  
  if (existingVoteIndex >= 0) {
    votes[existingVoteIndex].vote = vote;
  } else {
    votes.push({ climberId, vote });
  }
  
  const result = await pool.query(
    'UPDATE video_reviews SET votes = $1 WHERE id = $2 RETURNING *',
    [JSON.stringify(votes), reviewId]
  );
  return result.rows[0];
}

export async function approveVideo(reviewId: number) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Get the video review details
    const reviewResult = await client.query(
      'SELECT * FROM video_reviews WHERE id = $1',
      [reviewId]
    );
    
    if (reviewResult.rows.length === 0) {
      throw new Error('Video review not found');
    }
    
    const review = reviewResult.rows[0];
    const { session_id, color, wall } = review;
    
    // Update the video status to approved
    await client.query(
      'UPDATE video_reviews SET status = $1 WHERE id = $2',
      ['approved', reviewId]
    );
    
    // Map wall names to database column prefixes
    const wallMapping: { [key: string]: string } = {
      'overhang': 'overhang',
      'midWall': 'midwall',
      'sideWall': 'sidewall'
    };
    
    const wallPrefix = wallMapping[wall] || wall.toLowerCase();
    
    // Build column name (ensure it's safe - no SQL injection since we control the mapping)
    const validColors = ['green', 'blue', 'yellow', 'orange', 'red', 'black'];
    if (!validColors.includes(color)) {
      throw new Error(`Invalid color: ${color}`);
    }
    
    const columnName = `${wallPrefix}_${color}`;
    
    console.log(`Updating wall_counts: ${columnName} for session ${session_id}`);
    
    // Use string interpolation for column name (safe since validated above)
    const updateQuery = `UPDATE wall_counts SET ${columnName} = ${columnName} + 1 WHERE session_id = $1`;
    await client.query(updateQuery, [session_id]);
    
    // Recalculate the session score
    const sessionResult = await client.query(`
      SELECT s.id, s.climber_id, s.date, s.notes,
             w.overhang_green, w.overhang_blue, w.overhang_yellow, w.overhang_orange, w.overhang_red, w.overhang_black,
             w.midwall_green, w.midwall_blue, w.midwall_yellow, w.midwall_orange, w.midwall_red, w.midwall_black,
             w.sidewall_green, w.sidewall_blue, w.sidewall_yellow, w.sidewall_orange, w.sidewall_red, w.sidewall_black
      FROM sessions s
      LEFT JOIN wall_counts w ON s.id = w.session_id
      WHERE s.id = $1
    `, [session_id]);
    
    if (sessionResult.rows.length > 0) {
      const row = sessionResult.rows[0];
      const { scoreSession } = require('./score');
      const { combineCounts } = require('./score');
      
      const wallCounts = {
        overhang: {
          green: row.overhang_green || 0,
          blue: row.overhang_blue || 0,
          yellow: row.overhang_yellow || 0,
          orange: row.overhang_orange || 0,
          red: row.overhang_red || 0,
          black: row.overhang_black || 0
        },
        midWall: {
          green: row.midwall_green || 0,
          blue: row.midwall_blue || 0,
          yellow: row.midwall_yellow || 0,
          orange: row.midwall_orange || 0,
          red: row.midwall_red || 0,
          black: row.midwall_black || 0
        },
        sideWall: {
          green: row.sidewall_green || 0,
          blue: row.sidewall_blue || 0,
          yellow: row.sidewall_yellow || 0,
          orange: row.sidewall_orange || 0,
          red: row.sidewall_red || 0,
          black: row.sidewall_black || 0
        }
      };
      
      const totalCounts = combineCounts(wallCounts);
      const newScore = scoreSession(totalCounts);
      
      console.log(`Session ${session_id}: Old score from DB, New score: ${newScore}`);
      console.log('Total counts:', totalCounts);
      
      await client.query(
        'UPDATE sessions SET score = $1 WHERE id = $2',
        [newScore, session_id]
      );
      
      console.log(`Score updated successfully for session ${session_id}`);
    }
    
    await client.query('COMMIT');
    console.log(`Video ${reviewId} approved successfully`);
    return reviewResult.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function rejectVideo(reviewId: number) {
  const result = await pool.query(
    'UPDATE video_reviews SET status = $1 WHERE id = $2 RETURNING *',
    ['rejected', reviewId]
  );
  return result.rows[0];
}

// Admin: clear all data (KEEP SCHEMA)
export async function clearAllData() {
  // Truncate tables in proper order and restart identities
  await pool.query(`
    TRUNCATE TABLE counts, wall_counts, video_reviews, sessions, climbers RESTART IDENTITY CASCADE;
  `);
}

// Admin: seed data from a provided structure
export async function seedData(sample: {
  climbers: Array<{ name: string; username?: string; role?: string; sessions?: Array<{ date: string; wallCounts?: WallCounts; notes?: string }> }>;
}) {
  function combineCountsLocal(w?: WallCounts) {
    const base: Counts = { green:0, blue:0, yellow:0, orange:0, red:0, black:0 };
    if (!w) return base;
    const sum: any = { ...base };
    ['green','blue','yellow','orange','red','black'].forEach((col:any) => {
      const a = ((w.overhang as any)[col] || 0);
      const b = ((w.midWall as any)[col] || 0);
      const c = ((w.sideWall as any)[col] || 0);
      sum[col] = a + b + c;
    });
    return sum as Counts;
  }

  const defaultPassword = process.env.DEFAULT_SEED_PASSWORD || 'boulder123';
  for (const c of sample.climbers) {
    const hashed = c.username ? await bcrypt.hash(defaultPassword, 10) : undefined;
    const climber = await addClimber(c.name, c.username || undefined, hashed, c.role || 'user');
    if (c.sessions && c.sessions.length) {
      for (const s of c.sessions) {
        // compute score: the addSession expects a session object with score
        // We will compute score using existing scoreSession util in server; here we approximate by inserting with score 0 and let server recalc if needed.
        // Simpler: compute totals from wallCounts and use scoring logic in server when adding via API. Since this is DB-level seeding, we will compute a naive score of 0.
        const score = 0;
        const counts = combineCountsLocal(s.wallCounts);
        await addSession({ climberId: climber.id!, date: s.date, notes: s.notes || undefined, score }, counts, s.wallCounts);
      }
    }
  }
}
