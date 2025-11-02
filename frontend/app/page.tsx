"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { getClimbers, createClimber, getSessions, createSession, getLeaderboard } from "@/lib/api";
import { Climber, Session, Counts, WallCounts, LeaderboardEntry } from "@/lib/types";
import { scoreSession, marginalGain, BASE, ORDER, COLOR_NAMES, combineCounts } from "@/lib/scoring";

const emptyWall = (): Counts => ({ green: 0, blue: 0, yellow: 0, orange: 0, red: 0, black: 0 });

const WALL_TOTALS = {
  overhang: { yellow: 7, orange: 5, red: 0, black: 0, blue: 0, green: 0 },
  midWall: { yellow: 20, orange: 13, red: 0, black: 0, blue: 0, green: 0 },
  sideWall: { yellow: 11, orange: 8, red: 0, black: 0, blue: 0, green: 0 }
};

export default function Home() {
  const [climbers, setClimbers] = useState<Climber[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Form state
  const [selectedClimber, setSelectedClimber] = useState<number | null>(null);
  const [newClimberName, setNewClimberName] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [manualMode, setManualMode] = useState(false);
  const [wallCounts, setWallCounts] = useState<WallCounts>({
    overhang: emptyWall(),
    midWall: emptyWall(),
    sideWall: emptyWall()
  });

  // Dropdown mode state
  const [dropdownWall, setDropdownWall] = useState<'overhang' | 'midWall' | 'sideWall'>('midWall');
  const [dropdownColor, setDropdownColor] = useState<keyof Counts>('yellow');
  const [videoUrl, setVideoUrl] = useState('');
  const [sessionNotes, setSessionNotes] = useState('');

  const totalCounts = combineCounts(wallCounts);
  const currentScore = scoreSession(totalCounts);

  useEffect(() => {
    loadData();
    checkAuth();
  }, []);

  // Load selected climber's latest session data
  useEffect(() => {
    if (selectedClimber) {
      const climberSessions = sessions
        .filter((s) => s.climberId === selectedClimber)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      if (climberSessions.length > 0 && climberSessions[0].wallCounts) {
        setWallCounts(climberSessions[0].wallCounts);
      }
    }
  }, [selectedClimber, sessions]);

  async function loadData() {
    setLoading(true);
    const [c, s, l] = await Promise.all([getClimbers(), getSessions(), getLeaderboard()]);
    setClimbers(c);
    setSessions(s);
    setLeaderboard(l);
    setLoading(false);
  }

  function checkAuth() {
    // Check if user has a token in localStorage
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    setIsAuthenticated(!!token);
  }

  async function handleAddClimber() {
    if (!newClimberName.trim() || !isAuthenticated) return;
    try {
      const newClimber = await createClimber(newClimberName.trim());
      setClimbers([...climbers, newClimber]);
      setSelectedClimber(newClimber.id);
      setNewClimberName("");
    } catch (error) {
      console.error('Error adding climber:', error);
      alert('Failed to add climber. You may need to log in.');
    }
  }

  function updateWallCount(wall: 'overhang' | 'midWall' | 'sideWall', color: keyof Counts, val: string) {
    const nv = Math.max(0, parseInt(val) || 0);
    setWallCounts({ ...wallCounts, [wall]: { ...wallCounts[wall], [color]: nv } });
  }

  function addClimb() {
    if ((dropdownColor === 'red' || dropdownColor === 'black') && !videoUrl.trim()) {
      alert('Video evidence required for red and black climbs!');
      return;
    }

    const current = wallCounts[dropdownWall][dropdownColor];
    setWallCounts({
      ...wallCounts,
      [dropdownWall]: { ...wallCounts[dropdownWall], [dropdownColor]: current + 1 }
    });

    if (videoUrl.trim()) {
      const videoNote = `${dropdownColor} on ${dropdownWall}: ${videoUrl}`;
      setSessionNotes(sessionNotes ? `${sessionNotes}\n${videoNote}` : videoNote);
      setVideoUrl('');
    }
  }

  async function handleSubmit() {
    if (selectedClimber === null || !isAuthenticated) return;

    const sessionData = {
      climberId: selectedClimber,
      date,
      notes: sessionNotes,
      wallCounts
    };

    try {
      await createSession(sessionData);
      await loadData();
      setWallCounts({ overhang: emptyWall(), midWall: emptyWall(), sideWall: emptyWall() });
      setSessionNotes('');
      setVideoUrl('');
    } catch (error) {
      console.error('Error creating session:', error);
      alert('Failed to create session. You may need to log in.');
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-xl text-slate-400 animate-pulse">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Hero Section with Title */}
      <div className="text-center space-y-4 py-8">
        <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent">
          BoulderingELO
        </h1>
        <p className="text-slate-400 text-lg">Track your climbing progress with intelligent weighted scoring</p>
      </div>

      {/* Auth Status Banner */}
      {!isAuthenticated && (
        <Card className="border-yellow-500/30 bg-yellow-500/5">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="text-yellow-500 text-2xl">ℹ️</div>
              <div>
                <p className="text-yellow-200 font-medium">Viewing in Read-Only Mode</p>
                <p className="text-yellow-300/70 text-sm">Log in to add sessions and track your progress</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Scoring Formula Card */}
      <Card>
        <CardHeader>
          <CardTitle>📊 Scoring Formula</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
            <p className="font-mono mb-2 text-blue-400">Score = Σ (base_points × (W(cum + count) - W(cum)))</p>
            <p className="text-sm text-slate-400 mb-2">Where W(n) = (1 - r^n) / (1 - r), r = 0.95</p>
          </div>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-semibold text-slate-300 mb-2">Base Points:</p>
              <ul className="space-y-1 text-slate-400">
                <li>⚫ Black (≥V9): {BASE.black} pts</li>
                <li>🔴 Red (V7-V8): {BASE.red} pts</li>
                <li>🟠 Orange (V5-V6): {BASE.orange} pts</li>
                <li>🟡 Yellow (V3-V4): {BASE.yellow} pts</li>
                <li>🔵 Blue (V1-V2): {BASE.blue} pts</li>
                <li>🟢 Green (V0-V1): {BASE.green} pts</li>
              </ul>
            </div>
            <div>
              <p className="font-semibold text-slate-300 mb-2">How it works:</p>
              <p className="text-slate-400 leading-relaxed">
                The scoring system uses diminishing returns - your first climbs count more than later ones. 
                Harder climbs (higher difficulty) give exponentially more points. 
                Colors are processed in order from hardest to easiest.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* New Session Form - Only show if authenticated */}
        {isAuthenticated ? (
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>➕ New Session</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-slate-300">Climber</label>
                  <select
                    value={selectedClimber || ""}
                    onChange={(e) => setSelectedClimber(parseInt(e.target.value) || null)}
                    className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition"
                  >
                    <option value="">Select a climber...</option>
                    {climbers.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  <div className="mt-2 flex gap-2">
                    <Input
                      placeholder="New climber name"
                      value={newClimberName}
                      onChange={(e) => setNewClimberName(e.target.value)}
                      className="flex-1"
                    />
                    <Button onClick={handleAddClimber} variant="outline">Add Climber</Button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-slate-300">Date</label>
                  <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={manualMode}
                    onChange={(e) => setManualMode(e.target.checked)}
                    id="manual-mode"
                    className="w-4 h-4 rounded border-slate-700 bg-slate-900"
                  />
                  <label htmlFor="manual-mode" className="text-sm text-slate-300">Manual Input Mode</label>
                </div>

                {!manualMode ? (
                  <div className="space-y-4">
                    <h3 className="font-semibold text-white">🧗 Add Climb</h3>
                    
                    <div>
                      <label className="block text-sm font-medium mb-2 text-slate-300">Wall Section</label>
                      <select
                        value={dropdownWall}
                        onChange={(e) => setDropdownWall(e.target.value as any)}
                        className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                      >
                        <option value="midWall">Mid Wall</option>
                        <option value="overhang">Overhang</option>
                        <option value="sideWall">Side Wall</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2 text-slate-300">Color</label>
                      <select
                        value={dropdownColor}
                        onChange={(e) => setDropdownColor(e.target.value as keyof Counts)}
                        className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                      >
                        {ORDER.map((c) => (
                          <option key={c} value={c}>{COLOR_NAMES[c]}</option>
                        ))}
                      </select>
                    </div>

                    {(dropdownColor === 'red' || dropdownColor === 'black') && (
                      <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
                        <label className="block font-bold mb-2 text-red-300">⚠️ Video Evidence Required</label>
                        <Input
                          placeholder="Enter video URL (required for red/black)"
                          value={videoUrl}
                          onChange={(e) => setVideoUrl(e.target.value)}
                        />
                      </div>
                    )}

                    <Button onClick={addClimb} className="w-full">Add Climb</Button>

                    <Card className="bg-slate-900/30">
                      <CardHeader>
                        <CardTitle className="text-base">📈 Current Progress</CardTitle>
                      </CardHeader>
                      <CardContent className="text-sm space-y-2">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Mid Wall:</span>
                          <span className="text-white">
                            {wallCounts.midWall.yellow}/{WALL_TOTALS.midWall.yellow} yellows, 
                            {wallCounts.midWall.orange}/{WALL_TOTALS.midWall.orange} oranges
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Overhang:</span>
                          <span className="text-white">
                            {wallCounts.overhang.yellow}/{WALL_TOTALS.overhang.yellow} yellows, 
                            {wallCounts.overhang.orange}/{WALL_TOTALS.overhang.orange} oranges
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Side Wall:</span>
                          <span className="text-white">
                            {wallCounts.sideWall.yellow}/{WALL_TOTALS.sideWall.yellow} yellows, 
                            {wallCounts.sideWall.orange}/{WALL_TOTALS.sideWall.orange} oranges
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <h3 className="font-semibold text-white">📝 Wall Sections</h3>
                    
                    {(['overhang', 'midWall', 'sideWall'] as const).map((wall) => (
                      <div key={wall} className="bg-slate-900/30 p-4 rounded-lg border border-slate-700">
                        <h4 className="font-medium mb-3 capitalize text-white">
                          {wall === 'midWall' ? 'Mid Wall' : wall === 'sideWall' ? 'Side Wall' : 'Overhang'}
                        </h4>
                        <div className="grid grid-cols-3 gap-2">
                          {ORDER.map((color) => (
                            <div key={color}>
                              <label className="block text-xs mb-1 text-slate-400">{COLOR_NAMES[color]}</label>
                              <Input
                                type="number"
                                min={0}
                                value={wallCounts[wall][color]}
                                onChange={(e) => updateWallCount(wall, color, e.target.value)}
                                className="text-center"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <Button onClick={handleSubmit} className="w-full" disabled={!selectedClimber}>
                  Submit Session
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="lg:col-span-2">
            <Card className="bg-gradient-to-br from-slate-900/50 to-slate-800/30 border-slate-700">
              <CardHeader>
                <CardTitle>🔒 Session Tracking</CardTitle>
              </CardHeader>
              <CardContent className="text-center py-12">
                <div className="space-y-4">
                  <div className="text-6xl">🧗</div>
                  <h3 className="text-xl font-semibold text-white">Log in to track your sessions</h3>
                  <p className="text-slate-400 max-w-md mx-auto">
                    Create an account or sign in to start logging your climbing sessions, track progress, and compete on the leaderboard.
                  </p>
                  <Button className="mt-4">Sign In / Register</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Live Preview */}
          <Card className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border-blue-500/30">
            <CardHeader>
              <CardTitle>💯 Score Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-6">
                <div className="text-sm text-slate-400 mb-2">Current Session Score</div>
                <div className="text-6xl font-bold text-transparent bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text">
                  <AnimatedNumber value={currentScore} decimals={2} />
                </div>
              </div>
              <div className="mt-6 pt-6 border-t border-slate-700">
                <h4 className="font-semibold mb-3 text-white">Marginal Gains (+1)</h4>
                <div className="space-y-2">
                  {ORDER.map((color) => (
                    <div key={color} className="flex justify-between text-sm">
                      <span className="text-slate-400">{COLOR_NAMES[color]}</span>
                      <span className="text-blue-400 font-medium">+{marginalGain(totalCounts, color, 1).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Mini Leaderboard */}
          <Card>
            <CardHeader>
              <CardTitle>🏆 Leaderboard</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {leaderboard.slice(0, 5).map((entry, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-slate-900/30 hover:bg-slate-900/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                        i === 0 ? "bg-gradient-to-br from-yellow-500 to-yellow-600 text-yellow-950" :
                        i === 1 ? "bg-gradient-to-br from-slate-400 to-slate-500 text-slate-950" :
                        i === 2 ? "bg-gradient-to-br from-orange-600 to-orange-700 text-orange-950" :
                        "bg-slate-800 text-slate-400"
                      }`}>
                        {i + 1}
                      </div>
                      <span className="text-white text-sm">{entry.climber}</span>
                    </div>
                    <span className="text-blue-400 font-medium text-sm">{entry.total_score.toFixed(2)}</span>
                  </div>
                ))}
              </div>
              {leaderboard.length > 5 && (
                <div className="mt-3 text-center">
                  <a href="/leaderboard" className="text-sm text-blue-400 hover:text-blue-300">
                    View Full Leaderboard →
                  </a>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recent Sessions Table */}
      <Card>
        <CardHeader>
          <CardTitle>📅 Recent Sessions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">Date</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">Climber</th>
                  {ORDER.map((color) => (
                    <th key={color} className="text-center py-3 px-2 text-xs font-medium text-slate-400">
                      {color.charAt(0).toUpperCase()}
                    </th>
                  ))}
                  <th className="text-right py-3 px-4 text-sm font-medium text-slate-400">Score</th>
                </tr>
              </thead>
              <tbody>
                {[...sessions]
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .slice(0, 10)
                  .map((s) => {
                    const climber = climbers.find((c) => c.id === s.climberId);
                    return (
                      <tr key={s.id} className="border-b border-slate-800/50 hover:bg-slate-900/30 transition-colors">
                        <td className="py-3 px-4 text-sm text-slate-300">{s.date}</td>
                        <td className="py-3 px-4 text-sm text-white">{climber?.name || "Unknown"}</td>
                        {ORDER.map((color) => (
                          <td key={color} className="py-3 px-2 text-center text-sm text-slate-400">
                            {s[color] || 0}
                          </td>
                        ))}
                        <td className="py-3 px-4 text-right text-sm font-medium text-blue-400">
                          {s.score.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                {sessions.length === 0 && (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-500">
                      No sessions yet. {isAuthenticated ? 'Add your first session above!' : 'Log in to start tracking!'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
