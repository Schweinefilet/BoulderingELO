import { Pool } from 'pg';
import { Counts, Climber, Session, WallCounts } from './types';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined
});

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
  const result = await pool.query(
    'UPDATE video_reviews SET status = $1 WHERE id = $2 RETURNING *',
    ['approved', reviewId]
  );
  return result.rows[0];
}

export async function rejectVideo(reviewId: number) {
  const result = await pool.query(
    'UPDATE video_reviews SET status = $1 WHERE id = $2 RETURNING *',
    ['rejected', reviewId]
  );
  return result.rows[0];
}
