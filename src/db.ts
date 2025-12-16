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
      client_encoding: 'UTF8',
      // Connection pool settings for better reliability on Render
      max: 20, // Maximum number of clients in the pool
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 30000, // Increased to 30 seconds for Render
    };
    console.log('Database config:', { ...poolConfig, password: '***' });
  } catch (e) {
    console.error('Failed to parse DATABASE_URL:', e);
    poolConfig = { connectionString: dbUrl, ssl: { rejectUnauthorized: false } };
  }
} else {
  poolConfig = { connectionString: dbUrl, ssl: { rejectUnauthorized: false } };
}

const pool = new Pool(poolConfig);

// Add connection error handler
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

// Helper function to retry database operations
async function retryQuery<T>(queryFn: () => Promise<T>, maxRetries = 3, delay = 2000): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await queryFn();
    } catch (error: any) {
      console.error(`Database query attempt ${i + 1}/${maxRetries} failed:`, error.message);
      if (i === maxRetries - 1) throw error;
      console.log(`Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('Max retries reached');
}

// Initialize database tables with retry logic
export async function initDB() {
  console.log('Initializing database...');
  
  // Test connection first with retry
  await retryQuery(async () => {
    const result = await pool.query('SELECT NOW()');
    console.log('✅ Database connection successful at', result.rows[0].now);
  });

  // Add password and role columns to climbers table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS climbers (
      id SERIAL PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      username TEXT UNIQUE,
      password TEXT,
      role TEXT DEFAULT 'user',
      google_id TEXT UNIQUE,
      country TEXT,
      started_bouldering TEXT,
      bio TEXT,
      instagram_handle TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  
  // Add google_id column if it doesn't exist (for existing databases)
  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                     WHERE table_name='climbers' AND column_name='google_id') THEN
        ALTER TABLE climbers ADD COLUMN google_id TEXT UNIQUE;
      END IF;
    END $$;
  `);

  // Add instagram_handle column if it doesn't exist
  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                     WHERE table_name='climbers' AND column_name='instagram_handle') THEN
        ALTER TABLE climbers ADD COLUMN instagram_handle TEXT;
      END IF;
    END $$;
  `);
  
  // Add hidden column for hiding climbers from public view (admin-only)
  await pool.query(`
    DO $$ 
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                     WHERE table_name='climbers' AND column_name='hidden') THEN
        ALTER TABLE climbers ADD COLUMN hidden BOOLEAN DEFAULT FALSE;
      END IF;
    END $$;
  `);
  
  // Mark Thanos as hidden
  await pool.query(`
    UPDATE climbers SET hidden = TRUE WHERE name ILIKE '%thanos%'
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
  
  // Migrate wall_counts table to use JSONB for dynamic wall sections
  await pool.query(`
    DO $$ 
    BEGIN
      -- Check if the old column-based structure exists
      IF EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='wall_counts' AND column_name='overhang_green') THEN
        
        -- Create temporary table with new structure
        CREATE TABLE IF NOT EXISTS wall_counts_new (
          session_id INTEGER PRIMARY KEY REFERENCES sessions(id) ON DELETE CASCADE,
          counts JSONB DEFAULT '{}'::jsonb
        );
        
        -- Migrate existing data to JSONB format
        INSERT INTO wall_counts_new (session_id, counts)
        SELECT 
          session_id,
          jsonb_build_object(
            'overhang', jsonb_build_object(
              'green', COALESCE(overhang_green, 0),
              'blue', COALESCE(overhang_blue, 0),
              'yellow', COALESCE(overhang_yellow, 0),
              'orange', COALESCE(overhang_orange, 0),
              'red', COALESCE(overhang_red, 0),
              'black', COALESCE(overhang_black, 0)
            ),
            'midWall', jsonb_build_object(
              'green', COALESCE(midwall_green, 0),
              'blue', COALESCE(midwall_blue, 0),
              'yellow', COALESCE(midwall_yellow, 0),
              'orange', COALESCE(midwall_orange, 0),
              'red', COALESCE(midwall_red, 0),
              'black', COALESCE(midwall_black, 0)
            ),
            'sideWall', jsonb_build_object(
              'green', COALESCE(sidewall_green, 0),
              'blue', COALESCE(sidewall_blue, 0),
              'yellow', COALESCE(sidewall_yellow, 0),
              'orange', COALESCE(sidewall_orange, 0),
              'red', COALESCE(sidewall_red, 0),
              'black', COALESCE(sidewall_black, 0)
            )
          ) as counts
        FROM wall_counts
        ON CONFLICT (session_id) DO NOTHING;
        
        -- Drop old table and rename new one
        DROP TABLE wall_counts;
        ALTER TABLE wall_counts_new RENAME TO wall_counts;
      ELSE
        -- Just create the new structure if it doesn't exist
        CREATE TABLE IF NOT EXISTS wall_counts (
          session_id INTEGER PRIMARY KEY REFERENCES sessions(id) ON DELETE CASCADE,
          counts JSONB DEFAULT '{}'::jsonb
        );
      END IF;
    END $$;
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
  
  // Settings table for global configuration (wall sections, etc.)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value JSONB NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id SERIAL PRIMARY KEY,
      climber_id INTEGER REFERENCES climbers(id) ON DELETE CASCADE,
      token TEXT UNIQUE NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      used BOOLEAN DEFAULT FALSE,
      used_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  // Routes table for individual route tracking
  await pool.query(`
    CREATE TABLE IF NOT EXISTS routes (
      id SERIAL PRIMARY KEY,
      wall_section TEXT NOT NULL,
      section_number INTEGER NOT NULL,
      global_number INTEGER NOT NULL UNIQUE,
      color TEXT NOT NULL,
      position_order INTEGER NOT NULL,
      label_x DECIMAL(5,2),
      label_y DECIMAL(5,2),
      notes TEXT,
      dropbox_link TEXT,
      active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT NOW(),
      archived_at TIMESTAMP,
      UNIQUE(wall_section, section_number)
    )
  `);

  // Add dropbox_link column if it doesn't exist (migration)
  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'routes' AND column_name = 'dropbox_link'
      ) THEN
        ALTER TABLE routes ADD COLUMN dropbox_link TEXT;
      END IF;
    END $$;
  `);

  // Create indexes for routes table
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_routes_wall_color ON routes(wall_section, color) WHERE active = TRUE
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_routes_global ON routes(global_number) WHERE active = TRUE
  `);

  // Route completions table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS route_completions (
      id SERIAL PRIMARY KEY,
      session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
      route_id INTEGER NOT NULL REFERENCES routes(id),
      completed_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(session_id, route_id)
    )
  `);

  // Create indexes for route_completions table
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_route_completions_session ON route_completions(session_id)
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_route_completions_route ON route_completions(route_id)
  `);

  // Route sets table for tracking wall resets
  await pool.query(`
    CREATE TABLE IF NOT EXISTS route_sets (
      id SERIAL PRIMARY KEY,
      wall_section TEXT NOT NULL,
      set_date DATE NOT NULL,
      removed_date DATE,
      notes TEXT,
      created_by INTEGER REFERENCES climbers(id),
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
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sessions' AND column_name='reset_audit_id') THEN
        ALTER TABLE sessions ADD COLUMN reset_audit_id TEXT;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='climbers' AND column_name='country') THEN
        ALTER TABLE climbers ADD COLUMN country TEXT;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='climbers' AND column_name='started_bouldering') THEN
        ALTER TABLE climbers ADD COLUMN started_bouldering TEXT;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='climbers' AND column_name='bio') THEN
        ALTER TABLE climbers ADD COLUMN bio TEXT;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='climbers' AND column_name='password_changed_at') THEN
        ALTER TABLE climbers ADD COLUMN password_changed_at TIMESTAMP;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sessions' AND column_name='uses_route_tracking') THEN
        ALTER TABLE sessions ADD COLUMN uses_route_tracking BOOLEAN DEFAULT FALSE;
      END IF;
    END $$;
  `);
}

export async function getClient() {
  return pool.connect();
}

export async function addClimber(name: string, username?: string, password?: string | null, role: string = 'user', googleId?: string) {
  const existing = await pool.query('SELECT * FROM climbers WHERE name = $1', [name]);
  if (existing.rows.length > 0) return existing.rows[0] as Climber;
  
  const result = await pool.query(
    'INSERT INTO climbers (name, username, password, role, google_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
    [name, username || null, password || null, role, googleId || null]
  );
  return result.rows[0] as Climber;
}

export async function linkGoogleAccount(climberId: number, googleId: string) {
  await pool.query(
    'UPDATE climbers SET google_id = $1 WHERE id = $2',
    [googleId, climberId]
  );
}

export async function listClimbers(includeHidden: boolean = false) {
  let query = 'SELECT * FROM climbers';
  if (!includeHidden) {
    query += ' WHERE hidden = FALSE';
  }
  query += ' ORDER BY name';
  const result = await pool.query(query);
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
        'INSERT INTO wall_counts (session_id, counts) VALUES ($1, $2)',
        [sessionId, JSON.stringify(wallCounts)]
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

export async function updateSessionWallCounts(sessionId: number, wallCounts: WallCounts, score: number) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Recalculate total counts from wall counts
    const { combineCounts } = await import('./score');
    const totalCounts = combineCounts(wallCounts);
    
    // Update wall counts
    await client.query(
      'UPDATE wall_counts SET counts = $1 WHERE session_id = $2',
      [JSON.stringify(wallCounts), sessionId]
    );
    
    // Update total counts table
    await client.query(
      'UPDATE counts SET green = $1, blue = $2, yellow = $3, orange = $4, red = $5, black = $6 WHERE session_id = $7',
      [totalCounts.green, totalCounts.blue, totalCounts.yellow, totalCounts.orange, totalCounts.red, totalCounts.black, sessionId]
    );
    
    // Update session score
    await client.query(
      'UPDATE sessions SET score = $1 WHERE id = $2',
      [score, sessionId]
    );
    
    await client.query('COMMIT');
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
           w.counts as wall_counts
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

  // Process each session and load route data if needed
  const sessions = await Promise.all(result.rows.map(async (row: any) => {
    const session: any = {
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
      wallCounts: row.wall_counts || undefined,
      uses_route_tracking: row.uses_route_tracking || false
    };

    // If this is a route-based session, load the routes
    if (row.uses_route_tracking) {
      const routesResult = await pool.query(`
        SELECT r.*, rc.completed_at
        FROM route_completions rc
        JOIN routes r ON rc.route_id = r.id
        WHERE rc.session_id = $1
        ORDER BY r.wall_section, r.section_number
      `, [row.id]);

      session.routes = routesResult.rows.map((r: any) => ({
        id: r.id,
        wall_section: r.wall_section,
        section_number: r.section_number,
        global_number: r.global_number,
        color: r.color,
        notes: r.notes,
        completed_at: r.completed_at
      }));
    }

    return session;
  }));

  return sessions;
}

export async function getSessionById(id: number) {
  const result = await pool.query(`
    SELECT s.*, c.green, c.blue, c.yellow, c.orange, c.red, c.black,
           w.counts as wall_counts
    FROM sessions s
    LEFT JOIN counts c ON s.id = c.session_id
    LEFT JOIN wall_counts w ON s.id = w.session_id
    WHERE s.id = $1
  `, [id]);

  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  const session: any = {
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
    wallCounts: row.wall_counts || undefined,
    uses_route_tracking: row.uses_route_tracking || false
  };

  // If this is a route-based session, load the routes
  if (row.uses_route_tracking) {
    const routesResult = await pool.query(`
      SELECT r.*, rc.completed_at
      FROM route_completions rc
      JOIN routes r ON rc.route_id = r.id
      WHERE rc.session_id = $1
      ORDER BY r.wall_section, r.section_number
    `, [id]);

    session.routes = routesResult.rows.map((r: any) => ({
      id: r.id,
      wall_section: r.wall_section,
      section_number: r.section_number,
      global_number: r.global_number,
      color: r.color,
      notes: r.notes,
      completed_at: r.completed_at
    }));
  }

  return session;
}

export async function leaderboard(from?: string, to?: string, includeHidden: boolean = false) {
  let query = `
    SELECT DISTINCT ON (c.id) 
      c.id as climber_id,
      c.name as climber, 
      s.id as session_id,
      s.score as total_score
    FROM sessions s
    JOIN climbers c ON s.climber_id = c.id
    WHERE 1=1
  `;
  const params: any[] = [];
  let paramCount = 1;
  
  if (!includeHidden) {
    query += ` AND c.hidden = FALSE`;
  }
  
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
export async function getClimberById(id: number) {
  const result = await pool.query('SELECT * FROM climbers WHERE id = $1', [id]);
  return result.rows.length > 0 ? result.rows[0] : null;
}

export async function getClimberByUsername(username: string) {
  const result = await pool.query('SELECT * FROM climbers WHERE username = $1', [username]);
  return result.rows.length > 0 ? result.rows[0] : null;
}

export async function getClimberByGoogleId(googleId: string) {
  const result = await pool.query('SELECT * FROM climbers WHERE google_id = $1', [googleId]);
  return result.rows.length > 0 ? result.rows[0] : null;
}

export async function updateClimberPassword(climberId: number, password: string) {
  await pool.query('UPDATE climbers SET password = $1, password_changed_at = NOW() WHERE id = $2', [password, climberId]);
}

export async function invalidateResetTokensForUser(climberId: number) {
  await pool.query('UPDATE password_reset_tokens SET used = TRUE, used_at = NOW() WHERE climber_id = $1 AND used = FALSE', [climberId]);
}

export async function createPasswordResetToken(climberId: number, token: string, expiresAt: Date) {
  await pool.query(
    'INSERT INTO password_reset_tokens (climber_id, token, expires_at) VALUES ($1, $2, $3)',
    [climberId, token, expiresAt]
  );
}

export async function findPasswordResetToken(token: string) {
  const result = await pool.query('SELECT * FROM password_reset_tokens WHERE token = $1', [token]);
  return result.rows.length > 0 ? result.rows[0] : null;
}

export async function markResetTokenUsed(token: string) {
  await pool.query('UPDATE password_reset_tokens SET used = TRUE, used_at = NOW() WHERE token = $1', [token]);
}

export async function updateUserSettings(climberId: number, settings: { username?: string; name?: string; country?: string; started_bouldering?: string; bio?: string; instagram_handle?: string }) {
  const { username, name, country, started_bouldering, bio, instagram_handle } = settings;
  
  // Update climber profile (which includes username)
  const result = await pool.query(
    `UPDATE climbers 
     SET name = COALESCE($1, name),
         username = COALESCE($2, username),
         country = COALESCE($3, country),
         started_bouldering = COALESCE($4, started_bouldering),
        bio = COALESCE($5, bio),
        instagram_handle = COALESCE($6, instagram_handle)
     WHERE id = $7
     RETURNING *`,
    [name || null, username ? username.toLowerCase() : null, country || null,
     started_bouldering || null, bio || null, instagram_handle || null, climberId]
  );
  
  return result.rows[0];
}

export async function updateClimberProfile(climberId: number, updates: {
  name?: string;
  username?: string;
  country?: string;
  started_bouldering?: string;
  bio?: string;
  instagram_handle?: string;
  role?: string;
}) {
  const { name, username, country, started_bouldering, bio, instagram_handle, role } = updates;
  const result = await pool.query(
    `UPDATE climbers
     SET name = COALESCE($1, name),
         username = COALESCE($2, username),
         country = COALESCE($3, country),
         started_bouldering = COALESCE($4, started_bouldering),
         bio = COALESCE($5, bio),
         instagram_handle = COALESCE($6, instagram_handle),
         role = COALESCE($7, role)
     WHERE id = $8
     RETURNING *`,
    [name || null, username ? username.toLowerCase() : null, country || null,
     started_bouldering || null, bio || null, instagram_handle || null, role || null, climberId]
  );
  return result.rows[0];
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
    
    // Validate color
    const validColors = ['green', 'blue', 'yellow', 'orange', 'red', 'black'];
    if (!validColors.includes(color)) {
      throw new Error(`Invalid color: ${color}`);
    }
    
    console.log(`Updating wall_counts for wall: ${wall}, color: ${color}, session: ${session_id}`);
    
    // Get current wall counts
    const countsResult = await client.query(
      'SELECT counts FROM wall_counts WHERE session_id = $1',
      [session_id]
    );
    
    let wallCounts: any = {};
    if (countsResult.rows.length > 0 && countsResult.rows[0].counts) {
      wallCounts = countsResult.rows[0].counts;
    }
    
    // Initialize wall section if it doesn't exist
    if (!wallCounts[wall]) {
      wallCounts[wall] = { green: 0, blue: 0, yellow: 0, orange: 0, red: 0, black: 0 };
    }
    
    // Increment the color count for this wall
    wallCounts[wall][color as keyof Counts] = (wallCounts[wall][color as keyof Counts] || 0) + 1;
    
    // Update wall_counts with new JSONB data
    await client.query(
      'UPDATE wall_counts SET counts = $1 WHERE session_id = $2',
      [JSON.stringify(wallCounts), session_id]
    );
    
    // Recalculate the session score from wall counts
    const { computeWeeklyScore, combineCounts } = require('./score');
    const totalCounts = combineCounts(wallCounts);
    const newScore = computeWeeklyScore(totalCounts);
    
    // Update counts table
    await client.query(
      'UPDATE counts SET green = $1, blue = $2, yellow = $3, orange = $4, red = $5, black = $6 WHERE session_id = $7',
      [totalCounts.green, totalCounts.blue, totalCounts.yellow, totalCounts.orange, totalCounts.red, totalCounts.black, session_id]
    );
    
    // Update session score
    await client.query(
      'UPDATE sessions SET score = $1 WHERE id = $2',
      [newScore, session_id]
    );
    
    await client.query('COMMIT');
    console.log(`Video ${reviewId} approved successfully`);
    return review;
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
    // Support dynamic wall sections
    for (const wall of Object.keys(w)) {
      ['green','blue','yellow','orange','red','black'].forEach((col:any) => {
        sum[col] += ((w as any)[wall][col] || 0);
      });
    }
    return sum as Counts;
  }

  const defaultPassword = process.env.DEFAULT_SEED_PASSWORD || 'boulder123';
  for (const c of sample.climbers) {
    const hashed = c.username ? await bcrypt.hash(defaultPassword, 10) : undefined;
    const climber = await addClimber(c.name, c.username || undefined, hashed, c.role || 'user');
    if (c.sessions && c.sessions.length) {
      for (const s of c.sessions) {
        // compute score: the addSession expects a session object with score
        // We will compute score using the computeWeeklyScore util in server; here we approximate by inserting with score 0 and let server recalc if needed.
        // Simpler: compute totals from wallCounts and use scoring logic in server when adding via API. Since this is DB-level seeding, we will compute a naive score of 0.
        const score = 0;
        const counts = combineCountsLocal(s.wallCounts);
        await addSession({ climberId: climber.id!, date: s.date, notes: s.notes || undefined, score }, counts, s.wallCounts);
      }
    }
  }
}

// Settings management
export async function getSetting(key: string): Promise<any | null> {
  const result = await pool.query('SELECT value FROM settings WHERE key = $1', [key]);
  return result.rows.length > 0 ? result.rows[0].value : null;
}

export async function setSetting(key: string, value: any): Promise<void> {
  await pool.query(
    `INSERT INTO settings (key, value, updated_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (key)
     DO UPDATE SET value = $2, updated_at = NOW()`,
    [key, JSON.stringify(value)]
  );
}

// Route CRUD functions

export async function createRoute(route: {
  wall_section: string;
  section_number: number;
  global_number: number;
  color: string;
  position_order: number;
  label_x?: number;
  label_y?: number;
  notes?: string;
  dropbox_link?: string;
}) {
  const result = await pool.query(
    `INSERT INTO routes (wall_section, section_number, global_number, color, position_order, label_x, label_y, notes, dropbox_link)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [route.wall_section, route.section_number, route.global_number, route.color, route.position_order, route.label_x || null, route.label_y || null, route.notes || null, route.dropbox_link || null]
  );
  return result.rows[0];
}

