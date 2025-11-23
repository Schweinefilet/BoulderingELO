import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { GoogleLogin, CredentialResponse } from '@react-oauth/google'
import { computeWeeklyScore, marginalGain, ORDER, BASE, combineCounts, getGradeForScore, getGradeColor, GRADE_BOUNDS, type Counts, type WallCounts } from './lib/scoring'
import * as store from './lib/storage'
import * as api from './lib/api'
import { API_URL } from './lib/api'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts'
import { BackgroundBeams } from './components/ui/background-beams'
import { GlowBorder } from './components/ui/glow-border'
import { AuroraBackground } from './components/ui/aurora-background'
import { GlowingEffect } from './components/ui/glowing-effect'
import { FlagEmoji, COUNTRY_CODES, COUNTRY_NAMES } from './components/ui/flag-emoji'
import { InlineMath, BlockMath } from 'react-katex'
import 'katex/dist/katex.min.css'

const emptyWall = (): Counts => ({green:0,blue:0,yellow:0,orange:0,red:0,black:0});

const COLOR_SWATCHES: Record<keyof Counts, string> = {
  green: '#10b981',
  blue: '#3b82f6',
  yellow: '#eab308',
  orange: '#f97316',
  red: '#ef4444',
  black: '#d1d5db'
};

const CLIMB_CATEGORY_COLUMNS: Array<{ key: keyof Counts; label: string; color: string }> = [
  { key: 'black', label: 'BLACK', color: COLOR_SWATCHES.black },
  { key: 'red', label: 'RED', color: COLOR_SWATCHES.red },
  { key: 'orange', label: 'ORANGE', color: COLOR_SWATCHES.orange },
  { key: 'yellow', label: 'YELLOW', color: COLOR_SWATCHES.yellow },
  { key: 'blue', label: 'BLUE', color: COLOR_SWATCHES.blue },
  { key: 'green', label: 'GREEN', color: COLOR_SWATCHES.green }
];

const EMPTY_COUNTS: Counts = { green: 0, blue: 0, yellow: 0, orange: 0, red: 0, black: 0 };

type GradeName = ReturnType<typeof getGradeForScore>;

const GRADE_REFERENCE_LINES = GRADE_BOUNDS
  .filter(bound => bound.min > 0)
  .map(bound => ({ grade: bound.grade, value: bound.min }));

const gradeBadgeSizing = {
  sm: { fontSize: 11, padding: '2px 6px' },
  md: { fontSize: 13, padding: '4px 10px' },
  lg: { fontSize: 16, padding: '6px 16px' }
} as const;

const BLACK_PANEL_BG = 'rgba(0, 0, 0, 0.55)';
const BLACK_PANEL_BORDER_COLOR = 'rgba(255, 255, 255, 0.45)';
const BLACK_PANEL_BORDER = `1px solid ${BLACK_PANEL_BORDER_COLOR}`;
const BLACK_ROW_BG = 'rgba(0, 0, 0, 0.35)';
const BLACK_HOVER_BG = 'rgba(0, 0, 0, 0.65)';
const PANEL_RADIUS = 10;

const GradeBadge = ({ grade, size = 'md' }: { grade: GradeName; size?: 'sm' | 'md' | 'lg' }) => {
  const { backgroundColor, textColor } = getGradeColor(grade);
  return (
    <span
      style={{
        backgroundColor,
        color: textColor,
        borderRadius: 999,
        fontWeight: 700,
        letterSpacing: 0.5,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 48,
        ...gradeBadgeSizing[size]
      }}
    >
      {grade}
    </span>
  );
}

const SessionColorIndicator = ({ color, count }: { color: string; count: number }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color }}>
    <span style={{ display: 'inline-block', width: 12, height: 8, borderRadius: 2, backgroundColor: color }} />
    {count}
  </span>
);

const guideSectionCardStyle: React.CSSProperties = {
  marginTop: 16,
  padding: '16px',
  backgroundColor: BLACK_PANEL_BG,
  borderRadius: 8,
  border: BLACK_PANEL_BORDER
};

const guideSectionHeaderStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
  flexWrap: 'wrap'
};

const guideSectionTitleStyle: React.CSSProperties = {
  margin: 0,
  color: '#bfdbfe',
  fontSize: 16,
  fontWeight: 600,
  flex: 1,
  minWidth: 180
};

const guideToggleButtonStyle = (isActive: boolean): React.CSSProperties => ({
  padding: '8px 16px',
  borderRadius: 999,
  fontSize: 13,
  fontWeight: 600,
  backgroundColor: isActive ? 'rgba(59, 130, 246, 0.18)' : BLACK_ROW_BG,
  color: '#bfdbfe',
  border: `1px solid ${isActive ? 'rgba(59, 130, 246, 0.55)' : BLACK_PANEL_BORDER_COLOR}`,
  cursor: 'pointer',
  transition: 'background-color 0.2s ease, border-color 0.2s ease',
  minWidth: 160,
  display: 'inline-flex',
  justifyContent: 'center',
  alignItems: 'center',
  textTransform: 'capitalize'
});

const GuideToggleButton = ({
  label,
  isOpen,
  onToggle
}: {
  label: string;
  isOpen: boolean;
  onToggle: () => void;
}) => (
  <button onClick={onToggle} style={guideToggleButtonStyle(isOpen)}>
    {isOpen ? `Hide ${label}` : `Show ${label}`}
  </button>
);

const renderGradeReferenceLines = () => GRADE_REFERENCE_LINES.map(({ grade, value }) => {
  const colors = getGradeColor(grade);
  return (
    <ReferenceLine
      key={`${grade}-${value}`}
      y={value}
      stroke={colors.backgroundColor}
      strokeDasharray="3 3"
      label={{ position: 'right', value: grade, fill: colors.textColor, fontSize: 10 }}
    />
  );
});

const formatGradeRangeLabel = (min: number, max?: number) => {
  if (min === 0 && typeof max === 'number') return `S < ${max}`;
  if (typeof max === 'number') return `${min} ≤ S < ${max}`;
  return `S ≥ ${min}`;
};

const formatBaseValue = (value: number) => (Number.isInteger(value) ? value.toString() : value.toFixed(1));

