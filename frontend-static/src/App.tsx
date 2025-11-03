import React, { useState, useEffect } from 'react'
import { scoreSession, marginalGain, ORDER, BASE, combineCounts, type Counts, type WallCounts } from './lib/scoring'
import * as store from './lib/storage'
import * as api from './lib/api'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { GlowingCard } from './components/ui/glowing-card'
import { BackgroundBeams } from './components/ui/background-beams'
import { GlowBorder } from './components/ui/glow-border'
import { FlagEmoji, COUNTRY_CODES, COUNTRY_NAMES } from './components/ui/flag-emoji'

const emptyWall = (): Counts => ({green:0,blue:0,yellow:0,orange:0,red:0,black:0});

const CLIMB_CATEGORY_COLUMNS: Array<{ key: keyof Counts; label: string; color: string }> = [
  { key: 'black', label: 'BLACK', color: '#d1d5db' },
  { key: 'red', label: 'RED', color: '#ef4444' },
  { key: 'orange', label: 'ORANGE', color: '#f97316' },
  { key: 'yellow', label: 'YELLOW', color: '#eab308' }
];

const EMPTY_COUNTS: Counts = { green: 0, blue: 0, yellow: 0, orange: 0, red: 0, black: 0 };

const normalizeSessionCounts = (session: any): Counts => {
  if (!session) return { ...EMPTY_COUNTS };
  if (session.wallCounts) {
    return combineCounts(session.wallCounts as WallCounts);
  }
  return {
    green: session.green ?? 0,
    blue: session.blue ?? 0,
    yellow: session.yellow ?? 0,
    orange: session.orange ?? 0,
    red: session.red ?? 0,
    black: session.black ?? 0
  };
};

// Total available climbs per wall section per color
const WALL_TOTALS = {
  overhang: { yellow: 7, orange: 5, red: 0, black: 0, blue: 0, green: 0 },
  midWall: { yellow: 20, orange: 13, red: 0, black: 0, blue: 0, green: 0 },
  sideWall: { yellow: 11, orange: 8, red: 0, black: 0, blue: 0, green: 0 }
};

function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const result = await api.login(username, password);
      api.setToken(result.token);
      api.setUser(result.user);
      onLogin();
    } catch (err: any) {
      setError(err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const result = await api.register(username, password, name);
      api.setToken(result.token);
      api.setUser(result.user);
      onLogin();
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      fontFamily:'Inter, Arial, sans-serif'
    }}>
      <div style={{
        backgroundColor:'#1e293b',
        padding:40,
        borderRadius:8,
        border:'1px solid #475569',
        width:400,
        maxWidth:'90%'
      }}>
        <h1 style={{marginTop:0,marginBottom:24,textAlign:'center'}}>BoulderingELO</h1>
        
        <div style={{display:'flex',gap:8,marginBottom:24}}>
          <button
            onClick={() => setMode('login')}
            style={{
              flex:1,
              padding:8,
              backgroundColor:mode === 'login' ? '#3b82f6' : '#475569',
              color:'white',
              border:'none',
              borderRadius:6,
              fontSize:14,
              fontWeight:'600',
              cursor:'pointer'
            }}
          >
            Login
          </button>
          <button
            onClick={() => setMode('register')}
            style={{
              flex:1,
              padding:8,
              backgroundColor:mode === 'register' ? '#3b82f6' : '#475569',
              color:'white',
              border:'none',
              borderRadius:6,
              fontSize:14,
              fontWeight:'600',
              cursor:'pointer'
            }}
          >
            Register
          </button>
        </div>

        <form onSubmit={mode === 'login' ? handleLogin : handleRegister}>
          <div style={{marginBottom:16}}>
            <label style={{display:'block',marginBottom:8,fontSize:14}}>Username</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              style={{
                width:'100%',
                padding:12,
                borderRadius:6,
                border:'1px solid #475569',
                backgroundColor:'#0f172a',
                color:'white',
                fontSize:16
              }}
              placeholder="Enter username"
              autoFocus
            />
          </div>
          <div style={{marginBottom:16}}>
            <label style={{display:'block',marginBottom:8,fontSize:14}}>Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={{
                width:'100%',
                padding:12,
                borderRadius:6,
                border:'1px solid #475569',
                backgroundColor:'#0f172a',
                color:'white',
                fontSize:16
              }}
              placeholder="Enter password"
            />
          </div>
          {mode === 'register' && (
            <div style={{marginBottom:16}}>
              <label style={{display:'block',marginBottom:8,fontSize:14}}>Full Name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                style={{
                  width:'100%',
                  padding:12,
                  borderRadius:6,
                  border:'1px solid #475569',
                  backgroundColor:'#0f172a',
                  color:'white',
                  fontSize:16
                }}
                placeholder="Enter your name"
              />
            </div>
          )}
          {error && (
            <div style={{
              backgroundColor:'#dc2626',
              color:'white',
              padding:12,
              borderRadius:6,
              marginBottom:16,
              fontSize:14
            }}>
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={loading || !username || !password || (mode === 'register' && !name)}
            style={{
              width:'100%',
              padding:'12px 16px',
              backgroundColor:loading || !username || !password || (mode === 'register' && !name) ? '#475569' : '#3b82f6',
              color:'white',
              border:'none',
              borderRadius:8,
              fontSize:16,
              fontWeight:'600',
              cursor:loading || !username || !password || (mode === 'register' && !name) ? 'not-allowed' : 'pointer',
              transition:'background-color 0.2s'
            }}
          >
            {loading ? (mode === 'login' ? 'Logging in...' : 'Creating account...') : (mode === 'login' ? 'Login' : 'Create Account')}
          </button>
        </form>
      </div>
    </div>
  );
}

