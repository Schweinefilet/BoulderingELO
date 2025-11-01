import React, { useState, useEffect } from 'react'
import { scoreSession, marginalGain, ORDER, BASE, combineCounts, type Counts, type WallCounts } from './lib/scoring'
import * as store from './lib/storage'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

const emptyWall = (): Counts => ({green:0,blue:0,yellow:0,orange:0,red:0,black:0});

// Total available climbs per wall section per color
const WALL_TOTALS = {
  overhang: { yellow: 7, orange: 5, red: 0, black: 0, blue: 0, green: 0 },
  midWall: { yellow: 20, orange: 13, red: 0, black: 0, blue: 0, green: 0 },
  sideWall: { yellow: 11, orange: 8, red: 0, black: 0, blue: 0, green: 0 }
};

export default function App(){
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
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string|null>(null)

  const totalCounts = combineCounts(wallCounts);

  useEffect(()=>{ 
    loadData();
  }, [])
  
  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [loadedClimbers, loadedSessions, loadedLeaderboard] = await Promise.all([
        store.listClimbers(),
        store.getSessions(),
        store.leaderboard()
      ]);
      setClimbers(loadedClimbers);
      setSessions(loadedSessions);
      setLeaderboard(loadedLeaderboard);
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }
  
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

  async function addClimber(){ 
    if(!newName.trim()) return;
    setLoading(true);
    try {
      const c = await store.addClimber(newName.trim());
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
    setWallCounts({...wallCounts, [wall]: {...wallCounts[wall], [color]: nv}});
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
    
    // Append video URL to notes if provided
    if (videoUrl.trim()) {
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
      const score = scoreSession(totalCounts); 
      await store.addSession({climberId:selectedClimber,date,score,notes:sessionNotes}, totalCounts, wallCounts); 
      const [loadedSessions, loadedLeaderboard] = await Promise.all([
        store.getSessions(),
        store.leaderboard()
      ]);
      setSessions(loadedSessions);
      setLeaderboard(loadedLeaderboard); 
      setWallCounts({overhang:emptyWall(),midWall:emptyWall(),sideWall:emptyWall()}); 
      setSessionNotes('');
      setVideoUrl('');
    } catch (err: any) {
      setError(err.message || 'Failed to submit session');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{fontFamily:'Inter, Arial, sans-serif',padding:20,maxWidth:1000,margin:'0 auto'}}>
      <h1>BoulderingELO</h1>
      
      {error && (
        <div style={{backgroundColor:'#dc2626',color:'white',padding:12,borderRadius:6,marginBottom:16}}>
          {error}
        </div>
      )}
      
      {loading && (
        <div style={{color:'#3b82f6',marginBottom:16}}>Loading...</div>
      )}
      
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
      
      <section style={{display:'flex',gap:20,flexWrap:'wrap'}}>
        <div style={{flex:1,minWidth:300}}>
          <h2 style={{marginBottom:16}}>New Session</h2>
          
          <div style={{marginBottom:16}}>
            <label style={{display:'block',fontWeight:'500',marginBottom:8}}>Climber</label>
            <select 
              value={selectedClimber||''} 
              onChange={e=>setSelectedClimber(parseInt(e.target.value)||undefined)}
              style={{width:'100%',padding:'10px 12px',borderRadius:6,border:'1px solid #475569',backgroundColor:'#1e293b',color:'white',fontSize:14}}
            >
              <option value="">Select...</option>
              {climbers.map(c=>(<option key={c.id} value={c.id}>{c.name}</option>))}
            </select>
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

              <button 
                onClick={addClimb} 
                style={{width:'100%',padding:'12px',borderRadius:6,backgroundColor:'#10b981',color:'white',border:'none',cursor:'pointer',fontWeight:'600',fontSize:14,marginBottom:16}}
              >
                Add Climb
              </button>

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
                  {ORDER.map((color:keyof Counts)=> (
                    <div key={color}>
                      <label style={{display:'block',fontSize:12,fontWeight:'500',marginBottom:6,textTransform:'capitalize'}}>{color}</label>
                      <input 
                        type="number" 
                        min={0} 
                        value={wallCounts.overhang[color]} 
                        onChange={e=>updateWallCount('overhang',color,e.target.value)}
                        style={{width:'100%',padding:'8px',borderRadius:6,border:'1px solid #475569',backgroundColor:'#1e293b',color:'white',fontSize:14}}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div style={{marginBottom:20}}>
                <h4 style={{marginBottom:12,fontSize:16,fontWeight:'600',color:'#94a3b8'}}>Mid Wall</h4>
                <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12}}>
                  {ORDER.map((color:keyof Counts)=> (
                    <div key={color}>
                      <label style={{display:'block',fontSize:12,fontWeight:'500',marginBottom:6,textTransform:'capitalize'}}>{color}</label>
                      <input 
                        type="number" 
                        min={0} 
                        value={wallCounts.midWall[color]} 
                        onChange={e=>updateWallCount('midWall',color,e.target.value)}
                        style={{width:'100%',padding:'8px',borderRadius:6,border:'1px solid #475569',backgroundColor:'#1e293b',color:'white',fontSize:14}}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div style={{marginBottom:20}}>
                <h4 style={{marginBottom:12,fontSize:16,fontWeight:'600',color:'#94a3b8'}}>Side Wall</h4>
                <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12}}>
                  {ORDER.map((color:keyof Counts)=> (
                    <div key={color}>
                      <label style={{display:'block',fontSize:12,fontWeight:'500',marginBottom:6,textTransform:'capitalize'}}>{color}</label>
                      <input 
                        type="number" 
                        min={0} 
                        value={wallCounts.sideWall[color]} 
                        onChange={e=>updateWallCount('sideWall',color,e.target.value)}
                        style={{width:'100%',padding:'8px',borderRadius:6,border:'1px solid #475569',backgroundColor:'#1e293b',color:'white',fontSize:14}}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <button 
            onClick={submit}
            style={{width:'100%',padding:'14px',borderRadius:6,backgroundColor:'#3b82f6',color:'white',border:'none',cursor:'pointer',fontWeight:'600',fontSize:16,marginTop:16}}
          >
            Add Session
          </button>
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

          <div style={{backgroundColor:'#1e293b',padding:20,borderRadius:8,border:'1px solid #475569'}}>
            <h2 style={{marginTop:0,marginBottom:16,fontSize:20,fontWeight:'600'}}>Leaderboard</h2>
            <ol style={{margin:0,paddingLeft:24,display:'flex',flexDirection:'column',gap:12}}>
              {leaderboard.map((e:any,i:number)=> (
                <li key={i} style={{fontSize:14,lineHeight:'1.5'}}>
                  <span style={{fontWeight:'600',color:'#94a3b8'}}>{e.climber}:</span>
                  <span style={{marginLeft:8,color:'#3b82f6',fontWeight:'700',fontSize:16}}>{e.total_score.toFixed(2)}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

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
          <h2 style={{marginTop:0,marginBottom:20,fontSize:24,fontWeight:'600'}}>Video Evidence</h2>
          <div style={{display:'flex',flexDirection:'column',gap:16}}>
            {sessions
              .filter((s:any) => s.notes && (s.notes.includes('red on') || s.notes.includes('black on')))
              .sort((a:any, b:any) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .map((s:any) => {
                const climber = climbers.find(c => c.id === s.climberId);
                // Extract video URLs from notes
                const videoLines = s.notes.split('\n').filter((line:string) => 
                  (line.includes('red on') || line.includes('black on')) && line.includes('http')
                );
                
                return videoLines.map((line:string, idx:number) => {
                  const urlMatch = line.match(/(https?:\/\/[^\s]+)/);
                  const url = urlMatch ? urlMatch[1] : '';
                  const isBlack = line.includes('black on');
                  const wall = line.match(/on (\w+):/)?.[1] || 'unknown';
                  
                  return (
                    <div key={`${s.id}-${idx}`} style={{
                      padding:16,
                      backgroundColor:'#0f172a',
                      borderRadius:6,
                      border:`2px solid ${isBlack ? '#9333ea' : '#dc2626'}`,
                      display:'flex',
                      flexDirection:'column',
                      gap:12
                    }}>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                        <div>
                          <span style={{
                            fontSize:18,
                            fontWeight:'700',
                            color: isBlack ? '#c084fc' : '#f87171',
                            textTransform:'uppercase'
                          }}>
                            {isBlack ? 'Black' : 'Red'}
                          </span>
                          <span style={{marginLeft:12,color:'#94a3b8',fontSize:14}}>
                            {wall} · {s.date}
                          </span>
                        </div>
                        <span style={{fontWeight:'600',fontSize:16}}>{climber?.name}</span>
                      </div>
                      <a 
                        href={url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        style={{
                          color:'#3b82f6',
                          textDecoration:'none',
                          fontSize:14,
                          wordBreak:'break-all',
                          padding:8,
                          backgroundColor:'#1e293b',
                          borderRadius:4,
                          border:'1px solid #334155'
                        }}
                      >
                        {url}
                      </a>
                    </div>
                  );
                });
              })}
          </div>
          {sessions.filter((s:any) => s.notes && (s.notes.includes('red on') || s.notes.includes('black on'))).length === 0 && (
            <p style={{color:'#64748b',fontSize:14,textAlign:'center',margin:0}}>No video evidence submitted yet</p>
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
        <h2>Export / Import</h2>
        <div>
          <button onClick={()=>{ const csv = store.exportCSV(); const blob = new Blob([csv],{type:'text/csv'}); const url = URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='bouldering.csv'; a.click(); URL.revokeObjectURL(url); }}>Export CSV</button>
          <button onClick={()=>{ store.clearAll(); window.location.reload(); }}>Clear All</button>
        </div>
      </section>
    </div>
  )
}