const normalizeSessionCounts = (session: any, expiredSections: string[] = []): Counts => {
  if (!session) return { ...EMPTY_COUNTS };
  if (session.wallCounts) {
    // Filter out expired sections before combining
    const filteredWallCounts: WallCounts = {};
    Object.keys(session.wallCounts).forEach(section => {
      if (!expiredSections.includes(section)) {
        filteredWallCounts[section] = session.wallCounts[section];
      }
    });
    return combineCounts(filteredWallCounts as WallCounts);
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

// Default wall totals structure
const DEFAULT_wallTotals = {
  overhang: { yellow: 7, orange: 5, red: 0, black: 0, blue: 0, green: 0 },
  midWall: { yellow: 20, orange: 13, red: 0, black: 0, blue: 0, green: 0 },
  sideWall: { yellow: 11, orange: 8, red: 0, black: 0, blue: 0, green: 0 }
};

// Load wall totals from localStorage or use defaults
function getWallTotals(): Record<string, Record<string, number>> {
  try {
    const stored = localStorage.getItem('wallTotals');
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Error loading wall totals:', e);
  }
  return DEFAULT_wallTotals;
}

// Save wall totals to database via API
async function saveWallTotalsToAPI(totals: Record<string, Record<string, number>>) {
  try {
    await api.saveWallTotals(totals);
  } catch (e) {
    console.error('Error saving wall totals:', e);
    alert('Failed to save wall configuration. Please try again.');
  }
}

// Save wall section images to database via API
async function saveWallSectionImagesToAPI(images: Record<string, string[]>) {
  try {
    // Ensure Dropbox share links are converted to direct/raw links before saving
    const convertDropbox = (u: string) => {
      try {
        if (!u) return u;
        if (u.includes('dropbox.com')) {
          let out = u.replace('www.dropbox.com', 'dl.dropboxusercontent.com');
          out = out.replace('?dl=0', '');
          out = out.replace('?dl=1', '');
          return out;
        }
        return u;
      } catch (e) {
        return u;
      }
    };

    const sanitized: Record<string, string[]> = {};
    Object.entries(images).forEach(([k, arr]) => {
      sanitized[k] = (arr || []).map(v => typeof v === 'string' ? convertDropbox(v) : v).filter(Boolean as any);
    });

    await api.saveWallSectionImages(sanitized);
  } catch (e) {
    console.error('Error saving wall section images:', e);
    alert('Failed to save wall section images. Please try again.');
  }
}

// Expiry feature removed: expiry dates and auto-reset logic intentionally deleted.

function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [authView, setAuthView] = useState<'auth' | 'forgot'>('auth');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotMessage, setForgotMessage] = useState('');
  
  // Google sign-up name confirmation state
  const [showGoogleNamePrompt, setShowGoogleNamePrompt] = useState(false);
  const [googleCredential, setGoogleCredential] = useState<string | null>(null);
  const [googleName, setGoogleName] = useState('');
  const [googleUsername, setGoogleUsername] = useState('');
  const [googleEmail, setGoogleEmail] = useState('');
  
  // Check if Google OAuth is configured
  const googleClientId = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID || '';
  const isGoogleConfigured = googleClientId && 
    googleClientId.length > 0 && 
    !googleClientId.includes('your-google') && // Exclude placeholder values
    googleClientId.endsWith('.apps.googleusercontent.com');

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

  async function handleGoogleLogin(credentialResponse: CredentialResponse) {
    setLoading(true);
    setError('');
    
    try {
      if (!credentialResponse.credential) {
        throw new Error('No credential received from Google');
      }
      
      // If in register mode, show name prompt first
      if (mode === 'register') {
        // Decode JWT to get name (JWT format: header.payload.signature)
        const base64Url = credentialResponse.credential.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const payload = JSON.parse(window.atob(base64));
        
        setGoogleCredential(credentialResponse.credential);
        setGoogleName(payload.name || '');
        setGoogleEmail(payload.email || '');
        // Suggest username from email (part before @)
        setGoogleUsername(payload.email ? payload.email.split('@')[0] : '');
        setShowGoogleNamePrompt(true);
        setLoading(false);
        return;
      }
      
      // Login mode - proceed directly
      const result = await api.googleLogin(credentialResponse.credential);
      api.setToken(result.token);
      api.setUser(result.user);
      
      // Mark that we don't need to show the Google link reminder since user just logged in with Google
      sessionStorage.setItem('googleLinkReminderShown', 'true');
      
      setLoading(false);
      onLogin();
    } catch (err: any) {
      setError(err.message || 'Google login failed');
      setLoading(false);
    }
  }

  async function confirmGoogleSignUp() {
    if (!googleCredential || !googleName.trim() || !googleUsername.trim()) return;
    
    setLoading(true);
    setError('');
    
    try {
      // Send to backend with the confirmed name and username
      const result = await api.googleLogin(googleCredential, googleName, googleUsername);
      
      // Set token and user in localStorage first
      api.setToken(result.token);
      api.setUser(result.user);
      
      // Mark that we don't need to show the Google link reminder since user just signed up with Google
      sessionStorage.setItem('googleLinkReminderShown', 'true');
      
      // Reset form fields
      setGoogleCredential(null);
      setGoogleName('');
      setGoogleUsername('');
      setGoogleEmail('');
      setShowGoogleNamePrompt(false);
      setLoading(false);
      
      // Call the login success handler - this will close the login screen
      onLogin();
    } catch (err: any) {
      setError(err.message || 'Google sign-up failed');
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

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setForgotMessage('');

    try {
      const response = await api.requestPasswordReset(forgotEmail);
      setForgotMessage(response.message || 'If that email is registered, a password reset link has been sent.');
    } catch (err: any) {
      setForgotMessage('If that email is registered, a password reset link has been sent.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      fontFamily:'"Red Hat Text", sans-serif'
    }}>
      <div style={{
        backgroundColor:'#000',
        padding:40,
        borderRadius:8,
        border:'1px solid #475569',
        width:400,
        maxWidth:'90%'
      }}>
          <h1 className="mrs-saint-delafield-regular" style={{marginTop:0,marginBottom:24,textAlign:'center'}}>
            <span className="italianno" style={{marginRight: 4}}>Bouldering</span>
            <span className="dm-serif-text">ELO</span>
          </h1>
        
        {authView === 'auth' ? (
          <>
            <div style={{display:'flex',gap:8,marginBottom:24}}>
              <button
                onClick={() => { setMode('login'); setAuthView('auth'); }}
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
                onClick={() => { setMode('register'); setAuthView('auth'); }}
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

                                {/* (removed stray admin adjustment block that caused runtime error in Login modal) */}

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
              <div style={{marginBottom:8}}>
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
              {mode === 'login' && (
                <div style={{textAlign:'right', marginBottom:16}}>
                  <button
                    type="button"
                    onClick={() => { setAuthView('forgot'); setForgotEmail(username); setForgotMessage(''); setError(''); }}
                    style={{
                      background:'none',
                      border:'none',
                      color:'#93c5fd',
                      cursor:'pointer',
                      fontSize:13,
                      textDecoration:'underline'
                    }}
                  >
                    Forgot password?
                  </button>
                </div>
              )}
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

            {isGoogleConfigured && (
              <>
                <div style={{
                  margin:'24px 0',
                  textAlign:'center',
                  position:'relative'
                }}>
                  <div style={{
                    position:'absolute',
                    top:'50%',
                    left:0,
                    right:0,
                    height:'1px',
                    backgroundColor:'#475569'
                  }}></div>
                  <span style={{
                    position:'relative',
                    backgroundColor:'#1e293b',
                    padding:'0 16px',
                    fontSize:14,
                    color:'#94a3b8'
                  }}>OR</span>
                </div>

                <div style={{
                  display:'flex',
                  justifyContent:'center'
                }}>
                  <div style={{ borderRadius: '24px', overflow: 'hidden' }}>
                    <GoogleLogin
                      onSuccess={handleGoogleLogin}
                      onError={() => {
                        setError(`Google ${mode === 'login' ? 'login' : 'sign up'} failed. Please try again.`);
                      }}
                      theme="filled_blue"
                      size="large"
                      width="400"
                      shape="pill"
                      text={mode === 'login' ? 'signin_with' : 'signup_with'}
                    />
                  </div>
                </div>
              </>
            )}
          </>
        ) : (
          <>
            <h3 style={{marginTop:0, marginBottom:12}}>Forgot Password</h3>
            <p style={{color:'#cbd5e1', fontSize:14, marginBottom:16}}>
              Enter the email or username you use to sign in. If it matches a local account, we will send reset instructions.
            </p>
            <form onSubmit={handleForgotPassword}>
              <div style={{marginBottom:16}}>
                <label style={{display:'block',marginBottom:8,fontSize:14}}>Email or Username</label>
                <input
                  type="text"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  style={{
                    width:'100%',
                    padding:12,
                    borderRadius:6,
                    border:'1px solid #475569',
                    backgroundColor:'#0f172a',
                    color:'white',
                    fontSize:16
                  }}
                  placeholder="you@example.com"
                  required
                />
              </div>
              {forgotMessage && (
                <div style={{
                  backgroundColor:'#0ea5e9',
                  color:'white',
                  padding:12,
                  borderRadius:6,
                  marginBottom:16,
                  fontSize:14
                }}>
                  {forgotMessage}
                </div>
              )}
              <button
                type="submit"
                disabled={loading || !forgotEmail}
                style={{
                  width:'100%',
                  padding:'12px 16px',
                  backgroundColor:loading || !forgotEmail ? '#475569' : '#3b82f6',
                  color:'white',
                  border:'none',
                  borderRadius:8,
                  fontSize:16,
                  fontWeight:'600',
                  cursor:loading || !forgotEmail ? 'not-allowed' : 'pointer'
                }}
              >
                {loading ? 'Sending reset link...' : 'Send reset link'}
              </button>
            </form>
            <div style={{marginTop:16, textAlign:'center'}}>
              <button
                type="button"
                onClick={() => { setAuthView('auth'); setForgotEmail(''); setForgotMessage(''); setError(''); }}
                style={{
                  background:'none',
                  border:'none',
                  color:'#93c5fd',
                  cursor:'pointer',
                  fontSize:14,
                  textDecoration:'underline'
                }}
              >
                Back to login
              </button>
            </div>
          </>
        )}
      </div>
      {/* UMass Ascend subtitle under the main title */}
      <div style={{width:'100%',textAlign:'center',marginBottom:16}}>
        <div style={{fontSize:14,color:'#94a3b8',fontWeight:600}}>UMass Ascend</div>
      </div>

      {/* Google Name Confirmation Modal */}
      {showGoogleNamePrompt && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px'
          }}
          onClick={() => {
            setShowGoogleNamePrompt(false);
            setGoogleCredential(null);
            setGoogleName('');
            setGoogleUsername('');
            setGoogleEmail('');
          }}
        >
          <div 
            style={{
              backgroundColor: '#1e293b',
              padding: 24,
              borderRadius: 8,
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              maxWidth: '28rem',
              width: '100%',
              margin: '0 1rem'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{fontSize: 20, fontWeight: 'bold', marginBottom: 16, marginTop: 0}}>Complete Your Profile</h3>
            <p style={{color: '#cbd5e1', fontSize: 14, marginBottom: 16}}>
              You're signing up with <span style={{fontWeight: 600, color: 'white'}}>{googleEmail}</span>
            </p>
            <div style={{marginBottom: 16}}>
              <label style={{display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 8}}>
                Username
              </label>
              <input
                type="text"
                value={googleUsername}
                onChange={(e) => setGoogleUsername(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  backgroundColor: '#0f172a',
                  border: '1px solid #475569',
                  borderRadius: 6,
                  color: 'white',
                  fontSize: 14,
                  outline: 'none'
                }}
                placeholder="Choose a username"
                autoFocus
                onFocus={(e) => e.currentTarget.style.borderColor = '#3b82f6'}
                onBlur={(e) => e.currentTarget.style.borderColor = '#475569'}
              />
              <p style={{color: '#94a3b8', fontSize: 12, marginTop: 4, marginBottom: 0}}>
                Used for login and displayed in URLs
              </p>
            </div>
            <div style={{marginBottom: 16}}>
              <label style={{display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 8}}>
                Full Name
              </label>
              <input
                type="text"
                value={googleName}
                onChange={(e) => setGoogleName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  backgroundColor: '#0f172a',
                  border: '1px solid #475569',
                  borderRadius: 6,
                  color: 'white',
                  fontSize: 14,
                  outline: 'none'
                }}
                placeholder="Enter your full name"
                onFocus={(e) => e.currentTarget.style.borderColor = '#3b82f6'}
                onBlur={(e) => e.currentTarget.style.borderColor = '#475569'}
              />
              <p style={{color: '#94a3b8', fontSize: 12, marginTop: 4, marginBottom: 0}}>
                This will be displayed on the leaderboard
              </p>
            </div>
            <div style={{display: 'flex', gap: 12}}>
              <button
                onClick={confirmGoogleSignUp}
                disabled={!googleName.trim() || !googleUsername.trim()}
                style={{
                  flex: 1,
                  backgroundColor: !googleName.trim() || !googleUsername.trim() ? '#475569' : '#3b82f6',
                  color: 'white',
                  fontWeight: 600,
                  padding: '8px 16px',
                  borderRadius: 6,
                  border: 'none',
                  cursor: !googleName.trim() || !googleUsername.trim() ? 'not-allowed' : 'pointer',
                  transition: 'background-color 0.2s',
                  fontSize: 14
                }}
                onMouseEnter={(e) => {
                  if (googleName.trim() && googleUsername.trim()) {
                    e.currentTarget.style.backgroundColor = '#2563eb';
                  }
                }}
                onMouseLeave={(e) => {
                  if (googleName.trim() && googleUsername.trim()) {
                    e.currentTarget.style.backgroundColor = '#3b82f6';
                  }
                }}
              >
                Create Account
              </button>
              <button
                onClick={() => {
                  setShowGoogleNamePrompt(false);
                  setGoogleCredential(null);
                  setGoogleName('');
                  setGoogleUsername('');
                  setGoogleEmail('');
                }}
                style={{
                  flex: 1,
                  backgroundColor: '#475569',
                  color: 'white',
                  fontWeight: 600,
                  padding: '8px 16px',
                  borderRadius: 6,
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                  fontSize: 14
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#334155'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#475569'}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ResetPasswordModal({ token, onClose, onReset }: { token: string | null; onClose: () => void; onReset?: () => void }) {
  const [status, setStatus] = useState<'validating' | 'ready' | 'submitting'>('validating');
  const [error, setError] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    async function validate() {
      if (!token) {
        setError('Invalid or expired reset link');
        setStatus('ready');
        return;
      }

      setStatus('validating');
      try {
        await api.validateResetToken(token);
        setError(null);
        setStatus('ready');
      } catch (err: any) {
        setError(err.message || 'Invalid or expired reset link');
        setStatus('ready');
      }
    }

    validate();
  }, [token]);

  useEffect(() => {
    if (successMessage && onReset) {
      onReset();
    }
  }, [successMessage, onReset]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setError('Invalid or expired reset link');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setStatus('submitting');
    setError(null);

    try {
      const response = await api.resetPassword(token, newPassword);
      setSuccessMessage(response.message || 'Password reset successful');
    } catch (err: any) {
      setError(err.message || 'Unable to reset password. Please request a new link.');
    } finally {
      setStatus('ready');
    }
  };

  return (
    <div style={{
      backgroundColor:'#1e293b',
      padding:24,
      borderRadius:12,
      border:'1px solid #334155',
      width:420,
      maxWidth:'100%'
    }}>
      <h2 style={{marginTop:0, marginBottom:12}}>Reset Password</h2>
      {status === 'validating' && !error && (
        <p style={{color:'#cbd5e1', fontSize:14}}>Validating your reset link...</p>
      )}
      {error && (
        <div style={{
          backgroundColor:'#dc2626',
          color:'white',
          padding:12,
          borderRadius:8,
          marginBottom:12,
          fontSize:14
        }}>
          {error}
        </div>
      )}
      {successMessage ? (
        <div style={{
          backgroundColor:'#0f766e',
          color:'white',
          padding:12,
          borderRadius:8,
          marginBottom:16,
          fontSize:14
        }}>
          {successMessage}
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div style={{marginBottom:12}}>
            <label style={{display:'block',marginBottom:6,fontSize:13,fontWeight:600}}>New password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              style={{
                width:'100%',
                padding:12,
                borderRadius:6,
                border:'1px solid #475569',
                backgroundColor:'#0f172a',
                color:'white'
              }}
              placeholder="Enter a new password"
              disabled={status !== 'ready'}
            />
          </div>
          <div style={{marginBottom:16}}>
            <label style={{display:'block',marginBottom:6,fontSize:13,fontWeight:600}}>Confirm password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              style={{
                width:'100%',
                padding:12,
                borderRadius:6,
                border:'1px solid #475569',
                backgroundColor:'#0f172a',
                color:'white'
              }}
              placeholder="Re-enter your password"
              disabled={status !== 'ready'}
            />
          </div>
          <button
            type="submit"
            disabled={status !== 'ready'}
            style={{
              width:'100%',
              padding:12,
              backgroundColor: status !== 'ready' ? '#475569' : '#3b82f6',
              color:'white',
              border:'none',
              borderRadius:8,
              fontWeight:700,
              cursor: status !== 'ready' ? 'not-allowed' : 'pointer'
            }}
          >
            {status === 'submitting' ? 'Updating password...' : 'Update password'}
          </button>
        </form>
      )}
      <div style={{marginTop:12, display:'flex', gap:8}}>
        <button
          onClick={onClose}
          style={{
            flex:1,
            padding:10,
            borderRadius:6,
            backgroundColor:'#475569',
            color:'white',
            border:'none',
            cursor:'pointer'
          }}
        >
          Close
        </button>
        {successMessage && (
          <button
            onClick={() => { if (onReset) onReset(); onClose(); }}
            style={{
              flex:1,
              padding:10,
              borderRadius:6,
              backgroundColor:'#16a34a',
              color:'white',
              border:'none',
              cursor:'pointer'
            }}
          >
            Go to login
          </button>
        )}
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

function normalizeWallSectionImageUrl(input: string): string {
  if (!input) return '';
  let url = input.trim();
  if (!url) return '';

  if (url.startsWith('/') || url.startsWith('blob:')) {
    return url;
  }

  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url.replace(/^\/+/, '')}`;
  }

  try {
    const parsed = new URL(url);
    parsed.protocol = 'https:';
    const hostname = parsed.hostname.toLowerCase();

    if (hostname === 'www.dropbox.com' || hostname === 'dropbox.com') {
      parsed.hostname = 'dl.dropboxusercontent.com';
      parsed.searchParams.delete('dl');
      parsed.searchParams.set('raw', '1');
    } else if (hostname === 'dl.dropboxusercontent.com') {
      if (!parsed.searchParams.has('raw') && !parsed.searchParams.has('dl')) {
        parsed.searchParams.set('raw', '1');
      }
    }

    parsed.pathname = parsed.pathname
      .split('/')
      .map(segment => encodeURIComponent(decodeURIComponent(segment)))
      .join('/');

    return parsed.toString();
  } catch (err) {
    try {
      return encodeURI(url);
    } catch (e) {
      return url;
    }
  }
}

function normalizeWallSectionImages(images: Record<string, string | string[]>): Record<string, string[]> {
  const normalized: Record<string, string[]> = {};

  for (const [section, value] of Object.entries(images || {})) {
    if (Array.isArray(value)) {
      normalized[section] = value
        .map(item => typeof item === 'string' ? normalizeWallSectionImageUrl(item) : '')
        .filter(Boolean);
    } else if (typeof value === 'string') {
      const normalizedUrl = normalizeWallSectionImageUrl(value);
      normalized[section] = normalizedUrl ? [normalizedUrl] : [];
    } else {
      normalized[section] = [];
    }
  }

  return normalized;
}

function createWallImageErrorHandler(label: string) {
  return (e: React.SyntheticEvent<HTMLImageElement>) => {
    try {
      const img = e.currentTarget;
      const src = img.src || '';

      if (!img.dataset.retrySanitize) {
        img.dataset.retrySanitize = '1';
        const normalized = normalizeWallSectionImageUrl(src);
        if (normalized && normalized !== src) {
          img.src = normalized;
          return;
        }
      }

      if (!img.dataset.retryRaw && src.includes('dropboxusercontent.com') && !src.includes('raw=1')) {
        img.dataset.retryRaw = '1';
        img.src = src + (src.includes('?') ? '&raw=1' : '?raw=1');
        return;
      }

      if (!img.dataset.retryHttps && src.startsWith('http://')) {
        img.dataset.retryHttps = '1';
        img.src = src.replace('http://', 'https://');
        return;
      }

      img.style.display = 'none';
      const container = img.parentElement;
      if (container && !container.querySelector(`a[data-fallback-link="${label}"]`)) {
        const link = document.createElement('a');
        link.href = src;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.textContent = 'Open image in new tab';
        link.style.display = 'block';
        link.style.padding = '12px';
        link.style.color = '#93c5fd';
        link.dataset.fallbackLink = label;
        container.appendChild(link);
      }
    } catch (err) {
      // swallow error - backup link already created
    }
  };
}

export default function App(){
  // Check if Google OAuth is configured
  const googleClientId = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID || '';
  const isGoogleConfigured = googleClientId && googleClientId.length > 0 && !googleClientId.includes('your-google');

  const referenceImageErrorHandler = useMemo(() => createWallImageErrorHandler('wall-section-reference'), []);
  const adminReferenceImageErrorHandler = useMemo(() => createWallImageErrorHandler('admin-wall-section-reference'), []);
  
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
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [pendingGoogleLinkFocus, setPendingGoogleLinkFocus] = useState(false);
  const [highlightGoogleLink, setHighlightGoogleLink] = useState(false);
  const googleLinkSectionRef = useRef<HTMLDivElement | null>(null);
  const [backgroundEnabled, setBackgroundEnabled] = useState(false);
  const [climbers, setClimbers] = useState<any[]>([])
  const [sessions, setSessions] = useState<any[]>([])
  const [leaderboard, setLeaderboard] = useState<any[]>([])
  const [selectedClimber, setSelectedClimber] = useState<number|undefined>(undefined)
  const [newName, setNewName] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  
  // Wall totals state (loaded from API)
  const [wallTotals, setWallTotals] = useState<Record<string, Record<string, number>>>(DEFAULT_wallTotals)
  const [wallTotalsLoaded, setWallTotalsLoaded] = useState(false)
  const [wallSectionImages, setWallSectionImages] = useState<Record<string, string[]>>({}) // Store array of image URLs for each wall section
  const [currentImageIndex, setCurrentImageIndex] = useState(0); // Track current image in carousel for dropdown mode
  const [manualModeImageIndexes, setManualModeImageIndexes] = useState<Record<string, number>>({}); // Track current image index per section in manual mode
  const [expiredSections, setExpiredSections] = useState<string[]>([]) // Track expired wall sections
  
  // Helper function to format wall section names properly
  const formatWallSectionName = (section: string): string => {
    // Handle special cases first
    const specialCases: Record<string, string> = {
      'uMassLogo': 'UMass Logo',
      'umasslogo': 'UMass Logo',
      'tVWall': 'TV Wall',
      'tvwall': 'TV Wall',
      'tvWall': 'TV Wall',
      'TVWall': 'TV Wall',
      'UMassLogo': 'UMass Logo'
    };
    
    if (specialCases[section]) {
      return specialCases[section];
    }
    
    // For other cases, capitalize first letter and add spaces before capitals
    // But avoid adding spaces for consecutive capitals (like TV, UMass)
    return section
      .charAt(0).toUpperCase() + 
      section.slice(1).replace(/([A-Z])/g, ' $1').trim();
  };
  
  // Initialize wallCounts dynamically based on wallTotals
  const initializeWallCounts = () => {
    const counts: any = {};
    Object.keys(wallTotals).forEach(section => {
      counts[section] = emptyWall();
    });
    return counts;
  };
  
  const [wallCounts, setWallCounts] = useState<WallCounts>(initializeWallCounts())
  const [manualMode, setManualMode] = useState(false)
  
  // For dropdown mode - use first available wall section
  const availableWalls = Object.keys(wallTotals);
  const [dropdownWall, setDropdownWall] = useState<string>(availableWalls[0] || 'midWall')
  const [dropdownColor, setDropdownColor] = useState<keyof Counts>('yellow')
  const [videoUrl, setVideoUrl] = useState('')
  const [wallImage, setWallImage] = useState<string>('')
  const [sessionNotes, setSessionNotes] = useState('')
  const [pendingVideos, setPendingVideos] = useState<Array<{videoUrl: string, color: string, wall: string}>>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string|null>(null)
  const [bootStatus, setBootStatus] = useState<string | null>(null)
  
  // Track last edited cell for highlighting
  const [lastEditedCell, setLastEditedCell] = useState<{wall: string, color: string} | null>(null)
  
  // Password change state
  const [showPasswordChange, setShowPasswordChange] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState<string|null>(null)
  const [passwordSuccess, setPasswordSuccess] = useState(false)

  // Admin panel state
  const [showAdminPanel, setShowAdminPanel] = useState(false)
  const [showScoringFormula, setShowScoringFormula] = useState(false)
  const [showUserGuide, setShowUserGuide] = useState<boolean>(() => {
    try {
      const v = localStorage.getItem('showUserGuide');
      if (v === null) return true;
      return v === '1' || v === 'true';
    } catch (e) {
      return false;
    }
  })
  const [showGradeBoundaries, setShowGradeBoundaries] = useState(false)
  const [adminTab, setAdminTab] = useState<'accounts' | 'sessions' | 'routes' | 'audits'>('accounts')
  const [adminAudits, setAdminAudits] = useState<any[]>([])
  const [auditsLoading, setAuditsLoading] = useState(false)
  // Admin notifications (latest first)
  const [notifications, setNotifications] = useState<any[]>([])
  const [notifLoading, setNotifLoading] = useState(false)
  const [newNotificationText, setNewNotificationText] = useState('')
  
  // expiry dates feature removed; no state required
  const [editingSection, setEditingSection] = useState<string | null>(null)
  const [renamingSection, setRenamingSection] = useState<string | null>(null)
  const [newSectionName, setNewSectionName] = useState('')
  const [renameValue, setRenameValue] = useState('')
  
  // Copy/Paste section data state
  const [copiedSectionData, setCopiedSectionData] = useState<{
    totals: Record<string, number>;
    images?: string[];
  } | null>(null)
  
  // Session editing state
  const [editingSession, setEditingSession] = useState<number | null>(null)
  const [editSessionDate, setEditSessionDate] = useState('')
  const [editSessionNotes, setEditSessionNotes] = useState('')
  
  // Toast notification state
  const [toast, setToast] = useState<{message: string; type: 'success' | 'error'} | null>(null)
  const [editSessionWallCounts, setEditSessionWallCounts] = useState<WallCounts>({} as WallCounts)
  
  // Climber profile editing state (admin)
  const [editingClimber, setEditingClimber] = useState<number | null>(null)
  const [editClimberName, setEditClimberName] = useState('')
  const [editClimberUsername, setEditClimberUsername] = useState('')
  const [editClimberCountry, setEditClimberCountry] = useState('')
  const [editClimberStarted, setEditClimberStarted] = useState('')
  const [editClimberBio, setEditClimberBio] = useState('')
  const [editClimberInstagram, setEditClimberInstagram] = useState('')
  const [editClimberRole, setEditClimberRole] = useState<'user' | 'admin'>('user')
  
  // Profile view state
  const [viewingProfile, setViewingProfile] = useState<number | null>(null)
  
  // Video review state
  const [videos, setVideos] = useState<api.VideoReview[]>([])
  const [videoFilter, setVideoFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending')
  
  // Settings modal state
  const [showSettings, setShowSettings] = useState(false)
  const [showFormulaDetails, setShowFormulaDetails] = useState(false)
  const [settingsUsername, setSettingsUsername] = useState('')
  const [settingsName, setSettingsName] = useState('')
  const [settingsCountry, setSettingsCountry] = useState('')
  const [settingsStarted, setSettingsStarted] = useState('')
  const [settingsBio, setSettingsBio] = useState('')
  const [settingsInstagram, setSettingsInstagram] = useState('')
  const [settingsError, setSettingsError] = useState<string|null>(null)
  const [settingsSuccess, setSettingsSuccess] = useState(false)
  
  // Leaderboard pagination
  const [showAllLeaderboard, setShowAllLeaderboard] = useState(false)
  
  // Sessions pagination
  const [sessionsToShow, setSessionsToShow] = useState(1)
  const [expandedSession, setExpandedSession] = useState<number | null>(null)

  // Comparison charts state
  const [selectedClimbersForComparison, setSelectedClimbersForComparison] = useState<number[]>([])
  const [comparisonSearchQuery, setComparisonSearchQuery] = useState('')
  
  // Google link reminder popup
  const [showGoogleLinkReminder, setShowGoogleLinkReminder] = useState(false)

  const totalCounts = combineCounts(wallCounts);
  const previewScore = computeWeeklyScore(totalCounts);
  const previewGrade = getGradeForScore(previewScore);
  
  // Helper function to get total routes for a color across all wall sections
  const getTotalForColor = (color: string): number => {
    return Object.entries(wallTotals).reduce((sum, [section, counts]) => {
      // Skip expired sections when calculating totals
      if (expiredSections.includes(section)) {
        return sum;
      }
      return sum + (counts[color] || 0);
    }, 0);
  };

  useEffect(()=>{
    loadData();
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenFromUrl = params.get('token');
    if (tokenFromUrl && (window.location.pathname.includes('reset-password') || params.has('token'))) {
      setResetToken(tokenFromUrl);
      setShowResetPasswordModal(true);
      setShowLoginScreen(false);
    }
  }, []);
  
  // Reload wallTotals when page becomes visible (fixes mobile sync issues)
  // Load wallTotals from API on mount
  useEffect(() => {
    const loadWallTotals = async () => {
      try {
        const totals = await api.getWallTotals();
        setWallTotals(totals);
        setWallTotalsLoaded(true);
      } catch (err) {
        console.error('Failed to load wall totals:', err);
        // Use defaults if API fails
        setWallTotals(DEFAULT_wallTotals);
        setWallTotalsLoaded(true);
      }
    };
    loadWallTotals();
  }, []);

  // Load wall section images from API on mount
  useEffect(() => {
    const loadWallSectionImages = async () => {
      try {
        const images = await api.getWallSectionImages();
        const normalized = normalizeWallSectionImages(images);
        setWallSectionImages(normalized);
      } catch (err) {
        console.error('Failed to load wall section images:', err);
        // Use empty object if API fails
        setWallSectionImages({});
      }
    };
    loadWallSectionImages();
  }, []);

  // Ensure the dropdown carousel index always points to a valid image
  useEffect(() => {
    setCurrentImageIndex(prev => {
      const images = wallSectionImages[dropdownWall] || [];
      if (images.length === 0) {
        return 0;
      }
      const normalizedIndex = Math.min(prev, images.length - 1);
      return normalizedIndex < 0 ? 0 : normalizedIndex;
    });
  }, [dropdownWall, wallSectionImages]);

  // Keep manual mode carousel indexes in sync with available images
  useEffect(() => {
    setManualModeImageIndexes(prev => {
      let changed = false;
      const next: Record<string, number> = {};

      Object.entries(wallSectionImages).forEach(([section, images]) => {
        if (!images || images.length === 0) {
          return;
        }

        const prevIndex = prev[section] ?? 0;
        const normalizedIndex = Math.min(Math.max(prevIndex, 0), images.length - 1);
        next[section] = normalizedIndex;

        if (normalizedIndex !== prevIndex) {
          changed = true;
        }
      });

      const prevKeys = Object.keys(prev).filter(section => (wallSectionImages[section] || []).length > 0);
      const nextKeys = Object.keys(next);
      if (
        prevKeys.length !== nextKeys.length ||
        prevKeys.some(key => !nextKeys.includes(key))
      ) {
        changed = true;
      }

      return changed ? next : prev;
    });
  }, [wallSectionImages]);

  // Load data on mount
  useEffect(() => {
    loadData();
  }, []);

  // Reload wallTotals when tab becomes visible
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (!document.hidden) {
        try {
          const freshTotals = await api.getWallTotals();
          setWallTotals(freshTotals);
        } catch (err) {
          console.error('Failed to reload wall totals:', err);
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);
  
  // Sync wallCounts when wallTotals changes (e.g., after rename/add/delete)
  useEffect(() => {
    // Only run after wallTotals has been loaded
    if (!wallTotalsLoaded) return;
    
    const currentSections = Object.keys(wallCounts);
    const newSections = Object.keys(wallTotals);
    
    // Check if sections have changed
    const sectionsChanged = currentSections.length !== newSections.length || 
      !currentSections.every(section => newSections.includes(section));
    
    if (sectionsChanged) {
      console.log('Wall sections changed, syncing wallCounts:', { currentSections, newSections });
      // Re-initialize wallCounts with new sections, preserving existing counts where possible
      // Also filter out expired sections
      const newCounts: any = {};
      newSections.forEach(section => {
        if (!expiredSections.includes(section)) {
          newCounts[section] = wallCounts[section] || emptyWall();
        }
      });
      setWallCounts(newCounts);
      
      // Update dropdownWall ONLY if current selection no longer exists in newSections
      if (!newSections.includes(dropdownWall)) {
        console.log(`Dropdown wall "${dropdownWall}" no longer exists in new sections, switching to "${newSections[0]}"`);
        setDropdownWall(newSections[0] || '');
      }
    }
  }, [wallTotals, wallTotalsLoaded, expiredSections]);
  
  // Ensure dropdownWall is always valid when wallTotals changes
  useEffect(() => {
    const availableSections = Object.keys(wallTotals);
    if (availableSections.length > 0 && !availableSections.includes(dropdownWall)) {
      console.log(`Invalid dropdownWall "${dropdownWall}", resetting to first available: "${availableSections[0]}"`);
      setDropdownWall(availableSections[0]);
    }
  }, [wallTotals]);
  
  // Auto-expiry feature REMOVED - keeping useEffect stub to prevent issues
  useEffect(() => {
    // Feature removed
  }, []);
  
  // Auto-select climber for non-admin users
  useEffect(() => {
    if (user && user.role !== 'admin' && user.climberId && climbers.length > 0) {
      setSelectedClimber(user.climberId);
    }
  }, [user, climbers]);
  
  // Check if user needs Google link reminder
  useEffect(() => {
    if (user && climbers.length > 0 && isGoogleConfigured) {
      const currentClimber = climbers.find(c => c.id === user.climberId);
      const hasGoogleLinked = currentClimber?.google_id;

      // Show reminder if Google is not linked and we haven't shown it this session
      const reminderShown = sessionStorage.getItem('googleLinkReminderShown');
      if (!hasGoogleLinked && !reminderShown) {
        // Delay showing the popup slightly so it doesn't overlap with login transition
        setTimeout(() => {
          setShowGoogleLinkReminder(true);
          sessionStorage.setItem('googleLinkReminderShown', 'true');
        }, 2000);
      }
    }
  }, [user, climbers, isGoogleConfigured]);

  useEffect(() => {
    if (showSettings && pendingGoogleLinkFocus) {
      setTimeout(() => {
        googleLinkSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setHighlightGoogleLink(true);
      }, 50);
      setPendingGoogleLinkFocus(false);
    }
  }, [showSettings, pendingGoogleLinkFocus]);

  useEffect(() => {
    if (highlightGoogleLink) {
      const timer = setTimeout(() => setHighlightGoogleLink(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [highlightGoogleLink]);

  const handleExportCSV = useCallback(async () => {
    try {
      const csv = await store.exportCSV(
        climbers.length ? climbers : undefined,
        sessions.length ? sessions : undefined
      );
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'bouldering.csv';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert('Failed to export CSV: ' + (err?.message || err));
    }
  }, [climbers, sessions]);

  const API_BOOT_MAX_ATTEMPTS = 5;

  async function loadData() {
    setLoading(true);
    setError(null);
    setBootStatus(null);
    try {
      for (let attempt = 1; attempt <= API_BOOT_MAX_ATTEMPTS; attempt++) {
        try {
          console.log(`Loading data from API (attempt ${attempt})...`);
          const [loadedClimbers, loadedSessions, loadedLeaderboard] = await Promise.all([
            api.getClimbers(),
            api.getSessions(),
            api.getLeaderboard()
          ]);
          console.log('Data loaded successfully:', {
            climbers: loadedClimbers.length,
            sessions: loadedSessions.length,
            leaderboard: loadedLeaderboard.length
          });
          setClimbers(loadedClimbers);
          setSessions(loadedSessions);
          setLeaderboard(loadedLeaderboard);
          await loadVideos(); // Load videos too
          // Load admin notifications (non-blocking)
          (async () => {
            try {
              setNotifLoading(true);
              const noteRes = await api.getAdminNotifications();
              setNotifications(noteRes.notifications || []);
            } catch (e) {
              console.warn('Failed to load admin notifications', e);
            } finally {
              setNotifLoading(false);
            }
          })();
          setBootStatus(null);
          setError(null);
          return;
        } catch (err: any) {
          if (api.isBootingError(err) && attempt < API_BOOT_MAX_ATTEMPTS) {
            const waitMs = attempt * 4000;
            setBootStatus(`Render is waking the API (retry ${attempt}/${API_BOOT_MAX_ATTEMPTS}). Retrying in ${Math.ceil(waitMs / 1000)}s...`);
            await api.delay(waitMs);
            continue;
          }
          throw err;
        }
      }
    } catch (err: any) {
      console.error('Failed to load data:', err);
      if (api.isBootingError(err)) {
        setError('The API is still starting on Render. Please try again in a minute or refresh the page.');
      } else {
        setError(err.message || 'Failed to load data. Check if API is online at https://bouldering-elo-api.onrender.com');
      }
    } finally {
      setBootStatus(null);
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
        // Filter out expired sections from wallCounts
        const filteredWallCounts: any = {};
        Object.keys(climberSessions[0].wallCounts).forEach(section => {
          if (!expiredSections.includes(section)) {
            filteredWallCounts[section] = climberSessions[0].wallCounts[section];
          }
        });
        setWallCounts(filteredWallCounts);
      }
    }
  }, [selectedClimber, sessions, expiredSections]);

  function handleLoginSuccess() {
    setIsAuthenticated(true);
    setUser(api.getUser());
    setShowLoginScreen(false);
    loadData(); // Reload data after login
  }

  function handleLogout() {
    if (!confirm('Are you sure you want to log out?')) {
      return;
    }
    api.clearToken();
    setIsAuthenticated(false);
    setUser(null);
    setShowLoginScreen(true);
  }

  function closeResetPasswordModal() {
    setShowResetPasswordModal(false);
    setResetToken(null);
    const url = new URL(window.location.href);
    url.searchParams.delete('token');
    if (url.pathname.includes('reset-password')) {
      url.pathname = '/';
    }
    window.history.replaceState({}, document.title, url.toString());
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

  // Start editing a session
  function startEditSession(session: any) {
    setEditingSession(session.id);
    setEditSessionDate(session.date);
    setEditSessionNotes(session.notes || '');
    
    // Initialize wall counts for editing
    const counts: any = {};
    Object.keys(wallTotals).forEach(section => {
      counts[section] = {
        green: session.wallCounts?.[section]?.green || 0,
        blue: session.wallCounts?.[section]?.blue || 0,
        yellow: session.wallCounts?.[section]?.yellow || 0,
        orange: session.wallCounts?.[section]?.orange || 0,
        red: session.wallCounts?.[section]?.red || 0,
        black: session.wallCounts?.[section]?.black || 0
      };
    });
    setEditSessionWallCounts(counts);
  }

  // Cancel editing
  function cancelEditSession() {
    setEditingSession(null);
    setEditSessionDate('');
    setEditSessionNotes('');
    setEditSessionWallCounts({} as WallCounts);
  }

  // Save edited session
  async function saveEditedSession(sessionId: number, climberId: number) {
    setLoading(true);
    try {
      // First delete the old session
      await api.deleteSession(sessionId);
      
      // Then create a new one with the updated data
      await api.addSession({
        climberId,
        date: editSessionDate,
        wallCounts: editSessionWallCounts,
        notes: editSessionNotes
      });
      
      // Reload data
      await loadData();
      cancelEditSession();
      alert('Session updated successfully');
    } catch (err: any) {
      alert(`Error updating session: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  // Update a specific wall count during editing
  function updateEditWallCount(section: string, color: keyof Counts, value: string) {
    const numValue = Math.max(0, parseInt(value) || 0);
    setEditSessionWallCounts({
      ...editSessionWallCounts,
      [section]: {
        ...editSessionWallCounts[section],
        [color]: numValue
      }
    });
  }

  // Route Management Functions
  async function updateRouteCount(section: string, color: string, value: number) {
    const updated = {
      ...wallTotals,
      [section]: {
        ...wallTotals[section],
        [color]: Math.max(0, value)
      }
    };
    setWallTotals(updated);
    await saveWallTotalsToAPI(updated);
  }

  async function addWallSection() {
    if (!newSectionName.trim()) {
      alert('Please enter a section name');
      return;
    }
    if (wallTotals[newSectionName]) {
      alert('Section already exists');
      return;
    }
    const updated = {
      ...wallTotals,
      [newSectionName]: { yellow: 0, orange: 0, red: 0, black: 0, blue: 0, green: 0 }
    };
    setWallTotals(updated);
    await saveWallTotalsToAPI(updated);
    setNewSectionName('');
  }

  async function renameWallSection(oldName: string, newName: string) {
    if (!newName.trim()) {
      alert('Please enter a new section name');
      return;
    }
    if (newName === oldName) {
      setRenamingSection(null);
      return;
    }
    if (wallTotals[newName]) {
      alert('A section with that name already exists');
      return;
    }
    
    // Create new object with renamed section
    const updated: Record<string, Record<string, number>> = {};
    Object.keys(wallTotals).forEach(key => {
      if (key === oldName) {
        updated[newName] = wallTotals[oldName];
      } else {
        updated[key] = wallTotals[key];
      }
    });
    
    setWallTotals(updated);
    await saveWallTotalsToAPI(updated);
    
    // Update wall section images
    if (wallSectionImages[oldName]) {
      const updatedImages = { ...wallSectionImages };
      updatedImages[newName] = updatedImages[oldName];
      delete updatedImages[oldName];
      setWallSectionImages(updatedImages);
      await saveWallSectionImagesToAPI(updatedImages);
    }
    
    // Expiry dates feature removed; nothing to migrate here
    
    // Migrate session data: update all sessions that have the old wall name
    migrateSectionDataInSessions(oldName, newName);
    
    setRenamingSection(null);
    setRenameValue('');
  }

  // Migrate session data when wall section is renamed
  function migrateSectionDataInSessions(oldName: string, newName: string) {
    const updatedSessions = sessions.map(session => {
      if (session.wallCounts && session.wallCounts[oldName]) {
        const newWallCounts = { ...session.wallCounts };
        newWallCounts[newName] = newWallCounts[oldName];
        delete newWallCounts[oldName];
        return { ...session, wallCounts: newWallCounts };
      }
      return session;
    });
    setSessions(updatedSessions);
    
    // Show confirmation
    const migratedCount = updatedSessions.filter(s => s.wallCounts?.[newName]).length;
    if (migratedCount > 0) {
      console.log(`Migrated ${migratedCount} sessions from "${oldName}" to "${newName}"`);
    }
  }

  // Manual migration function for existing sessions with old wall names
  async function migrateOldWallNames() {
    if (!confirm('This will migrate all old session data from "midWall" to current wall sections and "sideWall" to current sections. Continue?')) {
      return;
    }
    
    setLoading(true);
    try {
      // Mapping of old names to new names (you can adjust these)
      const migrations = [
        { old: 'midWall', new: 'mid - front' },
        { old: 'sideWall', new: 'side - right' }
      ];
      
      let totalMigrated = 0;
      
      for (const migration of migrations) {
        // Check if new section exists
        if (!wallTotals[migration.new]) {
          console.log(`Skipping ${migration.old} -> ${migration.new}: target section doesn't exist`);
          continue;
        }
        
        const updatedSessions = sessions.map(session => {
          if (session.wallCounts && session.wallCounts[migration.old]) {
            const newWallCounts = { ...session.wallCounts };
            newWallCounts[migration.new] = newWallCounts[migration.old];
            delete newWallCounts[migration.old];
            totalMigrated++;
            return { ...session, wallCounts: newWallCounts };
          }
          return session;
        });
        setSessions(updatedSessions);
      }
      
      // Reload data to see the changes
      await loadData();
      
      alert(`Migration complete! Migrated data in ${totalMigrated} session entries.`);
    } catch (err: any) {
      alert(`Migration error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function deleteWallSection(section: string) {
    if (!confirm(`Delete wall section "${section}"? This cannot be undone!`)) {
      return;
    }
    const updated = { ...wallTotals };
    delete updated[section];
    setWallTotals(updated);
    await saveWallTotalsToAPI(updated);
    
    // Remove wall section image if exists
    if (wallSectionImages[section]) {
      const updatedImages = { ...wallSectionImages };
      delete updatedImages[section];
      setWallSectionImages(updatedImages);
      await saveWallSectionImagesToAPI(updatedImages);
    }
    
    // Expiry dates feature removed; nothing to do here
  }

  // Reset wall section for all sessions (admin): sets all climbs in the section to 0
  const [resetResult, setResetResult] = useState<{ message: string; changed: any[]; auditId?: string } | null>(null);
  const [resetLoading, setResetLoading] = useState(false);
  const [recalculateScoresLoading, setRecalculateScoresLoading] = useState(false);
  const [profileSessionsExpanded, setViewingProfileSessionsExpanded] = useState(false);

  const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isMobileCompact = typeof window !== 'undefined' && window.innerWidth <= 430;

  // Build responsive image sources to prefer AVIF/WEBP at ~1200px with fallback
  const buildImageSources = (path: string) => {
    const url = path.startsWith('http') ? path : `${API_URL}${path}`;
    const sep = url.includes('?') ? '&' : '?';
    const sized = `${url}${sep}w=1200`;
    return {
      avif: `${sized}&format=avif`,
      webp: `${sized}&format=webp`,
      fallback: sized
    };
  };

  async function resetWallSectionAdmin(section: string) {
    if (!confirm(`Reset all climbs in section "${section}" to 0 for all sessions? This will keep the section but set all counts to zero.`)) {
      return;
    }
    try {
      setResetLoading(true);
  const result = await api.resetWallSection(section);
  // result.changed is an array of affected sessions with old/new scores; result.auditId may be present
  setResetResult({ message: result.message || `Reset ${section}`, changed: result.changed || [], auditId: (result as any).auditId });
      // Reload sessions and leaderboard to reflect changes
      await loadData();
      alert(`${result.changed?.length ?? 0} sessions updated. See details in the admin reset dialog.`);
    } catch (err: any) {
      alert('Failed to reset wall section: ' + (err.message || 'Unknown error'));
    } finally {
      setResetLoading(false);
    }
  }

  // setExpiryDate removed along with expiry feature

  // Copy section data (totals, images)
  function copySectionData(section: string) {
    setCopiedSectionData({
      totals: { ...wallTotals[section] },
      images: wallSectionImages[section] ? [...wallSectionImages[section]] : undefined
    });
    alert(`Copied data from "${section}"`);
  }

  // Paste section data to another section
  async function pasteSectionData(section: string) {
    if (!copiedSectionData) {
      alert('No section data copied yet');
      return;
    }

    if (!confirm(`Paste copied data to "${section}"? This will overwrite current totals and images.`)) {
      return;
    }

    // Update totals
    const updatedTotals = {
      ...wallTotals,
      [section]: { ...copiedSectionData.totals }
    };
    setWallTotals(updatedTotals);
    await saveWallTotalsToAPI(updatedTotals);

    // Expiry dates feature removed; nothing to copy for expiry

    // Update images
    if (copiedSectionData.images && copiedSectionData.images.length > 0) {
      const updatedImages = {
        ...wallSectionImages,
        [section]: [...copiedSectionData.images]
      };
      setWallSectionImages(updatedImages);
      await saveWallSectionImagesToAPI(updatedImages);
    }

    alert(`Pasted data to "${section}"`);
  }

  // manuallyExpireSection removed along with expiry feature

  async function resetToDefaults() {
    if (!confirm('Reset all route totals to defaults? This cannot be undone!')) {
      return;
    }
    setWallTotals(DEFAULT_wallTotals);
    await saveWallTotalsToAPI(DEFAULT_wallTotals);
    // expiryDates removed; no-op
  }

  // Climber profile editing functions (admin)
  function startEditClimber(climber: any) {
    setEditingClimber(climber.id);
    setEditClimberName(climber.name || '');
    setEditClimberUsername(climber.username || '');
    setEditClimberCountry(climber.country || '');
    setEditClimberStarted(climber.started_bouldering || '');
    setEditClimberBio(climber.bio || '');
    setEditClimberInstagram(climber.instagram_handle || '');
    setEditClimberRole(climber.role || 'user');
  }

  function cancelEditClimber() {
    setEditingClimber(null);
    setEditClimberName('');
    setEditClimberUsername('');
    setEditClimberCountry('');
    setEditClimberStarted('');
    setEditClimberBio('');
    setEditClimberInstagram('');
    setEditClimberRole('user');
  }

  async function saveEditedClimber() {
    if (!editingClimber) return;
    
    try {
      setLoading(true);
      await api.updateClimberProfile(editingClimber, {
        name: editClimberName,
        username: editClimberUsername || undefined,
        country: editClimberCountry || undefined,
        started_bouldering: editClimberStarted || undefined,
        bio: editClimberBio || undefined,
        instagram_handle: editClimberInstagram || undefined,
        role: editClimberRole
      });
      
      // Reload data
      await loadData();
      cancelEditClimber();
      alert('Profile updated successfully!');
    } catch (err: any) {
      alert('Failed to update profile: ' + err.message);
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

  function updateWallCount(wall: string, color: keyof Counts, val: string) {
    const nv = Math.max(0, parseInt(val)||0);
    // Safely check if the wall exists in wallTotals
    const maxAllowed = (wallTotals[wall] && wallTotals[wall][color]) || 0;
    const cappedValue = maxAllowed > 0 ? Math.min(nv, maxAllowed) : nv;
    const currentWallCounts = wallCounts[wall] || emptyWall();
    setWallCounts({...wallCounts, [wall]: {...currentWallCounts, [color]: cappedValue}});
  }
  
  async function addClimb() {
    if (!selectedClimber) {
      alert('Please select a climber first.');
      return;
    }

    // Require video evidence for red or black
    if ((dropdownColor === 'red' || dropdownColor === 'black') && !videoUrl.trim()) {
      alert('Video evidence required for red and black climbs!');
      return;
    }
    
    console.log('DEBUG addClimb:', {
      dropdownWall,
      dropdownColor,
      wallCountsKeys: Object.keys(wallCounts),
      wallTotalsKeys: Object.keys(wallTotals),
      wallCountsForWall: wallCounts[dropdownWall],
      wallTotalsForWall: wallTotals[dropdownWall]
    });
    
    const current = wallCounts[dropdownWall]?.[dropdownColor];
    const maxForSection = wallTotals[dropdownWall]?.[dropdownColor];
    
    console.log('DEBUG values:', { current, maxForSection });
    
    // Check if wallCounts doesn't have this section - auto-fix instead of erroring
    if (current === undefined) {
      const availableSections = Object.keys(wallCounts);
      if (availableSections.length > 0) {
        console.log(`Auto-fixing: Wall section "${dropdownWall}" not found, switching to "${availableSections[0]}"`);
        setDropdownWall(availableSections[0]);
        alert(`Wall section "${dropdownWall}" not found. Switched to "${availableSections[0]}". Please try again.`);
      } else {
        alert(`Error: No wall sections available. Try refreshing the page.`);
      }
      return;
    }
    
    // Check if adding this climb would exceed the maximum (only if a limit is set)
    if (maxForSection !== undefined && maxForSection > 0 && current >= maxForSection) {
      alert(`Cannot add more ${dropdownColor} climbs to ${dropdownWall}. Maximum is ${maxForSection}.`);
      return;
    }
    
    const newWallCounts = {
      ...wallCounts,
      [dropdownWall]: {...wallCounts[dropdownWall], [dropdownColor]: current + 1}
    };

    setWallCounts(newWallCounts);

    // Track last edited cell for highlighting
    setLastEditedCell({wall: dropdownWall, color: dropdownColor});
    setTimeout(() => setLastEditedCell(null), 2000); // Clear highlight after 2 seconds

    let updatedPendingVideos = pendingVideos;
    let updatedSessionNotes = sessionNotes;

    // Track video for submission after session is created
    if (videoUrl.trim()) {
      updatedPendingVideos = [...pendingVideos, {
        videoUrl: videoUrl.trim(),
        color: dropdownColor,
        wall: dropdownWall
      }];
      const videoNote = `${dropdownColor} on ${dropdownWall}: ${videoUrl}`;
      updatedSessionNotes = sessionNotes ? `${sessionNotes}\n${videoNote}` : videoNote;
      setPendingVideos(updatedPendingVideos);
      setSessionNotes(updatedSessionNotes);
      setVideoUrl('');
    }

    const submitted = await submit(newWallCounts, updatedPendingVideos, updatedSessionNotes);

    if (submitted) {
      setToast({message: `✅ Added 1 ${dropdownColor} climb to ${formatWallSectionName(dropdownWall)}!`, type: 'success'});
      setTimeout(() => setToast(null), 3000);
    }
  }

  async function subtractClimb() {
    if (!selectedClimber) {
      alert('Please select a climber first.');
      return;
    }

    const current = wallCounts[dropdownWall]?.[dropdownColor];

    // Check if wallCounts doesn't have this section
    if (current === undefined) {
      const availableSections = Object.keys(wallCounts);
      if (availableSections.length > 0) {
        setDropdownWall(availableSections[0]);
        alert(`Wall section "${dropdownWall}" not found. Switched to "${availableSections[0]}". Please try again.`);
      }
      return;
    }
    
    // Can't go below 0
    if (current <= 0) {
      alert(`Cannot subtract - ${dropdownColor} count is already 0.`);
      return;
    }
    
    const newWallCounts = {
      ...wallCounts,
      [dropdownWall]: {...wallCounts[dropdownWall], [dropdownColor]: current - 1}
    };

    setWallCounts(newWallCounts);

    // Track last edited cell for highlighting
    setLastEditedCell({wall: dropdownWall, color: dropdownColor});
    setTimeout(() => setLastEditedCell(null), 2000); // Clear highlight after 2 seconds

    const submitted = await submit(newWallCounts);

    if (submitted) {
      setToast({message: `➖ Removed 1 ${dropdownColor} climb from ${formatWallSectionName(dropdownWall)}`, type: 'success'});
      setTimeout(() => setToast(null), 3000);
    }
  }

  async function submit(
    customWallCounts?: WallCounts,
    customPendingVideos = pendingVideos,
    customSessionNotes = sessionNotes
  ) {
    if (!selectedClimber) {
      alert('Please select a climber first.');
      return false;
    }

    const countsToUse = customWallCounts || wallCounts;

    setLoading(true);
    setError(null);
    try {
      // Exclude red/black climbs that have pending videos from the score
      // They will be added when admin approves the video
      const adjustedWallCounts = JSON.parse(JSON.stringify(countsToUse)); // Deep copy

      customPendingVideos.forEach(video => {
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
        notes: customSessionNotes
      });

      // Submit all pending videos with the session ID
      if (customPendingVideos.length > 0 && session.id) {
        await Promise.all(
          customPendingVideos.map(video =>
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
      setWallCounts(initializeWallCounts());
      setSessionNotes('');
      setVideoUrl('');
      setPendingVideos([]);
      return true;
    } catch (err: any) {
      setError(err.message || 'Failed to submit session');
      return false;
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{fontFamily:'"Red Hat Text", sans-serif',padding:'10px',maxWidth:1000,margin:'0 auto',position:'relative'}}>
      {backgroundEnabled && <BackgroundBeams />}
      
      {/* Toast Notification */}
      {toast && (
        <div style={{
          position:'fixed',
          top:20,
          right:20,
          backgroundColor: toast.type === 'success' ? '#10b981' : '#ef4444',
          color:'white',
          padding:'12px 20px',
          borderRadius:8,
          boxShadow:'0 4px 12px rgba(0,0,0,0.3)',
          zIndex:9999,
          fontWeight:'600',
          fontSize:14,
          maxWidth:'90%',
          animation:'slideIn 0.3s ease-out'
        }}>
          {toast.message}
        </div>
      )}
      
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20,flexWrap:'wrap',gap:12}}>
        <div style={{display:'flex',alignItems:'center',gap:16,flexWrap:'wrap'}}>
          <div style={{display:'flex',flexDirection:'column'}}>
            <h1 className="mrs-saint-delafield-regular" style={{margin:0,fontSize:'clamp(20px, 5vw, 32px)'}}>
              <span className="italianno" style={{marginRight: 6}}>Bouldering</span>
              <span className="dm-serif-text">ELO</span>
            </h1>
            <div style={{fontSize:12,color:'#94a3b8',fontWeight:600,marginTop:4}}>UMass Ascend</div>
          </div>
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
        <div style={{display:'flex',gap:12,alignItems:'center',flexWrap:'wrap',justifyContent:'flex-end'}}>
          <button
            type="button"
            aria-pressed={backgroundEnabled}
            onClick={() => setBackgroundEnabled(prev => !prev)}
            style={{
              padding:'8px 16px',
              backgroundColor: backgroundEnabled ? 'rgba(59,130,246,0.18)' : '#1e293b',
              color:'#bfdbfe',
              border:'1px solid rgba(148,163,184,0.6)',
              borderRadius:999,
              fontWeight:600,
              textTransform:'uppercase',
              letterSpacing:0.5,
              transition:'background-color 0.2s ease, color 0.2s ease',
              minWidth:160
            }}
          >
            {backgroundEnabled ? 'Hide Background' : 'Show Background'}
          </button>
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
                    setSettingsUsername(user?.username || '');
                    setSettingsName(currentClimber.name || '');
                    setSettingsCountry(currentClimber.country || '');
                    setSettingsStarted(currentClimber.started_bouldering || '');
                    setSettingsBio(currentClimber.bio || '');
                    setSettingsInstagram(currentClimber.instagram_handle || '');
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
              Login/Sign up
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
        <div style={{
          color:'#3b82f6',
          marginBottom:16,
          padding:16,
          backgroundColor:'#1e293b',
          borderRadius:8,
          border:'1px solid #3b82f6'
        }}>
          <div style={{marginBottom:8}}>
            {bootStatus || 'Please wait up to 50 seconds, API loading.'}
          </div>
        </div>
      )}
      
      {!isAuthenticated && !loading && (
        
          <div style={{backgroundColor:'#1e293b',padding:24,borderRadius:8,marginBottom:20,border:'2px solid #3b82f6'}}>
            <h2 style={{marginTop:0,color:'#3b82f6'}}>Welcome to my website ‎:) ‎</h2>
            <p>Create an account or log in to start logging climbs and appear on the leaderboard.</p>
          </div>
        
      )}
      
      {/* Expired Sections Banner */}
      {expiredSections.length > 0 && (
        <div style={{
          backgroundColor:'rgba(249, 115, 22, 0.15)',
          border:'1px solid rgba(249, 115, 22, 0.3)',
          borderRadius:8,
          padding:'12px 16px',
          marginBottom:16,
          color:'#fdba74'
        }}>
          <div style={{fontWeight:'600',marginBottom:4,fontSize:14}}>
            ⚠️ Wall Sections Replaced
          </div>
          <div style={{fontSize:13,lineHeight:1.5}}>
            The following sections have been replaced with new routes:
            <ul style={{marginTop:4,marginBottom:4,paddingLeft:20}}>
              {expiredSections.map((section, idx) => (
                <li key={idx}>
                  <strong>{formatWallSectionName(section)}</strong>
                </li>
              ))}
            </ul>
            <em>Your score has been recalculated to reflect only active routes. Previous climbs on these sections no longer count toward your total.</em>
          </div>
        </div>
      )}
      
      
        <div style={{position:'relative', marginBottom:20}}>
          <GlowingEffect variant="white" glow blur={18} spread={36} borderWidth={1} disabled={false} />
          <div style={{backgroundColor: BLACK_PANEL_BG, padding:24, borderRadius:8, border: BLACK_PANEL_BORDER, position:'relative'}}>
            {/* Notification center (admin can post messages) */}
            <div style={{marginBottom:16}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                <div style={{fontSize:16,fontWeight:700,color:'#fbbf24'}}>Notifications</div>
                {api.isAdmin() && (
                  <div style={{fontSize:12,color:'#94a3b8'}}>Admin editable</div>
                )}
              </div>
              <div style={{backgroundColor: BLACK_ROW_BG, borderRadius:8, padding:12, border: BLACK_PANEL_BORDER}}>
                {notifLoading ? (
                  <div style={{color:'#94a3b8'}}>Loading notifications...</div>
                ) : (
                  <div>
                    {notifications.length === 0 ? (
                      <div style={{color:'#94a3b8'}}>No notifications</div>
                    ) : (
                      <div style={{color:'#cbd5e1',whiteSpace:'pre-wrap'}}>{notifications[0].message}</div>
                    )}
                  </div>
                )}
              </div>

              {api.isAdmin() && (
                <div style={{marginTop:8,display:'flex',gap:8}}>
                  <textarea value={newNotificationText} onChange={e => setNewNotificationText(e.target.value)} placeholder="Type notification message..." style={{flex:1,minHeight:48,padding:8,backgroundColor:BLACK_PANEL_BG,color:'white',border:BLACK_PANEL_BORDER,borderRadius:6}} />
                  <div style={{display:'flex',flexDirection:'column',gap:8}}>
                    <button onClick={async () => {
                      if (!newNotificationText.trim()) return alert('Enter a message');
                      try {
                        setNotifLoading(true);
                        await api.setAdminNotification(newNotificationText.trim());
                        const res = await api.getAdminNotifications();
                        setNotifications(res.notifications || []);
                        setNewNotificationText('');
                      } catch (err: any) {
                        alert('Failed to save notification: ' + (err.message || err));
                      } finally { setNotifLoading(false); }
                    }} style={{padding:'8px 12px',backgroundColor:'#3b82f6',color:'white',border:'none',borderRadius:6,cursor:'pointer'}}>Save</button>
                    <button onClick={() => setNewNotificationText('')} style={{padding:'8px 12px',backgroundColor:'#475569',color:'white',border:'none',borderRadius:6,cursor:'pointer'}}>Clear</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      

      
        <div style={{backgroundColor: BLACK_PANEL_BG, padding:24, borderRadius:8, marginBottom:20, border: BLACK_PANEL_BORDER}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <h3 style={{marginTop:0,marginBottom:16}}>Guide</h3>
          </div>


          <div style={{...guideSectionCardStyle, marginTop: 0}}>
            <div style={guideSectionHeaderStyle}>
              <h4 style={guideSectionTitleStyle}>Quick start guide</h4>
              <GuideToggleButton
                label="guide"
                isOpen={showUserGuide}
                onToggle={() => {
                  const next = !showUserGuide;
                  setShowUserGuide(next);
                  try { localStorage.setItem('showUserGuide', next ? '1' : '0'); } catch (e) { /* ignore */ }
                }}
              />
            </div>
            {showUserGuide && (
                  <div style={{marginTop:16,display:'flex',flexDirection:'column',gap:16}}>
                    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:12}}>
                      {[
                    '1. Scroll down to “New Session”.',
                    '2. Select wall section + route color (reference available).',
                    '3. Add new climbs that you have done on that wall section.',
                    '4. See how you compare with others on the leaderboard!'
                  ].map((step) => (
                    <div key={step} style={{padding:'14px 16px',backgroundColor:BLACK_ROW_BG,borderRadius:8,border:BLACK_PANEL_BORDER,color:'#cbd5e1'}}>
                      <h5 style={{margin:0,fontSize:15,color:'#93c5fd'}}>{step}</h5>
                    </div>
                  ))}
                </div>

                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))',gap:12}}>
                  <div style={{padding:'12px 14px',backgroundColor:BLACK_ROW_BG,borderRadius:8,border:BLACK_PANEL_BORDER,color:'#cbd5e1',lineHeight:1.5}}>
                    <div style={{fontSize:13,fontWeight:700,color:'#93c5fd',marginBottom:6}}>Notes</div>
                    <ul style={{margin:0,paddingLeft:18,display:'flex',flexDirection:'column',gap:6,fontSize:13}}>
                      <li>Tap on any climber&apos;s name on the leaderboard to see their full profile.</li>
                      <li>Your stats save so you do not need to reenter all the climbs you have done.</li>
                      <li>Black and Red climbs wait for review before they count toward the leaderboard.</li>
                    </ul>
                  </div>
                </div>

                <div style={{display:'flex',flexWrap:'wrap',gap:10,alignItems:'center',backgroundColor:BLACK_ROW_BG,border:BLACK_PANEL_BORDER,borderRadius:8,padding:'12px 16px'}}>
                  <button
                    onClick={handleExportCSV}
                    style={{padding:'8px 12px',backgroundColor:BLACK_PANEL_BG,color:'#93c5fd',border:BLACK_PANEL_BORDER,borderRadius:6,cursor:'pointer'}}
                  >
                    Export CSV
                  </button>

                  <button
                    onClick={() => setShowSettings(true)}
                    style={{padding:'8px 12px',backgroundColor:BLACK_PANEL_BG,color:'#34d399',border:BLACK_PANEL_BORDER,borderRadius:6,cursor:'pointer'}}
                  >
                    Open Settings
                  </button>

                  <div style={{fontSize:13,color:'#93c5fd',fontWeight:600,display:'flex',flexDirection:'column',gap:4}}>
                    <span>Feel free to check out analytics at the bottom of the page.</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div style={guideSectionCardStyle}>
            <div style={guideSectionHeaderStyle}>
              <h4 style={guideSectionTitleStyle}>Scoring formula</h4>
              <GuideToggleButton
                label="scoring formula"
                isOpen={showScoringFormula}
                onToggle={() => setShowScoringFormula(prev => !prev)}
              />
            </div>
            {showScoringFormula && (
              <div style={{marginTop:16,display:'flex',flexDirection:'column',gap:16}}>
                <div style={{display:'flex',flexWrap:'wrap',gap:12,alignItems:'flex-start',justifyContent:'space-between'}}>
                  <div style={{flex:'1 1 260px',minWidth:220}}>
                    <h5 style={{margin:'0 0 6px',color:'#bfdbfe',fontSize:15}}>Scoring at a glance</h5>
                    <div style={{fontSize:14,lineHeight:1.6,color:'#cbd5e1'}}>
                      <strong>Climb harder routes to get more points.</strong> Sends are processed from Black → Green with a diminishing returns factor (r = 0.95) so earlier sends pay out more.
                      Your weekly total is then translated into a grade band (V0 → V9+) so you can compare sessions at a glance.
                    </div>
                  </div>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))',gap:16,color:'#cbd5e1'}}>
                  <div style={{backgroundColor:BLACK_ROW_BG,borderRadius:6,padding:'12px 16px',border:BLACK_PANEL_BORDER}}>
                    <div style={{fontSize:15,marginBottom:12,overflowX:'auto',textAlign:'center'}}>
                      <BlockMath math="\text{Score} = \sum_{c \in \text{colors}} \left( b_c \times \left[ W(n_{\text{cmltve}} + n_c) - W(n_{\text{cmltve}}) \right] \right)" />
                    </div>
                    <div style={{fontSize:14,lineHeight:1.6,textAlign:'center'}}>
                      <div style={{marginBottom:6}}>Weighting function:</div>
                      <InlineMath math="W(n) = \frac{1 - r^n}{1 - r}" />
                      {' with '}
                      <InlineMath math="r = 0.95" />
                    </div>
                  </div>

                  <div style={{display:'flex',flexDirection:'column',gap:12,backgroundColor:BLACK_ROW_BG,borderRadius:6,padding:'12px 16px',border:BLACK_PANEL_BORDER}}>
                    {/* TL;DR removed per guide update */}
                    <div style={{fontSize:14,lineHeight:1.7}}>
                      <h5 style={{margin:'0 0 8px',color:'#94a3b8',fontSize:14,fontWeight:600,letterSpacing:0.3}}>Scoring flow</h5>
                      <ol style={{paddingLeft:20,margin:0}}>
                        <li style={{marginBottom:6}}>
                          <strong>Color order:</strong> Black → Red → Orange → Yellow → Blue → Green.
                        </li>
                        <li style={{marginBottom:6}}>
                          <strong>Base values (<InlineMath math="b_c" />):</strong> Black(108) · Red(36) · Orange(12) · Yellow(4)· Blue(1.5) · Green(0.5).
                        </li>
                        <li style={{marginBottom:6}}>
                          <strong>Grade boundaries:</strong> Every score maps to a V-grade (see table below) so you know if your week felt like V3 or V8.
                        </li>
                        <li style={{marginBottom:6}}>
                          <strong>Diminishing returns:</strong> Early climbs for each color earn more than later repeats.
                        </li>
                        <li style={{marginBottom:6}}>
                          <InlineMath math="n_{\text{cmltve}}" /> counts all harder colors already processed; <InlineMath math="n_c" /> counts climbs of the current color.
                        </li>
                        <li>
                          <strong>Marginal gains shrink</strong> as totals increase, encouraging steady progression across colors.
                        </li>
                      </ol>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div style={guideSectionCardStyle}>
            <div style={guideSectionHeaderStyle}>
              <h4 style={guideSectionTitleStyle}>Grade boundaries</h4>
              <GuideToggleButton
                label="grade boundaries"
                isOpen={showGradeBoundaries}
                onToggle={() => setShowGradeBoundaries(prev => !prev)}
              />
            </div>
            {showGradeBoundaries && (
              <>
                <p style={{margin:'16px 0',fontSize:13,color:'#94a3b8'}}>
                  Each weekly score S maps to a V-grade using the exact ranges below. Colors match the badges on the leaderboard and profile pages.
                </p>
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:12}}>
                  {GRADE_BOUNDS.map(bound => {
                    const colors = getGradeColor(bound.grade);
                    return (
                      <div key={bound.grade} style={{backgroundColor:BLACK_ROW_BG,borderRadius:8,padding:12,border:BLACK_PANEL_BORDER}}>
                        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
                          <span style={{width:18,height:18,borderRadius:4,backgroundColor:colors.backgroundColor,border:'1px solid rgba(0,0,0,0.2)'}}></span>
                          <span style={{fontWeight:700,color:'#e2e8f0'}}>{bound.grade}</span>
                        </div>
                        <div style={{fontSize:13,color:'#94a3b8'}}>{formatGradeRangeLabel(bound.min, bound.max)}</div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Practical user guide included above for consistency */}

        </div>
      
      
      {isAuthenticated && (
        <section style={{display:'flex',gap:20,flexWrap:'wrap',marginBottom:20}}>
          <div style={{flex:1,minWidth:0,width:'100%'}}>
            
              <div style={{padding:'clamp(12px, 4vw, 24px)', backgroundColor: BLACK_PANEL_BG, borderRadius: PANEL_RADIUS, border: BLACK_PANEL_BORDER, overflow:'hidden'}}>
                <h2 style={{marginTop:0,marginBottom:8,fontSize:'clamp(20px, 5vw, 24px)',fontWeight:'600'}}>New Session</h2>
                <p style={{marginTop:0,marginBottom:20,fontSize:'clamp(12px, 3vw, 14px)',color:'#94a3b8'}}>
                  Track your climbing progress by adding completed routes
                </p>
            
            <div style={{marginBottom:16}}>
              <label style={{display:'block',fontWeight:'500',marginBottom:8}}>👤 Climber</label>
              {user?.role === 'admin' ? (
                <select 
                  value={selectedClimber||''} 
                  onChange={e=>setSelectedClimber(parseInt(e.target.value)||undefined)}
                  style={{width:'100%',padding:'10px 12px',borderRadius:6,border:BLACK_PANEL_BORDER,backgroundColor:BLACK_ROW_BG,color:'white',fontSize:14}}
                >
                  <option value="">Select...</option>
                  {climbers.map(c=>(<option key={c.id} value={c.id}>{c.name}</option>))}
                </select>
              ) : (
                <div style={{padding:'10px 12px',borderRadius:6,border:BLACK_PANEL_BORDER,backgroundColor:BLACK_ROW_BG,color:'#94a3b8',fontSize:14}}>
                  {climbers.find(c => c.id === user?.climberId)?.name || 'Loading...'}
                </div>
              )}
              {user?.role === 'admin' && (
                <div style={{marginTop:8,display:'flex',gap:8}}>
                  <input 
                    placeholder="New name" 
                    value={newName} 
                    onChange={e=>setNewName(e.target.value)}
                    style={{flex:1,padding:'10px 12px',borderRadius:6,border:BLACK_PANEL_BORDER,backgroundColor:BLACK_ROW_BG,color:'white',fontSize:14}}
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
              style={{
                width: isIOS ? 'calc(100% - 30px)' : '100%',
                maxWidth:'100%',
                minWidth:0,
                boxSizing:'border-box',
                display:'block',
                padding:'10px 12px',
                borderRadius:6,
                border:BLACK_PANEL_BORDER,
                backgroundColor:BLACK_ROW_BG,
                color:'white',
                fontSize:14
              }}
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
              <h3 style={{marginBottom:16,fontSize:18,fontWeight:'600',display:'flex',alignItems:'center',gap:8}}>
                🧗 Add Climb
              </h3>
              
              <div style={{marginBottom:16}}>
                {/* Display admin-uploaded wall section reference images - moved above buttons */}
                {wallSectionImages[dropdownWall] && wallSectionImages[dropdownWall].length > 0 && (
                  <div style={{
                    marginBottom:12,
                    border:'2px solid #3b82f6',
                    borderRadius:8,
                    overflow:'hidden',
                    backgroundColor:'#000',
                    position:'relative'
                  }}>
                    <div style={{
                      backgroundColor:BLACK_ROW_BG,
                      padding:'8px 12px',
                      borderBottom:'1px solid #3b82f6',
                      fontSize:12,
                      color:'#3b82f6',
                      fontWeight:'600',
                      display:'flex',
                      justifyContent:'space-between',
                      alignItems:'center'
                    }}>
                      <span>📍 Wall Section Reference ({formatWallSectionName(dropdownWall)})</span>
                      {wallSectionImages[dropdownWall].length > 1 && (
                        <span style={{fontSize:11,color:'#94a3b8'}}>
                          {currentImageIndex + 1} / {wallSectionImages[dropdownWall].length}
                        </span>
                      )}
                    </div>
                    <div style={{position:'relative'}}>
                        <picture>
                          <source
                            type="image/avif"
                            srcSet={buildImageSources(wallSectionImages[dropdownWall][currentImageIndex]).avif}
                          />
                          <source
                            type="image/webp"
                            srcSet={buildImageSources(wallSectionImages[dropdownWall][currentImageIndex]).webp}
                          />
                          <img
                            src={buildImageSources(wallSectionImages[dropdownWall][currentImageIndex]).fallback}
                            alt={`${dropdownWall} wall reference ${currentImageIndex + 1}`}
                            loading="lazy"
                            referrerPolicy="no-referrer"
                            width={1200}
                            height={900}
                            style={{
                              width:'100%',
                              height:'auto',
                              maxWidth:1200,
                              maxHeight:250,
                              objectFit:'contain',
                              display:'block'
                            }}
                            onError={referenceImageErrorHandler}
                          />
                        </picture>
                      {wallSectionImages[dropdownWall].length > 1 && (
                        <>
                          <button
                            onClick={() => setCurrentImageIndex((prev) => 
                              prev === 0 ? wallSectionImages[dropdownWall].length - 1 : prev - 1
                            )}
                            style={{
                              position:'absolute',
                              left:8,
                              top:'50%',
                              transform:'translateY(-50%)',
                              backgroundColor:'rgba(0,0,0,0.7)',
                              color:'white',
                              border:'none',
                              borderRadius:'50%',
                              width:36,
                              height:36,
                              fontSize:18,
                              cursor:'pointer',
                              display:'flex',
                              alignItems:'center',
                              justifyContent:'center'
                            }}
                          >
                            ‹
                          </button>
                          <button
                            onClick={() => setCurrentImageIndex((prev) => 
                              prev === wallSectionImages[dropdownWall].length - 1 ? 0 : prev + 1
                            )}
                            style={{
                              position:'absolute',
                              right:8,
                              top:'50%',
                              transform:'translateY(-50%)',
                              backgroundColor:'rgba(0,0,0,0.7)',
                              color:'white',
                              border:'none',
                              borderRadius:'50%',
                              width:36,
                              height:36,
                              fontSize:18,
                              cursor:'pointer',
                              display:'flex',
                              alignItems:'center',
                              justifyContent:'center'
                            }}
                          >
                            ›
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
              {(dropdownColor === 'red' || dropdownColor === 'black') && (
                <div style={{marginBottom:16,padding:16,backgroundColor:'#7f1d1d',borderRadius:6,border:'1px solid #991b1b'}}>
                  <label style={{display:'block',marginBottom:8,fontWeight:'bold',fontSize:14}}>⚠️ Video Evidence Required</label>
                  <input 
                    type="text" 
                    placeholder="Enter video URL (required for red/black)" 
                    value={videoUrl} 
                    onChange={e=>setVideoUrl(e.target.value)}
                    style={{width:'100%',padding:'10px 12px',borderRadius:6,border:'1px solid #991b1b',backgroundColor:BLACK_ROW_BG,color:'white',fontSize:14}}
                  />
                </div>
              )}

              <div style={{backgroundColor:BLACK_PANEL_BG,padding:'clamp(12px, 3vw, 16px)',borderRadius:8,fontSize:13,border:BLACK_PANEL_BORDER,overflowX:'auto'}}>
                <h4 style={{marginTop:0,marginBottom:12,fontSize:isMobileCompact ? 14 : 16,fontWeight:'600'}}>Current Progress</h4>
                <table style={{
                  width:'100%',
                  minWidth: isMobileCompact ? undefined : 520,
                  borderCollapse:'collapse',
                  fontSize:isMobileCompact ? 11 : 12,
                  tableLayout:'fixed'
                }}>
                  <colgroup>
                    <col style={{width:'25%'}} />
                    {Array.from({ length: 6 }).map((_, idx) => (
                      <col key={idx} style={{width:'12.5%'}} />
                    ))}
                  </colgroup>
                  <thead>
                    <tr style={{borderBottom:BLACK_PANEL_BORDER}}>
                      <th style={{textAlign:'left',padding: isMobileCompact ? '6px 4px' : '8px 6px',color:'#94a3b8',fontWeight:'600',width:'25%'}}>Wall Section</th>
                      <th style={{textAlign:'center',padding: isMobileCompact ? '6px 4px' : '8px 6px',color:'#10b981',fontWeight:'600',width:'12.5%'}}>Green</th>
                      <th style={{textAlign:'center',padding: isMobileCompact ? '6px 4px' : '8px 6px',color:'#3b82f6',fontWeight:'600',width:'12.5%'}}>Blue</th>
                      <th style={{textAlign:'center',padding: isMobileCompact ? '6px 4px' : '8px 6px',color:'#eab308',fontWeight:'600',width:'12.5%'}}>Yellow</th>
                      <th style={{textAlign:'center',padding: isMobileCompact ? '6px 4px' : '8px 6px',color:'#f97316',fontWeight:'600',width:'12.5%'}}>Orange</th>
                      <th style={{textAlign:'center',padding: isMobileCompact ? '6px 4px' : '8px 6px',color:'#ef4444',fontWeight:'600',width:'12.5%'}}>Red</th>
                      <th style={{textAlign:'center',padding: isMobileCompact ? '6px 4px' : '8px 6px',color:'#d1d5db',fontWeight:'600',width:'12.5%'}}>Black</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.keys(wallTotals)
                      .filter(section => !expiredSections.includes(section))
                      .map((section, idx) => {
                      const sectionCounts = wallCounts[section] || emptyWall();
                      const sectionTotals = wallTotals[section] || {};
                      const displayName = formatWallSectionName(section);
                      const isSelectedWall = section === dropdownWall;
                      const rowBackground = idx % 2 === 0 ? BLACK_PANEL_BG : BLACK_ROW_BG;
                      
                      return (
                        <tr key={section} style={{borderBottom:BLACK_PANEL_BORDER, backgroundColor: rowBackground}}>
                          <td style={{
                            padding: isMobileCompact ? '6px 4px' : '8px 6px',
                            transition: 'all 0.2s'
                          }}>
                            <div style={{
                              display: 'inline-block',
                              padding: isMobileCompact ? '3px 6px' : '4px 8px',
                              borderRadius: 6,
                              color:'#cbd5e1',
                              fontWeight:'500',
                              backgroundColor: isSelectedWall ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                              border: isSelectedWall ? '2px solid #3b82f6' : '2px solid transparent',
                              transition: 'all 0.2s'
                            }}>
                              {displayName}
                            </div>
                          </td>
                          {['green', 'blue', 'yellow', 'orange', 'red', 'black'].map((color) => {
                            const isSelectedColor = color === dropdownColor;
                            const isEdited = lastEditedCell?.wall === section && lastEditedCell?.color === color;
                            const isSelectedCell = isSelectedWall && isSelectedColor;
                            
                            return (
                              <td key={color} style={{
                                textAlign:'center',
                                padding: isMobileCompact ? '6px 4px' : '8px 6px',
                                fontWeight:'600',
                                transition: 'all 0.3s',
                                position: 'relative' as const
                              }}>
                                <div 
                                  onClick={() => {
                                    setDropdownWall(section);
                                    setDropdownColor(color as keyof Counts);
                                  }}
                                  style={{
                                  display: 'inline-block',
                                  padding: '4px 8px',
                                  borderRadius: 6,
                                  cursor: 'pointer',
                                  color: color === 'green' ? '#10b981' : 
                                         color === 'blue' ? '#3b82f6' :
                                         color === 'yellow' ? '#eab308' :
                                         color === 'orange' ? '#f97316' :
                                         color === 'red' ? '#ef4444' : '#d1d5db',
                                  backgroundColor: isEdited ? 'rgba(16, 185, 129, 0.25)' : 
                                                 isSelectedCell ? 'rgba(59, 130, 246, 0.2)' :
                                                 'transparent',
                                  border: isSelectedCell ? '2px solid #3b82f6' : '2px solid transparent',
                                  transition: 'all 0.3s'
                                }}>
                                  {isEdited && (
                                    <span style={{
                                      position: 'absolute' as const,
                                      top: 2,
                                      right: 2,
                                      fontSize: 10,
                                      animation: 'pulse 0.5s ease-in-out'
                                    }}>✨</span>
                                  )}
                                  {sectionCounts[color as keyof Counts]}/{sectionTotals[color] ?? '?'}
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div style={{margin:'16px 0',display:'flex',gap:12}}>
                <button
                  onClick={addClimb}
                  style={{
                    flex:1,
                    padding:'clamp(10px, 2vw, 12px) clamp(12px, 3vw, 16px)',
                    backgroundColor:'#3b82f6',
                    color:'white',
                    border:'none',
                    borderRadius:8,
                    fontSize:'clamp(14px, 3.5vw, 16px)',
                    fontWeight:'600',
                    cursor:'pointer',
                    transition:'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#3b82f6'}
                >
                  ➕ Add Climb
                </button>

                <button
                  onClick={subtractClimb}
                  style={{
                    flex:1,
                    padding:'clamp(10px, 2vw, 12px) clamp(12px, 3vw, 16px)',
                    backgroundColor:'#ef4444',
                    color:'white',
                    border:'none',
                    borderRadius:8,
                    fontSize:'clamp(14px, 3.5vw, 16px)',
                    fontWeight:'600',
                    cursor:'pointer',
                    transition:'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#dc2626'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ef4444'}
                >
                  ➖ Subtract Climb
                </button>
              </div>

              {/* Live Preview - moved here for better proximity to Current Progress */}
              <div style={{marginTop:16,backgroundColor:BLACK_PANEL_BG,padding:16,borderRadius:8,border:BLACK_PANEL_BORDER}}>
                <h4 style={{marginTop:0,marginBottom:16,fontSize:16,fontWeight:'600'}}>Live Preview</h4>
                <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:6,marginBottom:16}}>
                  <div style={{fontSize:36,fontWeight:700,color:'#3b82f6',textAlign:'center'}}>
                    {previewScore.toFixed(2)}
                  </div>
                  <GradeBadge grade={previewGrade} size="md" />
                  <div style={{fontSize:12,color:'#94a3b8',textTransform:'uppercase',letterSpacing:0.5}}>Weekly grade</div>
                </div>
                <div>
                  <h5 style={{marginTop:0,marginBottom:12,fontSize:12,fontWeight:'600',color:'#94a3b8',textTransform:'uppercase',letterSpacing:'0.05em'}}>Marginal Gains</h5>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(2, 1fr)',gap:8}}>
                    {ORDER.map((color:any)=> (
                      <div key={color} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'6px 10px',backgroundColor:BLACK_ROW_BG,borderRadius:6,border:BLACK_PANEL_BORDER}}>
                        <div style={{textTransform:'capitalize',fontSize:13,fontWeight:'500'}}>{color}</div>
                        <div style={{color:'#0ea5e9',fontWeight:'700',fontSize:13}}>+{marginalGain(totalCounts,color,1).toFixed(2)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            // Manual mode
            <div>
              <h3 style={{marginBottom:16,fontSize:18,fontWeight:'600'}}>Wall Sections</h3>
              
              {Object.keys(wallTotals).map(section => {
                const sectionCounts = wallCounts[section] || emptyWall();
                const sectionTotals = wallTotals[section] || {};
                const displayName = formatWallSectionName(section);
                
                return (
                  <div key={section} style={{marginBottom:20}}>
                    <h4 style={{marginBottom:12,fontSize:16,fontWeight:'600',color:'#94a3b8'}}>{displayName}</h4>
                    
                    {/* Display wall section reference images for this section */}
                    {wallSectionImages[section] && wallSectionImages[section].length > 0 && (
                      <div style={{
                        marginBottom:12,
                      border:'2px solid #3b82f6',
                      borderRadius:8,
                      overflow:'hidden',
                      backgroundColor:'#000',
                      position:'relative'
                    }}>
                      <div style={{
                        backgroundColor:BLACK_ROW_BG,
                        padding:'8px 12px',
                        borderBottom:'1px solid #3b82f6',
                        fontSize:12,
                        color:'#3b82f6',
                          fontWeight:'600',
                          display:'flex',
                          justifyContent:'space-between',
                          alignItems:'center'
                        }}>
                          <span>📍 Wall Section Reference ({displayName})</span>
                          {wallSectionImages[section].length > 1 && (
                            <span style={{fontSize:11,color:'#94a3b8'}}>
                              {(manualModeImageIndexes[section] || 0) + 1} / {wallSectionImages[section].length}
                            </span>
                          )}
                        </div>
                        <div style={{position:'relative'}}>
                          <picture>
                            <source
                              type="image/avif"
                              srcSet={buildImageSources(wallSectionImages[section][manualModeImageIndexes[section] || 0]).avif}
                            />
                            <source
                              type="image/webp"
                              srcSet={buildImageSources(wallSectionImages[section][manualModeImageIndexes[section] || 0]).webp}
                            />
                            <img
                              src={buildImageSources(wallSectionImages[section][manualModeImageIndexes[section] || 0]).fallback}
                              alt={`${section} wall reference ${(manualModeImageIndexes[section] || 0) + 1}`}
                              loading="lazy"
                              referrerPolicy="no-referrer"
                              width={1200}
                              height={900}
                              style={{
                                width:'100%',
                                height:'auto',
                                maxWidth:1200,
                                maxHeight:250,
                                objectFit:'contain',
                                display:'block'
                              }}
                              onError={referenceImageErrorHandler}
                            />
                          </picture>
                          {wallSectionImages[section].length > 1 && (
                            <>
                              <button
                                onClick={() => setManualModeImageIndexes(prev => ({
                                  ...prev,
                                  [section]: (prev[section] || 0) === 0 ? wallSectionImages[section].length - 1 : (prev[section] || 0) - 1
                                }))}
                                style={{
                                  position:'absolute',
                                  left:8,
                                  top:'50%',
                                  transform:'translateY(-50%)',
                                  backgroundColor:'rgba(0,0,0,0.7)',
                                  color:'white',
                                  border:'none',
                                  borderRadius:'50%',
                                  width:36,
                                  height:36,
                                  fontSize:18,
                                  cursor:'pointer',
                                  display:'flex',
                                  alignItems:'center',
                                  justifyContent:'center'
                                }}
                              >
                                ‹
                              </button>
                              <button
                                onClick={() => setManualModeImageIndexes(prev => ({
                                  ...prev,
                                  [section]: (prev[section] || 0) === wallSectionImages[section].length - 1 ? 0 : (prev[section] || 0) + 1
                                }))}
                                style={{
                                  position:'absolute',
                                  right:8,
                                  top:'50%',
                                  transform:'translateY(-50%)',
                                  backgroundColor:'rgba(0,0,0,0.7)',
                                  color:'white',
                                  border:'none',
                                  borderRadius:'50%',
                                  width:36,
                                  height:36,
                                  fontSize:18,
                                  cursor:'pointer',
                                  display:'flex',
                                  alignItems:'center',
                                  justifyContent:'center'
                                }}
                              >
                                ›
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                    
                    <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12}}>
                      {ORDER.map((color:keyof Counts)=> {
                        const total = sectionTotals[color];
                        const displayTotal = total !== undefined && total !== null ? total : '?';
                        const currentCount = sectionCounts[color];
                        return (
                          <div key={color}>
                            <label 
                              style={{
                                display:'block',
                                fontSize:12,
                                fontWeight:'500',
                                marginBottom:6,
                                textTransform:'capitalize',
                                cursor:'pointer',
                                userSelect:'none',
                                transition:'color 0.2s'
                              }}
                              onClick={(e) => {
                                e.preventDefault();
                                // Left click = increment, right click = decrement
                                const newVal = currentCount + 1;
                                const maxVal = typeof total === 'number' ? total : Infinity;
                                if (newVal <= maxVal) {
                                  updateWallCount(section, color, newVal.toString());
                                }
                              }}
                              onContextMenu={(e) => {
                                e.preventDefault();
                                // Right click = decrement
                                const newVal = Math.max(0, currentCount - 1);
                                updateWallCount(section, color, newVal.toString());
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.color = '#3b82f6'}
                              onMouseLeave={(e) => e.currentTarget.style.color = 'inherit'}
                            >
                              {color} ({currentCount}/{displayTotal})
                            </label>
                            <input 
                              type="number" 
                              min={0}
                              max={typeof total === 'number' ? total : undefined}
                              value={currentCount} 
                              onChange={e=>updateWallCount(section,color,e.target.value)}
                              style={{width:'100%',padding:'8px',borderRadius:6,border:BLACK_PANEL_BORDER,backgroundColor:BLACK_ROW_BG,color:'white',fontSize:14}}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>
      </div>

        {/* Live Preview - only show in manual mode since dropdown mode has it integrated */}
        {manualMode && (
          <div style={{width:350}}>
        
          <div style={{padding:24, backgroundColor: BLACK_PANEL_BG, borderRadius: PANEL_RADIUS, border: BLACK_PANEL_BORDER}}>
            <h2 style={{marginTop:0,marginBottom:16,fontSize:20,fontWeight:'600'}}>Live Preview</h2>
            <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:8,marginBottom:20}}>
              <div style={{fontSize:48,fontWeight:700,color:'#3b82f6',textAlign:'center'}}>
                {previewScore.toFixed(2)}
              </div>
              <GradeBadge grade={previewGrade} size="lg" />
              <div style={{fontSize:13,color:'#94a3b8',textTransform:'uppercase',letterSpacing:0.5}}>Weekly grade</div>
            </div>
            <div>
              <h4 style={{marginTop:0,marginBottom:12,fontSize:14,fontWeight:'600',color:'#94a3b8',textTransform:'uppercase',letterSpacing:'0.05em'}}>Marginal</h4>
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                {ORDER.map((color:any)=> (
                  <div key={color} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 12px',backgroundColor:BLACK_ROW_BG,borderRadius:6,border:BLACK_PANEL_BORDER}}>
                    <div style={{textTransform:'capitalize',fontSize:14,fontWeight:'500'}}>{color}</div>
                    <div style={{color:'#0ea5e9',fontWeight:'700',fontSize:14}}>+{marginalGain(totalCounts,color,1).toFixed(2)}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        
          </div>
        )}
        </section>
      )}

      {/* Leaderboard - visible to everyone */}
      <section style={{marginBottom:20}}>
        
          <div style={{padding:24, backgroundColor: BLACK_PANEL_BG, borderRadius:PANEL_RADIUS, border:BLACK_PANEL_BORDER}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
              <h2 style={{margin:0,fontSize:28,fontWeight:'700'}}>Leaderboard</h2>
            </div>
            <div style={{
              backgroundColor:'#000',
              borderRadius:PANEL_RADIUS,
              overflow:'auto',
              WebkitOverflowScrolling:'touch' as any,
              border:BLACK_PANEL_BORDER,
              position:'relative'
            }}>
              {/* Header */}
              <div style={{
                display:'grid',
                gridTemplateColumns:'50px minmax(120px, 2fr) repeat(9, minmax(60px, 1fr))',
                columnGap:4,
                padding:'12px 8px',
                backgroundColor:'#000',
                fontWeight:'600',
                fontSize:12,
                color:'#94a3b8',
                borderBottom:'1px solid rgba(148, 163, 184, 0.2)',
                alignItems:'center',
                minWidth:'fit-content'
              }}>
                <div style={{textAlign:'center',position:'sticky',left:0,backgroundColor:'#000',zIndex:2}}></div>
                <div style={{display:'flex', alignItems:'center', gap:8}}>
                  <span style={{width:16,display:'inline-block'}}></span>
                  <span></span>
                </div>
                <div style={{textAlign:'center',fontSize:11}}>Score</div>
                <div style={{textAlign:'center',fontSize:11}}>Grade</div>
                <div style={{textAlign:'center',fontSize:11}}>Sessions</div>
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
                // Exclude adjustment (proxy) sessions from play count
                const playCount = climberSessions.filter((s:any) => s.status !== 'adjustment').length;

                // Get latest non-adjustment session for climb counts and leaderboard totals
                const nonAdjSessions = climberSessions.filter((s:any) => s.status !== 'adjustment')
                  .sort((a:any, b:any) => new Date(b.date).getTime() - new Date(a.date).getTime());
                const latestNonAdjSession = nonAdjSessions.length > 0 ? nonAdjSessions[0] : null;
                // Fallback to any latest session if no non-adjustment sessions exist
                const latestAnySession = climberSessions.length > 0
                  ? climberSessions.sort((a:any, b:any) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
                  : null;
                const latestCounts = normalizeSessionCounts(latestNonAdjSession || latestAnySession, expiredSections);
                // Use the non-adjustment score for leaderboard totals when available
                const displayScore = latestNonAdjSession ? latestNonAdjSession.score : (e.total_score || 0);

                const resolvedScore = typeof displayScore === 'number'
                  ? displayScore
                  : (typeof e.total_score === 'number' ? e.total_score : Number(e.total_score) || 0);
                const rowGrade = getGradeForScore(resolvedScore);

                const defaultRowColor = i % 2 === 0 ? '#000' : '#050505';
                return (
                    <div
                      key={i}
                      style={{
                        display:'grid',
                        gridTemplateColumns:'50px minmax(120px, 2fr) repeat(9, minmax(60px, 1fr))',
                        columnGap:4,
                        padding:'10px 8px',
                        backgroundColor: defaultRowColor,
                        ['--row-bg-color' as any]: defaultRowColor,
                        borderBottom: i < (showAllLeaderboard ? leaderboard.length - 1 : Math.min(9, leaderboard.length - 1)) ? '1px solid rgba(148, 163, 184, 0.2)' : 'none',
                        alignItems:'center',
                        transition:'background-color 0.2s',
                        cursor:'pointer',
                        minWidth:'fit-content'
                      }}
                    onMouseEnter={e => {
                      e.currentTarget.style.backgroundColor = '#111';
                      e.currentTarget.style.setProperty('--row-bg-color', '#111');
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.backgroundColor = defaultRowColor;
                      e.currentTarget.style.setProperty('--row-bg-color', defaultRowColor);
                    }}
                    onClick={() => climber && setViewingProfile(climber.id)}
                  >
                    {/* Rank */}
                    <div style={{
                      textAlign:'center',
                      fontWeight:'700',
                      fontSize:14,
                      color: i === 0 ? '#fbbf24' : i === 1 ? '#cbd5e1' : i === 2 ? '#d97706' : '#64748b',
                      position:'sticky',
                      left:0,
                      backgroundColor:'var(--row-bg-color)' as any,
                      zIndex:1
                    }}>
                      #{i + 1}
                    </div>
                    
                    {/* Player with flag */}
                    <div style={{display:'flex',alignItems:'center',gap:8,minWidth:0,overflow:'hidden'}}>
                      <FlagEmoji countryCode={climber?.country} size={16} />
                      <span style={{fontWeight:'600',fontSize:14,color:'#e2e8f0',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{e.climber}</span>
                    </div>
                    
                    {/* Ranked Score (use latest non-adjustment session when available) */}
                    <div style={{textAlign:'center',fontWeight:'700',fontSize:14,color:'#3b82f6'}}>
                      {resolvedScore.toFixed(2)}
                    </div>

                    {/* Grade */}
                    <div style={{display:'flex',justifyContent:'center'}}>
                      <GradeBadge grade={rowGrade} size="sm" />
                    </div>

                    {/* Sessions */}
                    <div style={{textAlign:'center',color:'#94a3b8',fontSize:13}}>{playCount}</div>
                    
                    {/* Climbs by color */}
                    {CLIMB_CATEGORY_COLUMNS.map(column => (
                      <div key={column.key} style={{textAlign:'center'}}>
                        <div style={{fontSize:14,color:column.color,fontWeight:'700'}}>{latestCounts[column.key] || 0}</div>
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
                  backgroundColor:'#000',
                  borderTop:'1px solid rgba(148, 163, 184, 0.2)'
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
                    Show All ({leaderboard.length} climbers)
                  </button>
                </div>
              )}
              
              {showAllLeaderboard && leaderboard.length > 10 && (
                <div style={{
                  padding:16,
                  textAlign:'center',
                  backgroundColor:'#000',
                  borderTop:'1px solid rgba(148, 163, 184, 0.2)'
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
        
      </section>
      

      <section style={{marginTop:32}}>
        
          <div style={{padding:24, backgroundColor: BLACK_PANEL_BG, borderRadius: PANEL_RADIUS, border: BLACK_PANEL_BORDER}}>
            <h2 style={{marginTop:0,marginBottom:20,fontSize:24,fontWeight:'600'}}>Sessions</h2>
          
          {/* Expired Sections Notice */}
          {expiredSections.length > 0 && (
            <div style={{
              backgroundColor:'rgba(249, 115, 22, 0.1)',
              border:'1px solid rgba(249, 115, 22, 0.3)',
              borderRadius:8,
              padding:'12px 16px',
              marginBottom:20,
              color:'#fdba74',
              fontSize:13
            }}>
              <div style={{fontWeight:'600',marginBottom:4}}>
                ⚠️ Replaced Sections
              </div>
              <div>
                {expiredSections.map((section, idx) => (
                  <span key={idx}>
                    <strong>{formatWallSectionName(section)}</strong>
                    {idx < expiredSections.length - 1 && ', '}
                  </span>
                ))}
                {' - Climbs from these sections no longer count toward scores'}
              </div>
            </div>
          )}
          
          <div>
            {(() => {
              // Group sessions by date
              const sessionsByDate = new Map<string, any[]>();
              // Include adjustment (proxy) sessions in the Sessions view so they are visible to users,
              // but they remain marked as admin adjustments and do not modify past sessions.
              [...sessions]
                .sort((a:any, b:any) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .forEach(s => {
                  if (!sessionsByDate.has(s.date)) {
                    sessionsByDate.set(s.date, []);
                  }
                  sessionsByDate.get(s.date)!.push(s);
                });

              const allDates = Array.from(sessionsByDate.entries());
              const datesToShow = allDates.slice(0, sessionsToShow);
              const hasMore = allDates.length > sessionsToShow;

              return (
                <>
                  {datesToShow.map(([date, dateSessions]) => (
                    <div key={date} style={{marginBottom:24,paddingBottom:24,borderBottom:BLACK_PANEL_BORDER}}>
                      <h3 style={{fontSize:18,fontWeight:'600',marginBottom:16,color:'#3b82f6'}}>{date}</h3>
                      <div style={{display:'flex',flexDirection:'column',gap:10}}>
                        {dateSessions.map(s => {
                          const climber = climbers.find(c=>c.id===s.climberId);
                          
                          // Find previous non-adjustment session for this climber (so adjustments don't count as previous)
                          const climberSessions = sessions
                            .filter((sess:any) => sess.climberId === s.climberId)
                            .sort((a:any, b:any) => new Date(a.date).getTime() - new Date(b.date).getTime());

                          const sessionIndex = climberSessions.findIndex((sess:any) => sess.id === s.id);
                          let prevSession = null as any;
                          for (let idx = sessionIndex - 1; idx >= 0; idx--) {
                            const candidate = climberSessions[idx];
                            if (candidate && candidate.status !== 'adjustment') {
                              prevSession = candidate;
                              break;
                            }
                          }
                          
                          const scoreDiff = prevSession ? s.score - prevSession.score : s.score;
                          const displayScore = scoreDiff >= 0 ? `+${scoreDiff.toFixed(2)}` : scoreDiff.toFixed(2);
                          const sessionGrade = getGradeForScore(s.score || 0);
                          
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
                          
                          const isExpanded = expandedSession === s.id;
                          
                          // Calculate what's new in this session
                          const newClimbs: any = {};
                          if (prevSession && prevSession.wallCounts && s.wallCounts) {
                            Object.keys(s.wallCounts).forEach(section => {
                              const curr = s.wallCounts[section];
                              const prev = prevSession.wallCounts[section] || {green:0,blue:0,yellow:0,orange:0,red:0,black:0};
                              const diff: any = {};
                              let hasChanges = false;
                              ORDER.forEach(color => {
                                const delta = (curr[color] || 0) - (prev[color] || 0);
                                if (delta !== 0) {
                                  diff[color] = delta;
                                  hasChanges = true;
                                }
                              });
                              if (hasChanges) {
                                newClimbs[section] = diff;
                              }
                            });
                          }
                          
                          return (
                            <div key={s.id}>
                              <div 
                              onClick={() => setExpandedSession(isExpanded ? null : s.id)}
                              style={{
                                display:'flex',
                                justifyContent:'space-between',
                                alignItems:'center',
                                padding:'12px 16px',
                                backgroundColor:BLACK_ROW_BG,
                                borderRadius:6,
                                border:BLACK_PANEL_BORDER,
                                cursor:'pointer',
                                transition:'all 0.2s'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = BLACK_HOVER_BG}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = BLACK_ROW_BG}
                            >
                              <span style={{fontSize:16,fontWeight:'500'}}>{climber?.name}</span>
                              <div style={{display:'flex',alignItems:'center',gap:12}}>
                                  <span style={{color,fontWeight:'700',fontSize:18}}>{displayScore}</span>
                                  <GradeBadge grade={sessionGrade} size="sm" />
                                  <span style={{fontSize:12,color:'#94a3b8'}}>{isExpanded ? '▼' : '▸'}</span>
                                </div>
                              </div>
                              
                              {isExpanded && Object.keys(newClimbs).length > 0 && (
                                <div style={{marginTop:8,marginLeft:16,padding:12,backgroundColor:BLACK_PANEL_BG,borderRadius:6,border:BLACK_PANEL_BORDER}}>
                                  <h5 style={{margin:'0 0 8px 0',fontSize:13,fontWeight:'600',color:'#94a3b8'}}>Changes:</h5>
                                  {Object.entries(newClimbs).map(([section, colors]: [string, any]) => (
                                    <div key={section} style={{marginBottom:6,fontSize:12}}>
                                      <span style={{color:'#cbd5e1',fontWeight:'500'}}>{formatWallSectionName(section)}:</span>{' '}
                                      {ORDER.map(color => {
                                        if (colors[color]) {
                                          const colorMap: any = {green:'#10b981',blue:'#3b82f6',yellow:'#eab308',orange:'#f97316',red:'#ef4444',black:'#d1d5db'};
                                          const delta = colors[color];
                                          const sign = delta > 0 ? '+' : '';
                                          return <span key={color} style={{color:colorMap[color],marginLeft:8}}>{sign}{delta} {color}</span>;
                                        }
                                        return null;
                                      })}
                                    </div>
                                  ))}
                                </div>
                              )}
                              
                              {isExpanded && Object.keys(newClimbs).length === 0 && (
                                <div style={{marginTop:8,marginLeft:16,padding:12,backgroundColor:BLACK_PANEL_BG,borderRadius:6,border:BLACK_PANEL_BORDER,fontSize:12,color:'#94a3b8'}}>
                                  First session - no previous data to compare
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                  
                  {hasMore && (
                    <div style={{textAlign:'center',marginTop:16}}>
                      <button
                        onClick={() => setSessionsToShow(prev => prev + 3)}
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
                        See More
                      </button>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
          </div>
        
      </section>

      <section style={{marginTop:32}}>
        
          <div style={{padding:24, backgroundColor: BLACK_PANEL_BG, borderRadius: PANEL_RADIUS, border: BLACK_PANEL_BORDER}}>
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
                    : BLACK_ROW_BG,
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
                  backgroundColor:BLACK_ROW_BG,
                  backdropFilter:'blur(10px)',
                  borderRadius:12,
                  border:BLACK_PANEL_BORDER,
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
          <h3>Total Score Over Time - Top 10 (Last 30 Days)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={(() => {
              // Filter sessions to last 30 days
              const oneMonthAgo = new Date();
              oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);
              
              const sortedSessions = [...sessions]
                .filter((s:any) => new Date(s.date) >= oneMonthAgo)
                .sort((a:any,b:any)=> new Date(a.date).getTime() - new Date(b.date).getTime());
              
              if (sortedSessions.length === 0) return [];
              
              // Helper to get all dates between start and end
              const getAllDatesBetween = (start: Date, end: Date): string[] => {
                const dates: string[] = [];
                const current = new Date(start);
                while (current <= end) {
                  dates.push(current.toISOString().split('T')[0]);
                  current.setDate(current.getDate() + 1);
                }
                return dates;
              };
              
              // Get date range (start from 30 days ago or first session, whichever is later)
              // End date is today to ensure we always show the latest data
              const startDate = new Date(Math.max(oneMonthAgo.getTime(), new Date(sortedSessions[0].date).getTime()));
              const endDate = new Date(); // Always include today
              endDate.setHours(0, 0, 0, 0); // Reset to start of day for consistency
              const allDates = getAllDatesBetween(startDate, endDate);
              
              // Track each climber's current total score (from their latest session counts)
              const climberCurrentScore: { [climberId: number]: number } = {};
              climbers.forEach((c:any) => climberCurrentScore[c.id] = 0);
              
              const chartData: any[] = [];
              allDates.forEach((date: string) => {
                // Update scores from sessions on this date (use the session's total score, don't add)
                sortedSessions.filter((s:any) => s.date === date).forEach((s:any) => {
                  climberCurrentScore[s.climberId] = s.score;
                });
                
                // Record current scores for all climbers
                const point: any = { date };
                climbers.forEach((c:any) => {
                  point[c.name] = climberCurrentScore[c.id] || null;
                });
                chartData.push(point);
              });
              
              return chartData;
            })()}>
              <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
              <XAxis dataKey="date" stroke="#94a3b8" />
              <YAxis
                stroke="#94a3b8"
                label={{ value: 'Score', angle: -90, position: 'insideLeft', style: { fill: '#94a3b8', fontSize: 12 } }}
              />
              <Tooltip
                contentStyle={{backgroundColor:BLACK_PANEL_BG,border:BLACK_PANEL_BORDER}}
                formatter={(value: any) => {
                  if (typeof value !== 'number') return value;
                  return `${value.toFixed(2)} (${getGradeForScore(value)})`;
                }}
                labelFormatter={(label) => `Date: ${label}`}
                itemSorter={(item: any) => {
                  // Sort tooltip items by score (descending)
                  const climberScores = climbers.map((c:any) => {
                    const latestSession = sessions
                      .filter((s:any) => s.climberId === c.id)
                      .sort((a:any,b:any)=> new Date(b.date).getTime() - new Date(a.date).getTime())[0];
                    return {name: c.name, score: latestSession?.score || 0};
                  }).sort((a, b) => b.score - a.score);
                  
                  const rank = climberScores.findIndex(cs => cs.name === item.name);
                  return rank;
                }}
              />
              {renderGradeReferenceLines()}
              <Legend />
              {(() => {
                // Get top 10 climbers by current score
                const top10Climbers = climbers
                  .map((c:any) => {
                    const latestSession = sessions
                      .filter((s:any) => s.climberId === c.id)
                      .sort((a:any,b:any)=> new Date(b.date).getTime() - new Date(a.date).getTime())[0];
                    return {climber: c, score: latestSession?.score || 0};
                  })
                  .sort((a, b) => b.score - a.score)
                  .slice(0, 10)
                  .map(item => item.climber);
                
                // Distinct colors for up to 10 climbers
                const colors = [
                  '#3b82f6', // blue
                  '#ef4444', // red
                  '#10b981', // green
                  '#f59e0b', // amber
                  '#a855f7', // purple
                  '#ec4899', // pink
                  '#14b8a6', // teal
                  '#f97316', // orange
                  '#6366f1', // indigo
                  '#84cc16'  // lime
                ];
                
                return top10Climbers.map((c:any,i:number)=>(
                  <Line 
                    key={c.id} 
                    type="monotone" 
                    dataKey={c.name}
                    name={c.name}
                    stroke={colors[i]}
                    strokeWidth={2}
                    dot={false}
                    connectNulls
                  />
                ));
              })()}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Comparison Selector */}
        <div style={{marginTop:24,marginBottom:24,backgroundColor:BLACK_PANEL_BG,padding:16,borderRadius:8,border:BLACK_PANEL_BORDER}}>
          <h3 style={{marginTop:0,marginBottom:12}}>Compare Climbers</h3>
          <div style={{marginBottom:16}}>
            <label style={{display:'block',fontWeight:'500',marginBottom:8,fontSize:14}}>
              Search and select climbers to compare (2-5):
            </label>
            <input
              type="text"
              value={comparisonSearchQuery}
              onChange={(e) => setComparisonSearchQuery(e.target.value)}
              placeholder="Type to search climbers..."
              style={{
                width:'100%',
                padding:'10px 12px',
                borderRadius:6,
                border:BLACK_PANEL_BORDER,
                backgroundColor:BLACK_ROW_BG,
                color:'white',
                fontSize:14,
                marginBottom:12
              }}
            />
            {selectedClimbersForComparison.length > 0 && (
              <div style={{marginBottom:12}}>
                <div style={{fontSize:13,color:'#94a3b8',marginBottom:8}}>Selected ({selectedClimbersForComparison.length}):</div>
                <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
                  {selectedClimbersForComparison.map(id => {
                    const climber = climbers.find(c => c.id === id);
                    if (!climber) return null;
                    return (
                      <div 
                        key={id}
                        style={{
                          padding:'4px 10px',
                          backgroundColor:BLACK_ROW_BG,
                          color:'#60a5fa',
                          borderRadius:6,
                          border:BLACK_PANEL_BORDER,
                          fontSize:13,
                          display:'flex',
                          alignItems:'center',
                          gap:6
                        }}
                      >
                        {climber.name}
                        <button
                          onClick={() => setSelectedClimbersForComparison(prev => prev.filter(cid => cid !== id))}
                          style={{
                            background:'none',
                            border:'none',
                            color:'#60a5fa',
                            cursor:'pointer',
                            padding:0,
                            fontSize:16,
                            lineHeight:1
                          }}
                        >×</button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            <div style={{maxHeight:200,overflowY:'auto',border:BLACK_PANEL_BORDER,borderRadius:6,backgroundColor:BLACK_ROW_BG}}>
              {climbers
                .filter((c:any) => 
                  c.name.toLowerCase().includes(comparisonSearchQuery.toLowerCase()) &&
                  !selectedClimbersForComparison.includes(c.id)
                )
                .slice(0, 10) // Show max 10 results
                .map((c:any) => {
                  const canSelect = selectedClimbersForComparison.length < 5;
                  return (
                    <div
                      key={c.id}
                      onClick={() => {
                        if (canSelect) {
                          setSelectedClimbersForComparison(prev => [...prev, c.id]);
                          setComparisonSearchQuery(''); // Clear search after selection
                        }
                      }}
                      style={{
                        padding:'10px 12px',
                        cursor: canSelect ? 'pointer' : 'not-allowed',
                        opacity: canSelect ? 1 : 0.5,
                        borderBottom:BLACK_PANEL_BORDER,
                        transition:'background-color 0.2s',
                        backgroundColor: BLACK_ROW_BG
                      }}
                      onMouseEnter={(e) => canSelect && (e.currentTarget.style.backgroundColor = BLACK_HOVER_BG)}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = BLACK_ROW_BG)}
                    >
                      <div style={{fontSize:14,fontWeight:'500'}}>{c.name}</div>
                    </div>
                  );
                })}
              {comparisonSearchQuery && climbers.filter((c:any) => 
                  c.name.toLowerCase().includes(comparisonSearchQuery.toLowerCase()) &&
                  !selectedClimbersForComparison.includes(c.id)
                ).length === 0 && (
                <div style={{padding:20,textAlign:'center',color:'#64748b',fontSize:13}}>
                  No climbers found
                </div>
              )}
            </div>
            {selectedClimbersForComparison.length < 2 && (
              <p style={{fontSize:12,color:'#94a3b8',marginTop:8,marginBottom:0}}>
                Select at least 2 climbers to view comparison charts
              </p>
            )}
          </div>
        </div>

        {selectedClimbersForComparison.length >= 2 ? (
          <>
            {/* Total Score Comparison */}
            <div style={{marginTop:24}}>
              <h3>Total Score Over Time (Comparison)</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={(() => {
                  // Get ALL sessions for selected climbers to build cumulative scores
                  const relevantSessions = sessions.filter((s: any) => 
                    selectedClimbersForComparison.includes(s.climberId)
                  );
                  
                  if (relevantSessions.length === 0) return [];
                  
                  // Get all dates between start and end (last 30 days)
                  const getAllDatesBetween = (start: Date, end: Date): string[] => {
                    const dates: string[] = [];
                    const current = new Date(start);
                    while (current <= end) {
                      dates.push(current.toISOString().split('T')[0]);
                      current.setDate(current.getDate() + 1);
                    }
                    return dates;
                  };
                  
                  const oneMonthAgo = new Date();
                  oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);
                  const endDate = new Date();
                  const allDates = getAllDatesBetween(oneMonthAgo, endDate);
                  
                  // Build cumulative score data for each climber using ALL sessions
                  const climberScores = new Map<number, Map<string, number>>();
                  
                  selectedClimbersForComparison.forEach((climberId: number) => {
                    const climberSessions = relevantSessions
                      .filter((s: any) => s.climberId === climberId)
                      .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
                    
                    const scoreByDate = new Map<string, number>();
                    
                    climberSessions.forEach((session: any) => {
                      scoreByDate.set(session.date.split('T')[0], session.score);
                    });
                    
                    climberScores.set(climberId, scoreByDate);
                  });
                  
                  // Create data points for each date in the last 30 days
                  return allDates.map(date => {
                    const point: any = { date };
                    
                    selectedClimbersForComparison.forEach((climberId: number) => {
                      const climber = climbers.find((c: any) => c.id === climberId);
                      const scoreMap = climberScores.get(climberId);
                      
                      if (climber && scoreMap) {
                        // Find the most recent score up to this date
                        let score = 0;
                        for (const [sessionDate, sessionScore] of Array.from(scoreMap.entries())) {
                          if (sessionDate <= date) {
                            score = sessionScore;
                          }
                        }
                        point[climber.name] = score;
                      }
                    });
                    
                    return point;
                  });
                })()}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                  <XAxis 
                    dataKey="date" 
                    stroke="#94a3b8"
                    tickFormatter={(date) => {
                      const d = new Date(date);
                      return `${d.getMonth() + 1}/${d.getDate()}`;
                    }}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    label={{ value: 'Score', angle: -90, position: 'insideLeft', style: { fill: '#94a3b8', fontSize: 12 } }}
                  />
                  <Tooltip
                    contentStyle={{backgroundColor:'#1e293b',border:'1px solid #475569'}}
                    formatter={(value: any) => typeof value === 'number' ? `${value.toFixed(2)} (${getGradeForScore(value)})` : value}
                    labelFormatter={(label) => {
                      const d = new Date(label);
                      return d.toLocaleDateString();
                    }}
                  />
                  {renderGradeReferenceLines()}
                  <Legend />
                  {selectedClimbersForComparison.map((climberId: number, idx: number) => {
                    const climber = climbers.find((c: any) => c.id === climberId);
                    const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];
                    return climber ? (
                      <Line 
                        key={climberId}
                        type="monotone"
                        dataKey={climber.name}
                        stroke={colors[idx % colors.length]}
                        strokeWidth={2}
                        dot={false}
                      />
                    ) : null;
                  })}
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Color Totals */}
            <div style={{marginTop:24}}>
              <h3>Sends by Color (Comparison)</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={climbers
                  .filter((c:any) => selectedClimbersForComparison.includes(c.id))
                  .map((c:any)=>{
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
                  {ORDER.map((color:any)=> (
                    <Bar key={color} dataKey={color} fill={COLOR_SWATCHES[color as keyof Counts]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Wall Section Breakdown */}
            <div style={{marginTop:24}}>
              <h3>Sends by Wall Section (Comparison)</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={climbers
                  .filter((c:any) => selectedClimbersForComparison.includes(c.id))
                  .map((c:any)=>{
                    const latestSession = sessions
                      .filter((s:any)=>s.climberId===c.id)
                      .sort((a:any,b:any)=> new Date(b.date).getTime() - new Date(a.date).getTime())[0];
                      
                    const result:any = {climber: c.name};
                    
                    if(latestSession?.wallCounts){
                      Object.keys(wallTotals).forEach(section => {
                        result[section] = 0;
                        ORDER.forEach((color:any)=>{
                          result[section] += latestSession.wallCounts[section]?.[color] || 0;
                        });
                      });
                    } else {
                      // Initialize with 0 for all sections
                      Object.keys(wallTotals).forEach(section => {
                        result[section] = 0;
                      });
                    }
                    
                    return result;
                  })}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                  <XAxis dataKey="climber" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip 
                    contentStyle={{backgroundColor:'#1e293b',border:'1px solid #475569'}}
                    formatter={(value: any) => typeof value === 'number' ? value.toFixed(2) : value}
                  />
                  <Legend />
                  {Object.keys(wallTotals).map((section, idx) => {
                    // Generate colors dynamically
                    const colors = ['#ec4899', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'];
                    const displayName = formatWallSectionName(section);
                    return (
                      <Bar 
                        key={section} 
                        dataKey={section} 
                        name={displayName} 
                        fill={colors[idx % colors.length]} 
                      />
                    );
                  })}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        ) : (
          <div style={{
            height:300,
            display:'flex',
            alignItems:'center',
            justifyContent:'center',
            backgroundColor:'#0f172a',
            borderRadius:8,
            border:'1px solid #334155',
            marginTop:24
          }}>
            <p style={{color:'#64748b',fontSize:14}}>Select at least 2 climbers to view comparison charts</p>
          </div>
        )}
      </section>

      <section style={{marginTop:24}}>
        <div>
          <button onClick={handleExportCSV}>Export CSV</button>
        </div>
      </section>
      
      {/* Settings Modal */}
      {showSettings && (
        <div 
          onClick={() => {
            setShowSettings(false);
            setSettingsSuccess(false);
            setSettingsError(null);
            setPasswordError(null);
            setPasswordSuccess(false);
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
          }}
          style={{
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
          overflowY:'auto',
          WebkitOverflowScrolling:'touch' as any
        }}>
          <div style={{width:500,maxWidth:'100%',maxHeight:'90vh',display:'flex',flexDirection:'column'}}>
            <GlowBorder glowColor="rgba(16, 185, 129, 0.5)" borderRadius={12} backgroundColor="#1e293b">
              <div 
                onClick={(e) => e.stopPropagation()}
                style={{
                padding:'16px',
                overflowY:'auto',
                WebkitOverflowScrolling:'touch' as any,
                scrollbarWidth:'none',
                msOverflowStyle:'none',
                maxHeight:'90vh'
              }}
                className="hide-scrollbar"
              >
              <h2 style={{marginTop:0,marginBottom:16,fontSize:20}}>Account Settings</h2>
              <form onSubmit={async (e) => {
                e.preventDefault();
                setSettingsError(null);
                setSettingsSuccess(false);
                
                try {
                  await api.updateUserSettings({
                    username: settingsUsername,
                    name: settingsName,
                    country: settingsCountry,
                    started_bouldering: settingsStarted,
                    bio: settingsBio,
                    instagram_handle: settingsInstagram
                  });
                  setSettingsSuccess(true);
                  
                  // Update user object if username changed
                  if (user && settingsUsername !== user.username) {
                    setUser({ ...user, username: settingsUsername });
                  }
                  
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
                  padding:12,
                  borderRadius:8,
                  border:'1px solid #475569',
                  marginBottom:12
                }}>
                  <label style={{display:'block',marginBottom:6,fontSize:13,fontWeight:'600'}}>Username</label>
                  <input
                    type="text"
                    value={settingsUsername}
                    onChange={e => setSettingsUsername(e.target.value)}
                    placeholder="Your username"
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

                <div style={{
                  backgroundColor:'#0f172a',
                  padding:12,
                  borderRadius:8,
                  border:'1px solid #475569',
                  marginBottom:12
                }}>
                  <label style={{display:'block',marginBottom:6,fontSize:13,fontWeight:'600'}}>Full Name</label>
                  <input
                    type="text"
                    value={settingsName}
                    onChange={e => setSettingsName(e.target.value)}
                    placeholder="Your full name"
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

                <div style={{
                  backgroundColor:'#0f172a',
                  padding:12,
                  borderRadius:8,
                  border:'1px solid #475569',
                  marginBottom:12
                }}>
                  <label style={{display:'block',marginBottom:6,fontSize:13,fontWeight:'600'}}>Country</label>
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
                  padding:12,
                  borderRadius:8,
                  border:'1px solid #475569',
                  marginBottom:12
                }}>
                  <label style={{display:'block',marginBottom:6,fontSize:13,fontWeight:'600'}}>When Did You Start Bouldering?</label>
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

                <div style={{
                  backgroundColor:'#0f172a',
                  padding:12,
                  borderRadius:8,
                  border:'1px solid #475569',
                  marginBottom:12
                }}>
                  <label style={{display:'block',marginBottom:6,fontSize:13,fontWeight:'600'}}>Instagram</label>
                  <input
                    type="text"
                    value={settingsInstagram}
                    onChange={e => setSettingsInstagram(e.target.value)}
                    placeholder="e.g., @myhandle or https://instagram.com/myhandle"
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
                  <div style={{fontSize:12,color:'#94a3b8',marginTop:8}}>
                    We'll show this on your public profile so others can follow you.
                  </div>
                </div>

                <div style={{
                  backgroundColor:'#0f172a',
                  padding:12,
                  borderRadius:8,
                  border:'1px solid #475569',
                  marginBottom:12
                }}>
                  <label style={{display:'block',marginBottom:6,fontSize:13,fontWeight:'600'}}>About Me</label>
                  <textarea
                    value={settingsBio}
                    onChange={e => setSettingsBio(e.target.value)}
                    placeholder="Tell us about yourself..."
                    rows={4}
                    style={{
                      width:'100%',
                      padding:12,
                      borderRadius:6,
                      border:'1px solid #475569',
                      backgroundColor:'#1e293b',
                      color:'white',
                      fontSize:14,
                      boxSizing:'border-box',
                      fontFamily:'inherit',
                      resize:'vertical'
                    }}
                  />
                </div>
                
                {/* Change Password Section */}
                <div style={{
                  backgroundColor:'#0f172a',
                  padding:12,
                  borderRadius:8,
                  border:'1px solid #475569',
                  marginTop:8
                }}>
                  <h3 style={{marginTop:0,marginBottom:12,fontSize:16,fontWeight:'600'}}>Change Password</h3>
                  <div style={{marginBottom:12}}>
                    <label style={{display:'block',marginBottom:6,fontSize:13,fontWeight:'600'}}>Current Password</label>
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
                  <div style={{marginBottom:12}}>
                    <label style={{display:'block',marginBottom:6,fontSize:13,fontWeight:'600'}}>New Password</label>
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
                  <div style={{marginBottom:12}}>
                    <label style={{display:'block',marginBottom:6,fontSize:13,fontWeight:'600'}}>Confirm New Password</label>
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
                    padding:10,
                    borderRadius:6,
                    marginTop:12,
                    fontSize:13
                  }}>
                    {passwordError}
                  </div>
                )}
                {passwordSuccess && (
                  <div style={{
                    backgroundColor:'#10b981',
                    color:'white',
                    padding:10,
                    borderRadius:6,
                    marginTop:12,
                    fontSize:13
                  }}>
                    Password changed successfully!
                  </div>
                )}
                
                {settingsError && (
                  <div style={{
                    backgroundColor:'#dc2626',
                    color:'white',
                    padding:10,
                    borderRadius:6,
                    marginBottom:12,
                    fontSize:13
                  }}>
                    {settingsError}
                  </div>
                )}
                {settingsSuccess && (
                  <div style={{
                    backgroundColor:'#10b981',
                    color:'white',
                    padding:10,
                    borderRadius:6,
                    marginBottom:12,
                    fontSize:13
                  }}>
                    Settings updated successfully!
                  </div>
                )}
              </form>
              
              {/* Link Google Account Section */}
              {(() => {
                const currentClimber = climbers.find(c => c.id === user?.climberId);
                const hasGoogleLinked = currentClimber?.google_id;
                
                // Only show if Google account is not already linked
                if (hasGoogleLinked) return null;
                
                return (
                  <div
                    ref={googleLinkSectionRef}
                    style={{
                      backgroundColor:'#0f172a',
                      padding:16,
                      borderRadius:8,
                      border:'1px solid #475569',
                      marginTop:16,
                      boxShadow: highlightGoogleLink ? '0 0 0 2px #3b82f6' : undefined,
                      transition:'box-shadow 0.3s ease'
                    }}
                  >
                    <h3 style={{marginTop:0,marginBottom:12,fontSize:18,fontWeight:'600'}}>Link Google Account</h3>
                    {isGoogleConfigured ? (
                      <>
                        <p style={{fontSize:14,color:'#94a3b8',marginBottom:16}}>
                          Link your Google account for easy sign-in
                        </p>
                        <div style={{
                          display:'flex',
                          justifyContent:'center'
                        }}>
                          <div style={{ borderRadius: '24px', overflow: 'hidden' }}>
                            <GoogleLogin
                              onSuccess={async (credentialResponse: CredentialResponse) => {
                                try {
                                  if (!credentialResponse.credential) {
                                    throw new Error('No credential received from Google');
                                  }
                                  
                                  // Use the link endpoint instead of regular Google login
                                  await api.linkGoogleAccount(credentialResponse.credential);
                                  setSettingsSuccess(true);
                                  
                                  // Reload user data
                                  const loadedClimbers = await api.getClimbers();
                                  setClimbers(loadedClimbers);
                                  
                                  setTimeout(() => {
                                    setShowSettings(false);
                                    setSettingsSuccess(false);
                                  }, 2000);
                                } catch (err: any) {
                                  setSettingsError(err.message || 'Failed to link Google account');
                                }
                              }}
                              onError={() => {
                                setSettingsError('Google linking failed. Please try again.');
                              }}
                              theme="outline"
                              size="large"
                              shape="pill"
                              text="continue_with"
                            />
                          </div>
                        </div>
                      </>
                    ) : (
                      <div style={{
                        padding:16,
                        backgroundColor:'#1e293b',
                        borderRadius:6,
                        border:'1px solid #475569'
                      }}>
                        <p style={{fontSize:14,color:'#94a3b8',marginBottom:8}}>
                          ℹ️ Google Sign-In is not yet configured by the administrator.
                        </p>
                        <p style={{fontSize:13,color:'#64748b',marginBottom:0}}>
                          Contact your admin to enable Google authentication. See <code style={{backgroundColor:'#0f172a',padding:'2px 6px',borderRadius:4,fontSize:12}}>GOOGLE_OAUTH_SETUP.md</code> for setup instructions.
                        </p>
                      </div>
                    )}
                  </div>
                );
              })()}
              
              {/* Delete Account Section */}
              <div style={{
                backgroundColor:'#7f1d1d',
                padding:16,
                borderRadius:8,
                border:'1px solid #991b1b',
                marginTop:16
              }}>
                <h3 style={{marginTop:0,marginBottom:12,fontSize:18,fontWeight:'600',color:'#fca5a5'}}>Danger Zone</h3>
                <p style={{fontSize:14,color:'#fecaca',marginBottom:12}}>
                  ⚠️ Once you delete your account, there is no going back. This will permanently delete all your data including sessions and climbs.
                </p>
                <button
                  onClick={async () => {
                    const confirmFirst = confirm('Are you sure you want to delete your account? This action cannot be undone!');
                    if (!confirmFirst) return;
                    
                    const confirmSecond = confirm('This is your final warning. Type your username to confirm deletion.\n\nYour username: ' + user?.username);
                    if (!confirmSecond) return;
                    
                    const typedUsername = prompt('Type your username to confirm deletion:');
                    if (typedUsername !== user?.username) {
                      alert('Username does not match. Account deletion cancelled.');
                      return;
                    }
                    
                    try {
                      await api.deleteAccount();
                      alert('Your account has been permanently deleted.');
                      handleLogout();
                    } catch (err: any) {
                      setSettingsError(err.message || 'Failed to delete account');
                    }
                  }}
                  style={{
                    padding:'10px 20px',
                    backgroundColor:'#dc2626',
                    color:'white',
                    border:'none',
                    borderRadius:6,
                    fontSize:14,
                    fontWeight:'600',
                    cursor:'pointer'
                  }}
                >
                  Delete Account Permanently
                </button>
              </div>
              
              <div style={{display:'flex',gap:12,marginTop:16}}>
                <button
                  onClick={async () => {
                    setSettingsError(null);
                    setSettingsSuccess(false);
                    
                    try {
                      await api.updateUserSettings({
                        country: settingsCountry,
                        started_bouldering: settingsStarted,
                        bio: settingsBio,
                        instagram_handle: settingsInstagram
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
                    setSettingsName('');
                    setSettingsCountry('');
                    setSettingsStarted('');
                    setSettingsBio('');
                    setSettingsInstagram('');
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
        </div>
      )}

      {/* Google Link Reminder Popup */}
      {showGoogleLinkReminder && (
        <div
          onClick={() => setShowGoogleLinkReminder(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.7)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1001,
            padding: 20
          }}
        >
          <div style={{ width: 450, maxWidth: '100%' }}>
            <GlowBorder glowColor="rgba(59, 130, 246, 0.5)" borderRadius={12} backgroundColor="#1e293b">
              <div
                onClick={(e) => e.stopPropagation()}
                style={{
                  padding: 24
                }}
              >
                <h2 style={{ marginTop: 0, marginBottom: 16, fontSize: 20, color: '#60a5fa' }}>
                  🔐 Secure Your Account
                </h2>
                <p style={{ fontSize: 14, color: '#cbd5e1', marginBottom: 16, lineHeight: 1.6 }}>
                  Link your Google account for easier sign-in and account recovery. You'll be able to log in with just one click!
                </p>
                <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
                  <button
                    onClick={() => {
                      setShowGoogleLinkReminder(false);
                      setPendingGoogleLinkFocus(true);
                      setShowSettings(true);
                    }}
                    style={{
                      flex: 1,
                      padding: '12px 20px',
                      backgroundColor: '#3b82f6',
                      color: 'white',
                      border: 'none',
                      borderRadius: 6,
                      fontSize: 14,
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    Link Google Account
                  </button>
                  <button
                    onClick={() => setShowGoogleLinkReminder(false)}
                    style={{
                      flex: 1,
                      padding: '12px 20px',
                      backgroundColor: '#475569',
                      color: 'white',
                      border: 'none',
                      borderRadius: 6,
                      fontSize: 14,
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    Maybe Later
                  </button>
                </div>
              </div>
            </GlowBorder>
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
        const latestScoreValue = typeof profileLeaderboardEntry?.total_score === 'number'
          ? profileLeaderboardEntry.total_score
          : (profileSessions[0]?.score || 0);
        const latestGrade = getGradeForScore(latestScoreValue || 0);

        const rawInstagram = profileClimber?.instagram_handle?.trim();
        const normalizedInstagram = rawInstagram?.replace(/^@/, '') || '';
        const instagramUrl = rawInstagram
          ? rawInstagram.startsWith('http')
            ? rawInstagram
            : `https://instagram.com/${normalizedInstagram}`
          : '';
        const instagramDisplay = rawInstagram
          ? rawInstagram.startsWith('http')
            ? rawInstagram.replace(/^https?:\/\//, '')
            : `@${normalizedInstagram}`
          : '';
        
        // Calculate CUMULATIVE total climbs by tracking increases between sessions
        // Each session stores current state, so we calculate deltas to get actual climbs completed
        const sortedSessions = [...profileSessions].reverse(); // Oldest to newest
        
        let totalClimbs = { green: 0, blue: 0, yellow: 0, orange: 0, red: 0, black: 0 };
        let previousCounts = { green: 0, blue: 0, yellow: 0, orange: 0, red: 0, black: 0 };
        
        sortedSessions.forEach(session => {
          const currentCounts = {
            green: session.green || 0,
            blue: session.blue || 0,
            yellow: session.yellow || 0,
            orange: session.orange || 0,
            red: session.red || 0,
            black: session.black || 0
          };
          
          // Add the increase (or 0 if it decreased due to replacement)
          Object.keys(currentCounts).forEach(color => {
            const key = color as keyof typeof currentCounts;
            const increase = Math.max(0, currentCounts[key] - previousCounts[key]);
            totalClimbs[key] += increase;
          });
          
          previousCounts = currentCounts;
        });
        
        // Calculate current climbs (from most recent session)
        const latestSession = profileSessions[0];
        const currentClimbs = latestSession && latestSession.wallCounts ? (() => {
          // Recalculate color totals from wallCounts, excluding expired sections
          const totals = { green: 0, blue: 0, yellow: 0, orange: 0, red: 0, black: 0 };
          Object.keys(latestSession.wallCounts).forEach(section => {
            // Skip expired sections
            if (!expiredSections.includes(section)) {
              const sectionCounts = latestSession.wallCounts[section];
              totals.green += sectionCounts.green || 0;
              totals.blue += sectionCounts.blue || 0;
              totals.yellow += sectionCounts.yellow || 0;
              totals.orange += sectionCounts.orange || 0;
              totals.red += sectionCounts.red || 0;
              totals.black += sectionCounts.black || 0;
            }
          });
          return totals;
        })() : { green: 0, blue: 0, yellow: 0, orange: 0, red: 0, black: 0 };
        
        // Calculate rank history and peak score
        const rankHistory: {date: string, rank: number}[] = [];
        const scoreHistory: {date: string, score: number}[] = [];
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
          let lastScore: number | null = null;
          
          // Iterate through every day from first session to today
          let currentDate = new Date(firstDate);
          
          while (currentDate <= endDate) {
            const dateStr = currentDate.toISOString().split('T')[0];
            
            // Get the most recent session score for each climber up to this date
            // Each session.score already contains the cumulative total at that time
            const scoresUpToDate = new Map<number, number>();
            
            climbers.forEach((c:any) => {
              // Find the most recent session for this climber on or before this date
              const climberSessions = sessions
                .filter((s:any) => s.climberId === c.id && s.date <= dateStr)
                .sort((a:any, b:any) => new Date(b.date).getTime() - new Date(a.date).getTime());
              
              if (climberSessions.length > 0) {
                // Use the score from the most recent session
                scoresUpToDate.set(c.id, climberSessions[0].score);
              } else {
                scoresUpToDate.set(c.id, 0);
              }
            });
            
            // Calculate rankings for this date
            const rankings = Array.from(scoresUpToDate.entries())
              .filter(([id, score]) => score > 0)
              .map(([id, score]) => ({id, score}))
              .sort((a, b) => b.score - a.score);
            
            const rankOnThisDate = rankings.findIndex(r => r.id === viewingProfile) + 1;
            const scoreOnThisDate = scoresUpToDate.get(viewingProfile) || 0;
            
            // Add to history if this user had sessions up to this date
            if (rankOnThisDate > 0 && scoreOnThisDate > 0) {
              lastRank = rankOnThisDate;
              lastScore = scoreOnThisDate;
              const formattedDate = currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              
              rankHistory.push({
                date: formattedDate,
                rank: rankOnThisDate
              });
              
              scoreHistory.push({
                date: formattedDate,
                score: scoreOnThisDate
              });
              
              if (rankOnThisDate < bestRank) {
                bestRank = rankOnThisDate;
              }
            } else if (lastRank !== null && lastScore !== null) {
              // Fill in with previous rank/score if no sessions up to this date but user has had sessions before
              const formattedDate = currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              
              rankHistory.push({
                date: formattedDate,
                rank: lastRank
              });
              
              scoreHistory.push({
                date: formattedDate,
                score: lastScore
              });
            }
            
            currentDate.setDate(currentDate.getDate() + 1);
          }
          
          peakRank = bestRank !== Infinity ? bestRank : null;
          
          // Peak score is the maximum score ever achieved
          if (scoreHistory.length > 0) {
            peakScore = Math.max(...scoreHistory.map(s => s.score));
          } else {
            peakScore = null;
          }
        }
        
        const peakScoreGrade = typeof peakScore === 'number' ? getGradeForScore(peakScore) : null;

        if (!profileClimber) return null;
        
        const currentRank = leaderboard.findIndex((e:any) => e.climber === profileClimber.name) + 1;
        
        return (
          <div 
            onClick={() => setViewingProfile(null)}
            style={{
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
            <div 
              onClick={(e) => e.stopPropagation()}
              className="hide-scrollbar"
              style={{
                backgroundColor:'#000',
                borderRadius:12,
                border:'2px solid #fff',
                maxWidth:1000,
                width:'100%',
                maxHeight:'90vh',
                overflowY:'auto',
                scrollbarWidth:'none',
                msOverflowStyle:'none',
                color:'#f5f5f5',
                position:'relative'
              }}
            >
              {/* Header Section */}
              <AuroraBackground showRadialGradient style={{borderTopLeftRadius:10,borderTopRightRadius:10}}>
                <div style={{
                  backgroundColor: '#000',
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
                    backgroundColor:'rgba(0,0,0,0.65)',
                    color:'#fff',
                    border:'1px solid #fff',
                    borderRadius:8,
                    fontSize:14,
                    fontWeight:'700',
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
                    
                    {/* Bio, Started Climbing, Instagram */}
                    {(profileClimber?.bio || profileClimber?.started_bouldering || profileClimber?.instagram_handle) && (
                      <div style={{marginTop:16, padding:16, backgroundColor:'#000', borderRadius:8, border:'1px solid #fff'}}>
                        {profileClimber?.started_bouldering && (
                          <div style={{marginBottom: profileClimber?.bio ? 12 : 0}}>
                            <div style={{fontSize:12, color:'rgba(255,255,255,0.7)', marginBottom:4, fontWeight:'600'}}>
                              Started Climbing
                            </div>
                            <div style={{fontSize:14, color:'white'}}>
                              {profileClimber.started_bouldering}
                            </div>
                          </div>
                        )}
                        {profileClimber?.bio && (
                          <div>
                            <div style={{fontSize:12, color:'rgba(255,255,255,0.7)', marginBottom:4, fontWeight:'600'}}>
                              About Me
                            </div>
                            <div style={{fontSize:14, color:'white', lineHeight:'1.5', whiteSpace:'pre-wrap'}}>
                              {profileClimber.bio}
                            </div>
                          </div>
                        )}
                        {profileClimber?.instagram_handle && instagramDisplay && (
                          <div style={{marginTop: profileClimber?.bio ? 12 : (profileClimber?.started_bouldering ? 12 : 0)}}>
                            <div style={{fontSize:12, color:'rgba(255,255,255,0.7)', marginBottom:4, fontWeight:'600'}}>
                              Instagram
                            </div>
                            <a
                              href={instagramUrl}
                              target="_blank"
                              rel="noreferrer"
                              style={{fontSize:14, color:'#a5b4fc', textDecoration:'none', fontWeight:600}}
                            >
                              {instagramDisplay}
                            </a>
                          </div>
                        )}
                      </div>
                    )}
                    
                    <div style={{display:'flex', gap:32, marginTop:16}}>
                      <div>
                        <div style={{fontSize:14, color:'rgba(255,255,255,0.7)', marginBottom:4}}>Ranking</div>
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
                      <div style={{fontSize:12, color:'rgba(255,255,255,0.7)', marginBottom:4}}>Score</div>
                      <div style={{fontSize:20, fontWeight:'700', color:'white', display:'flex', alignItems:'center', gap:8, flexWrap:'wrap'}}>
                        {latestScoreValue.toFixed(2)}
                        <GradeBadge grade={latestGrade} size="sm" />
                      </div>
                      <div style={{fontSize:12,color:'#94a3b8',marginTop:4}}>Current weekly grade</div>
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
                      <div style={{fontSize:20, fontWeight:'700', color:'white', display:'flex', alignItems:'center', gap:8, flexWrap:'wrap'}}>
                        {peakScore ? peakScore.toFixed(2) : 'N/A'}
                        {peakScore && peakScoreGrade ? <GradeBadge grade={peakScoreGrade} size="sm" /> : null}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Stats Section */}
              </AuroraBackground>
              
              <div style={{padding:32}}>
                {/* Current Climbs Section */}
                <div style={{
                  backgroundColor:'#000',
                  padding:24,
                  borderRadius:12,
                  border:'1px solid #fff',
                  marginBottom:24
                }}>
                  <h3 style={{marginTop:0, marginBottom:8, fontSize:18, fontWeight:'600', color:'#94a3b8'}}>CURRENT CLIMBS</h3>
                  <p style={{marginTop:0, marginBottom:20, fontSize:13, color:'#64748b'}}>From latest session - routes available this week</p>
                  <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(140px, 1fr))', gap:16}}>
                    <div style={{backgroundColor:'#000', padding:16, borderRadius:6, border:'1px solid #222'}}>
                      <div style={{fontSize:12, color:'#10b981', marginBottom:6, fontWeight:'600'}}>GREEN</div>
                      <div style={{fontSize:22, fontWeight:'700', color:'white'}}>
                        {currentClimbs.green}/{getTotalForColor('green') || '?'}
                      </div>
                      <div style={{fontSize:13, color:'#64748b', marginTop:4}}>
                        ({getTotalForColor('green') > 0 ? ((currentClimbs.green / getTotalForColor('green')) * 100).toFixed(1) : '0.0'}%)
                      </div>
                    </div>
                    <div style={{backgroundColor:'#000', padding:16, borderRadius:6, border:'1px solid #222'}}>
                      <div style={{fontSize:12, color:'#3b82f6', marginBottom:6, fontWeight:'600'}}>BLUE</div>
                      <div style={{fontSize:22, fontWeight:'700', color:'white'}}>
                        {currentClimbs.blue}/{getTotalForColor('blue') || '?'}
                      </div>
                      <div style={{fontSize:13, color:'#64748b', marginTop:4}}>
                        ({getTotalForColor('blue') > 0 ? ((currentClimbs.blue / getTotalForColor('blue')) * 100).toFixed(1) : '0.0'}%)
                      </div>
                    </div>
                    <div style={{backgroundColor:'#000', padding:16, borderRadius:6, border:'1px solid #222'}}>
                      <div style={{fontSize:12, color:'#eab308', marginBottom:6, fontWeight:'600'}}>YELLOW</div>
                      <div style={{fontSize:22, fontWeight:'700', color:'white'}}>
                        {currentClimbs.yellow}/{getTotalForColor('yellow') || '?'}
                      </div>
                      <div style={{fontSize:13, color:'#64748b', marginTop:4}}>
                        ({getTotalForColor('yellow') > 0 ? ((currentClimbs.yellow / getTotalForColor('yellow')) * 100).toFixed(1) : '0.0'}%)
                      </div>
                    </div>
                    <div style={{backgroundColor:'#000', padding:16, borderRadius:6, border:'1px solid #222'}}>
                      <div style={{fontSize:12, color:'#f97316', marginBottom:6, fontWeight:'600'}}>ORANGE</div>
                      <div style={{fontSize:22, fontWeight:'700', color:'white'}}>
                        {currentClimbs.orange}/{getTotalForColor('orange') || '?'}
                      </div>
                      <div style={{fontSize:13, color:'#64748b', marginTop:4}}>
                        ({getTotalForColor('orange') > 0 ? ((currentClimbs.orange / getTotalForColor('orange')) * 100).toFixed(1) : '0.0'}%)
                      </div>
                    </div>
                    <div style={{backgroundColor:'#000', padding:16, borderRadius:6, border:'1px solid #222'}}>
                      <div style={{fontSize:12, color:'#ef4444', marginBottom:6, fontWeight:'600'}}>RED</div>
                      <div style={{fontSize:22, fontWeight:'700', color:'white'}}>
                        {currentClimbs.red}/{getTotalForColor('red') || '?'}
                      </div>
                      <div style={{fontSize:13, color:'#64748b', marginTop:4}}>
                        ({getTotalForColor('red') > 0 ? ((currentClimbs.red / getTotalForColor('red')) * 100).toFixed(1) : '0.0'}%)
                      </div>
                    </div>
                    <div style={{backgroundColor:'#000', padding:16, borderRadius:6, border:'1px solid #222'}}>
                      <div style={{fontSize:12, color:'#d1d5db', marginBottom:6, fontWeight:'600'}}>BLACK</div>
                      <div style={{fontSize:22, fontWeight:'700', color:'white'}}>
                        {currentClimbs.black}/{getTotalForColor('black') || '?'}
                      </div>
                      <div style={{fontSize:13, color:'#64748b', marginTop:4}}>
                        ({getTotalForColor('black') > 0 ? ((currentClimbs.black / getTotalForColor('black')) * 100).toFixed(1) : '0.0'}%)
                      </div>
                    </div>
                  </div>
                </div>

                {/* Total Climbs by Color */}
                <div style={{
                  backgroundColor:'#000',
                  padding:24,
                  borderRadius:12,
                  border:'1px solid #fff',
                  marginBottom:24
                }}>
                  <h3 style={{marginTop:0, marginBottom:8, fontSize:18, fontWeight:'600', color:'#94a3b8'}}>TOTAL CLIMBS</h3>
                  <p style={{marginTop:0, marginBottom:20, fontSize:13, color:'#64748b'}}>All-time climbs including replaced routes</p>
                  <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(140px, 1fr))', gap:16}}>
                    <div style={{backgroundColor:'#000', padding:16, borderRadius:6, border:'1px solid #222'}}>
                      <div style={{fontSize:12, color:'#10b981', marginBottom:6, fontWeight:'600'}}>GREEN</div>
                      <div style={{fontSize:28, fontWeight:'700', color:'white'}}>{totalClimbs.green}</div>
                    </div>
                    <div style={{backgroundColor:'#000', padding:16, borderRadius:6, border:'1px solid #222'}}>
                      <div style={{fontSize:12, color:'#3b82f6', marginBottom:6, fontWeight:'600'}}>BLUE</div>
                      <div style={{fontSize:28, fontWeight:'700', color:'white'}}>{totalClimbs.blue}</div>
                    </div>
                    <div style={{backgroundColor:'#000', padding:16, borderRadius:6, border:'1px solid #222'}}>
                      <div style={{fontSize:12, color:'#eab308', marginBottom:6, fontWeight:'600'}}>YELLOW</div>
                      <div style={{fontSize:28, fontWeight:'700', color:'white'}}>{totalClimbs.yellow}</div>
                    </div>
                    <div style={{backgroundColor:'#000', padding:16, borderRadius:6, border:'1px solid #222'}}>
                      <div style={{fontSize:12, color:'#f97316', marginBottom:6, fontWeight:'600'}}>ORANGE</div>
                      <div style={{fontSize:28, fontWeight:'700', color:'white'}}>{totalClimbs.orange}</div>
                    </div>
                    <div style={{backgroundColor:'#000', padding:16, borderRadius:6, border:'1px solid #222'}}>
                      <div style={{fontSize:12, color:'#ef4444', marginBottom:6, fontWeight:'600'}}>RED</div>
                      <div style={{fontSize:28, fontWeight:'700', color:'white'}}>{totalClimbs.red}</div>
                    </div>
                    <div style={{backgroundColor:'#000', padding:16, borderRadius:6, border:'1px solid #222'}}>
                      <div style={{fontSize:12, color:'#d1d5db', marginBottom:6, fontWeight:'600'}}>BLACK</div>
                      <div style={{fontSize:28, fontWeight:'700', color:'white'}}>{totalClimbs.black}</div>
                    </div>
                  </div>
                </div>

                {/* Rank History Graph */}
                {rankHistory.length > 0 && (
                <div style={{
                  backgroundColor:'#000',
                  padding:24,
                  borderRadius:12,
                  border:'1px solid #fff',
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
                            backgroundColor:'#000',
                            border:'1px solid #fff',
                            borderRadius:6,
                            color:'#f5f5f5'
                          }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="rank" 
                          stroke="#3b82f6" 
                          strokeWidth={3}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Score History Graph */}
                {scoreHistory.length > 0 && (
                <div style={{
                  backgroundColor:'#000',
                  padding:24,
                  borderRadius:12,
                  border:'1px solid #fff',
                  marginBottom:24
                }}>
                    <h3 style={{marginTop:0, marginBottom:20, fontSize:18, fontWeight:'600', color:'#94a3b8'}}>SCORE OVER TIME</h3>
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={scoreHistory}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                        <XAxis 
                          dataKey="date" 
                          stroke="#94a3b8"
                          style={{fontSize:12}}
                        />
                        <YAxis
                          stroke="#94a3b8"
                          style={{fontSize:12}}
                          label={{ value: 'Score', angle: -90, position: 'insideLeft', style: { fill: '#94a3b8', fontSize: 12 } }}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor:'#000',
                            border: '1px solid #fff',
                            borderRadius:6,
                            color:'#f5f5f5'
                          }}
                          formatter={(value: any) => typeof value === 'number' ? `${value.toFixed(2)} (${getGradeForScore(value)})` : value}
                        />
                        {renderGradeReferenceLines()}
                        <Line
                          type="monotone" 
                          dataKey="score" 
                          stroke="#10b981" 
                          strokeWidth={3}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Session History */}
                <div>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:8,flexWrap:'wrap'}}>
                    <h3 style={{marginTop:0, marginBottom:16, fontSize:18, fontWeight:'600', color:'#94a3b8'}}>RECENT SESSIONS</h3>
                    {profileSessions.length > 5 && (
                      <button
                        onClick={() => setViewingProfileSessionsExpanded(prev => !prev)}
                        style={{padding:'6px 12px',backgroundColor:'#1e293b',color:'#94a3b8',border:'1px solid #475569',borderRadius:6,fontSize:12,cursor:'pointer'}}
                      >
                        {profileSessionsExpanded ? 'Show 5' : 'See All'}
                      </button>
                    )}
                  </div>
                  {profileSessions.length > 0 ? (
                    <div style={{display:'flex',flexDirection:'column',gap:12}}>
                      {(profileSessionsExpanded ? profileSessions : profileSessions.slice(0, 5)).map((session:any) => (
                        <div 
                          key={session.id}
                          style={{
                            backgroundColor:'#000',
                            padding:16,
                            borderRadius:12,
                            border:'1px solid #fff'
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
                              <div style={{fontSize:14,color:'#94a3b8',marginTop:4,display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
                                <span>Score: {session.score.toFixed(2)}</span>
                                <GradeBadge grade={getGradeForScore(session.score || 0)} size="sm" />
                              </div>
                            </div>
                          </div>
                          <div style={{display:'flex',gap:16,flexWrap:'wrap',marginTop:12,fontSize:14}}>
                            {[
                              { key: 'green', count: session.green, color: COLOR_SWATCHES.green },
                              { key: 'blue', count: session.blue, color: COLOR_SWATCHES.blue },
                              { key: 'yellow', count: session.yellow, color: COLOR_SWATCHES.yellow },
                              { key: 'orange', count: session.orange, color: COLOR_SWATCHES.orange },
                              { key: 'red', count: session.red, color: COLOR_SWATCHES.red },
                              { key: 'black', count: session.black, color: COLOR_SWATCHES.black }
                            ]
                              .filter(({ count }) => count > 0)
                              .map(({ key, count, color }) => (
                                <SessionColorIndicator key={key} color={color} count={count} />
                              ))}
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
            maxHeight:'70vh',
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
              {(['accounts', 'sessions', 'routes', 'audits'] as const).map(tab => (
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
                          border:'1px solid #475569'
                        }}
                      >
                        {editingClimber === climber.id ? (
                          // Edit mode
                          <div>
                            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:16}}>
                              <div>
                                <label style={{display:'block',fontSize:14,fontWeight:'600',marginBottom:8,color:'#94a3b8'}}>
                                  Name
                                </label>
                                <input
                                  value={editClimberName}
                                  onChange={(e) => setEditClimberName(e.target.value)}
                                  style={{
                                    width:'100%',
                                    padding:'8px 12px',
                                    backgroundColor:'#0f172a',
                                    border:'1px solid #475569',
                                    borderRadius:6,
                                    color:'white',
                                    fontSize:14
                                  }}
                                />
                              </div>
                              <div>
                                <label style={{display:'block',fontSize:14,fontWeight:'600',marginBottom:8,color:'#94a3b8'}}>
                                  Username
                                </label>
                                <input
                                  value={editClimberUsername}
                                  onChange={(e) => setEditClimberUsername(e.target.value)}
                                  style={{
                                    width:'100%',
                                    padding:'8px 12px',
                                    backgroundColor:'#0f172a',
                                    border:'1px solid #475569',
                                    borderRadius:6,
                                    color:'white',
                                    fontSize:14
                                  }}
                                />
                              </div>
                              <div>
                                <label style={{display:'block',fontSize:14,fontWeight:'600',marginBottom:8,color:'#94a3b8'}}>
                                  Country
                                </label>
                                <input
                                  value={editClimberCountry}
                                  onChange={(e) => setEditClimberCountry(e.target.value)}
                                  placeholder="e.g., US, GB, DE"
                                  style={{
                                    width:'100%',
                                    padding:'8px 12px',
                                    backgroundColor:'#0f172a',
                                    border:'1px solid #475569',
                                    borderRadius:6,
                                    color:'white',
                                    fontSize:14
                                  }}
                                />
                              </div>
                              <div>
                                <label style={{display:'block',fontSize:14,fontWeight:'600',marginBottom:8,color:'#94a3b8'}}>
                                  Started Bouldering
                                </label>
                                <input
                                  value={editClimberStarted}
                                  onChange={(e) => setEditClimberStarted(e.target.value)}
                                  placeholder="e.g., 2020"
                                  style={{
                                    width:'100%',
                                    padding:'8px 12px',
                                    backgroundColor:'#0f172a',
                                    border:'1px solid #475569',
                                    borderRadius:6,
                                    color:'white',
                                    fontSize:14
                                  }}
                                />
                              </div>
                              <div>
                                <label style={{display:'block',fontSize:14,fontWeight:'600',marginBottom:8,color:'#94a3b8'}}>
                                  Instagram
                                </label>
                                <input
                                  value={editClimberInstagram}
                                  onChange={(e) => setEditClimberInstagram(e.target.value)}
                                  placeholder="@handle or URL"
                                  style={{
                                    width:'100%',
                                    padding:'8px 12px',
                                    backgroundColor:'#0f172a',
                                    border:'1px solid #475569',
                                    borderRadius:6,
                                    color:'white',
                                    fontSize:14
                                  }}
                                />
                              </div>
                              <div>
                                <label style={{display:'block',fontSize:14,fontWeight:'600',marginBottom:8,color:'#94a3b8'}}>
                                  Role
                                </label>
                                <select
                                  value={editClimberRole}
                                  onChange={(e) => setEditClimberRole(e.target.value as 'user' | 'admin')}
                                  style={{
                                    width:'100%',
                                    padding:'8px 12px',
                                    backgroundColor:'#0f172a',
                                    border:'1px solid #475569',
                                    borderRadius:6,
                                    color:'white',
                                    fontSize:14
                                  }}
                                >
                                  <option value="user">User</option>
                                  <option value="admin">Admin</option>
                                </select>
                              </div>
                            </div>
                            <div style={{marginBottom:16}}>
                              <label style={{display:'block',fontSize:14,fontWeight:'600',marginBottom:8,color:'#94a3b8'}}>
                                Bio
                              </label>
                              <textarea
                                value={editClimberBio}
                                onChange={(e) => setEditClimberBio(e.target.value)}
                                style={{
                                  width:'100%',
                                  padding:'8px 12px',
                                  backgroundColor:'#0f172a',
                                  border:'1px solid #475569',
                                  borderRadius:6,
                                  color:'white',
                                  fontSize:14,
                                  minHeight:60,
                                  resize:'vertical'
                                }}
                              />
                            </div>
                            <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
                              <button
                                onClick={cancelEditClimber}
                                style={{
                                  padding:'8px 16px',
                                  backgroundColor:'#475569',
                                  color:'white',
                                  border:'none',
                                  borderRadius:6,
                                  cursor:'pointer',
                                  fontSize:14,
                                  fontWeight:'600'
                                }}
                              >
                                Cancel
                              </button>
                              <button
                                onClick={saveEditedClimber}
                                style={{
                                  padding:'8px 16px',
                                  backgroundColor:'#10b981',
                                  color:'white',
                                  border:'none',
                                  borderRadius:6,
                                  cursor:'pointer',
                                  fontSize:14,
                                  fontWeight:'600'
                                }}
                              >
                                Save Changes
                              </button>
                            </div>
                          </div>
                        ) : (
                          // View mode
                          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
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
                              {climber.country && (
                                <div style={{fontSize:14,color:'#94a3b8',marginTop:4}}>
                                  Country: {climber.country}
                                </div>
                              )}
                            </div>
                            <div style={{display:'flex',gap:8}}>
                              <button
                                onClick={() => startEditClimber(climber)}
                                style={{
                                  padding:'8px 16px',
                                  backgroundColor:'#3b82f6',
                                  color:'white',
                                  border:'none',
                                  borderRadius:6,
                                  cursor:'pointer',
                                  fontSize:14,
                                  fontWeight:'600'
                                }}
                              >
                                Edit
                              </button>
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
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {adminTab === 'sessions' && (
                <div>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16,gap:12}}>
                    <h3 style={{margin:0,fontSize:18,fontWeight:'600'}}>Manage Sessions</h3>
                    <div style={{display:'flex',gap:8}}>
                      <button
                        onClick={async () => {
                          if (!confirm('Merge all duplicate sessions (same climber + same date)? This will combine their climb counts.')) return;
                          try {
                            setLoading(true);
                            const result = await api.mergeDuplicateSessions();
                            alert(result.message);
                            await loadData();
                          } catch (err: any) {
                            alert('Merge failed: ' + err.message);
                          } finally {
                            setLoading(false);
                          }
                        }}
                        style={{
                          padding:'8px 16px',
                          backgroundColor:'#10b981',
                          color:'white',
                          border:'none',
                          borderRadius:6,
                          cursor:'pointer',
                          fontSize:14,
                          fontWeight:'600'
                        }}
                      >
                        Merge Duplicates
                      </button>
                      <button
                        onClick={migrateOldWallNames}
                        style={{
                          padding:'8px 16px',
                          backgroundColor:'#8b5cf6',
                          color:'white',
                          border:'none',
                          borderRadius:6,
                          cursor:'pointer',
                          fontSize:14,
                          fontWeight:'600'
                        }}
                      >
                        Migrate Old Wall Names
                      </button>
                      <button
                        onClick={async () => {
                          if (!confirm('Recalculate every session score with the latest scoring system?')) return;
                          try {
                            setRecalculateScoresLoading(true);
                            const result = await api.recalculateScores();
                            alert(result.message || 'Scores recalculated');
                            await loadData();
                          } catch (err: any) {
                            alert('Recalculation failed: ' + err.message);
                          } finally {
                            setRecalculateScoresLoading(false);
                          }
                        }}
                        style={{
                          padding:'8px 16px',
                          backgroundColor: recalculateScoresLoading ? '#1d4ed8' : '#2563eb',
                          color:'white',
                          border:'none',
                          borderRadius:6,
                          cursor: recalculateScoresLoading ? 'not-allowed' : 'pointer',
                          fontSize:14,
                          fontWeight:'600',
                          opacity: recalculateScoresLoading ? 0.7 : 1
                        }}
                        disabled={recalculateScoresLoading}
                      >
                        {recalculateScoresLoading ? 'Recalculating…' : 'Recalculate Scores'}
                      </button>
                    </div>
                  </div>
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
                        {editingSession === session.id ? (
                          // Edit mode
                          <div>
                            <div style={{marginBottom:16}}>
                              <label style={{display:'block',fontSize:14,fontWeight:'600',marginBottom:8,color:'#94a3b8'}}>
                                Date
                              </label>
                              <input
                                type="date"
                                value={editSessionDate}
                                onChange={(e) => setEditSessionDate(e.target.value)}
                                style={{
                                  width:'100%',
                                  maxWidth:'100%',
                                  minWidth:0,
                                  boxSizing:'border-box',
                                  display:'block',
                                  padding:'8px 12px',
                                  backgroundColor:'#0f172a',
                                  border:'1px solid #475569',
                                  borderRadius:6,
                                  color:'white',
                                  fontSize:14
                                }}
                              />
                            </div>
                            
                            <div style={{marginBottom:16}}>
                              <label style={{display:'block',fontSize:14,fontWeight:'600',marginBottom:8,color:'#94a3b8'}}>
                                Notes
                              </label>
                              <textarea
                                value={editSessionNotes}
                                onChange={(e) => setEditSessionNotes(e.target.value)}
                                style={{
                                  width:'100%',
                                  padding:'8px 12px',
                                  backgroundColor:'#0f172a',
                                  border:'1px solid #475569',
                                  borderRadius:6,
                                  color:'white',
                                  fontSize:14,
                                  minHeight:60,
                                  resize:'vertical'
                                }}
                              />
                            </div>
                            
                            {/* Wall counts editing */}
                            <div style={{marginBottom:16}}>
                              <label style={{display:'block',fontSize:14,fontWeight:'600',marginBottom:12,color:'#94a3b8'}}>
                                Climbs by Wall Section
                              </label>
                              {Object.keys(wallTotals).map(section => (
                                <div key={section} style={{marginBottom:16}}>
                                  <div style={{fontSize:13,fontWeight:'600',marginBottom:8,color:'#cbd5e1'}}>
                                    {formatWallSectionName(section)}
                                  </div>
                                  <div style={{display:'grid',gridTemplateColumns:'repeat(6,1fr)',gap:8}}>
                                    {ORDER.map(color => (
                                      <div key={color}>
                                        <label style={{display:'block',fontSize:11,color:'#94a3b8',marginBottom:4}}>
                                          {color}
                                        </label>
                                        <input
                                          type="number"
                                          min={0}
                                          value={editSessionWallCounts[section]?.[color] || 0}
                                          onChange={(e) => updateEditWallCount(section, color as keyof Counts, e.target.value)}
                                          style={{
                                            width:'100%',
                                            padding:'6px',
                                            backgroundColor:'#0f172a',
                                            border:'1px solid #475569',
                                            borderRadius:4,
                                            color:'white',
                                            fontSize:13
                                          }}
                                        />
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                            
                            <div style={{display:'flex',gap:8}}>
                              <button
                                onClick={() => saveEditedSession(session.id, session.climberId)}
                                style={{
                                  flex:1,
                                  padding:'8px 16px',
                                  backgroundColor:'#10b981',
                                  color:'white',
                                  border:'none',
                                  borderRadius:6,
                                  cursor:'pointer',
                                  fontSize:14,
                                  fontWeight:'600'
                                }}
                              >
                                Save
                              </button>
                              <button
                                onClick={cancelEditSession}
                                style={{
                                  flex:1,
                                  padding:'8px 16px',
                                  backgroundColor:'#475569',
                                  color:'white',
                                  border:'none',
                                  borderRadius:6,
                                  cursor:'pointer',
                                  fontSize:14,
                                  fontWeight:'600'
                                }}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          // View mode
                          <div>
                            <div style={{display:'flex',justifyContent:'space-between',alignItems:'start',marginBottom:8}}>
                              <div>
                                <div style={{fontSize:16,fontWeight:'600',color:'white'}}>
                                  {climbers.find(c => c.id === session.climberId)?.name || 'Unknown'}
                                </div>
                                <div style={{fontSize:14,color:'#94a3b8',marginTop:4,display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
                                  <span>{new Date(session.date).toLocaleDateString()} • Score: {session.score.toFixed(2)}</span>
                                  <GradeBadge grade={getGradeForScore(session.score || 0)} size="sm" />
                                </div>
                              </div>
                              <div style={{display:'flex',gap:8}}>
                                <button
                                  onClick={() => startEditSession(session)}
                                  style={{
                                    padding:'6px 12px',
                                    backgroundColor:'#3b82f6',
                                    color:'white',
                                    border:'none',
                                    borderRadius:6,
                                    cursor:'pointer',
                                    fontSize:13,
                                    fontWeight:'600'
                                  }}
                                >
                                  Edit
                                </button>
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
                            </div>
                            {session.notes && (
                              <div style={{fontSize:14,color:'#cbd5e1',marginTop:8,fontStyle:'italic'}}>
                                {session.notes}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {adminTab === 'audits' && (
                <div>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
                    <h3 style={{margin:0,fontSize:18,fontWeight:'600'}}>Reset Audit History</h3>
                    <div style={{display:'flex',gap:8}}>
                      <button
                        onClick={async () => {
                          try {
                            setAuditsLoading(true);
                            const res = await api.getResetAudits();
                            setAdminAudits(res.audits || []);
                          } catch (err: any) {
                            alert('Failed to load audits: ' + (err.message || err));
                          } finally {
                            setAuditsLoading(false);
                          }
                        }}
                        style={{padding:'8px 16px',backgroundColor:'#3b82f6',color:'white',border:'none',borderRadius:6,cursor:'pointer',fontWeight:600}}
                      >
                        Refresh
                      </button>
                    </div>
                  </div>

                  {auditsLoading ? (
                    <div>Loading audits...</div>
                  ) : (
                    <div style={{display:'flex',flexDirection:'column',gap:12}}>
                      {adminAudits.length === 0 && <div style={{color:'#94a3b8'}}>No audits found.</div>}
                      {adminAudits.map(a => (
                        <div key={a.id} style={{backgroundColor:'#1e293b',padding:12,borderRadius:8,border:'1px solid #475569'}}>
                          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                            <div>
                              <div style={{fontWeight:700,color:'white'}}>{a.wall} — {a.id}</div>
                              <div style={{color:'#94a3b8',fontSize:13}}>Performed: {new Date(a.performedAt).toLocaleString()} by {a.performedBy || 'system'}</div>
                              <div style={{color:'#94a3b8',fontSize:13}}>Affected: {a.changes?.length || 0} sessions</div>
                              {a.undone && <div style={{color:'#f97316',fontSize:13}}>Undone at {a.undoneAt}</div>}
                            </div>
                            <div style={{display:'flex',gap:8}}>
                              {!a.undone && (
                                <button
                                  onClick={async () => {
                                    if (!confirm(`Undo reset ${a.id}? This will remove the ${a.changes?.length||0} proxy sessions.`)) return;
                                    try {
                                      setAuditsLoading(true);
                                      await api.undoResetWallSection(a.id);
                                      // Refresh audits
                                      const res = await api.getResetAudits();
                                      setAdminAudits(res.audits || []);
                                      await loadData();
                                      alert('Undo completed');
                                    } catch (err: any) {
                                      alert('Undo failed: ' + (err.message || err));
                                    } finally {
                                      setAuditsLoading(false);
                                    }
                                  }}
                                  style={{padding:'8px 12px',backgroundColor:'#ef4444',color:'white',border:'none',borderRadius:6,cursor:'pointer',fontWeight:600}}
                                >
                                  Undo
                                </button>
                              )}
                            </div>
                          </div>
                          <div style={{marginTop:8,color:'#cbd5e1',fontSize:13,whiteSpace:'pre-wrap'}}>
                            {JSON.stringify(a.changes?.slice(0,10) || [], null, 2)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {adminTab === 'routes' && (
                <div>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
                    <h3 style={{margin:0,fontSize:18,fontWeight:'600'}}>Route Management</h3>
                    <button
                      onClick={resetToDefaults}
                      style={{
                        padding:'8px 16px',
                        backgroundColor:'#f59e0b',
                        color:'#000',
                        border:'none',
                        borderRadius:6,
                        cursor:'pointer',
                        fontSize:14,
                        fontWeight:'600'
                      }}
                    >
                      Reset to Defaults
                    </button>
                  </div>

                  <p style={{color:'#94a3b8',fontSize:14,marginBottom:24}}>
                    Set the total number of routes available per wall section and color. These totals are used to track climb completion percentages.
                  </p>

                  {/* Add New Section */}
                  <div style={{
                    backgroundColor:'#1e293b',
                    padding:20,
                    borderRadius:8,
                    border:'2px dashed #475569',
                    marginBottom:24
                  }}>
                    <h4 style={{marginTop:0,marginBottom:12,fontSize:16,fontWeight:'600'}}>Add New Wall Section</h4>
                    <div style={{display:'flex',gap:12,alignItems:'center'}}>
                      <input
                        type="text"
                        placeholder="Section name (e.g., 'section1', 'westWall')"
                        value={newSectionName}
                        onChange={(e) => setNewSectionName(e.target.value)}
                        style={{
                          flex:1,
                          padding:'10px 12px',
                          backgroundColor:'#0f172a',
                          border:'1px solid #475569',
                          borderRadius:6,
                          color:'white',
                          fontSize:14
                        }}
                      />
                      <button
                        onClick={addWallSection}
                        style={{
                          padding:'10px 20px',
                          backgroundColor:'#10b981',
                          color:'white',
                          border:'none',
                          borderRadius:6,
                          cursor:'pointer',
                          fontSize:14,
                          fontWeight:'600'
                        }}
                      >
                        Add Section
                      </button>
                    </div>
                  </div>

                  {/* Wall Sections */}
                  <div style={{display:'flex',flexDirection:'column',gap:16}}>
                    {Object.keys(wallTotals).map(section => (
                      <div 
                        key={section}
                        style={{
                          backgroundColor:'#1e293b',
                          padding:20,
                          borderRadius:8,
                          border:'1px solid #475569'
                        }}
                      >
                        {/* Section Header with Rename and Delete */}
                        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
                          {renamingSection === section ? (
                            <div style={{display:'flex',gap:8,alignItems:'center',flex:1}}>
                              <input
                                type="text"
                                value={renameValue}
                                onChange={(e) => setRenameValue(e.target.value)}
                                placeholder="New section name"
                                autoFocus
                                style={{
                                  padding:'6px 10px',
                                  backgroundColor:'#0f172a',
                                  border:'1px solid #fbbf24',
                                  borderRadius:4,
                                  color:'white',
                                  fontSize:14,
                                  flex:1,
                                  maxWidth:250
                                }}
                              />
                              <button
                                onClick={() => renameWallSection(section, renameValue)}
                                style={{
                                  padding:'6px 12px',
                                  backgroundColor:'#10b981',
                                  color:'white',
                                  border:'none',
                                  borderRadius:4,
                                  cursor:'pointer',
                                  fontSize:12,
                                  fontWeight:'600'
                                }}
                              >
                                Save
                              </button>
                              <button
                                onClick={() => {
                                  setRenamingSection(null);
                                  setRenameValue('');
                                }}
                                style={{
                                  padding:'6px 12px',
                                  backgroundColor:'#475569',
                                  color:'white',
                                  border:'none',
                                  borderRadius:4,
                                  cursor:'pointer',
                                  fontSize:12,
                                  fontWeight:'600'
                                }}
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <h4 style={{margin:0,fontSize:16,fontWeight:'600',textTransform:'capitalize',color:'#fbbf24'}}>
                              {section}
                            </h4>
                          )}
                          <div style={{display:'flex',gap:8}}>
                            {renamingSection !== section && (
                              <>
                                <button
                                  onClick={() => copySectionData(section)}
                                  style={{
                                    padding:'6px 12px',
                                    backgroundColor:'#8b5cf6',
                                    color:'white',
                                    border:'none',
                                    borderRadius:6,
                                    cursor:'pointer',
                                    fontSize:12,
                                    fontWeight:'600'
                                  }}
                                  title="Copy section data (totals, expiry, images)"
                                >
                                  📋 Copy
                                </button>
                                <button
                                  onClick={() => pasteSectionData(section)}
                                  disabled={!copiedSectionData}
                                  style={{
                                    padding:'6px 12px',
                                    backgroundColor: copiedSectionData ? '#10b981' : '#475569',
                                    color:'white',
                                    border:'none',
                                    borderRadius:6,
                                    cursor: copiedSectionData ? 'pointer' : 'not-allowed',
                                    fontSize:12,
                                    fontWeight:'600',
                                    opacity: copiedSectionData ? 1 : 0.6
                                  }}
                                  title={copiedSectionData ? "Paste copied data here" : "Copy a section first"}
                                >
                                  📄 Paste
                                </button>
                                <button
                                  onClick={() => {
                                    setRenamingSection(section);
                                    setRenameValue(section);
                                  }}
                                  style={{
                                    padding:'6px 12px',
                                    backgroundColor:'#3b82f6',
                                    color:'white',
                                    border:'none',
                                    borderRadius:6,
                                    cursor:'pointer',
                                    fontSize:12,
                                    fontWeight:'600'
                                  }}
                                >
                                  Rename
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => resetWallSectionAdmin(section)}
                              disabled={resetLoading}
                              title="Set all climbs in this section to 0 for all sessions"
                              style={{
                                padding:'6px 12px',
                                backgroundColor:'#f97316',
                                color:'white',
                                border:'none',
                                borderRadius:6,
                                cursor:resetLoading ? 'not-allowed' : 'pointer',
                                fontSize:12,
                                fontWeight:'600',
                                marginRight:8
                              }}
                            >
                              {resetLoading ? 'Resetting...' : 'Reset'}
                            </button>

                            <button
                              onClick={() => deleteWallSection(section)}
                              style={{
                                padding:'6px 12px',
                                backgroundColor:'#dc2626',
                                color:'white',
                                border:'none',
                                borderRadius:6,
                                cursor:'pointer',
                                fontSize:12,
                                fontWeight:'600'
                              }}
                            >
                              Delete
                            </button>
                          </div>
                        </div>

                        

                        {/* Wall Section Image Upload */}
                        <div style={{
                          backgroundColor:'#0f172a',
                          padding:12,
                          borderRadius:6,
                          marginBottom:16
                        }}>
                          <label style={{fontSize:13,color:'#94a3b8',display:'block',marginBottom:8}}>
                            📸 Wall Section Reference Images
                          </label>
                          
                          {/* Display existing images */}
                          {wallSectionImages[section] && wallSectionImages[section].length > 0 && (
                            <div style={{
                              display:'grid',
                              gridTemplateColumns:'repeat(auto-fill, minmax(80px, 1fr))',
                              gap:8,
                              marginBottom:12
                            }}>
                              {wallSectionImages[section].map((imagePath, idx) => (
                                <div key={idx} style={{
                                  position:'relative',
                                  aspectRatio:'1',
                                  backgroundColor:'#1e293b',
                                  borderRadius:6,
                                  overflow:'hidden',
                                  border:'1px solid #475569'
                                }}>
                                  <picture>
                                    <source
                                      type="image/avif"
                                      srcSet={buildImageSources(imagePath).avif}
                                    />
                                    <source
                                      type="image/webp"
                                      srcSet={buildImageSources(imagePath).webp}
                                    />
                                    <img
                                      src={buildImageSources(imagePath).fallback}
                                      alt={`${section} reference ${idx + 1}`}
                                      referrerPolicy="no-referrer"
                                      loading="lazy"
                                      width={1200}
                                      height={1200}
                                      style={{
                                        width:'100%',
                                        height:'100%',
                                        objectFit:'cover'
                                      }}
                                      onError={adminReferenceImageErrorHandler}
                                    />
                                  </picture>
                                  <button
                                    onClick={async () => {
                                      if (confirm(`Delete image ${idx + 1}?`)) {
                                        try {
                                          const imagePath = wallSectionImages[section][idx];
                                          const resp = await fetch(`${API_URL}/api/settings/wall-section-image/delete`, {
                                            method: 'POST',
                                            headers: {
                                              'Content-Type': 'application/json',
                                              'Authorization': `Bearer ${api.getToken()}`
                                            },
                                            body: JSON.stringify({ section, imagePath })
                                          });
                                          const result = await resp.json();
                                          if (!resp.ok) throw new Error(result.error || 'Failed to delete image');
                                          // Use returned images array if provided
                                          const images = result.images || result.data?.images || [];
                                          const updated = { ...wallSectionImages, [section]: images };
                                          setWallSectionImages(updated);
                                        } catch (err: any) {
                                          alert('Failed to delete image: ' + (err.message || 'Unknown error'));
                                        }
                                      }
                                    }}
                                    style={{
                                      position:'absolute',
                                      top:4,
                                      right:4,
                                      backgroundColor:'rgba(220, 38, 38, 0.9)',
                                      color:'white',
                                      border:'none',
                                      borderRadius:'50%',
                                      width:20,
                                      height:20,
                                      fontSize:12,
                                      cursor:'pointer',
                                      display:'flex',
                                      alignItems:'center',
                                      justifyContent:'center',
                                      padding:0
                                    }}
                                  >
                                    ×
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                          
                          <input
                            type="file"
                            accept="image/*"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              
                              try {
                                const formData = new FormData();
                                formData.append('image', file);
                                formData.append('section', section);
                                
                                const response = await fetch(`${API_URL}/api/settings/upload-wall-image`, {
                                  method: 'POST',
                                  headers: {
                                    'Authorization': `Bearer ${api.getToken()}`
                                  },
                                  body: formData
                                });
                                
                                if (!response.ok) {
                                  const errorData = await response.json().catch(() => ({}));
                                  throw new Error(errorData.error || 'Upload failed');
                                }
                                
                                const result = await response.json();
                                // Handle both response formats: result.imagePath or result.data.imagePath
                                const imagePath = result.imagePath || result.data?.imagePath;
                                
                                if (!imagePath) {
                                  throw new Error('No image path returned from server');
                                }
                                
                                // Add to existing images array
                                const updated = {
                                  ...wallSectionImages,
                                  [section]: [...(wallSectionImages[section] || []), imagePath]
                                };
                                setWallSectionImages(updated);
                                
                                // Also save to database
                                await saveWallSectionImagesToAPI(updated);
                                
                                // Clear file input
                                e.target.value = '';
                              } catch (err: any) {
                                alert('Failed to upload image: ' + (err.message || 'Unknown error'));
                              }
                            }}
                            style={{
                              width:'100%',
                              padding:'8px 12px',
                              backgroundColor:'#1e293b',
                              border:'1px solid #475569',
                              borderRadius:4,
                              color:'white',
                              fontSize:13,
                              marginBottom:8,
                              cursor:'pointer'
                            }}
                          />
                          
                          {/* Dropbox/URL Link Option */}
                          <div style={{marginTop:8,marginBottom:8}}>
                            <label style={{display:'block',fontSize:12,color:'#94a3b8',marginBottom:4}}>
                              Or paste a Dropbox/Imgur link:
                            </label>
                            <div style={{display:'flex',gap:8}}>
                              <input
                                type="text"
                                placeholder="https://www.dropbox.com/... or https://i.imgur.com/..."
                                onKeyDown={async (e) => {
                                  if (e.key === 'Enter') {
                                    const input = e.currentTarget;
                                    const rawUrl = input.value.trim();
                                    if (!rawUrl) return;

                                    try {
                                      const url = normalizeWallSectionImageUrl(rawUrl);
                                      if (!url) return;

                                      // Add to existing images array
                                      const updated = {
                                        ...wallSectionImages,
                                        [section]: [...(wallSectionImages[section] || []), url]
                                      };
                                      setWallSectionImages(updated);
                                      
                                      // Save to database
                                      await saveWallSectionImagesToAPI(updated);
                                      
                                      // Clear input
                                      input.value = '';
                                    } catch (err: any) {
                                      alert('Failed to add image URL: ' + (err.message || 'Unknown error'));
                                    }
                                  }
                                }}
                                style={{
                                  flex:1,
                                  padding:'8px 12px',
                                  backgroundColor:'#1e293b',
                                  border:'1px solid #475569',
                                  borderRadius:4,
                                  color:'white',
                                  fontSize:13
                                }}
                              />
                            </div>
                          </div>
                          
                          <p style={{fontSize:11,color:'#64748b',marginTop:6,marginBottom:0}}>
                            💡 Upload multiple images (HEIF, HEIC, JPG, PNG). Max 10MB each. Or paste Dropbox/Imgur links. Press Enter to add link.
                          </p>
                        </div>

                        {/* Route Count Inputs */}
                        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(120px, 1fr))',gap:12}}>
                          {(['green', 'blue', 'yellow', 'orange', 'red', 'black'] as const).map(color => {
                            const colorMap = {
                              green: '#10b981',
                              blue: '#3b82f6',
                              yellow: '#eab308',
                              orange: '#f97316',
                              red: '#ef4444',
                              black: '#d1d5db'
                            };
                            return (
                              <div key={color} style={{backgroundColor:'#0f172a',padding:12,borderRadius:6}}>
                                <div style={{
                                  fontSize:11,
                                  color:colorMap[color],
                                  marginBottom:6,
                                  fontWeight:'600',
                                  textTransform:'uppercase'
                                }}>
                                  {color}
                                </div>
                                <input
                                  type="number"
                                  min="0"
                                  value={wallTotals[section]?.[color] || 0}
                                  onChange={(e) => updateRouteCount(section, color, parseInt(e.target.value) || 0)}
                                  style={{
                                    width:'100%',
                                    padding:'8px',
                                    backgroundColor:'#1e293b',
                                    border:'1px solid #475569',
                                    borderRadius:4,
                                    color:'white',
                                    fontSize:16,
                                    fontWeight:'600',
                                    textAlign:'center'
                                  }}
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showResetPasswordModal && (
        <div
          onClick={closeResetPasswordModal}
          style={{
            position:'fixed',
            top:0,
            left:0,
            right:0,
            bottom:0,
            backgroundColor:'rgba(0,0,0,0.8)',
            display:'flex',
            justifyContent:'center',
            alignItems:'center',
            zIndex:2001,
            padding:20
          }}
        >
          <div onClick={(e) => e.stopPropagation()} style={{width:'100%', maxWidth:520}}>
            <ResetPasswordModal
              token={resetToken}
              onClose={closeResetPasswordModal}
              onReset={() => setShowLoginScreen(true)}
            />
          </div>
        </div>
      )}

      {/* Login Modal */}
      {showLoginScreen && (
        <div
          onClick={() => setShowLoginScreen(false)}
          style={{
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
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{position:'relative',maxWidth:500,width:'100%'}}>
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

      {/* Reset result modal */}
      {resetResult && (
        <div
          onClick={() => setResetResult(null)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 20
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#0f172a',
              padding: 20,
              borderRadius: 8,
              maxWidth: 900,
              width: '100%',
              maxHeight: '80vh',
              overflow: 'auto',
              border: '1px solid #334155'
            }}
          >
            <h3 style={{marginTop:0}}>Reset Result</h3>
            <p style={{color:'#94a3b8'}}>{resetResult.message}</p>
            <div style={{marginTop:12}}>
              <strong>Affected sessions:</strong> {resetResult.changed.length}
            </div>
            <div style={{marginTop:12, fontSize:13}}>
              {resetResult.changed.length === 0 && <div style={{color:'#94a3b8'}}>No sessions were affected.</div>}
              {resetResult.changed.length > 0 && (
                <div>
                  <div style={{marginBottom:8}}>Showing up to the first 20 changes:</div>
                  <div style={{backgroundColor:'#071029',padding:12,borderRadius:6,border:'1px solid #223344'}}>
                    {resetResult.changed.slice(0,20).map((r, idx) => (
                      <div key={idx} style={{padding:'8px 0',borderBottom: idx < Math.min(resetResult.changed.length,20)-1 ? '1px solid #223344' : 'none'}}>
                        <div><strong>Session:</strong> {r.sessionId} — <strong>Climber:</strong> {r.climberId}</div>
                        <div style={{fontSize:13,color:'#9ca3af'}}>Old score: {r.oldScore} → New score: {r.newScore}</div>
                        <div style={{fontSize:12,color:'#94a3b8',marginTop:6}}>Removed counts: {JSON.stringify(r.removedCounts)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div style={{display:'flex',justifyContent:'flex-end',marginTop:16,alignItems:'center',gap:8}}>
              {resetResult.auditId && (
                <button
                  onClick={async () => {
                    if (!confirm('Undo this reset? This will restore sessions to their previous values.')) return;
                    try {
                      setResetLoading(true);
                      await api.undoResetWallSection(resetResult.auditId);
                      // Reload data
                      await loadData();
                      // Update modal to show undone state
                      setResetResult(prev => prev ? { ...prev, message: (prev.message || '') + ' (undone)' , changed: [] } : null);
                      alert('Reset undone successfully');
                    } catch (err: any) {
                      alert('Failed to undo reset: ' + (err.message || 'Unknown error'));
                    } finally {
                      setResetLoading(false);
                    }
                  }}
                  style={{padding:'8px 12px',backgroundColor:'#10b981',color:'white',border:'none',borderRadius:6}}
                >
                  Undo
                </button>
              )}
              <button onClick={() => setResetResult(null)} style={{padding:'8px 12px',backgroundColor:'#475569',color:'white',border:'none',borderRadius:6}}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