export async function getRoutes(filter?: { wall_section?: string; color?: string; active?: boolean }) {
  let query = 'SELECT * FROM routes WHERE 1=1';
  const params: any[] = [];
  let paramIndex = 1;

  if (filter?.wall_section) {
    query += ` AND wall_section = $${paramIndex}`;
    params.push(filter.wall_section);
    paramIndex++;
  }

  if (filter?.color) {
    query += ` AND color = $${paramIndex}`;
    params.push(filter.color);
    paramIndex++;
  }

  if (filter?.active !== undefined) {
    query += ` AND active = $${paramIndex}`;
    params.push(filter.active);
    paramIndex++;
  } else {
    // Default to active routes only
    query += ' AND active = TRUE';
  }

  query += ' ORDER BY global_number ASC';

  const result = await pool.query(query, params);
  return result.rows;
}

export async function getRouteById(id: number) {
  const result = await pool.query('SELECT * FROM routes WHERE id = $1', [id]);
  return result.rows[0] || null;
}

export async function updateRoute(id: number, updates: {
  section_number?: number;
  color?: string;
  position_order?: number;
  label_x?: number;
  label_y?: number;
  notes?: string;
  dropbox_link?: string;
}) {
  const fields: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (updates.section_number !== undefined) {
    fields.push(`section_number = $${paramIndex}`);
    values.push(updates.section_number);
    paramIndex++;
  }
  if (updates.color !== undefined) {
    fields.push(`color = $${paramIndex}`);
    values.push(updates.color);
    paramIndex++;
  }
  if (updates.position_order !== undefined) {
    fields.push(`position_order = $${paramIndex}`);
    values.push(updates.position_order);
    paramIndex++;
  }
  if (updates.label_x !== undefined) {
    fields.push(`label_x = $${paramIndex}`);
    values.push(updates.label_x);
    paramIndex++;
  }
  if (updates.label_y !== undefined) {
    fields.push(`label_y = $${paramIndex}`);
    values.push(updates.label_y);
    paramIndex++;
  }
  if (updates.notes !== undefined) {
    fields.push(`notes = $${paramIndex}`);
    values.push(updates.notes);
    paramIndex++;
  }
  if (updates.dropbox_link !== undefined) {
    fields.push(`dropbox_link = $${paramIndex}`);
    values.push(updates.dropbox_link);
    paramIndex++;
  }

  if (fields.length === 0) return null;

  values.push(id);
  const query = `UPDATE routes SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
  const result = await pool.query(query, values);
  return result.rows[0] || null;
}

export async function archiveRoute(id: number) {
  const result = await pool.query(
    'UPDATE routes SET active = FALSE, archived_at = NOW() WHERE id = $1 RETURNING *',
    [id]
  );
  return result.rows[0] || null;
}

export async function deleteAllRoutes() {
  const result = await pool.query('DELETE FROM routes');
  return result.rowCount || 0;
}

export async function getNextSectionNumber(wallSection: string): Promise<number> {
  const result = await pool.query(
    'SELECT MAX(section_number) as max FROM routes WHERE wall_section = $1 AND active = TRUE',
    [wallSection]
  );
  return (result.rows[0]?.max || 0) + 1;
}

export async function getNextGlobalNumber(): Promise<number> {
  const result = await pool.query('SELECT MAX(global_number) as max FROM routes WHERE active = TRUE');
  return (result.rows[0]?.max || 0) + 1;
}

export async function addRouteCompletion(sessionId: number, routeId: number) {
  const result = await pool.query(
    'INSERT INTO route_completions (session_id, route_id) VALUES ($1, $2) ON CONFLICT (session_id, route_id) DO NOTHING RETURNING *',
    [sessionId, routeId]
  );
  return result.rows[0] || null;
}

export async function getRouteCompletions(sessionId: number) {
  const result = await pool.query(
    `SELECT rc.*, r.*
     FROM route_completions rc
     JOIN routes r ON rc.route_id = r.id
     WHERE rc.session_id = $1
     ORDER BY r.wall_section, r.section_number`,
    [sessionId]
  );
  return result.rows;
}

export async function addRouteSession(session: {
  climberId: number;
  date: string;
  routeIds: number[];
  notes?: string;
}) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Import the combineCounts function
    const { computeWeeklyScore, combineCounts } = require('./score');

    // 1. Fetch route details for aggregation
    const routesResult = await client.query(
      'SELECT id, color, wall_section FROM routes WHERE id = ANY($1)',
      [session.routeIds]
    );
    const routes = routesResult.rows;

    // 2. Aggregate into wallCounts
    const wallCounts: Record<string, Counts> = {};
    for (const route of routes) {
      if (!wallCounts[route.wall_section]) {
        wallCounts[route.wall_section] = { green: 0, blue: 0, yellow: 0, orange: 0, red: 0, black: 0 };
      }
      const color = route.color as keyof Counts;
      wallCounts[route.wall_section][color]++;
    }

    // 3. Combine into total counts
    const totalCounts = combineCounts(wallCounts);

    // 4. Compute score
    const score = computeWeeklyScore(totalCounts);

    // 5. Create session record
    const sessionResult = await client.query(
      `INSERT INTO sessions (climber_id, date, score, notes, uses_route_tracking)
       VALUES ($1, $2, $3, $4, TRUE)
       RETURNING *`,
      [session.climberId, session.date, score, session.notes || null]
    );
    const sessionId = sessionResult.rows[0].id;

    // 6. Insert route completions
    for (const routeId of session.routeIds) {
      await client.query(
        'INSERT INTO route_completions (session_id, route_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [sessionId, routeId]
      );
    }

    // 7. Insert wall_counts (for backward compatibility)
    await client.query(
      'INSERT INTO wall_counts (session_id, counts) VALUES ($1, $2)',
      [sessionId, JSON.stringify(wallCounts)]
    );

    // 8. Insert total counts (for scoring)
    await client.query(
      `INSERT INTO counts (session_id, green, blue, yellow, orange, red, black)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [sessionId, totalCounts.green, totalCounts.blue, totalCounts.yellow, totalCounts.orange, totalCounts.red, totalCounts.black]
    );

    await client.query('COMMIT');

    return {
      id: sessionId,
      ...sessionResult.rows[0],
      wallCounts,
      routes
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