// Helper function to extract YouTube video ID from various URL formats
function getYouTubeVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/shorts\/([^&\n?#]+)/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  return null;
}

// Helper component to render video player
function VideoPlayer({ url }: { url: string }) {
  const youtubeId = getYouTubeVideoId(url);
  
  if (youtubeId) {
    return (
      <iframe
        src={`https://www.youtube.com/embed/${youtubeId}`}
        style={{width:'100%',height:'100%',border:'none'}}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    );
  }
  
  // Fallback to regular video tag for direct video files
  return (
    <video
      src={url}
      controls
      style={{width:'100%',height:'100%'}}
    />
  );
}

export default function App(){
  // Validate localStorage on mount - clear if user object is malformed
  const validateAuth = () => {
    const user = api.getUser();
    const token = api.getToken();
    
    // If we have a token but user is invalid (missing climberId), clear everything
    if (token && user && !user.climberId) {
      console.warn('Invalid user object detected, clearing auth');
      api.clearToken();
      return false;
    }
    
    return api.isAuthenticated();
  };

  const [isAuthenticated, setIsAuthenticated] = useState(validateAuth());
  const [user, setUser] = useState<api.User | null>(api.getUser());
  const [showLoginScreen, setShowLoginScreen] = useState(false); // Don't show login modal by default
  const [climbers, setClimbers] = useState<any[]>([])
  const [sessions, setSessions] = useState<any[]>([])
  const [leaderboard, setLeaderboard] = useState<any[]>([])
  const [selectedClimber, setSelectedClimber] = useState<number|undefined>(undefined)
  const [newName, setNewName] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [wallCounts, setWallCounts] = useState<WallCounts>({
    overhang: emptyWall(),
    midWall: emptyWall(),
    sideWall: emptyWall()
  })
  const [manualMode, setManualMode] = useState(false)
  
  // For dropdown mode
  const [dropdownWall, setDropdownWall] = useState<'overhang'|'midWall'|'sideWall'>('midWall')
  const [dropdownColor, setDropdownColor] = useState<keyof Counts>('yellow')
  const [videoUrl, setVideoUrl] = useState('')
  const [sessionNotes, setSessionNotes] = useState('')
  const [pendingVideos, setPendingVideos] = useState<Array<{videoUrl: string, color: string, wall: string}>>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string|null>(null)
  
  // Password change state
  const [showPasswordChange, setShowPasswordChange] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState<string|null>(null)
  const [passwordSuccess, setPasswordSuccess] = useState(false)
  
  // Admin panel state
  const [showAdminPanel, setShowAdminPanel] = useState(false)
  const [adminTab, setAdminTab] = useState<'accounts' | 'sessions'>('accounts')
  
  // Profile view state
  const [viewingProfile, setViewingProfile] = useState<number | null>(null)
  
  // Video review state
  const [videos, setVideos] = useState<api.VideoReview[]>([])
  const [videoFilter, setVideoFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending')
  
  // Settings modal state
  const [showSettings, setShowSettings] = useState(false)
  const [settingsCountry, setSettingsCountry] = useState('')
  const [settingsStarted, setSettingsStarted] = useState('')
  const [settingsBio, setSettingsBio] = useState('')
  const [settingsError, setSettingsError] = useState<string|null>(null)
  const [settingsSuccess, setSettingsSuccess] = useState(false)
  
  // Leaderboard pagination
  const [showAllLeaderboard, setShowAllLeaderboard] = useState(false)

  const totalCounts = combineCounts(wallCounts);

  useEffect(()=>{ 
    loadData();
  }, [])
  
  // Auto-select climber for non-admin users
  useEffect(() => {
    if (user && user.role !== 'admin' && user.climberId && climbers.length > 0) {
      setSelectedClimber(user.climberId);
    }
  }, [user, climbers]);
  
  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [loadedClimbers, loadedSessions, loadedLeaderboard] = await Promise.all([
        api.getClimbers(),
        api.getSessions(),
        api.getLeaderboard()
      ]);
      setClimbers(loadedClimbers);
      setSessions(loadedSessions);
      setLeaderboard(loadedLeaderboard);
      await loadVideos(); // Load videos too
    } catch (err: any) {
      console.error('Failed to load data:', err);
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }
  
  async function loadVideos() {
    try {
      const status = videoFilter === 'all' ? undefined : videoFilter;
      const loadedVideos = await api.getVideos(status);
      setVideos(loadedVideos);
    } catch (err: any) {
      console.error('Failed to load videos:', err);
    }
  }
  
  // Reload videos when filter changes
  useEffect(() => {
    loadVideos();
  }, [videoFilter]);
  
  // Load selected climber's latest session data
  useEffect(() => {
    if (selectedClimber) {
      const climberSessions = sessions
        .filter((s:any) => s.climberId === selectedClimber)
        .sort((a:any, b:any) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      if (climberSessions.length > 0 && climberSessions[0].wallCounts) {
        setWallCounts(climberSessions[0].wallCounts);
      }
    }
  }, [selectedClimber, sessions]);

  function handleLoginSuccess() {
    setIsAuthenticated(true);
    setUser(api.getUser());
    setShowLoginScreen(false);
    loadData(); // Reload data after login
  }

  function handleLogout() {
    api.clearToken();
    setIsAuthenticated(false);
    setUser(null);
    setShowLoginScreen(true);
  }

  async function handlePasswordChange(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);
    
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }
    
    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters');
      return;
    }
    
    try {
      await api.changePassword(currentPassword, newPassword);
      setPasswordSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      // Don't auto-close since we're in settings modal now
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to change password');
    }
  }

  async function deleteClimberAccount(climberId: number, climberName: string) {
    if (!confirm(`Delete ${climberName} and all their sessions? This cannot be undone!`)) {
      return;
    }
    try {
      setLoading(true);
      await api.deleteClimber(climberId);
      await loadData();
      alert(`Deleted ${climberName}`);
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function deleteSessionById(sessionId: number) {
    if (!confirm('Delete this session? This cannot be undone!')) {
      return;
    }
    try {
      setLoading(true);
      await api.deleteSession(sessionId);
      await loadData();
      alert('Session deleted');
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  // Removed automatic login screen redirect - users can browse without logging in

  async function addClimber(){ 
    if(!newName.trim()) return;
    setLoading(true);
    try {
      const c = await api.addClimber(newName.trim());
      setClimbers([...climbers,c]);
      setSelectedClimber(c.id);
      setNewName('');
    } catch (err: any) {
      setError(err.message || 'Failed to add climber');
    } finally {
      setLoading(false);
    }
  }

  function updateWallCount(wall: 'overhang'|'midWall'|'sideWall', color: keyof Counts, val: string) {
    const nv = Math.max(0, parseInt(val)||0);
    const maxAllowed = WALL_TOTALS[wall][color];
    const cappedValue = maxAllowed > 0 ? Math.min(nv, maxAllowed) : nv;
    setWallCounts({...wallCounts, [wall]: {...wallCounts[wall], [color]: cappedValue}});
  }
  
  function addClimb() {
    // Require video evidence for red or black
    if ((dropdownColor === 'red' || dropdownColor === 'black') && !videoUrl.trim()) {
      alert('Video evidence required for red and black climbs!');
      return;
    }
    
    const current = wallCounts[dropdownWall][dropdownColor];
    setWallCounts({
      ...wallCounts, 
      [dropdownWall]: {...wallCounts[dropdownWall], [dropdownColor]: current + 1}
    });
    
    // Track video for submission after session is created
    if (videoUrl.trim()) {
      setPendingVideos([...pendingVideos, {
        videoUrl: videoUrl.trim(),
        color: dropdownColor,
        wall: dropdownWall
      }]);
      const videoNote = `${dropdownColor} on ${dropdownWall}: ${videoUrl}`;
      setSessionNotes(sessionNotes ? `${sessionNotes}\n${videoNote}` : videoNote);
      setVideoUrl('');
    }
  }

  async function submit(){ 
    if(!selectedClimber) return;
    setLoading(true);
    setError(null);
    try {
      // Exclude red/black climbs that have pending videos from the score
      // They will be added when admin approves the video
      const adjustedWallCounts = JSON.parse(JSON.stringify(wallCounts)); // Deep copy
      
      pendingVideos.forEach(video => {
        if (video.color === 'red' || video.color === 'black') {
          const wall = video.wall as 'overhang' | 'midWall' | 'sideWall';
          const color = video.color as 'red' | 'black';
          if (adjustedWallCounts[wall] && adjustedWallCounts[wall][color] > 0) {
            adjustedWallCounts[wall][color] -= 1;
          }
        }
      });
      
      const session = await api.addSession({
        climberId: selectedClimber,
        date,
        wallCounts: adjustedWallCounts, // Submit WITHOUT pending red/black climbs
        notes: sessionNotes
      });
      
      // Submit all pending videos with the session ID
      if (pendingVideos.length > 0 && session.id) {
        await Promise.all(
          pendingVideos.map(video => 
            api.submitVideo(session.id, video.videoUrl, video.color, video.wall)
          )
        );
      }
      
      const [loadedSessions, loadedLeaderboard] = await Promise.all([
        api.getSessions(),
        api.getLeaderboard()
      ]);
      setSessions(loadedSessions);
      setLeaderboard(loadedLeaderboard); 
      setWallCounts({overhang:emptyWall(),midWall:emptyWall(),sideWall:emptyWall()}); 
      setSessionNotes('');
      setVideoUrl('');
      setPendingVideos([]);
    } catch (err: any) {
      setError(err.message || 'Failed to submit session');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{fontFamily:'Inter, Arial, sans-serif',padding:'10px',maxWidth:1000,margin:'0 auto',position:'relative'}}>
      <BackgroundBeams />
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20,flexWrap:'wrap',gap:12}}>
        <div style={{display:'flex',alignItems:'center',gap:16,flexWrap:'wrap'}}>
          <h1 style={{margin:0,fontSize:'clamp(20px, 5vw, 32px)'}}>BoulderingELO</h1>
          <a 
            href="https://github.com/Schweinefilet/BoulderingELO" 
            target="_blank" 
            rel="noopener noreferrer"
            style={{
              color:'#3b82f6',
              textDecoration:'none',
              fontWeight:'600',
              fontSize:'clamp(12px, 2.5vw, 14px)',
              transition:'color 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#2563eb'}
            onMouseLeave={(e) => e.currentTarget.style.color = '#3b82f6'}
          >
            ⭐ GitHub Repository (please give it a star!)
          </a>
        </div>
        <div style={{display:'flex',gap:12,alignItems:'center'}}>
          {isAuthenticated && user && (
            <>
              <span style={{color:'#94a3b8'}}>
                {user.username} {user.role === 'admin' && <span style={{color:'#fbbf24'}}>(Admin)</span>}
              </span>
              {user.role === 'admin' && (
                <button
                  onClick={() => setShowAdminPanel(true)}
                  style={{
                    padding:'8px 16px',
                    backgroundColor:'#fbbf24',
                    color:'#000',
                    border:'none',
                    borderRadius:6,
                    cursor:'pointer',
                    fontWeight:'600'
                  }}
                >
                  Admin Panel
                </button>
              )}
              <button
                onClick={() => {
                  // Load current settings when opening modal
                  const currentClimber = climbers.find(c => c.id === user?.climberId);
                  if (currentClimber) {
                    setSettingsCountry(currentClimber.country || '');
                    setSettingsStarted(currentClimber.started_bouldering || '');
                    setSettingsBio(currentClimber.bio || '');
                  }
                  setShowSettings(true);
                }}
                style={{
                  padding:'8px 16px',
                  backgroundColor:'#10b981',
                  color:'white',
                  border:'none',
                  borderRadius:6,
                  cursor:'pointer'
                }}
              >
                Settings
              </button>
              <button
                onClick={handleLogout}
                style={{
                  padding:'8px 16px',
                  backgroundColor:'#475569',
                  color:'white',
                  border:'none',
                  borderRadius:6,
                  cursor:'pointer'
                }}
              >
                Logout
              </button>
            </>
          )}
          {!isAuthenticated && (
            <button
              onClick={() => setShowLoginScreen(true)}
              style={{
                padding:'8px 16px',
                backgroundColor:'#3b82f6',
                color:'white',
                border:'none',
                borderRadius:6,
                cursor:'pointer'
              }}
            >
              Login
            </button>
          )}
        </div>
      </div>
      
      {error && (
        <div style={{backgroundColor:'#dc2626',color:'white',padding:12,borderRadius:6,marginBottom:16}}>
          {error}
        </div>
      )}
      
      {loading && (
        <div style={{color:'#3b82f6',marginBottom:16}}>Loading...</div>
      )}
      
      {!isAuthenticated && !loading && (
        <GlowingCard>
          <div style={{backgroundColor:'#1e293b',padding:24,borderRadius:8,marginBottom:20,border:'2px solid #3b82f6'}}>
            <h2 style={{marginTop:0,color:'#3b82f6'}}>Welcome to BoulderingELO</h2>
            <p>Track your climbing progress with our weighted scoring system. View stats below or login to add your sessions!</p>
          </div>
        </GlowingCard>
      )}
      
      <GlowingCard>
        <div style={{backgroundColor:'#1e293b',padding:16,borderRadius:8,marginBottom:20}}>
          <h3 style={{marginTop:0}}>Scoring Formula</h3>
          <p style={{fontFamily:'monospace',fontSize:14}}>
            Score = Σ (base_points × (W(cmltve + count) - W(cmltve)))
          </p>
          <p style={{fontSize:14,marginBottom:8}}>
            Where W(n) = (1 - r^n) / (1 - r), r = 0.95
          </p>
          <div style={{fontSize:13,color:'#94a3b8'}}>
            <strong>Base Points:</strong> Black(120), Red(56), Orange(12.5), Yellow(3.5), Blue(0.75), Green(0.25)
            <br/>
            <strong>cmltve</strong> = cumulative count of all higher-ranked colors processed so far
            <br/>
            Colors are processed in order: Black (≥V9) → Red (V7-V8) → Orange (V5-V6) → Yellow (V3-V4) → Blue (V1-V2) → Green (V0-V1)
          </div>
                    <p style={{fontSize:14,marginBottom:8}}>
            Basically, climb harder stuff to get more points!
          </p>
        </div>
      </GlowingCard>
      
      {/* Leaderboard - visible to everyone */}
      <section style={{marginBottom:20}}>
        <GlowBorder glowColor="rgba(59, 130, 246, 0.4)" borderRadius={12} backgroundColor="#1e293b">
          <div style={{padding:24}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
              <h2 style={{margin:0,fontSize:28,fontWeight:'700'}}>Leaderboard</h2>
            </div>
            <div style={{
              backgroundColor:'#0f172a',
              borderRadius:8,
              overflow:'auto',
              border:'1px solid #334155'
            }}>
              {/* Header */}
              <div style={{
                display:'grid',
                gridTemplateColumns:'60px 2fr 120px 120px 90px repeat(4, 70px)',
                columnGap:8,
                padding:'12px 16px',
                backgroundColor:'#1e293b',
                fontWeight:'600',
                fontSize:13,
                color:'#94a3b8',
                borderBottom:'1px solid #334155',
                alignItems:'center',
                minWidth:700
              }}>
                <div style={{textAlign:'center'}}></div>
                <div style={{display:'flex', alignItems:'center', gap:12}}>
                  <span style={{width:20,display:'inline-block'}}></span>
                  <span></span>
                </div>
                <div style={{textAlign:'center'}}>Global Ranking</div>
                <div style={{textAlign:'center'}}>Ranked Score</div>
                <div style={{textAlign:'center'}}>Sessions</div>
                {CLIMB_CATEGORY_COLUMNS.map(column => (
                  <div
                    key={column.key}
                    style={{
                      textAlign:'center',
                      fontSize:11,
                      fontWeight:'600',
                      color:column.color
                    }}
                  >
                    {column.label}
                  </div>
                ))}
              </div>
              
              {/* Rows */}
              {(showAllLeaderboard ? leaderboard : leaderboard.slice(0, 10)).map((e:any,i:number)=> {
                const climber = climbers.find((c:any) => c.name === e.climber);
                const climberSessions = sessions.filter((s:any) => s.climberId === climber?.id);
                const playCount = climberSessions.length;
                
                // Get latest session for climb counts
                const latestSession = climberSessions.length > 0 
                  ? climberSessions.sort((a:any, b:any) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
                  : null;
                const latestCounts = normalizeSessionCounts(latestSession);

                return (
                    <div 
                      key={i}
                      style={{
                        display:'grid',
                        gridTemplateColumns:'60px 2fr 120px 120px 90px repeat(4, 70px)',
                        columnGap:8,
                        padding:'12px 16px',
                        backgroundColor: i % 2 === 0 ? '#0f172a' : '#1a1f2e',
                        borderBottom: i < (showAllLeaderboard ? leaderboard.length - 1 : Math.min(9, leaderboard.length - 1)) ? '1px solid #334155' : 'none',
                        alignItems:'center',
                        transition:'background-color 0.2s',
                        cursor:'pointer',
                        minWidth:700
                      }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#1e293b'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = i % 2 === 0 ? '#0f172a' : '#1a1f2e'}
                    onClick={() => climber && setViewingProfile(climber.id)}
                  >
                    {/* Rank */}
                    <div style={{
                      textAlign:'center',
                      fontWeight:'700',
                      fontSize:16,
                      color: i === 0 ? '#fbbf24' : i === 1 ? '#cbd5e1' : i === 2 ? '#d97706' : '#64748b'
                    }}>
                      #{i + 1}
                    </div>
                    
                    {/* Player with flag */}
                    <div style={{display:'flex',alignItems:'center',gap:12,minWidth:0}}>
                      <FlagEmoji countryCode={climber?.country} size={20} />
                      <span style={{fontWeight:'600',fontSize:16,color:'#e2e8f0',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{e.climber}</span>
                    </div>
                    
                    {/* Global Ranking */}
                    <div style={{textAlign:'center',fontWeight:'700',fontSize:14,color:'#94a3b8'}}>
                      #{i + 1}
                    </div>
                    
                    {/* Ranked Score */}
                    <div style={{textAlign:'center',fontWeight:'700',fontSize:16,color:'#3b82f6'}}>
                      {e.total_score.toFixed(2)}
                    </div>
                    
                    {/* Sessions */}
                    <div style={{textAlign:'center',color:'#94a3b8',fontSize:14}}>{playCount}</div>
                    
                    {/* Climbs by color */}
                    {CLIMB_CATEGORY_COLUMNS.map(column => (
                      <div key={column.key} style={{textAlign:'center'}}>
                        <div style={{fontSize:16,color:column.color,fontWeight:'700'}}>{latestCounts[column.key] || 0}</div>
                      </div>
                    ))}
                  </div>
                );
              })}
              
              {/* Show All button */}
              {!showAllLeaderboard && leaderboard.length > 10 && (
                <div style={{
                  padding:16,
                  textAlign:'center',
                  backgroundColor:'#1e293b',
                  borderTop:'1px solid #334155'
                }}>
                  <button
                    onClick={() => setShowAllLeaderboard(true)}
                    style={{
                      padding:'10px 32px',
                      backgroundColor:'#3b82f6',
                      color:'white',
                      border:'none',
                      borderRadius:8,
                      fontSize:14,
                      fontWeight:'600',
                      cursor:'pointer',
                      transition:'background-color 0.2s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#2563eb'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = '#3b82f6'}
                  >
                    Show All ({leaderboard.length} players)
                  </button>
                </div>
              )}
              
              {showAllLeaderboard && leaderboard.length > 10 && (
                <div style={{
                  padding:16,
                  textAlign:'center',
                  backgroundColor:'#1e293b',
                  borderTop:'1px solid #334155'
                }}>
                  <button
                    onClick={() => setShowAllLeaderboard(false)}
                    style={{
                      padding:'10px 32px',
                      backgroundColor:'#475569',
                      color:'white',
                      border:'none',
                      borderRadius:8,
                      fontSize:14,
                      fontWeight:'600',
                      cursor:'pointer',
                      transition:'background-color 0.2s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#64748b'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = '#475569'}
                  >
                    Show Less
                  </button>
                </div>
              )}
            </div>
          </div>
        </GlowBorder>
      </section>
      
      {isAuthenticated && (
        <section style={{display:'flex',gap:20,flexWrap:'wrap',marginBottom:20}}>
          <div style={{flex:1,minWidth:300}}>
            <GlowBorder glowColor="rgba(59, 130, 246, 0.4)" borderRadius={12} backgroundColor="#1e293b">
              <div style={{padding:24}}>
                <h2 style={{marginTop:0,marginBottom:20,fontSize:24,fontWeight:'600'}}>New Session</h2>
            
            <div style={{marginBottom:16}}>
              <label style={{display:'block',fontWeight:'500',marginBottom:8}}>Climber</label>
              {user?.role === 'admin' ? (
                <select 
                  value={selectedClimber||''} 
                  onChange={e=>setSelectedClimber(parseInt(e.target.value)||undefined)}
                  style={{width:'100%',padding:'10px 12px',borderRadius:6,border:'1px solid #475569',backgroundColor:'#1e293b',color:'white',fontSize:14}}
                >
                  <option value="">Select...</option>
                  {climbers.map(c=>(<option key={c.id} value={c.id}>{c.name}</option>))}
                </select>
              ) : (
                <div style={{padding:'10px 12px',borderRadius:6,border:'1px solid #475569',backgroundColor:'#1e293b',color:'#94a3b8',fontSize:14}}>
                  {climbers.find(c => c.id === user?.climberId)?.name || 'Loading...'}
                </div>
              )}
              {user?.role === 'admin' && (
                <div style={{marginTop:8,display:'flex',gap:8}}>
                  <input 
                    placeholder="New name" 
                    value={newName} 
                    onChange={e=>setNewName(e.target.value)}
                    style={{flex:1,padding:'10px 12px',borderRadius:6,border:'1px solid #475569',backgroundColor:'#1e293b',color:'white',fontSize:14}}
                  />
                  <button 
                    onClick={addClimber}
                    style={{padding:'10px 20px',borderRadius:6,backgroundColor:'#3b82f6',color:'white',border:'none',cursor:'pointer',fontWeight:'500',fontSize:14,whiteSpace:'nowrap'}}
                  >
                    Add climber
                  </button>
                </div>
              )}
            </div>

          <div style={{marginBottom:16}}>
            <label style={{display:'block',fontWeight:'500',marginBottom:8}}>Date</label>
            <input 
              type="date" 
              value={date} 
              onChange={e=>setDate(e.target.value)}
              style={{width:'100%',padding:'10px 12px',borderRadius:6,border:'1px solid #475569',backgroundColor:'#1e293b',color:'white',fontSize:14}}
            />
          </div>

          {user?.role === 'admin' && (
            <div style={{marginBottom:16,display:'flex',alignItems:'center',gap:8}}>
              <input 
                type="checkbox" 
                checked={manualMode} 
                onChange={e=>setManualMode(e.target.checked)}
                id="manual-mode"
                style={{width:18,height:18,cursor:'pointer'}}
              />
              <label htmlFor="manual-mode" style={{fontWeight:'500',cursor:'pointer',userSelect:'none'}}>
                Manual Input Mode
              </label>
            </div>
          )}

          {!manualMode ? (
            // Dropdown mode
            <div>
              <h3 style={{marginBottom:16,fontSize:18,fontWeight:'600'}}>Add Climb</h3>
              
              <div style={{marginBottom:16}}>
                <label style={{display:'block',fontWeight:'500',marginBottom:8}}>Wall Section</label>
                <select 
                  value={dropdownWall} 
                  onChange={e=>setDropdownWall(e.target.value as any)} 
                  style={{width:'100%',padding:'10px 12px',borderRadius:6,border:'1px solid #475569',backgroundColor:'#1e293b',color:'white',fontSize:14}}
                >
                  <option value="midWall">Mid Wall</option>
                  <option value="overhang">Overhang</option>
                  <option value="sideWall">Side Wall</option>
                </select>
              </div>

              <div style={{marginBottom:16}}>
                <label style={{display:'block',fontWeight:'500',marginBottom:8}}>Color</label>
                <select 
                  value={dropdownColor} 
                  onChange={e=>setDropdownColor(e.target.value as any)} 
                  style={{width:'100%',padding:'10px 12px',borderRadius:6,border:'1px solid #475569',backgroundColor:'#1e293b',color:'white',fontSize:14}}
                >
                  {ORDER.map((c:any)=><option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {(dropdownColor === 'red' || dropdownColor === 'black') && (
                <div style={{marginBottom:16,padding:16,backgroundColor:'#7f1d1d',borderRadius:6,border:'1px solid #991b1b'}}>
                  <label style={{display:'block',marginBottom:8,fontWeight:'bold',fontSize:14}}>⚠️ Video Evidence Required</label>
                  <input 
                    type="text" 
                    placeholder="Enter video URL (required for red/black)" 
                    value={videoUrl} 
                    onChange={e=>setVideoUrl(e.target.value)}
                    style={{width:'100%',padding:'10px 12px',borderRadius:6,border:'1px solid #991b1b',backgroundColor:'#1e293b',color:'white',fontSize:14}}
                  />
                </div>
              )}

              <div style={{marginBottom:16}}>
                <button
                  onClick={addClimb}
                  style={{
                    width:'100%',
                    padding:'12px 16px',
                    backgroundColor:'#3b82f6',
                    color:'white',
                    border:'none',
                    borderRadius:8,
                    fontSize:16,
                    fontWeight:'600',
                    cursor:'pointer',
                    transition:'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#3b82f6'}
                >
                  Add Climb
                </button>
              </div>

              <div style={{backgroundColor:'#1e293b',padding:16,borderRadius:8,fontSize:13,border:'1px solid #475569'}}>
                <h4 style={{marginTop:0,marginBottom:12,fontSize:16,fontWeight:'600'}}>Current Progress</h4>
                <div style={{marginBottom:8,lineHeight:'1.6'}}>
                  <strong style={{color:'#94a3b8'}}>Mid Wall:</strong>{' '}
                  <span style={{color:'#10b981',fontWeight:'600'}}>{wallCounts.midWall.green}/{WALL_TOTALS.midWall.green || '?'}</span> green,{' '}
                  <span style={{color:'#3b82f6',fontWeight:'600'}}>{wallCounts.midWall.blue}/{WALL_TOTALS.midWall.blue || '?'}</span> blue,{' '}
                  <span style={{color:'#eab308',fontWeight:'600'}}>{wallCounts.midWall.yellow}/{WALL_TOTALS.midWall.yellow || '?'}</span> yellow,{' '}
                  <span style={{color:'#f97316',fontWeight:'600'}}>{wallCounts.midWall.orange}/{WALL_TOTALS.midWall.orange || '?'}</span> orange,{' '}
                  <span style={{color:'#ef4444',fontWeight:'600'}}>{wallCounts.midWall.red}/{WALL_TOTALS.midWall.red || '?'}</span> red,{' '}
                  <span style={{color:'#d1d5db',fontWeight:'600'}}>{wallCounts.midWall.black}/{WALL_TOTALS.midWall.black || '?'}</span> black
                </div>
                <div style={{marginBottom:8,lineHeight:'1.6'}}>
                  <strong style={{color:'#94a3b8'}}>Overhang:</strong>{' '}
                  <span style={{color:'#10b981',fontWeight:'600'}}>{wallCounts.overhang.green}/{WALL_TOTALS.overhang.green || '?'}</span> green,{' '}
                  <span style={{color:'#3b82f6',fontWeight:'600'}}>{wallCounts.overhang.blue}/{WALL_TOTALS.overhang.blue || '?'}</span> blue,{' '}
                  <span style={{color:'#eab308',fontWeight:'600'}}>{wallCounts.overhang.yellow}/{WALL_TOTALS.overhang.yellow || '?'}</span> yellow,{' '}
                  <span style={{color:'#f97316',fontWeight:'600'}}>{wallCounts.overhang.orange}/{WALL_TOTALS.overhang.orange || '?'}</span> orange,{' '}
                  <span style={{color:'#ef4444',fontWeight:'600'}}>{wallCounts.overhang.red}/{WALL_TOTALS.overhang.red || '?'}</span> red,{' '}
                  <span style={{color:'#d1d5db',fontWeight:'600'}}>{wallCounts.overhang.black}/{WALL_TOTALS.overhang.black || '?'}</span> black
                </div>
                <div style={{lineHeight:'1.6'}}>
                  <strong style={{color:'#94a3b8'}}>Side Wall:</strong>{' '}
                  <span style={{color:'#10b981',fontWeight:'600'}}>{wallCounts.sideWall.green}/{WALL_TOTALS.sideWall.green || '?'}</span> green,{' '}
                  <span style={{color:'#3b82f6',fontWeight:'600'}}>{wallCounts.sideWall.blue}/{WALL_TOTALS.sideWall.blue || '?'}</span> blue,{' '}
                  <span style={{color:'#eab308',fontWeight:'600'}}>{wallCounts.sideWall.yellow}/{WALL_TOTALS.sideWall.yellow || '?'}</span> yellow,{' '}
                  <span style={{color:'#f97316',fontWeight:'600'}}>{wallCounts.sideWall.orange}/{WALL_TOTALS.sideWall.orange || '?'}</span> orange,{' '}
                  <span style={{color:'#ef4444',fontWeight:'600'}}>{wallCounts.sideWall.red}/{WALL_TOTALS.sideWall.red || '?'}</span> red,{' '}
                  <span style={{color:'#d1d5db',fontWeight:'600'}}>{wallCounts.sideWall.black}/{WALL_TOTALS.sideWall.black || '?'}</span> black
                </div>
              </div>
            </div>
          ) : (
            // Manual mode
            <div>
              <h3 style={{marginBottom:16,fontSize:18,fontWeight:'600'}}>Wall Sections</h3>
              
              <div style={{marginBottom:20}}>
                <h4 style={{marginBottom:12,fontSize:16,fontWeight:'600',color:'#94a3b8'}}>Overhang</h4>
                <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12}}>
                  {ORDER.map((color:keyof Counts)=> {
                    const total = WALL_TOTALS.overhang[color];
                    const displayTotal = total > 0 ? total : '?';
                    return (
                      <div key={color}>
                        <label style={{display:'block',fontSize:12,fontWeight:'500',marginBottom:6,textTransform:'capitalize'}}>
                          {color} ({wallCounts.overhang[color]}/{displayTotal})
                        </label>
                        <input 
                          type="number" 
                          min={0}
                          max={total > 0 ? total : undefined}
                          value={wallCounts.overhang[color]} 
                          onChange={e=>updateWallCount('overhang',color,e.target.value)}
                          style={{width:'100%',padding:'8px',borderRadius:6,border:'1px solid #475569',backgroundColor:'#1e293b',color:'white',fontSize:14}}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              <div style={{marginBottom:20}}>
                <h4 style={{marginBottom:12,fontSize:16,fontWeight:'600',color:'#94a3b8'}}>Mid Wall</h4>
                <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12}}>
                  {ORDER.map((color:keyof Counts)=> {
                    const total = WALL_TOTALS.midWall[color];
                    const displayTotal = total > 0 ? total : '?';
                    return (
                      <div key={color}>
                        <label style={{display:'block',fontSize:12,fontWeight:'500',marginBottom:6,textTransform:'capitalize'}}>
                          {color} ({wallCounts.midWall[color]}/{displayTotal})
                        </label>
                        <input 
                          type="number" 
                          min={0}
                          max={total > 0 ? total : undefined}
                          value={wallCounts.midWall[color]} 
                          onChange={e=>updateWallCount('midWall',color,e.target.value)}
                          style={{width:'100%',padding:'8px',borderRadius:6,border:'1px solid #475569',backgroundColor:'#1e293b',color:'white',fontSize:14}}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              <div style={{marginBottom:20}}>
                <h4 style={{marginBottom:12,fontSize:16,fontWeight:'600',color:'#94a3b8'}}>Side Wall</h4>
                <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12}}>
                  {ORDER.map((color:keyof Counts)=> {
                    const total = WALL_TOTALS.sideWall[color];
                    const displayTotal = total > 0 ? total : '?';
                    return (
                      <div key={color}>
                        <label style={{display:'block',fontSize:12,fontWeight:'500',marginBottom:6,textTransform:'capitalize'}}>
                          {color} ({wallCounts.sideWall[color]}/{displayTotal})
                        </label>
                        <input 
                          type="number" 
                          min={0}
                          max={total > 0 ? total : undefined}
                          value={wallCounts.sideWall[color]} 
                          onChange={e=>updateWallCount('sideWall',color,e.target.value)}
                          style={{width:'100%',padding:'8px',borderRadius:6,border:'1px solid #475569',backgroundColor:'#1e293b',color:'white',fontSize:14}}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          <div style={{marginTop:16}}>
            <button
              onClick={submit}
              style={{
                width:'100%',
                padding:'14px 18px',
                backgroundColor:'#3b82f6',
                color:'white',
                border:'none',
                borderRadius:8,
                fontSize:18,
                fontWeight:'600',
                cursor:'pointer',
                transition:'background-color 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#3b82f6'}
            >
              Add Session
            </button>
          </div>
        </div>
      </GlowBorder>
    </div>

    <div style={{width:350}}>
      <GlowBorder glowColor="rgba(59, 130, 246, 0.4)" borderRadius={12} backgroundColor="#1e293b">
        <div style={{padding:24}}>
          <h2 style={{marginTop:0,marginBottom:16,fontSize:20,fontWeight:'600'}}>Live Preview</h2>
          <div style={{fontSize:48,fontWeight:700,color:'#3b82f6',marginBottom:20,textAlign:'center'}}>
            {scoreSession(totalCounts).toFixed(2)}
          </div>
          <div>
            <h4 style={{marginTop:0,marginBottom:12,fontSize:14,fontWeight:'600',color:'#94a3b8',textTransform:'uppercase',letterSpacing:'0.05em'}}>Marginal +1</h4>
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {ORDER.map((color:any)=> (
                <div key={color} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 12px',backgroundColor:'#0f172a',borderRadius:6}}>
                  <div style={{textTransform:'capitalize',fontSize:14,fontWeight:'500'}}>{color}</div>
                  <div style={{color:'#0ea5e9',fontWeight:'700',fontSize:14}}>+{marginalGain(totalCounts,color,1).toFixed(2)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </GlowBorder>
    </div>
    </section>
      )}

      <section style={{marginTop:32}}>
        <GlowBorder glowColor="rgba(59, 130, 246, 0.4)" borderRadius={12} backgroundColor="#1e293b">
          <div style={{padding:24}}>
            <h2 style={{marginTop:0,marginBottom:20,fontSize:24,fontWeight:'600'}}>Sessions</h2>
          <div>
            {(() => {
              // Group sessions by date
              const sessionsByDate = new Map<string, any[]>();
              [...sessions]
                .sort((a:any, b:any) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .forEach(s => {
                  if (!sessionsByDate.has(s.date)) {
                    sessionsByDate.set(s.date, []);
                  }
                  sessionsByDate.get(s.date)!.push(s);
                });

              return Array.from(sessionsByDate.entries()).map(([date, dateSessions]) => (
                <div key={date} style={{marginBottom:24,paddingBottom:24,borderBottom:'1px solid #475569'}}>
                  <h3 style={{fontSize:18,fontWeight:'600',marginBottom:16,color:'#3b82f6'}}>{date}</h3>
                  <div style={{display:'flex',flexDirection:'column',gap:10}}>
                    {dateSessions.map(s => {
                      const climber = climbers.find(c=>c.id===s.climberId);
                      
                      // Find previous session for this climber
                      const climberSessions = sessions
                        .filter((sess:any) => sess.climberId === s.climberId)
                        .sort((a:any, b:any) => new Date(a.date).getTime() - new Date(b.date).getTime());
                      
                      const sessionIndex = climberSessions.findIndex((sess:any) => sess.id === s.id);
                      const prevSession = sessionIndex > 0 ? climberSessions[sessionIndex - 1] : null;
                      
                      const scoreDiff = prevSession ? s.score - prevSession.score : s.score;
                      const displayScore = scoreDiff >= 0 ? `+${scoreDiff.toFixed(2)}` : scoreDiff.toFixed(2);
                      
                      // Color based on score change
                      let color = '#10b981';
                      if (scoreDiff < 0) {
                        color = '#ef4444';
                      } else if (scoreDiff >= 40) {
                        color = '#6ee7b7';
                      } else if (scoreDiff >= 30) {
                        color = '#5eead4';
                      } else if (scoreDiff >= 20) {
                        color = '#34d399';
                      } else if (scoreDiff >= 10) {
                        color = '#10b981';
                      } else {
                        color = '#059669';
                      }
                      
                      return (
                        <div key={s.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'12px 16px',backgroundColor:'#0f172a',borderRadius:6,border:'1px solid #334155'}}>
                          <span style={{fontSize:16,fontWeight:'500'}}>{climber?.name}</span>
                          <span style={{color,fontWeight:'700',fontSize:18,minWidth:80,textAlign:'right'}}>{displayScore}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ));
            })()}
          </div>
          </div>
        </GlowBorder>
      </section>

      <section style={{marginTop:32}}>
        <GlowBorder glowColor="rgba(168, 85, 247, 0.4)" borderRadius={12} backgroundColor="#1e293b">
          <div style={{padding:24}}>
            <h2 style={{marginTop:0,marginBottom:20,fontSize:24,fontWeight:'600'}}>🎥 Video Evidence Review</h2>
          
          {!api.isAuthenticated() && (
            <div style={{
              marginBottom:20,
              padding:12,
              backgroundColor:'rgba(234, 179, 8, 0.1)',
              border:'1px solid rgba(234, 179, 8, 0.3)',
              borderRadius:8
            }}>
              <p style={{margin:0,color:'#fde047',fontSize:14}}>
                👀 Viewing mode: Log in to vote on videos
              </p>
            </div>
          )}
          
          {/* Filter Tabs */}
          <div style={{display:'flex',gap:8,marginBottom:20,flexWrap:'wrap',justifyContent:'center'}}>
            {(['all', 'pending', 'approved', 'rejected'] as const).map(status => (
              <button
                key={status}
                onClick={() => setVideoFilter(status)}
                style={{
                  padding:'8px 24px',
                  borderRadius:8,
                  fontWeight:500,
                  border:'none',
                  cursor:'pointer',
                  background: videoFilter === status
                    ? 'linear-gradient(to right, #a855f7, #ec4899)'
                    : 'rgba(255,255,255,0.05)',
                  color: videoFilter === status ? '#fff' : '#94a3b8',
                  transition:'all 0.2s'
                }}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
          
          {/* Video Grid */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill, minmax(min(400px, 100%), 1fr))',gap:16}}>
            {videos.map(video => {
              const votes = video.votes || [];
              const upvotes = votes.filter(v => v.vote === 'up').length;
              const downvotes = votes.filter(v => v.vote === 'down').length;
              const totalScore = upvotes - downvotes;
              
              return (
                <div key={video.id} style={{
                  backgroundColor:'rgba(255,255,255,0.05)',
                  backdropFilter:'blur(10px)',
                  borderRadius:12,
                  border:'1px solid rgba(255,255,255,0.1)',
                  overflow:'hidden',
                  transition:'all 0.2s'
                }}>
                  {/* Video Player */}
                  <div style={{aspectRatio:'16/9',backgroundColor:'#000'}}>
                    <VideoPlayer url={video.video_url} />
                  </div>
                  
                  {/* Video Info */}
                  <div style={{padding:20}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:12}}>
                      <div>
                        <h3 style={{margin:0,marginBottom:4,fontSize:18,fontWeight:600,color:'#fff'}}>
                          {video.climber_name}
                        </h3>
                        <p style={{margin:0,fontSize:14,color:'#94a3b8'}}>
                          {video.color} • {video.wall}
                        </p>
                        <p style={{margin:0,marginTop:4,fontSize:12,color:'#64748b'}}>
                          {new Date(video.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      
                      {/* Status Badge */}
                      <span style={{
                        padding:'4px 12px',
                        borderRadius:9999,
                        fontSize:12,
                        fontWeight:500,
                        backgroundColor: video.status === 'approved' 
                          ? 'rgba(34, 197, 94, 0.2)' 
                          : video.status === 'rejected'
                          ? 'rgba(239, 68, 68, 0.2)'
                          : 'rgba(234, 179, 8, 0.2)',
                        color: video.status === 'approved'
                          ? '#86efac'
                          : video.status === 'rejected'
                          ? '#fca5a5'
                          : '#fde047',
                        border: video.status === 'approved'
                          ? '1px solid rgba(34, 197, 94, 0.3)'
                          : video.status === 'rejected'
                          ? '1px solid rgba(239, 68, 68, 0.3)'
                          : '1px solid rgba(234, 179, 8, 0.3)'
                      }}>
                        {video.status}
                      </span>
                    </div>
                    
                    {/* Vote Counts */}
                    <div style={{
                      display:'flex',
                      gap:16,
                      marginBottom:16,
                      paddingBottom:16,
                      borderBottom:'1px solid rgba(255,255,255,0.1)'
                    }}>
                      <div style={{display:'flex',alignItems:'center',gap:8}}>
                        <span style={{fontSize:16}}>👍</span>
                        <span style={{color:'#fff',fontWeight:500}}>{upvotes}</span>
                      </div>
                      <div style={{display:'flex',alignItems:'center',gap:8}}>
                        <span style={{fontSize:16}}>👎</span>
                        <span style={{color:'#fff',fontWeight:500}}>{downvotes}</span>
                      </div>
                      <div style={{marginLeft:'auto',display:'flex',alignItems:'center',gap:8}}>
                        <span style={{color:'#94a3b8',fontSize:14}}>Score:</span>
                        <span style={{
                          fontWeight:600,
                          color: totalScore >= 0 ? '#86efac' : '#fca5a5'
                        }}>
                          {totalScore > 0 ? '+' : ''}{totalScore}
                        </span>
                      </div>
                    </div>
                    
                    {/* Voting Buttons */}
                    <div style={{display:'flex',gap:8}}>
                      <button
                        onClick={async () => {
                          if (!api.isAuthenticated()) {
                            alert('Please log in to vote');
                            return;
                          }
                          try {
                            await api.voteOnVideo(video.id, 'up');
                            await loadVideos();
                          } catch (err: any) {
                            alert('Failed to submit vote: ' + err.message);
                          }
                        }}
                        disabled={!api.isAuthenticated()}
                        style={{
                          flex:1,
                          padding:'8px 16px',
                          backgroundColor: api.isAuthenticated() ? 'rgba(34, 197, 94, 0.2)' : 'rgba(100, 116, 139, 0.1)',
                          color: api.isAuthenticated() ? '#86efac' : '#64748b',
                          border: api.isAuthenticated() ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid rgba(100, 116, 139, 0.2)',
                          borderRadius:8,
                          fontWeight:500,
                          cursor: api.isAuthenticated() ? 'pointer' : 'not-allowed',
                          transition:'all 0.2s'
                        }}
                      >
                        👍 Upvote
                      </button>
                      <button
                        onClick={async () => {
                          if (!api.isAuthenticated()) {
                            alert('Please log in to vote');
                            return;
                          }
                          try {
                            await api.voteOnVideo(video.id, 'down');
                            await loadVideos();
                          } catch (err: any) {
                            alert('Failed to submit vote: ' + err.message);
                          }
                        }}
                        disabled={!api.isAuthenticated()}
                        style={{
                          flex:1,
                          padding:'8px 16px',
                          backgroundColor: api.isAuthenticated() ? 'rgba(239, 68, 68, 0.2)' : 'rgba(100, 116, 139, 0.1)',
                          color: api.isAuthenticated() ? '#fca5a5' : '#64748b',
                          border: api.isAuthenticated() ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(100, 116, 139, 0.2)',
                          borderRadius:8,
                          fontWeight:500,
                          cursor: api.isAuthenticated() ? 'pointer' : 'not-allowed',
                          transition:'all 0.2s'
                        }}
                      >
                        👎 Downvote
                      </button>
                    </div>
                    
                    {/* Admin Controls */}
                    {api.isAdmin() && video.status === 'pending' && (
                      <div style={{
                        display:'flex',
                        gap:8,
                        marginTop:12,
                        paddingTop:12,
                        borderTop:'1px solid rgba(255,255,255,0.1)'
                      }}>
                        <button
                          onClick={async () => {
                            try {
                              await api.approveVideo(video.id);
                              // Reload sessions and leaderboard to reflect score update
                              const [loadedSessions, loadedLeaderboard] = await Promise.all([
                                api.getSessions(),
                                api.getLeaderboard(),
                                loadVideos()
                              ]);
                              setSessions(loadedSessions);
                              setLeaderboard(loadedLeaderboard);
                            } catch (err: any) {
                              alert('Failed to approve: ' + err.message);
                            }
                          }}
                          style={{
                            flex:1,
                            padding:'8px 16px',
                            backgroundColor:'rgba(59, 130, 246, 0.2)',
                            color:'#93c5fd',
                            border:'1px solid rgba(59, 130, 246, 0.3)',
                            borderRadius:8,
                            fontWeight:500,
                            cursor:'pointer'
                          }}
                        >
                          ✅ Approve
                        </button>
                        <button
                          onClick={async () => {
                            try {
                              await api.rejectVideo(video.id);
                              await loadVideos();
                            } catch (err: any) {
                              alert('Failed to reject: ' + err.message);
                            }
                          }}
                          style={{
                            flex:1,
                            padding:'8px 16px',
                            backgroundColor:'rgba(249, 115, 22, 0.2)',
                            color:'#fdba74',
                            border:'1px solid rgba(249, 115, 22, 0.3)',
                            borderRadius:8,
                            fontWeight:500,
                            cursor:'pointer'
                          }}
                        >
                          ❌ Reject
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          
          {videos.length === 0 && (
            <p style={{color:'#64748b',fontSize:14,textAlign:'center',margin:0}}>
              {videoFilter === 'pending' && 'No videos waiting for review'}
              {videoFilter === 'approved' && 'No approved videos yet'}
              {videoFilter === 'rejected' && 'No rejected videos'}
              {videoFilter === 'all' && 'No video submissions yet'}
            </p>
          )}
          </div>
        </GlowBorder>
      </section>

      <section style={{marginTop:24}}>
        <h2>Analytics</h2>
        
        {/* Total Score Over Time */}
        <div style={{marginTop:16}}>
          <h3>Total Score Over Time</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={(() => {
              const sortedSessions = [...sessions].sort((a:any,b:any)=> new Date(a.date).getTime() - new Date(b.date).getTime());
              
              // Group sessions by date - just display the scores as entered
              const dateMap = new Map<string, Map<number, number>>();
              for (const s of sortedSessions) {
                if (!dateMap.has(s.date)) {
                  dateMap.set(s.date, new Map());
                }
                dateMap.get(s.date)!.set(s.climberId, s.score);
              }
              
              // Convert to chart data with all climbers at each date
              const chartData: any[] = [];
              for (const [date, climberScores] of dateMap) {
                const point: any = { date };
                for (const c of climbers) {
                  point[c.name] = climberScores.get(c.id) || null;
                }
                chartData.push(point);
              }
              
              return chartData;
            })()}>
              <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
              <XAxis dataKey="date" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip 
                contentStyle={{backgroundColor:'#1e293b',border:'1px solid #475569'}}
                formatter={(value: any) => typeof value === 'number' ? value.toFixed(2) : value}
              />
              <Legend />
              {climbers.map((c:any,i:number)=>(
                <Line 
                  key={c.id} 
                  type="monotone" 
                  dataKey={c.name}
                  name={c.name}
                  stroke={['#3b82f6','#a855f7','#ec4899','#f59e0b','#10b981'][i%5]}
                  strokeWidth={2}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Color Totals */}
        <div style={{marginTop:24}}>
          <h3>Sends by Color</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={climbers.map((c:any)=>{
              const latestSession = sessions
                .filter((s:any)=>s.climberId===c.id)
                .sort((a:any,b:any)=> new Date(b.date).getTime() - new Date(a.date).getTime())[0];
              
              if(!latestSession) return {climber: c.name};
              
              const totals:any = {climber: c.name};
              ORDER.forEach((color:any)=>{
                totals[color] = latestSession[color]||0;
              });
              return totals;
            })}>
              <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
              <XAxis dataKey="climber" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip 
                contentStyle={{backgroundColor:'#1e293b',border:'1px solid #475569'}}
                formatter={(value: any) => typeof value === 'number' ? value.toFixed(2) : value}
              />
              <Legend />
              {ORDER.map((color:any,i:number)=>(
                <Bar key={color} dataKey={color} fill={['#3b82f6','#a855f7','#ec4899','#f59e0b','#10b981','#06b6d4'][i%6]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Wall Section Breakdown */}
        <div style={{marginTop:24}}>
          <h3>Sends by Wall Section</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={climbers.map((c:any)=>{
              const latestSession = sessions
                .filter((s:any)=>s.climberId===c.id)
                .sort((a:any,b:any)=> new Date(b.date).getTime() - new Date(a.date).getTime())[0];
                
              const wallTotals:any = {climber: c.name, overhang: 0, midWall: 0, sideWall: 0};
              
              if(latestSession?.wallCounts){
                ORDER.forEach((color:any)=>{
                  wallTotals.overhang += latestSession.wallCounts.overhang[color]||0;
                  wallTotals.midWall += latestSession.wallCounts.midWall[color]||0;
                  wallTotals.sideWall += latestSession.wallCounts.sideWall[color]||0;
                });
              }
              
              return wallTotals;
            })}>
              <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
              <XAxis dataKey="climber" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip 
                contentStyle={{backgroundColor:'#1e293b',border:'1px solid #475569'}}
                formatter={(value: any) => typeof value === 'number' ? value.toFixed(2) : value}
              />
              <Legend />
              <Bar dataKey="overhang" name="Overhang" fill="#ec4899" />
              <Bar dataKey="midWall" name="Mid Wall" fill="#3b82f6" />
              <Bar dataKey="sideWall" name="Side Wall" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section style={{marginTop:24}}>
        <div>
          <button onClick={()=>{ const csv = store.exportCSV(); const blob = new Blob([csv],{type:'text/csv'}); const url = URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='bouldering.csv'; a.click(); URL.revokeObjectURL(url); }}>Export CSV</button>
        </div>
      </section>
      
      {/* Settings Modal */}
      {showSettings && (
        <div style={{
          position:'fixed',
          top:0,
          left:0,
          right:0,
          bottom:0,
          backgroundColor:'rgba(0,0,0,0.7)',
          display:'flex',
          justifyContent:'center',
          alignItems:'center',
          zIndex:1000,
          padding:20,
          overflowY:'auto'
        }}>
          <GlowBorder glowColor="rgba(16, 185, 129, 0.5)" borderRadius={12} backgroundColor="#1e293b">
            <div style={{
              padding:32,
              width:500,
              maxWidth:'100%',
              maxHeight:'90vh',
              overflowY:'auto'
            }}>
              <h2 style={{marginTop:0,marginBottom:24}}>Account Settings</h2>
              <form onSubmit={async (e) => {
                e.preventDefault();
                setSettingsError(null);
                setSettingsSuccess(false);
                
                try {
                  await api.updateUserSettings({
                    country: settingsCountry,
                    started_bouldering: settingsStarted,
                    bio: settingsBio
                  });
                  setSettingsSuccess(true);
                  
                  // Reload climbers data to reflect changes
                  const loadedClimbers = await api.getClimbers();
                  setClimbers(loadedClimbers);
                  
                  setTimeout(() => {
                    setShowSettings(false);
                    setSettingsSuccess(false);
                  }, 2000);
                } catch (err: any) {
                  setSettingsError(err.message || 'Failed to update settings');
                }
              }}>
                <div style={{
                  backgroundColor:'#0f172a',
                  padding:16,
                  borderRadius:8,
                  border:'1px solid #475569',
                  marginBottom:16
                }}>
                  <label style={{display:'block',marginBottom:8,fontSize:14,fontWeight:'600'}}>Country</label>
                  <select
                    value={settingsCountry}
                    onChange={e => setSettingsCountry(e.target.value)}
                    style={{
                      width:'100%',
                      padding:12,
                      borderRadius:6,
                      border:'1px solid #475569',
                      backgroundColor:'#1e293b',
                      color:'white',
                      fontSize:14
                    }}
                  >
                    <option value="">Select a country...</option>
                    {COUNTRY_CODES.map(code => (
                      <option key={code} value={code}>
                        {COUNTRY_NAMES[code]} ({code})
                      </option>
                    ))}
                  </select>
                  {settingsCountry && (
                    <div style={{marginTop:8,display:'flex',alignItems:'center',gap:8}}>
                      <span style={{fontSize:12,color:'#94a3b8'}}>Preview:</span>
                      <FlagEmoji countryCode={settingsCountry} size={24} />
                    </div>
                  )}
                </div>
                
                <div style={{
                  backgroundColor:'#0f172a',
                  padding:16,
                  borderRadius:8,
                  border:'1px solid #475569',
                  marginBottom:16
                }}>
                  <label style={{display:'block',marginBottom:8,fontSize:14,fontWeight:'600'}}>When Did You Start Bouldering?</label>
                  <input
                    type="text"
                    value={settingsStarted}
                    onChange={e => setSettingsStarted(e.target.value)}
                    placeholder="e.g., 2020, January 2021"
                    style={{
                      width:'100%',
                      padding:12,
                      borderRadius:6,
                      border:'1px solid #475569',
                      backgroundColor:'#1e293b',
                      color:'white',
                      fontSize:14,
                      boxSizing:'border-box'
                    }}
                  />
                </div>
                
                {/* Change Password Section */}
                <div style={{
                  backgroundColor:'#0f172a',
                  padding:16,
                  borderRadius:8,
                  border:'1px solid #475569',
                  marginTop:8
                }}>
                  <h3 style={{marginTop:0,marginBottom:16,fontSize:18,fontWeight:'600'}}>Change Password</h3>
                  <div style={{marginBottom:16}}>
                    <label style={{display:'block',marginBottom:8,fontSize:14,fontWeight:'600'}}>Current Password</label>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={e => setCurrentPassword(e.target.value)}
                      style={{
                        width:'100%',
                        padding:12,
                        borderRadius:6,
                        border:'1px solid #475569',
                        backgroundColor:'#1e293b',
                        color:'white',
                        fontSize:14,
                        boxSizing:'border-box'
                      }}
                    />
                  </div>
                  <div style={{marginBottom:16}}>
                    <label style={{display:'block',marginBottom:8,fontSize:14,fontWeight:'600'}}>New Password</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      style={{
                        width:'100%',
                        padding:12,
                        borderRadius:6,
                        border:'1px solid #475569',
                        backgroundColor:'#1e293b',
                        color:'white',
                        fontSize:14,
                        boxSizing:'border-box'
                      }}
                      minLength={6}
                    />
                  </div>
                  <div style={{marginBottom:16}}>
                    <label style={{display:'block',marginBottom:8,fontSize:14,fontWeight:'600'}}>Confirm New Password</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      style={{
                        width:'100%',
                        padding:12,
                        borderRadius:6,
                        border:'1px solid #475569',
                        backgroundColor:'#1e293b',
                        color:'white',
                        fontSize:14,
                        boxSizing:'border-box'
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handlePasswordChange}
                    disabled={!currentPassword || !newPassword || !confirmPassword}
                    style={{
                      width:'100%',
                      padding:12,
                      backgroundColor:!currentPassword || !newPassword || !confirmPassword ? '#475569' : '#0ea5e9',
                      color:'white',
                      border:'none',
                      borderRadius:6,
                      fontSize:14,
                      fontWeight:'600',
                      cursor:!currentPassword || !newPassword || !confirmPassword ? 'not-allowed' : 'pointer'
                    }}
                  >
                    Update Password
                  </button>
                </div>

                {passwordError && (
                  <div style={{
                    backgroundColor:'#dc2626',
                    color:'white',
                    padding:12,
                    borderRadius:6,
                    marginTop:16,
                    fontSize:14
                  }}>
                    {passwordError}
                  </div>
                )}
                {passwordSuccess && (
                  <div style={{
                    backgroundColor:'#10b981',
                    color:'white',
                    padding:12,
                    borderRadius:6,
                    marginTop:16,
                    fontSize:14
                  }}>
                    Password changed successfully!
                  </div>
                )}
                
                {settingsError && (
                  <div style={{
                    backgroundColor:'#dc2626',
                    color:'white',
                    padding:12,
                    borderRadius:6,
                    marginBottom:16,
                    fontSize:14
                  }}>
                    {settingsError}
                  </div>
                )}
                {settingsSuccess && (
                  <div style={{
                    backgroundColor:'#10b981',
                    color:'white',
                    padding:12,
                    borderRadius:6,
                    marginBottom:16,
                    fontSize:14
                  }}>
                    Settings updated successfully!
                  </div>
                )}
              </form>
              
              <div style={{display:'flex',gap:12,marginTop:16}}>
                <button
                  onClick={async () => {
                    setSettingsError(null);
                    setSettingsSuccess(false);
                    
                    try {
                      await api.updateUserSettings({
                        country: settingsCountry,
                        started_bouldering: settingsStarted,
                        bio: settingsBio
                      });
                      setSettingsSuccess(true);
                      
                      // Reload climbers data to reflect changes
                      const loadedClimbers = await api.getClimbers();
                      setClimbers(loadedClimbers);
                      
                      setTimeout(() => {
                        setShowSettings(false);
                        setSettingsSuccess(false);
                      }, 2000);
                    } catch (err: any) {
                      setSettingsError(err.message || 'Failed to update settings');
                    }
                  }}
                  style={{
                    flex:1,
                    padding:12,
                    backgroundColor:'#10b981',
                    color:'white',
                    border:'none',
                    borderRadius:6,
                    fontSize:16,
                    fontWeight:'600',
                    cursor:'pointer'
                  }}
                >
                  Save Changes
                </button>
                <button
                  onClick={() => {
                    setShowSettings(false);
                    setSettingsCountry('');
                    setSettingsStarted('');
                    setSettingsBio('');
                    setSettingsError(null);
                    setSettingsSuccess(false);
                    setCurrentPassword('');
                    setNewPassword('');
                    setConfirmPassword('');
                    setPasswordError(null);
                    setPasswordSuccess(false);
                  }}
                  style={{
                    flex:1,
                    padding:12,
                    backgroundColor:'#475569',
                    color:'white',
                    border:'none',
                    borderRadius:6,
                    fontSize:16,
                    fontWeight:'600',
                    cursor:'pointer'
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </GlowBorder>
        </div>
      )}

      {/* User Profile Modal */}
      {viewingProfile !== null && (() => {
        const profileClimber = climbers.find((c:any) => c.id === viewingProfile);
        const profileSessions = sessions
          .filter((s:any) => s.climberId === viewingProfile)
          .sort((a:any, b:any) => new Date(b.date).getTime() - new Date(a.date).getTime());
        const profileLeaderboardEntry = leaderboard.find((e:any) => e.climber === profileClimber?.name);
        
        // Calculate total climbs by color from LATEST session only
        const latestSession = profileSessions[0];
        const totalClimbs = {
          green: latestSession?.green || 0,
          blue: latestSession?.blue || 0,
          yellow: latestSession?.yellow || 0,
          orange: latestSession?.orange || 0,
          red: latestSession?.red || 0,
          black: latestSession?.black || 0
        };
        
        // Calculate rank history and peak score
        const rankHistory: {date: string, rank: number}[] = [];
        let peakRank: number | null = null;
        let peakScore: number | null = null;
        
        if (profileSessions.length > 0) {
          // Get all unique session dates across all climbers
          const allDates = new Set<string>();
          sessions.forEach((s:any) => {
            allDates.add(s.date);
          });
          
          // Sort dates chronologically
          const sortedDates = Array.from(allDates).sort((a, b) => 
            new Date(a).getTime() - new Date(b).getTime()
          );
          
          // Find the first and last date
          const firstDate = new Date(sortedDates[0]);
          const lastDate = new Date(sortedDates[sortedDates.length - 1]);
          const today = new Date();
          const endDate = lastDate > today ? lastDate : today;
          
          let bestRank = Infinity;
          let lastRank: number | null = null;
          
          // Iterate through every day from first session to today
          let currentDate = new Date(firstDate);
          
          while (currentDate <= endDate) {
            const dateStr = currentDate.toISOString().split('T')[0];
            
            // Calculate cumulative scores up to and including this date
            const scoresUpToDate = new Map<number, number>();
            climbers.forEach((c:any) => scoresUpToDate.set(c.id, 0));
            
            sessions.forEach((session:any) => {
              if (session.date <= dateStr) {
                const currentScore = scoresUpToDate.get(session.climberId) || 0;
                scoresUpToDate.set(session.climberId, currentScore + session.score);
              }
            });
            
            // Calculate rankings for this date
            const rankings = Array.from(scoresUpToDate.entries())
              .filter(([id, score]) => score > 0)
              .map(([id, score]) => ({id, score}))
              .sort((a, b) => b.score - a.score);
            
            const rankOnThisDate = rankings.findIndex(r => r.id === viewingProfile) + 1;
            
            // Add to history if this user had sessions up to this date
            if (rankOnThisDate > 0) {
              lastRank = rankOnThisDate;
              rankHistory.push({
                date: currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                rank: rankOnThisDate
              });
              
              if (rankOnThisDate < bestRank) {
                bestRank = rankOnThisDate;
              }
            } else if (lastRank !== null) {
              // Fill in with previous rank if no sessions up to this date but user has had sessions before
              rankHistory.push({
                date: currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                rank: lastRank
              });
            }
            
            currentDate.setDate(currentDate.getDate() + 1);
          }
          
          peakRank = bestRank !== Infinity ? bestRank : null;
          
          // Peak score is simply the current total score
          const currentTotalScore = profileLeaderboardEntry?.total_score || 0;
          peakScore = currentTotalScore > 0 ? currentTotalScore : null;
        }
        
        if (!profileClimber) return null;
        
        const currentRank = leaderboard.findIndex((e:any) => e.climber === profileClimber.name) + 1;
        
        return (
          <div style={{
            position:'fixed',
            top:0,
            left:0,
            right:0,
            bottom:0,
            backgroundColor:'rgba(0,0,0,0.8)',
            display:'flex',
            justifyContent:'center',
            alignItems:'center',
            zIndex:1000,
            padding:20,
            overflowY:'auto'
          }}>
            <div style={{
              backgroundColor:'#1e293b',
              borderRadius:12,
              border:'2px solid #475569',
              maxWidth:1000,
              width:'100%',
              maxHeight:'90vh',
              overflowY:'auto'
            }}>
              {/* Header Section - osu! style */}
              <div style={{
                background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
                padding: 'clamp(16px, 4vw, 32px)',
                borderTopLeftRadius: 10,
                borderTopRightRadius: 10,
                position: 'relative'
              }}>
                <button
                  onClick={() => setViewingProfile(null)}
                  style={{
                    position: 'absolute',
                    top: 16,
                    right: 16,
                    padding:'8px 16px',
                    backgroundColor:'rgba(0,0,0,0.3)',
                    color:'white',
                    border:'1px solid rgba(255,255,255,0.2)',
                    borderRadius:6,
                    fontSize:14,
                    fontWeight:'600',
                    cursor:'pointer',
                    zIndex:10
                  }}
                >
                  ✕
                </button>
                
                <div style={{display:'flex', gap:24, alignItems:'flex-start', flexWrap:'wrap'}}>
                  <div style={{flex:1, minWidth:200}}>
                    <div style={{display:'flex', alignItems:'center', gap:16, marginBottom:8, flexWrap:'wrap'}}>
                      <FlagEmoji countryCode={profileClimber?.country} size={32} />
                      <h1 style={{margin:0, fontSize:'clamp(24px, 5vw, 36px)', fontWeight:'700', color:'white'}}>
                        {profileClimber.name}
                      </h1>
                    </div>
                    <div style={{display:'flex', gap:32, marginTop:16}}>
                      <div>
                        <div style={{fontSize:14, color:'rgba(255,255,255,0.7)', marginBottom:4}}>Global Ranking</div>
                        <div style={{fontSize:32, fontWeight:'700', color:'white'}}>
                          #{currentRank || 'N/A'}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div style={{
                    backgroundColor:'rgba(0,0,0,0.2)',
                    padding:20,
                    borderRadius:8,
                    minWidth:200,
                    border:'1px solid rgba(255,255,255,0.1)',
                    marginRight:60
                  }}>
                    <div style={{marginBottom:12}}>
                      <div style={{fontSize:12, color:'rgba(255,255,255,0.7)', marginBottom:4}}>Ranked Score</div>
                      <div style={{fontSize:20, fontWeight:'700', color:'white'}}>
                        {profileLeaderboardEntry?.total_score.toFixed(2) || '0.00'}
                      </div>
                    </div>
                    <div style={{marginBottom:12}}>
                      <div style={{fontSize:12, color:'rgba(255,255,255,0.7)', marginBottom:4}}>Session Count</div>
                      <div style={{fontSize:20, fontWeight:'700', color:'white'}}>
                        {profileSessions.length}
                      </div>
                    </div>
                    <div style={{marginBottom:12}}>
                      <div style={{fontSize:12, color:'rgba(255,255,255,0.7)', marginBottom:4}}>Peak Rank</div>
                      <div style={{fontSize:20, fontWeight:'700', color:'white'}}>
                        {peakRank ? `#${peakRank}` : 'N/A'}
                      </div>
                    </div>
                    <div>
                      <div style={{fontSize:12, color:'rgba(255,255,255,0.7)', marginBottom:4}}>Peak Score</div>
                      <div style={{fontSize:20, fontWeight:'700', color:'white'}}>
                        {peakScore ? peakScore.toFixed(2) : 'N/A'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Stats Section */}
              <div style={{padding:32}}>
                {/* Total Climbs by Color */}
                <div style={{
                  backgroundColor:'#0f172a',
                  padding:24,
                  borderRadius:8,
                  border:'1px solid #475569',
                  marginBottom:24
                }}>
                  <h3 style={{marginTop:0, marginBottom:20, fontSize:18, fontWeight:'600', color:'#94a3b8'}}>TOTAL CLIMBS</h3>
                  <div style={{display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:16}}>
                    <div style={{backgroundColor:'#1e293b', padding:16, borderRadius:6}}>
                      <div style={{fontSize:12, color:'#10b981', marginBottom:6, fontWeight:'600'}}>GREEN</div>
                      <div style={{fontSize:28, fontWeight:'700', color:'white'}}>{totalClimbs.green}</div>
                      <div style={{fontSize:11, color:'#64748b'}}>0/{WALL_TOTALS.overhang.green + WALL_TOTALS.midWall.green + WALL_TOTALS.sideWall.green || '?'}</div>
                    </div>
                    <div style={{backgroundColor:'#1e293b', padding:16, borderRadius:6}}>
                      <div style={{fontSize:12, color:'#3b82f6', marginBottom:6, fontWeight:'600'}}>BLUE</div>
                      <div style={{fontSize:28, fontWeight:'700', color:'white'}}>{totalClimbs.blue}</div>
                      <div style={{fontSize:11, color:'#64748b'}}>0/{WALL_TOTALS.overhang.blue + WALL_TOTALS.midWall.blue + WALL_TOTALS.sideWall.blue || '?'}</div>
                    </div>
                    <div style={{backgroundColor:'#1e293b', padding:16, borderRadius:6}}>
                      <div style={{fontSize:12, color:'#eab308', marginBottom:6, fontWeight:'600'}}>YELLOW</div>
                      <div style={{fontSize:28, fontWeight:'700', color:'white'}}>{totalClimbs.yellow}</div>
                      <div style={{fontSize:11, color:'#64748b'}}>0/{WALL_TOTALS.overhang.yellow + WALL_TOTALS.midWall.yellow + WALL_TOTALS.sideWall.yellow || '?'}</div>
                    </div>
                    <div style={{backgroundColor:'#1e293b', padding:16, borderRadius:6}}>
                      <div style={{fontSize:12, color:'#f97316', marginBottom:6, fontWeight:'600'}}>ORANGE</div>
                      <div style={{fontSize:28, fontWeight:'700', color:'white'}}>{totalClimbs.orange}</div>
                      <div style={{fontSize:11, color:'#64748b'}}>0/{WALL_TOTALS.overhang.orange + WALL_TOTALS.midWall.orange + WALL_TOTALS.sideWall.orange || '?'}</div>
                    </div>
                    <div style={{backgroundColor:'#1e293b', padding:16, borderRadius:6}}>
                      <div style={{fontSize:12, color:'#ef4444', marginBottom:6, fontWeight:'600'}}>RED</div>
                      <div style={{fontSize:28, fontWeight:'700', color:'white'}}>{totalClimbs.red}</div>
                      <div style={{fontSize:11, color:'#64748b'}}>0/{WALL_TOTALS.overhang.red + WALL_TOTALS.midWall.red + WALL_TOTALS.sideWall.red || '?'}</div>
                    </div>
                    <div style={{backgroundColor:'#1e293b', padding:16, borderRadius:6}}>
                      <div style={{fontSize:12, color:'#d1d5db', marginBottom:6, fontWeight:'600'}}>BLACK</div>
                      <div style={{fontSize:28, fontWeight:'700', color:'white'}}>{totalClimbs.black}</div>
                      <div style={{fontSize:11, color:'#64748b'}}>0/{WALL_TOTALS.overhang.black + WALL_TOTALS.midWall.black + WALL_TOTALS.sideWall.black || '?'}</div>
                    </div>
                  </div>
                </div>

                {/* Rank History Graph */}
                {rankHistory.length > 0 && (
                  <div style={{
                    backgroundColor:'#0f172a',
                    padding:24,
                    borderRadius:8,
                    border:'1px solid #475569',
                    marginBottom:24
                  }}>
                    <h3 style={{marginTop:0, marginBottom:20, fontSize:18, fontWeight:'600', color:'#94a3b8'}}>RANK HISTORY</h3>
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={rankHistory}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                        <XAxis 
                          dataKey="date" 
                          stroke="#94a3b8"
                          style={{fontSize:12}}
                        />
                        <YAxis 
                          stroke="#94a3b8"
                          reversed
                          domain={[1, 'dataMax']}
                          style={{fontSize:12}}
                        />
                        <Tooltip 
                          contentStyle={{
                            backgroundColor:'#1e293b',
                            border:'1px solid #475569',
                            borderRadius:6
                          }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="rank" 
                          stroke="#3b82f6" 
                          strokeWidth={3}
                          dot={{fill:'#3b82f6', r:4}}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Session History */}
                <div>
                  <h3 style={{marginTop:0, marginBottom:16, fontSize:18, fontWeight:'600', color:'#94a3b8'}}>RECENT SESSIONS</h3>
                  {profileSessions.length > 0 ? (
                    <div style={{display:'flex',flexDirection:'column',gap:12}}>
                      {profileSessions.slice(0, 5).map((session:any) => (
                        <div 
                          key={session.id}
                          style={{
                            backgroundColor:'#0f172a',
                            padding:16,
                            borderRadius:8,
                            border:'1px solid #475569'
                          }}
                        >
                          <div style={{display:'flex',justifyContent:'space-between',alignItems:'start',marginBottom:8}}>
                            <div>
                              <div style={{fontSize:16,fontWeight:'600',color:'white'}}>
                                {new Date(session.date).toLocaleDateString('en-US', { 
                                  weekday: 'short', 
                                  year: 'numeric', 
                                  month: 'short', 
                                  day: 'numeric' 
                                })}
                              </div>
                              <div style={{fontSize:14,color:'#94a3b8',marginTop:4}}>
                                Score: {session.score.toFixed(2)}
                              </div>
                            </div>
                          </div>
                          <div style={{display:'flex',gap:16,flexWrap:'wrap',marginTop:12,fontSize:14}}>
                            {session.green > 0 && <span style={{color:'#10b981'}}>🟢 {session.green}</span>}
                            {session.blue > 0 && <span style={{color:'#3b82f6'}}>� {session.blue}</span>}
                            {session.yellow > 0 && <span style={{color:'#eab308'}}>� {session.yellow}</span>}
                            {session.orange > 0 && <span style={{color:'#f97316'}}>� {session.orange}</span>}
                            {session.red > 0 && <span style={{color:'#ef4444'}}>� {session.red}</span>}
                            {session.black > 0 && <span style={{color:'#d1d5db'}}>⚫ {session.black}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{
                      textAlign:'center',
                      padding:32,
                      color:'#64748b',
                      fontSize:16,
                      backgroundColor:'#0f172a',
                      borderRadius:8,
                      border:'1px solid #475569'
                    }}>
                      No sessions yet
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Admin Panel */}
      {showAdminPanel && user?.role === 'admin' && (
        <div style={{
          position:'fixed',
          top:0,
          left:0,
          right:0,
          bottom:0,
          backgroundColor:'rgba(0,0,0,0.8)',
          display:'flex',
          alignItems:'center',
          justifyContent:'center',
          zIndex:1000,
          padding:20
        }}>
          <div style={{
            backgroundColor:'#0f172a',
            borderRadius:12,
            border:'2px solid #fbbf24',
            width:'100%',
            maxWidth:900,
            maxHeight:'90vh',
            overflow:'hidden',
            display:'flex',
            flexDirection:'column'
          }}>
            <div style={{
              padding:'20px 24px',
              borderBottom:'1px solid #475569',
              display:'flex',
              justifyContent:'space-between',
              alignItems:'center'
            }}>
              <h2 style={{margin:0,fontSize:24,fontWeight:'700',color:'#fbbf24'}}>Admin Panel</h2>
              <button
                onClick={() => setShowAdminPanel(false)}
                style={{
                  padding:'8px 16px',
                  backgroundColor:'#475569',
                  color:'white',
                  border:'none',
                  borderRadius:6,
                  cursor:'pointer',
                  fontSize:14
                }}
              >
                Close
              </button>
            </div>

            {/* Tabs */}
            <div style={{
              display:'flex',
              gap:4,
              padding:'16px 24px',
              borderBottom:'1px solid #475569',
              backgroundColor:'#1e293b'
            }}>
              {(['accounts', 'sessions'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setAdminTab(tab)}
                  style={{
                    padding:'10px 20px',
                    backgroundColor: adminTab === tab ? '#fbbf24' : 'transparent',
                    color: adminTab === tab ? '#000' : '#94a3b8',
                    border:'none',
                    borderRadius:6,
                    cursor:'pointer',
                    fontWeight:'600',
                    fontSize:14,
                    textTransform:'capitalize'
                  }}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div style={{
              flex:1,
              overflow:'auto',
              padding:24
            }}>
              {adminTab === 'accounts' && (
                <div>
                  <h3 style={{marginTop:0,marginBottom:16,fontSize:18,fontWeight:'600'}}>Manage Accounts</h3>
                  <div style={{display:'flex',flexDirection:'column',gap:12}}>
                    {climbers.map(climber => (
                      <div 
                        key={climber.id}
                        style={{
                          backgroundColor:'#1e293b',
                          padding:16,
                          borderRadius:8,
                          border:'1px solid #475569',
                          display:'flex',
                          justifyContent:'space-between',
                          alignItems:'center'
                        }}
                      >
                        <div>
                          <div style={{fontSize:16,fontWeight:'600',color:'white'}}>{climber.name}</div>
                          {climber.username && (
                            <div style={{fontSize:14,color:'#94a3b8',marginTop:4}}>
                              Username: {climber.username}
                              {climber.role === 'admin' && (
                                <span style={{
                                  marginLeft:8,
                                  padding:'2px 8px',
                                  backgroundColor:'#fbbf24',
                                  color:'#000',
                                  borderRadius:4,
                                  fontSize:12,
                                  fontWeight:'600'
                                }}>
                                  ADMIN
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => deleteClimberAccount(climber.id, climber.name)}
                          style={{
                            padding:'8px 16px',
                            backgroundColor:'#dc2626',
                            color:'white',
                            border:'none',
                            borderRadius:6,
                            cursor:'pointer',
                            fontSize:14,
                            fontWeight:'600'
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {adminTab === 'sessions' && (
                <div>
                  <h3 style={{marginTop:0,marginBottom:16,fontSize:18,fontWeight:'600'}}>Manage Sessions</h3>
                  <div style={{display:'flex',flexDirection:'column',gap:12}}>
                    {sessions.map(session => (
                      <div 
                        key={session.id}
                        style={{
                          backgroundColor:'#1e293b',
                          padding:16,
                          borderRadius:8,
                          border:'1px solid #475569'
                        }}
                      >
                        <div style={{display:'flex',justifyContent:'space-between',alignItems:'start',marginBottom:8}}>
                          <div>
                            <div style={{fontSize:16,fontWeight:'600',color:'white'}}>
                              {climbers.find(c => c.id === session.climberId)?.name || 'Unknown'}
                            </div>
                            <div style={{fontSize:14,color:'#94a3b8',marginTop:4}}>
                              {new Date(session.date).toLocaleDateString()} • Score: {session.score.toFixed(2)}
                            </div>
                          </div>
                          <button
                            onClick={() => deleteSessionById(session.id)}
                            style={{
                              padding:'6px 12px',
                              backgroundColor:'#dc2626',
                              color:'white',
                              border:'none',
                              borderRadius:6,
                              cursor:'pointer',
                              fontSize:13,
                              fontWeight:'600'
                            }}
                          >
                            Delete
                          </button>
                        </div>
                        {session.notes && (
                          <div style={{fontSize:14,color:'#cbd5e1',marginTop:8,fontStyle:'italic'}}>
                            {session.notes}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Login Modal */}
      {showLoginScreen && (
        <div style={{
          position:'fixed',
          top:0,
          left:0,
          right:0,
          bottom:0,
          backgroundColor:'rgba(0,0,0,0.9)',
          display:'flex',
          justifyContent:'center',
          alignItems:'center',
          zIndex:2000,
          padding:20
        }}>
          <div style={{position:'relative',maxWidth:500,width:'100%'}}>
            <button
              onClick={() => setShowLoginScreen(false)}
              style={{
                position:'absolute',
                top:-40,
                right:0,
                padding:'8px 16px',
                backgroundColor:'#475569',
                color:'white',
                border:'none',
                borderRadius:6,
                fontSize:14,
                fontWeight:'600',
                cursor:'pointer'
              }}
            >
              Close
            </button>
            <LoginScreen onLogin={handleLoginSuccess} />
          </div>
        </div>
      )}
    </div>
  )
}
