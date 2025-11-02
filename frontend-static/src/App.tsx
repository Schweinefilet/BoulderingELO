import React, { useState, useEffect } from 'react'
import { scoreSession, marginalGain, ORDER, BASE, combineCounts, type Counts, type WallCounts } from './lib/scoring'
import * as store from './lib/storage'
import * as api from './lib/api'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { GlowingCard } from './components/ui/glowing-card'
import { HoverBorderGradient } from './components/ui/hover-border-gradient'

const emptyWall = (): Counts => ({green:0,blue:0,yellow:0,orange:0,red:0,black:0});

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
              padding:12,
              backgroundColor:loading || !username || !password || (mode === 'register' && !name) ? '#475569' : '#3b82f6',
              color:'white',
              border:'none',
              borderRadius:6,
              fontSize:16,
              fontWeight:'600',
              cursor:loading || !username || !password || (mode === 'register' && !name) ? 'not-allowed' : 'pointer'
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

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
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
      setTimeout(() => {
        setShowPasswordChange(false);
        setPasswordSuccess(false);
      }, 2000);
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
    <div style={{fontFamily:'Inter, Arial, sans-serif',padding:20,maxWidth:1000,margin:'0 auto'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
        <h1 style={{margin:0}}>BoulderingELO</h1>
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
                onClick={() => setShowPasswordChange(true)}
                style={{
                  padding:'8px 16px',
                  backgroundColor:'#0ea5e9',
                  color:'white',
                  border:'none',
                  borderRadius:6,
                  cursor:'pointer'
                }}
              >
                Change Password
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
        </div>
      </GlowingCard>
      
      {/* Leaderboard - visible to everyone */}
      <section style={{marginBottom:20}}>
        <GlowingCard>
          <div style={{backgroundColor:'#1e293b',padding:20,borderRadius:8,border:'1px solid #475569'}}>
            <h2 style={{marginTop:0,marginBottom:16,fontSize:24,fontWeight:'600'}}>Leaderboard</h2>
            <ol style={{margin:0,paddingLeft:24,display:'flex',flexDirection:'column',gap:12}}>
              {leaderboard.map((e:any,i:number)=> {
                const climber = climbers.find((c:any) => c.name === e.climber);
                return (
                  <li key={i} style={{fontSize:16,lineHeight:'1.5'}}>
                    <button
                      onClick={() => climber && setViewingProfile(climber.id)}
                      style={{
                        background:'none',
                        border:'none',
                        padding:0,
                        fontWeight:'600',
                        color:'#94a3b8',
                        cursor:'pointer',
                        textDecoration:'underline',
                        fontSize:16
                      }}
                    >
                      {e.climber}
                    </button>
                    :
                    <span style={{marginLeft:8,color:'#3b82f6',fontWeight:'700',fontSize:18}}>{e.total_score.toFixed(2)}</span>
                  </li>
                );
              })}
            </ol>
          </div>
        </GlowingCard>
      </section>
      
      
      {isAuthenticated && (
        <section style={{display:'flex',gap:20,flexWrap:'wrap'}}>
          <div style={{flex:1,minWidth:300}}>
            <h2 style={{marginBottom:16}}>New Session</h2>
            
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

              <div style={{marginBottom:16,display:'flex',justifyContent:'center'}}>
                <HoverBorderGradient
                  onClick={addClimb}
                  containerClassName="w-full"
                  className="bg-black text-white w-full font-semibold text-base"
                  duration={3}
                  style={{padding: '12px'}}
                >
                  Add Climb
                </HoverBorderGradient>
              </div>

              <div style={{backgroundColor:'#1e293b',padding:16,borderRadius:8,fontSize:14,border:'1px solid #475569'}}>
                <h4 style={{marginTop:0,marginBottom:12,fontSize:16,fontWeight:'600'}}>Current Progress</h4>
                <div style={{marginBottom:10,lineHeight:'1.6'}}>
                  <strong style={{color:'#94a3b8'}}>Mid Wall:</strong> <span style={{color:'#3b82f6',fontWeight:'600'}}>{wallCounts.midWall.yellow}/{WALL_TOTALS.midWall.yellow}</span> yellows, <span style={{color:'#f59e0b',fontWeight:'600'}}>{wallCounts.midWall.orange}/{WALL_TOTALS.midWall.orange}</span> oranges
                </div>
                <div style={{marginBottom:10,lineHeight:'1.6'}}>
                  <strong style={{color:'#94a3b8'}}>Overhang:</strong> <span style={{color:'#3b82f6',fontWeight:'600'}}>{wallCounts.overhang.yellow}/{WALL_TOTALS.overhang.yellow}</span> yellows, <span style={{color:'#f59e0b',fontWeight:'600'}}>{wallCounts.overhang.orange}/{WALL_TOTALS.overhang.orange}</span> oranges
                </div>
                <div style={{lineHeight:'1.6'}}>
                  <strong style={{color:'#94a3b8'}}>Side Wall:</strong> <span style={{color:'#3b82f6',fontWeight:'600'}}>{wallCounts.sideWall.yellow}/{WALL_TOTALS.sideWall.yellow}</span> yellows, <span style={{color:'#f59e0b',fontWeight:'600'}}>{wallCounts.sideWall.orange}/{WALL_TOTALS.sideWall.orange}</span> oranges
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

          <div style={{marginTop:16,display:'flex',justifyContent:'center'}}>
            <HoverBorderGradient
              onClick={submit}
              containerClassName="w-full"
              className="bg-black text-white w-full font-semibold text-base"
              duration={3}
              style={{padding: '12px'}}
            >
              Add Session
            </HoverBorderGradient>
          </div>
        </div>

        <div style={{width:300}}>
          <div style={{backgroundColor:'#1e293b',padding:20,borderRadius:8,border:'1px solid #475569',marginBottom:20}}>
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
        </div>
      </section>
      )}

      <section style={{marginTop:32}}>
        <div style={{backgroundColor:'#1e293b',padding:24,borderRadius:8,border:'1px solid #475569'}}>
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
      </section>

      <section style={{marginTop:32}}>
        <div style={{backgroundColor:'#1e293b',padding:24,borderRadius:8,border:'1px solid #475569'}}>
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
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill, minmax(400px, 1fr))',gap:16}}>
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
      
      {/* Password Change Modal */}
      {showPasswordChange && (
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
          zIndex:1000
        }}>
          <div style={{
            backgroundColor:'#1e293b',
            padding:32,
            borderRadius:8,
            border:'1px solid #475569',
            width:400,
            maxWidth:'90%'
          }}>
            <h2 style={{marginTop:0,marginBottom:24}}>Change Password</h2>
            <form onSubmit={handlePasswordChange}>
              <div style={{marginBottom:16}}>
                <label style={{display:'block',marginBottom:8,fontSize:14}}>Current Password</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  style={{
                    width:'100%',
                    padding:12,
                    borderRadius:6,
                    border:'1px solid #475569',
                    backgroundColor:'#0f172a',
                    color:'white',
                    fontSize:14
                  }}
                  required
                />
              </div>
              <div style={{marginBottom:16}}>
                <label style={{display:'block',marginBottom:8,fontSize:14}}>New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  style={{
                    width:'100%',
                    padding:12,
                    borderRadius:6,
                    border:'1px solid #475569',
                    backgroundColor:'#0f172a',
                    color:'white',
                    fontSize:14
                  }}
                  required
                  minLength={6}
                />
              </div>
              <div style={{marginBottom:16}}>
                <label style={{display:'block',marginBottom:8,fontSize:14}}>Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  style={{
                    width:'100%',
                    padding:12,
                    borderRadius:6,
                    border:'1px solid #475569',
                    backgroundColor:'#0f172a',
                    color:'white',
                    fontSize:14
                  }}
                  required
                />
              </div>
              {passwordError && (
                <div style={{
                  backgroundColor:'#dc2626',
                  color:'white',
                  padding:12,
                  borderRadius:6,
                  marginBottom:16,
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
                  marginBottom:16,
                  fontSize:14
                }}>
                  Password changed successfully!
                </div>
              )}
              <div style={{display:'flex',gap:12}}>
                <button
                  type="submit"
                  style={{
                    flex:1,
                    padding:12,
                    backgroundColor:'#3b82f6',
                    color:'white',
                    border:'none',
                    borderRadius:6,
                    fontSize:16,
                    fontWeight:'600',
                    cursor:'pointer'
                  }}
                >
                  Change Password
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordChange(false);
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
            </form>
          </div>
        </div>
      )}

      {/* User Profile Modal */}
      {viewingProfile !== null && (() => {
        const profileClimber = climbers.find((c:any) => c.id === viewingProfile);
        const profileSessions = sessions
          .filter((s:any) => s.climberId === viewingProfile)
          .sort((a:any, b:any) => new Date(b.date).getTime() - new Date(a.date).getTime());
        const profileLeaderboardEntry = leaderboard.find((e:any) => e.climber === profileClimber?.name);
        
        // Calculate peak rank by simulating historical rankings
        let peakRank = null;
        if (profileSessions.length > 0) {
          // Group all sessions by date and calculate cumulative scores
          const allSessionsByDate = sessions
            .map((s:any) => ({...s, date: new Date(s.date)}))
            .sort((a:any, b:any) => a.date.getTime() - b.date.getTime());
          
          const climberScores = new Map<number, number>();
          climbers.forEach((c:any) => climberScores.set(c.id, 0));
          
          let bestRank = Infinity;
          
          allSessionsByDate.forEach((session:any) => {
            const currentScore = climberScores.get(session.climberId) || 0;
            climberScores.set(session.climberId, currentScore + session.score);
            
            // Calculate rankings at this point in time
            const rankings = Array.from(climberScores.entries())
              .map(([id, score]) => ({id, score}))
              .sort((a, b) => b.score - a.score);
            
            const currentRank = rankings.findIndex(r => r.id === viewingProfile) + 1;
            if (currentRank > 0 && currentRank < bestRank) {
              bestRank = currentRank;
            }
          });
          
          peakRank = bestRank !== Infinity ? bestRank : null;
        }
        
        if (!profileClimber) return null;
        
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
              padding:32,
              borderRadius:8,
              border:'1px solid #475569',
              maxWidth:800,
              width:'100%',
              maxHeight:'90vh',
              overflowY:'auto'
            }}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:24}}>
                <h2 style={{margin:0,fontSize:28,fontWeight:'700'}}>{profileClimber.name}</h2>
                <button
                  onClick={() => setViewingProfile(null)}
                  style={{
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
              </div>
              
              {/* Stats */}
              <div style={{
                backgroundColor:'#0f172a',
                padding:20,
                borderRadius:8,
                marginBottom:24,
                border:'1px solid #475569'
              }}>
                <h3 style={{marginTop:0,marginBottom:16,fontSize:20}}>Stats</h3>
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(150px, 1fr))',gap:16}}>
                  <div>
                    <div style={{fontSize:14,color:'#94a3b8',marginBottom:4}}>Total Score</div>
                    <div style={{fontSize:24,fontWeight:'700',color:'#3b82f6'}}>
                      {profileLeaderboardEntry?.total_score.toFixed(2) || '0.00'}
                    </div>
                  </div>
                  <div>
                    <div style={{fontSize:14,color:'#94a3b8',marginBottom:4}}>Sessions</div>
                    <div style={{fontSize:24,fontWeight:'700',color:'#10b981'}}>
                      {profileSessions.length}
                    </div>
                  </div>
                  <div>
                    <div style={{fontSize:14,color:'#94a3b8',marginBottom:4}}>Current Rank</div>
                    <div style={{fontSize:24,fontWeight:'700',color:'#fbbf24'}}>
                      #{(leaderboard.findIndex((e:any) => e.climber === profileClimber.name) + 1) || 'N/A'}
                    </div>
                  </div>
                  <div>
                    <div style={{fontSize:14,color:'#94a3b8',marginBottom:4}}>Peak Rank</div>
                    <div style={{fontSize:24,fontWeight:'700',color:'#a855f7'}}>
                      {peakRank ? `#${peakRank}` : 'N/A'}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Session History */}
              <div>
                <h3 style={{marginTop:0,marginBottom:16,fontSize:20}}>Session History</h3>
                {profileSessions.length > 0 ? (
                  <div style={{display:'flex',flexDirection:'column',gap:12}}>
                    {profileSessions.map((session:any) => (
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
                          {session.black > 0 && <span style={{color:'#d1d5db'}}>⚫ Black: {session.black}</span>}
                          {session.red > 0 && <span style={{color:'#ef4444'}}>🔴 Red: {session.red}</span>}
                          {session.orange > 0 && <span style={{color:'#f97316'}}>🟠 Orange: {session.orange}</span>}
                          {session.yellow > 0 && <span style={{color:'#eab308'}}>🟡 Yellow: {session.yellow}</span>}
                          {session.blue > 0 && <span style={{color:'#3b82f6'}}>🔵 Blue: {session.blue}</span>}
                          {session.green > 0 && <span style={{color:'#10b981'}}>🟢 Green: {session.green}</span>}
                        </div>
                        {session.notes && (
                          <div style={{
                            marginTop:12,
                            fontSize:14,
                            color:'#cbd5e1',
                            fontStyle:'italic',
                            borderTop:'1px solid #475569',
                            paddingTop:12
                          }}>
                            {session.notes}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{
                    textAlign:'center',
                    padding:32,
                    color:'#64748b',
                    fontSize:16
                  }}>
                    No sessions yet
                  </div>
                )}
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
