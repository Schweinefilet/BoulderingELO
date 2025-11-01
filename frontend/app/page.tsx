"use client";"use client";"use client";"use client";"use client";import Image from "next/image";



import { useState, useEffect } from "react";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

import { Button } from "@/components/ui/button";import { useState, useEffect } from "react";

import { Input } from "@/components/ui/input";

import { AnimatedNumber } from "@/components/ui/animated-number";import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

import { getClimbers, createClimber, getSessions, createSession, getLeaderboard } from "@/lib/api";

import { Climber, Session, Counts, WallCounts, LeaderboardEntry } from "@/lib/types";import { Button } from "@/components/ui/button";import { useState, useEffect } from "react";import { useState, useEffect } from "react";

import { scoreSession, marginalGain, BASE, ORDER, COLOR_NAMES, combineCounts } from "@/lib/scoring";

import { Input } from "@/components/ui/input";

const emptyWall = (): Counts => ({ green: 0, blue: 0, yellow: 0, orange: 0, red: 0, black: 0 });

import { AnimatedNumber } from "@/components/ui/animated-number";import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

const WALL_TOTALS = {

  overhang: { yellow: 7, orange: 5, red: 0, black: 0, blue: 0, green: 0 },import { getClimbers, createClimber, getSessions, createSession, getLeaderboard } from "@/lib/api";

  midWall: { yellow: 20, orange: 13, red: 0, black: 0, blue: 0, green: 0 },

  sideWall: { yellow: 11, orange: 8, red: 0, black: 0, blue: 0, green: 0 }import { Climber, Session, Counts, WallCounts, LeaderboardEntry } from "@/lib/types";import { Button } from "@/components/ui/button";import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";import { useState, useEffect } from "react";

};

import { scoreSession, marginalGain, BASE, ORDER, COLOR_NAMES, combineCounts } from "@/lib/scoring";

export default function Home() {

  const [climbers, setClimbers] = useState<Climber[]>([]);import { Input } from "@/components/ui/input";

  const [sessions, setSessions] = useState<Session[]>([]);

  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);const emptyWall = (): Counts => ({ green: 0, blue: 0, yellow: 0, orange: 0, red: 0, black: 0 });

  const [loading, setLoading] = useState(true);

import { AnimatedNumber } from "@/components/ui/animated-number";import { Button } from "@/components/ui/button";

  // Form state

  const [selectedClimber, setSelectedClimber] = useState<number | null>(null);const WALL_TOTALS = {

  const [newClimberName, setNewClimberName] = useState("");

  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);  overhang: { yellow: 7, orange: 5, red: 0, black: 0, blue: 0, green: 0 },import { getClimbers, createClimber, getSessions, createSession, getLeaderboard } from "@/lib/api";

  const [manualMode, setManualMode] = useState(false);

  const [wallCounts, setWallCounts] = useState<WallCounts>({  midWall: { yellow: 20, orange: 13, red: 0, black: 0, blue: 0, green: 0 },

    overhang: emptyWall(),

    midWall: emptyWall(),  sideWall: { yellow: 11, orange: 8, red: 0, black: 0, blue: 0, green: 0 }import { Climber, Session, Counts, WallCounts, LeaderboardEntry } from "@/lib/types";import { Input } from "@/components/ui/input";import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";export default function Home() {

    sideWall: emptyWall()

  });};



  // Dropdown mode stateimport { scoreSession, marginalGain, BASE, ORDER, COLOR_NAMES, combineCounts } from "@/lib/scoring";

  const [dropdownWall, setDropdownWall] = useState<'overhang' | 'midWall' | 'sideWall'>('midWall');

  const [dropdownColor, setDropdownColor] = useState<keyof Counts>('yellow');export default function Home() {

  const [videoUrl, setVideoUrl] = useState('');

  const [sessionNotes, setSessionNotes] = useState('');  const [climbers, setClimbers] = useState<Climber[]>([]);import { AnimatedNumber } from "@/components/ui/animated-number";



  const totalCounts = combineCounts(wallCounts);  const [sessions, setSessions] = useState<Session[]>([]);

  const currentScore = scoreSession(totalCounts);

  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);const emptyWall = (): Counts => ({ green: 0, blue: 0, yellow: 0, orange: 0, red: 0, black: 0 });

  useEffect(() => {

    loadData();  const [loading, setLoading] = useState(true);

  }, []);

import { getClimbers, createClimber, getSessions, createSession } from "@/lib/api";import { Button } from "@/components/ui/button";  return (

  // Load selected climber's latest session data

  useEffect(() => {  // Form state

    if (selectedClimber) {

      const climberSessions = sessions  const [selectedClimber, setSelectedClimber] = useState<number | null>(null);const WALL_TOTALS = {

        .filter((s) => s.climberId === selectedClimber)

        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());  const [newClimberName, setNewClimberName] = useState("");



      if (climberSessions.length > 0 && climberSessions[0].wallCounts) {  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);  overhang: { yellow: 7, orange: 5, red: 0, black: 0, blue: 0, green: 0 },import { Climber, Session, Counts } from "@/lib/types";

        setWallCounts(climberSessions[0].wallCounts);

      }  const [manualMode, setManualMode] = useState(false);

    }

  }, [selectedClimber, sessions]);  const [wallCounts, setWallCounts] = useState<WallCounts>({  midWall: { yellow: 20, orange: 13, red: 0, black: 0, blue: 0, green: 0 },



  async function loadData() {    overhang: emptyWall(),

    setLoading(true);

    const [c, s, l] = await Promise.all([getClimbers(), getSessions(), getLeaderboard()]);    midWall: emptyWall(),  sideWall: { yellow: 11, orange: 8, red: 0, black: 0, blue: 0, green: 0 }import { scoreSession, marginalGain, BASE, ORDER, COLOR_NAMES } from "@/lib/scoring";import { Input } from "@/components/ui/input";    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">

    setClimbers(c);

    setSessions(s);    sideWall: emptyWall()

    setLeaderboard(l);

    setLoading(false);  });};

  }



  async function handleAddClimber() {

    if (!newClimberName.trim()) return;  // Dropdown mode state

    const newClimber = await createClimber(newClimberName.trim());

    setClimbers([...climbers, newClimber]);  const [dropdownWall, setDropdownWall] = useState<'overhang' | 'midWall' | 'sideWall'>('midWall');

    setSelectedClimber(newClimber.id);

    setNewClimberName("");  const [dropdownColor, setDropdownColor] = useState<keyof Counts>('yellow');export default function Home() {

  }

  const [videoUrl, setVideoUrl] = useState('');

  function updateWallCount(wall: 'overhang' | 'midWall' | 'sideWall', color: keyof Counts, val: string) {

    const nv = Math.max(0, parseInt(val) || 0);  const [sessionNotes, setSessionNotes] = useState('');  const [climbers, setClimbers] = useState<Climber[]>([]);export default function SessionsPage() {import { AnimatedNumber } from "@/components/ui/animated-number";      <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-white dark:bg-black sm:items-start">

    setWallCounts({ ...wallCounts, [wall]: { ...wallCounts[wall], [color]: nv } });

  }



  function addClimb() {  const totalCounts = combineCounts(wallCounts);  const [sessions, setSessions] = useState<Session[]>([]);

    if ((dropdownColor === 'red' || dropdownColor === 'black') && !videoUrl.trim()) {

      alert('Video evidence required for red and black climbs!');  const currentScore = scoreSession(totalCounts);

      return;

    }  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);  const [climbers, setClimbers] = useState<Climber[]>([]);



    const current = wallCounts[dropdownWall][dropdownColor];  useEffect(() => {

    setWallCounts({

      ...wallCounts,    loadData();  const [loading, setLoading] = useState(true);

      [dropdownWall]: { ...wallCounts[dropdownWall], [dropdownColor]: current + 1 }

    });  }, []);



    if (videoUrl.trim()) {  const [sessions, setSessions] = useState<Session[]>([]);import { getClimbers, createClimber, getSessions, createSession } from "@/lib/api";        <Image

      const videoNote = `${dropdownColor} on ${dropdownWall}: ${videoUrl}`;

      setSessionNotes(sessionNotes ? `${sessionNotes}\n${videoNote}` : videoNote);  // Load selected climber's latest session data

      setVideoUrl('');

    }  useEffect(() => {  // Form state

  }

    if (selectedClimber) {

  async function handleSubmit() {

    if (selectedClimber === null) return;      const climberSessions = sessions  const [selectedClimber, setSelectedClimber] = useState<number | null>(null);  const [loading, setLoading] = useState(true);



    const sessionData = {        .filter((s) => s.climberId === selectedClimber)

      climberId: selectedClimber,

      date,        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());  const [newClimberName, setNewClimberName] = useState("");

      notes: sessionNotes,

      ...totalCounts,

      wallCounts

    };      if (climberSessions.length > 0 && climberSessions[0].wallCounts) {  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);  import { Climber, Session, Counts } from "@/lib/types";          className="dark:invert"



    await createSession(sessionData);        setWallCounts(climberSessions[0].wallCounts);

    await loadData();

    setWallCounts({ overhang: emptyWall(), midWall: emptyWall(), sideWall: emptyWall() });      }  const [manualMode, setManualMode] = useState(false);

    setSessionNotes('');

    setVideoUrl('');    }

  }

  }, [selectedClimber, sessions]);  const [wallCounts, setWallCounts] = useState<WallCounts>({  // Form state

  if (loading) {

    return (

      <div className="flex min-h-screen items-center justify-center">

        <div className="text-xl">Loading...</div>  async function loadData() {    overhang: emptyWall(),

      </div>

    );    setLoading(true);

  }

    const [c, s, l] = await Promise.all([getClimbers(), getSessions(), getLeaderboard()]);    midWall: emptyWall(),  const [selectedClimber, setSelectedClimber] = useState<number | null>(null);import { scoreSession, marginalGain, BASE, ORDER, COLOR_NAMES } from "@/lib/scoring";          src="/next.svg"

  return (

    <div className="container mx-auto p-6 max-w-7xl">    setClimbers(c);

      <h1 className="text-4xl font-bold mb-6">BoulderingELO</h1>

    setSessions(s);    sideWall: emptyWall()

      <Card className="mb-6">

        <CardHeader>    setLeaderboard(l);

          <CardTitle>Scoring Formula</CardTitle>

        </CardHeader>    setLoading(false);  });  const [newClimberName, setNewClimberName] = useState("");

        <CardContent>

          <p className="font-mono mb-2">Score = Σ (base_points × (W(cum + count) - W(cum)))</p>  }

          <p className="text-sm mb-2">Where W(n) = (1 - r^n) / (1 - r), r = 0.95</p>

          <p className="text-sm text-muted-foreground">

            <strong>Base Points:</strong> Black(120), Red(56), Orange(12.5), Yellow(3.5), Blue(0.75), Green(0.25)

            <br />  async function handleAddClimber() {

            <strong>cum</strong> = cumulative count of all higher-ranked colors processed so far

            <br />    if (!newClimberName.trim()) return;  // Dropdown mode state  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);          alt="Next.js logo"

            Colors are processed in order: Black (≥V9) → Red (V7-V8) → Orange (V5-V6) → Yellow (V3-V4) → Blue (V1-V2) → Green (V0-V1)

          </p>    const newClimber = await createClimber(newClimberName.trim());

        </CardContent>

      </Card>    setClimbers([...climbers, newClimber]);  const [dropdownWall, setDropdownWall] = useState<'overhang' | 'midWall' | 'sideWall'>('midWall');



      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">    setSelectedClimber(newClimber.id);

        <div className="lg:col-span-2">

          <Card>    setNewClimberName("");  const [dropdownColor, setDropdownColor] = useState<keyof Counts>('yellow');  const [notes, setNotes] = useState("");

            <CardHeader>

              <CardTitle>New Session</CardTitle>  }

            </CardHeader>

            <CardContent className="space-y-4">  const [videoUrl, setVideoUrl] = useState('');

              <div>

                <label className="block text-sm font-medium mb-2">Climber</label>  function updateWallCount(wall: 'overhang' | 'midWall' | 'sideWall', color: keyof Counts, val: string) {

                <select

                  value={selectedClimber || ""}    const nv = Math.max(0, parseInt(val) || 0);  const [sessionNotes, setSessionNotes] = useState('');  const [counts, setCounts] = useState<Counts>({export default function SessionsPage() {          width={100}

                  onChange={(e) => setSelectedClimber(parseInt(e.target.value) || null)}

                  className="w-full border rounded p-2"    setWallCounts({ ...wallCounts, [wall]: { ...wallCounts[wall], [color]: nv } });

                >

                  <option value="">Select...</option>  }

                  {climbers.map((c) => (

                    <option key={c.id} value={c.id}>{c.name}</option>

                  ))}

                </select>  function addClimb() {  const totalCounts = combineCounts(wallCounts);    green: 0,

                <div className="mt-2 flex gap-2">

                  <Input    if ((dropdownColor === 'red' || dropdownColor === 'black') && !videoUrl.trim()) {

                    placeholder="New climber name"

                    value={newClimberName}      alert('Video evidence required for red and black climbs!');  const currentScore = scoreSession(totalCounts);

                    onChange={(e) => setNewClimberName(e.target.value)}

                  />      return;

                  <Button onClick={handleAddClimber}>Add Climber</Button>

                </div>    }    blue: 0,  const [climbers, setClimbers] = useState<Climber[]>([]);          height={20}

              </div>



              <div>

                <label className="block text-sm font-medium mb-2">Date</label>    const current = wallCounts[dropdownWall][dropdownColor];  useEffect(() => {

                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />

              </div>    setWallCounts({



              <div className="flex items-center gap-2">      ...wallCounts,    loadData();    yellow: 0,

                <input

                  type="checkbox"      [dropdownWall]: { ...wallCounts[dropdownWall], [dropdownColor]: current + 1 }

                  checked={manualMode}

                  onChange={(e) => setManualMode(e.target.checked)}    });  }, []);

                  id="manual-mode"

                />

                <label htmlFor="manual-mode">Manual Input Mode</label>

              </div>    if (videoUrl.trim()) {    orange: 0,  const [sessions, setSessions] = useState<Session[]>([]);          priority



              {!manualMode ? (      const videoNote = `${dropdownColor} on ${dropdownWall}: ${videoUrl}`;

                <div className="space-y-4">

                  <h3 className="font-semibold">Add Climb</h3>      setSessionNotes(sessionNotes ? `${sessionNotes}\n${videoNote}` : videoNote);  // Load selected climber's latest session data

                  

                  <div>      setVideoUrl('');

                    <label className="block text-sm font-medium mb-2">Wall Section</label>

                    <select    }  useEffect(() => {    red: 0,

                      value={dropdownWall}

                      onChange={(e) => setDropdownWall(e.target.value as any)}  }

                      className="w-full border rounded p-2"

                    >    if (selectedClimber) {

                      <option value="midWall">Mid Wall</option>

                      <option value="overhang">Overhang</option>  async function handleSubmit() {

                      <option value="sideWall">Side Wall</option>

                    </select>    if (selectedClimber === null) return;      const climberSessions = sessions    black: 0,  const [loading, setLoading] = useState(true);        />

                  </div>



                  <div>

                    <label className="block text-sm font-medium mb-2">Color</label>    const sessionData = {        .filter((s) => s.climberId === selectedClimber)

                    <select

                      value={dropdownColor}      climberId: selectedClimber,

                      onChange={(e) => setDropdownColor(e.target.value as keyof Counts)}

                      className="w-full border rounded p-2"      date,        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());  });

                    >

                      {ORDER.map((c) => (      notes: sessionNotes,

                        <option key={c} value={c}>{COLOR_NAMES[c]}</option>

                      ))}      ...totalCounts,

                    </select>

                  </div>      wallCounts



                  {(dropdownColor === 'red' || dropdownColor === 'black') && (    };      if (climberSessions.length > 0 && climberSessions[0].wallCounts) {          <div className="flex flex-col items-center gap-6 text-center sm:items-start sm:text-left">

                    <div className="p-3 bg-red-900 rounded">

                      <label className="block font-bold mb-2">⚠️ Video Evidence Required</label>

                      <Input

                        placeholder="Enter video URL (required for red/black)"    await createSession(sessionData);        setWallCounts(climberSessions[0].wallCounts);

                        value={videoUrl}

                        onChange={(e) => setVideoUrl(e.target.value)}    await loadData();

                      />

                    </div>    setWallCounts({ overhang: emptyWall(), midWall: emptyWall(), sideWall: emptyWall() });      }  const currentScore = scoreSession(counts);

                  )}

    setSessionNotes('');

                  <Button onClick={addClimb}>Add Climb</Button>

    setVideoUrl('');    }

                  <Card>

                    <CardHeader>  }

                      <CardTitle className="text-base">Current Progress</CardTitle>

                    </CardHeader>  }, [selectedClimber, sessions]);  // Form state          <h1 className="max-w-xs text-3xl font-semibold leading-10 tracking-tight text-black dark:text-zinc-50">

                    <CardContent className="text-sm space-y-1">

                      <div><strong>Mid Wall:</strong> {wallCounts.midWall.yellow}/{WALL_TOTALS.midWall.yellow} yellows, {wallCounts.midWall.orange}/{WALL_TOTALS.midWall.orange} oranges</div>  if (loading) {

                      <div><strong>Overhang:</strong> {wallCounts.overhang.yellow}/{WALL_TOTALS.overhang.yellow} yellows, {wallCounts.overhang.orange}/{WALL_TOTALS.overhang.orange} oranges</div>

                      <div><strong>Side Wall:</strong> {wallCounts.sideWall.yellow}/{WALL_TOTALS.sideWall.yellow} yellows, {wallCounts.sideWall.orange}/{WALL_TOTALS.sideWall.orange} oranges</div>    return (

                    </CardContent>

                  </Card>      <div className="flex min-h-screen items-center justify-center">

                </div>

              ) : (        <div className="text-xl">Loading...</div>  async function loadData() {  useEffect(() => {

                <div className="space-y-4">

                  <h3 className="font-semibold">Wall Sections</h3>      </div>

                  

                  {(['overhang', 'midWall', 'sideWall'] as const).map((wall) => (    );    setLoading(true);

                    <div key={wall}>

                      <h4 className="font-medium mb-2 capitalize">{wall === 'midWall' ? 'Mid Wall' : wall === 'sideWall' ? 'Side Wall' : 'Overhang'}</h4>  }

                      <div className="grid grid-cols-3 gap-2">

                        {ORDER.map((color) => (    const [c, s, l] = await Promise.all([getClimbers(), getSessions(), getLeaderboard()]);    loadData();  const [selectedClimber, setSelectedClimber] = useState<number | null>(null);            To get started, edit the page.tsx file.

                          <div key={color}>

                            <label className="block text-xs mb-1">{COLOR_NAMES[color]}</label>  return (

                            <Input

                              type="number"    <div className="container mx-auto p-6 max-w-7xl">    setClimbers(c);

                              min={0}

                              value={wallCounts[wall][color]}      <h1 className="text-4xl font-bold mb-6">BoulderingELO</h1>

                              onChange={(e) => updateWallCount(wall, color, e.target.value)}

                            />    setSessions(s);  }, []);

                          </div>

                        ))}      <Card className="mb-6">

                      </div>

                    </div>        <CardHeader>    setLeaderboard(l);

                  ))}

                </div>          <CardTitle>Scoring Formula</CardTitle>

              )}

        </CardHeader>    setLoading(false);  const [newClimberName, setNewClimberName] = useState("");          </h1>

              <Button onClick={handleSubmit} className="w-full">Add Session</Button>

            </CardContent>        <CardContent>

          </Card>

        </div>          <p className="font-mono mb-2">Score = Σ (base_points × (W(cum + count) - W(cum)))</p>  }



        <div>          <p className="text-sm mb-2">Where W(n) = (1 - r^n) / (1 - r), r = 0.95</p>

          <Card className="mb-6">

            <CardHeader>          <p className="text-sm text-muted-foreground">  async function loadData() {

              <CardTitle>Live Preview</CardTitle>

            </CardHeader>            <strong>Base Points:</strong> Black(120), Red(48), Orange(12), Yellow(3.5), Blue(0.75), Green(0.25)

            <CardContent>

              <div className="text-4xl font-bold mb-4">            <br />  async function handleAddClimber() {

                <AnimatedNumber value={currentScore} decimals={2} />

              </div>            <strong>cum</strong> = cumulative count of all higher-ranked colors processed so far

              <div>

                <h4 className="font-semibold mb-2">Marginal +1</h4>            <br />    if (!newClimberName.trim()) return;    setLoading(true);  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);          <p className="max-w-md text-lg leading-8 text-zinc-600 dark:text-zinc-400">

                {ORDER.map((color) => (

                  <div key={color} className="flex justify-between text-sm">            Colors are processed in order: Black (≥V9) → Red (V7-V8) → Orange (V5-V6) → Yellow (V3-V4) → Blue (V1-V2) → Green (V0-V1)

                    <span>{COLOR_NAMES[color]}</span>

                    <span className="text-blue-500">+{marginalGain(totalCounts, color, 1).toFixed(2)}</span>          </p>    const newClimber = await createClimber(newClimberName.trim());

                  </div>

                ))}        </CardContent>

              </div>

            </CardContent>      </Card>    setClimbers([...climbers, newClimber]);    const [c, s] = await Promise.all([getClimbers(), getSessions()]);

          </Card>



          <Card>

            <CardHeader>      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">    setSelectedClimber(newClimber.id);

              <CardTitle>Leaderboard</CardTitle>

            </CardHeader>        <div className="lg:col-span-2">

            <CardContent>

              <ol className="list-decimal list-inside space-y-1">          <Card>    setNewClimberName("");    setClimbers(c);  const [notes, setNotes] = useState("");            Looking for a starting point or more instructions? Head over to{" "}

                {leaderboard.map((entry, i) => (

                  <li key={i}>            <CardHeader>

                    {entry.climber}: {entry.total_score.toFixed(2)}

                  </li>              <CardTitle>New Session</CardTitle>  }

                ))}

              </ol>            </CardHeader>

            </CardContent>

          </Card>            <CardContent className="space-y-4">    setSessions(s);

        </div>

      </div>              <div>



      <Card className="mt-6">                <label className="block text-sm font-medium mb-2">Climber</label>  function updateWallCount(wall: 'overhang' | 'midWall' | 'sideWall', color: keyof Counts, val: string) {

        <CardHeader>

          <CardTitle>Sessions</CardTitle>                <select

        </CardHeader>

        <CardContent>                  value={selectedClimber || ""}    const nv = Math.max(0, parseInt(val) || 0);    setLoading(false);  const [counts, setCounts] = useState<Counts>({            <a

          <table className="w-full">

            <thead>                  onChange={(e) => setSelectedClimber(parseInt(e.target.value) || null)}

              <tr className="border-b">

                <th className="text-left p-2">Date</th>                  className="w-full border rounded p-2"    setWallCounts({ ...wallCounts, [wall]: { ...wallCounts[wall], [color]: nv } });

                <th className="text-left p-2">Climber</th>

                <th className="text-left p-2">Score Change</th>                >

              </tr>

            </thead>                  <option value="">Select...</option>  }  }

            <tbody>

              {[...sessions]                  {climbers.map((c) => (

                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

                .map((s) => {                    <option key={c.id} value={c.id}>{c.name}</option>

                  const climber = climbers.find((c) => c.id === s.climberId);

                  const climberSessions = sessions                  ))}

                    .filter((sess) => sess.climberId === s.climberId)

                    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());                </select>  function addClimb() {    green: 0,              href="https://vercel.com/templates?framework=next.js&utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"

                  const sessionIndex = climberSessions.findIndex((sess) => sess.id === s.id);

                  const prevSession = sessionIndex > 0 ? climberSessions[sessionIndex - 1] : null;                <div className="mt-2 flex gap-2">

                  const scoreDiff = prevSession ? s.score - prevSession.score : s.score;

                  const displayScore = scoreDiff >= 0 ? `+${scoreDiff.toFixed(2)}` : scoreDiff.toFixed(2);                  <Input    if ((dropdownColor === 'red' || dropdownColor === 'black') && !videoUrl.trim()) {



                  // Color based on score change: negative = red, positive = green (lighter = more gain)                    placeholder="New climber name"

                  let color = 'text-emerald-500';

                  if (scoreDiff < 0) {                    value={newClimberName}      alert('Video evidence required for red and black climbs!');  async function handleAddClimber() {

                    color = 'text-red-500';

                  } else if (scoreDiff >= 40) {                    onChange={(e) => setNewClimberName(e.target.value)}

                    color = 'text-emerald-300';

                  } else if (scoreDiff >= 30) {                  />      return;

                    color = 'text-teal-300';

                  } else if (scoreDiff >= 20) {                  <Button onClick={handleAddClimber}>Add Climber</Button>

                    color = 'text-emerald-400';

                  } else if (scoreDiff >= 10) {                </div>    }    if (!newClimberName.trim()) return;    blue: 0,              className="font-medium text-zinc-950 dark:text-zinc-50"

                    color = 'text-emerald-500';

                  } else {              </div>

                    color = 'text-emerald-600';

                  }



                  return (              <div>

                    <tr key={s.id} className="border-b">

                      <td className="p-2">{s.date}</td>                <label className="block text-sm font-medium mb-2">Date</label>    const current = wallCounts[dropdownWall][dropdownColor];    const newClimber = await createClimber(newClimberName.trim());

                      <td className="p-2">{climber?.name}</td>

                      <td className={`p-2 font-bold ${color}`}>{displayScore}</td>                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />

                    </tr>

                  );              </div>    setWallCounts({

                })}

            </tbody>

          </table>

        </CardContent>              <div className="flex items-center gap-2">      ...wallCounts,    setClimbers([...climbers, newClimber]);    yellow: 0,            >

      </Card>

    </div>                <input

  );

}                  type="checkbox"      [dropdownWall]: { ...wallCounts[dropdownWall], [dropdownColor]: current + 1 }


                  checked={manualMode}

                  onChange={(e) => setManualMode(e.target.checked)}    });    setSelectedClimber(newClimber.id);

                  id="manual-mode"

                />

                <label htmlFor="manual-mode">Manual Input Mode</label>

              </div>    if (videoUrl.trim()) {    setNewClimberName("");    orange: 0,              Templates



              {!manualMode ? (      const videoNote = `${dropdownColor} on ${dropdownWall}: ${videoUrl}`;

                <div className="space-y-4">

                  <h3 className="font-semibold">Add Climb</h3>      setSessionNotes(sessionNotes ? `${sessionNotes}\n${videoNote}` : videoNote);  }

                  

                  <div>      setVideoUrl('');

                    <label className="block text-sm font-medium mb-2">Wall Section</label>

                    <select    }    red: 0,            </a>{" "}

                      value={dropdownWall}

                      onChange={(e) => setDropdownWall(e.target.value as any)}  }

                      className="w-full border rounded p-2"

                    >  async function handleSubmit(e: React.FormEvent) {

                      <option value="midWall">Mid Wall</option>

                      <option value="overhang">Overhang</option>  async function handleSubmit() {

                      <option value="sideWall">Side Wall</option>

                    </select>    if (selectedClimber === null) return;    e.preventDefault();    black: 0,            or the{" "}

                  </div>



                  <div>

                    <label className="block text-sm font-medium mb-2">Color</label>    const sessionData = {    if (!selectedClimber) return;

                    <select

                      value={dropdownColor}      climberId: selectedClimber,

                      onChange={(e) => setDropdownColor(e.target.value as keyof Counts)}

                      className="w-full border rounded p-2"      date,      });            <a

                    >

                      {ORDER.map((c) => (      notes: sessionNotes,

                        <option key={c} value={c}>{COLOR_NAMES[c]}</option>

                      ))}      ...totalCounts,    await createSession({

                    </select>

                  </div>      wallCounts



                  {(dropdownColor === 'red' || dropdownColor === 'black') && (    };      climberId: selectedClimber,              href="https://nextjs.org/learn?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"

                    <div className="p-3 bg-red-900 rounded">

                      <label className="block font-bold mb-2">⚠️ Video Evidence Required</label>

                      <Input

                        placeholder="Enter video URL (required for red/black)"    await createSession(sessionData);      date,

                        value={videoUrl}

                        onChange={(e) => setVideoUrl(e.target.value)}    await loadData();

                      />

                    </div>    setWallCounts({ overhang: emptyWall(), midWall: emptyWall(), sideWall: emptyWall() });      counts,  const currentScore = scoreSession(counts);              className="font-medium text-zinc-950 dark:text-zinc-50"

                  )}

    setSessionNotes('');

                  <Button onClick={addClimb}>Add Climb</Button>

    setVideoUrl('');      notes: notes.trim() || undefined,

                  <Card>

                    <CardHeader>  }

                      <CardTitle className="text-base">Current Progress</CardTitle>

                    </CardHeader>    });            >

                    <CardContent className="text-sm space-y-1">

                      <div><strong>Mid Wall:</strong> {wallCounts.midWall.yellow}/{WALL_TOTALS.midWall.yellow} yellows, {wallCounts.midWall.orange}/{WALL_TOTALS.midWall.orange} oranges</div>  if (loading) {

                      <div><strong>Overhang:</strong> {wallCounts.overhang.yellow}/{WALL_TOTALS.overhang.yellow} yellows, {wallCounts.overhang.orange}/{WALL_TOTALS.overhang.orange} oranges</div>

                      <div><strong>Side Wall:</strong> {wallCounts.sideWall.yellow}/{WALL_TOTALS.sideWall.yellow} yellows, {wallCounts.sideWall.orange}/{WALL_TOTALS.sideWall.orange} oranges</div>    return (    

                    </CardContent>

                  </Card>      <div className="flex min-h-screen items-center justify-center">

                </div>

              ) : (        <div className="text-xl">Loading...</div>    // Reset form  useEffect(() => {              Learning

                <div className="space-y-4">

                  <h3 className="font-semibold">Wall Sections</h3>      </div>

                  

                  {(['overhang', 'midWall', 'sideWall'] as const).map((wall) => (    );    setCounts({ green: 0, blue: 0, yellow: 0, orange: 0, red: 0, black: 0 });

                    <div key={wall}>

                      <h4 className="font-medium mb-2 capitalize">{wall === 'midWall' ? 'Mid Wall' : wall === 'sideWall' ? 'Side Wall' : 'Overhang'}</h4>  }

                      <div className="grid grid-cols-3 gap-2">

                        {ORDER.map((color) => (    setNotes("");    loadData();            </a>{" "}

                          <div key={color}>

                            <label className="block text-xs mb-1">{COLOR_NAMES[color]}</label>  return (

                            <Input

                              type="number"    <div className="container mx-auto p-6 max-w-7xl">    await loadData();

                              min={0}

                              value={wallCounts[wall][color]}      <h1 className="text-4xl font-bold mb-6">BoulderingELO</h1>

                              onChange={(e) => updateWallCount(wall, color, e.target.value)}

                            />  }  }, []);            center.

                          </div>

                        ))}      <Card className="mb-6">

                      </div>

                    </div>        <CardHeader>

                  ))}

                </div>          <CardTitle>Scoring Formula</CardTitle>

              )}

        </CardHeader>  function updateCount(color: keyof Counts, value: string) {          </p>

              <Button onClick={handleSubmit} className="w-full">Add Session</Button>

            </CardContent>        <CardContent>

          </Card>

        </div>          <p className="font-mono mb-2">Score = Σ (base_points × (W(cum + count) - W(cum)))</p>    const num = parseInt(value) || 0;



        <div>          <p className="text-sm mb-2">Where W(n) = (1 - r^n) / (1 - r), r = 0.95</p>

          <Card className="mb-6">

            <CardHeader>          <p className="text-sm text-muted-foreground">    setCounts({ ...counts, [color]: Math.max(0, num) });  async function loadData() {        </div>

              <CardTitle>Live Preview</CardTitle>

            </CardHeader>            <strong>Base Points:</strong> Black(120), Red(48), Orange(12), Yellow(3.5), Blue(0.75), Green(0.25)

            <CardContent>

              <div className="text-4xl font-bold mb-4">            <br />  }

                <AnimatedNumber value={currentScore} decimals={2} />

              </div>            <strong>cum</strong> = cumulative count of all higher-ranked colors processed so far

              <div>

                <h4 className="font-semibold mb-2">Marginal +1</h4>            <br />    setLoading(true);        <div className="flex flex-col gap-4 text-base font-medium sm:flex-row">

                {ORDER.map((color) => (

                  <div key={color} className="flex justify-between text-sm">            Colors are processed in order: Black (≥V9) → Red (V7-V8) → Orange (V5-V6) → Yellow (V3-V4) → Blue (V1-V2) → Green (V0-V1)

                    <span>{COLOR_NAMES[color]}</span>

                    <span className="text-blue-500">+{marginalGain(totalCounts, color, 1).toFixed(2)}</span>          </p>  const getColorClass = (color: keyof Counts) => {

                  </div>

                ))}        </CardContent>

              </div>

            </CardContent>      </Card>    const colorMap = {    const [c, s] = await Promise.all([getClimbers(), getSessions()]);          <a

          </Card>



          <Card>

            <CardHeader>      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">      black: "bg-gray-900 border-gray-700",

              <CardTitle>Leaderboard</CardTitle>

            </CardHeader>        <div className="lg:col-span-2">

            <CardContent>

              <ol className="list-decimal list-inside space-y-1">          <Card>      red: "bg-red-900/30 border-red-700",    setClimbers(c);            className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-foreground px-5 text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc] md:w-[158px]"

                {leaderboard.map((entry, i) => (

                  <li key={i}>            <CardHeader>

                    {entry.climber}: {entry.total_score.toFixed(2)}

                  </li>              <CardTitle>New Session</CardTitle>      orange: "bg-orange-900/30 border-orange-700",

                ))}

              </ol>            </CardHeader>

            </CardContent>

          </Card>            <CardContent className="space-y-4">      yellow: "bg-yellow-900/30 border-yellow-700",    setSessions(s);            href="https://vercel.com/new?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"

        </div>

      </div>              <div>



      <Card className="mt-6">                <label className="block text-sm font-medium mb-2">Climber</label>      blue: "bg-blue-900/30 border-blue-700",

        <CardHeader>

          <CardTitle>Sessions</CardTitle>                <select

        </CardHeader>

        <CardContent>                  value={selectedClimber || ""}      green: "bg-green-900/30 border-green-700",    setLoading(false);            target="_blank"

          <table className="w-full">

            <thead>                  onChange={(e) => setSelectedClimber(parseInt(e.target.value) || null)}

              <tr className="border-b">

                <th className="text-left p-2">Date</th>                  className="w-full border rounded p-2"    };

                <th className="text-left p-2">Climber</th>

                <th className="text-left p-2">Score Change</th>                >

              </tr>

            </thead>                  <option value="">Select...</option>    return colorMap[color];  }            rel="noopener noreferrer"

            <tbody>

              {[...sessions]                  {climbers.map((c) => (

                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

                .map((s) => {                    <option key={c.id} value={c.id}>{c.name}</option>  };

                  const climber = climbers.find((c) => c.id === s.climberId);

                  const climberSessions = sessions                  ))}

                    .filter((sess) => sess.climberId === s.climberId)

                    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());                </select>          >

                  const sessionIndex = climberSessions.findIndex((sess) => sess.id === s.id);

                  const prevSession = sessionIndex > 0 ? climberSessions[sessionIndex - 1] : null;                <div className="mt-2 flex gap-2">

                  const scoreDiff = prevSession ? s.score - prevSession.score : s.score;

                  const displayScore = scoreDiff >= 0 ? `+${scoreDiff.toFixed(2)}` : scoreDiff.toFixed(2);                  <Input  if (loading) {



                  // Color based on score change: negative = red, positive = green (lighter = more gain)                    placeholder="New climber name"

                  let color = 'text-emerald-500';

                  if (scoreDiff < 0) {                    value={newClimberName}    return <div className="text-center py-12 text-slate-400">Loading...</div>;  async function handleAddClimber() {            <Image

                    color = 'text-red-500';

                  } else if (scoreDiff >= 40) {                    onChange={(e) => setNewClimberName(e.target.value)}

                    color = 'text-emerald-300';

                  } else if (scoreDiff >= 30) {                  />  }

                    color = 'text-teal-300';

                  } else if (scoreDiff >= 20) {                  <Button onClick={handleAddClimber}>Add Climber</Button>

                    color = 'text-emerald-400';

                  } else if (scoreDiff >= 10) {                </div>    if (!newClimberName.trim()) return;              className="dark:invert"

                    color = 'text-emerald-500';

                  } else {              </div>

                    color = 'text-emerald-600';

                  }  return (



                  return (              <div>

                    <tr key={s.id} className="border-b">

                      <td className="p-2">{s.date}</td>                <label className="block text-sm font-medium mb-2">Date</label>    <div className="space-y-8">    const newClimber = await createClimber(newClimberName.trim());              src="/vercel.svg"

                      <td className="p-2">{climber?.name}</td>

                      <td className={`p-2 font-bold ${color}`}>{displayScore}</td>                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />

                    </tr>

                  );              </div>      <div className="grid md:grid-cols-2 gap-8">

                })}

            </tbody>

          </table>

        </CardContent>              <div className="flex items-center gap-2">        {/* New Session Form */}    setClimbers([...climbers, newClimber]);              alt="Vercel logomark"

      </Card>

    </div>                <input

  );

}                  type="checkbox"        <Card>


                  checked={manualMode}

                  onChange={(e) => setManualMode(e.target.checked)}          <CardHeader>    setSelectedClimber(newClimber.id);              width={16}

                  id="manual-mode"

                />            <CardTitle>New Session</CardTitle>

                <label htmlFor="manual-mode">Manual Input Mode</label>

              </div>          </CardHeader>    setNewClimberName("");              height={16}



              {!manualMode ? (          <CardContent>

                <div className="space-y-4">

                  <h3 className="font-semibold">Add Climb</h3>            <form onSubmit={handleSubmit} className="space-y-4">  }            />

                  

                  <div>              {/* Climber Selection */}

                    <label className="block text-sm font-medium mb-2">Wall Section</label>

                    <select              <div>            Deploy Now

                      value={dropdownWall}

                      onChange={(e) => setDropdownWall(e.target.value as any)}                <label className="block text-sm font-medium mb-2">Climber</label>

                      className="w-full border rounded p-2"

                    >                <div className="flex gap-2">  async function handleSubmit(e: React.FormEvent) {          </a>

                      <option value="midWall">Mid Wall</option>

                      <option value="overhang">Overhang</option>                  <select

                      <option value="sideWall">Side Wall</option>

                    </select>                    value={selectedClimber || ""}    e.preventDefault();          <a

                  </div>

                    onChange={(e) => setSelectedClimber(Number(e.target.value))}

                  <div>

                    <label className="block text-sm font-medium mb-2">Color</label>                    className="flex-1 px-4 py-2.5 rounded-lg bg-slate-900/50 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"    if (!selectedClimber) return;            className="flex h-12 w-full items-center justify-center rounded-full border border-solid border-black/[.08] px-5 transition-colors hover:border-transparent hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a] md:w-[158px]"

                    <select

                      value={dropdownColor}                  >

                      onChange={(e) => setDropdownColor(e.target.value as keyof Counts)}

                      className="w-full border rounded p-2"                    <option value="">Select climber...</option>                href="https://nextjs.org/docs?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"

                    >

                      {ORDER.map((c) => (                    {climbers.map((c) => (

                        <option key={c} value={c}>{COLOR_NAMES[c]}</option>

                      ))}                      <option key={c.id} value={c.id}>    await createSession({            target="_blank"

                    </select>

                  </div>                        {c.name}



                  {(dropdownColor === 'red' || dropdownColor === 'black') && (                      </option>      climberId: selectedClimber,            rel="noopener noreferrer"

                    <div className="p-3 bg-red-900 rounded">

                      <label className="block font-bold mb-2">⚠️ Video Evidence Required</label>                    ))}

                      <Input

                        placeholder="Enter video URL (required for red/black)"                  </select>      date,          >

                        value={videoUrl}

                        onChange={(e) => setVideoUrl(e.target.value)}                </div>

                      />

                    </div>                <div className="flex gap-2 mt-2">      counts,            Documentation

                  )}

                  <Input

                  <Button onClick={addClimb}>Add Climb</Button>

                    placeholder="New climber name"      notes: notes.trim() || undefined,          </a>

                  <Card>

                    <CardHeader>                    value={newClimberName}

                      <CardTitle className="text-base">Current Progress</CardTitle>

                    </CardHeader>                    onChange={(e) => setNewClimberName(e.target.value)}    });        </div>

                    <CardContent className="text-sm space-y-1">

                      <div><strong>Mid Wall:</strong> {wallCounts.midWall.yellow}/{WALL_TOTALS.midWall.yellow} yellows, {wallCounts.midWall.orange}/{WALL_TOTALS.midWall.orange} oranges</div>                  />

                      <div><strong>Overhang:</strong> {wallCounts.overhang.yellow}/{WALL_TOTALS.overhang.yellow} yellows, {wallCounts.overhang.orange}/{WALL_TOTALS.overhang.orange} oranges</div>

                      <div><strong>Side Wall:</strong> {wallCounts.sideWall.yellow}/{WALL_TOTALS.sideWall.yellow} yellows, {wallCounts.sideWall.orange}/{WALL_TOTALS.sideWall.orange} oranges</div>                  <Button type="button" onClick={handleAddClimber} variant="outline">          </main>

                    </CardContent>

                  </Card>                    Add

                </div>

              ) : (                  </Button>    // Reset form    </div>

                <div className="space-y-4">

                  <h3 className="font-semibold">Wall Sections</h3>                </div>

                  

                  {(['overhang', 'midWall', 'sideWall'] as const).map((wall) => (              </div>    setCounts({ green: 0, blue: 0, yellow: 0, orange: 0, red: 0, black: 0 });  );

                    <div key={wall}>

                      <h4 className="font-medium mb-2 capitalize">{wall === 'midWall' ? 'Mid Wall' : wall === 'sideWall' ? 'Side Wall' : 'Overhang'}</h4>

                      <div className="grid grid-cols-3 gap-2">

                        {ORDER.map((color) => (              {/* Date */}    setNotes("");}

                          <div key={color}>

                            <label className="block text-xs mb-1">{COLOR_NAMES[color]}</label>              <div>

                            <Input

                              type="number"                <label className="block text-sm font-medium mb-2">Date</label>    await loadData();

                              min={0}

                              value={wallCounts[wall][color]}                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />  }

                              onChange={(e) => updateWallCount(wall, color, e.target.value)}

                            />              </div>

                          </div>

                        ))}  function updateCount(color: keyof Counts, value: string) {

                      </div>

                    </div>              {/* Color Counts */}    const num = parseInt(value) || 0;

                  ))}

                </div>              <div>    setCounts({ ...counts, [color]: Math.max(0, num) });

              )}

                <label className="block text-sm font-medium mb-3">Boulder Counts</label>  }

              <Button onClick={handleSubmit} className="w-full">Add Session</Button>

            </CardContent>                <div className="grid grid-cols-2 gap-3">

          </Card>

        </div>                  {ORDER.map((color) => (  const getColorClass = (color: keyof Counts) => {



        <div>                    <div key={color} className={`p-3 rounded-lg border ${getColorClass(color)}`}>    const colorMap = {

          <Card className="mb-6">

            <CardHeader>                      <label className="block text-xs font-medium mb-1 text-slate-300">      black: "bg-gray-900 border-gray-700",

              <CardTitle>Live Preview</CardTitle>

            </CardHeader>                        {COLOR_NAMES[color]} ({BASE[color]}pts)      red: "bg-red-900/30 border-red-700",

            <CardContent>

              <div className="text-4xl font-bold mb-4">                      </label>      orange: "bg-orange-900/30 border-orange-700",

                <AnimatedNumber value={currentScore} decimals={2} />

              </div>                      <Input      yellow: "bg-yellow-900/30 border-yellow-700",

              <div>

                <h4 className="font-semibold mb-2">Marginal +1</h4>                        type="number"      blue: "bg-blue-900/30 border-blue-700",

                {ORDER.map((color) => (

                  <div key={color} className="flex justify-between text-sm">                        min="0"      green: "bg-green-900/30 border-green-700",

                    <span>{COLOR_NAMES[color]}</span>

                    <span className="text-blue-500">+{marginalGain(totalCounts, color, 1).toFixed(2)}</span>                        value={counts[color] || ""}    };

                  </div>

                ))}                        onChange={(e) => updateCount(color, e.target.value)}    return colorMap[color];

              </div>

            </CardContent>                        placeholder="0"  };

          </Card>

                        className="text-center"

          <Card>

            <CardHeader>                      />  if (loading) {

              <CardTitle>Leaderboard</CardTitle>

            </CardHeader>                    </div>    return <div className="text-center py-12 text-slate-400">Loading...</div>;

            <CardContent>

              <ol className="list-decimal list-inside space-y-1">                  ))}  }

                {leaderboard.map((entry, i) => (

                  <li key={i}>                </div>

                    {entry.climber}: {entry.total_score.toFixed(2)}

                  </li>              </div>  return (

                ))}

              </ol>    <div className="space-y-8">

            </CardContent>

          </Card>              {/* Notes */}      <div className="grid md:grid-cols-2 gap-8">

        </div>

      </div>              <div>        {/* New Session Form */}



      <Card className="mt-6">                <label className="block text-sm font-medium mb-2">Notes (optional)</label>        <Card>

        <CardHeader>

          <CardTitle>Sessions</CardTitle>                <Input          <CardHeader>

        </CardHeader>

        <CardContent>                  placeholder="Wall sections, observations..."            <CardTitle>New Session</CardTitle>

          <table className="w-full">

            <thead>                  value={notes}          </CardHeader>

              <tr className="border-b">

                <th className="text-left p-2">Date</th>                  onChange={(e) => setNotes(e.target.value)}          <CardContent>

                <th className="text-left p-2">Climber</th>

                <th className="text-left p-2">Score Change</th>                />            <form onSubmit={handleSubmit} className="space-y-4">

              </tr>

            </thead>              </div>              {/* Climber Selection */}

            <tbody>

              {[...sessions]              <div>

                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

                .map((s) => {              <Button type="submit" className="w-full" disabled={!selectedClimber}>                <label className="block text-sm font-medium mb-2">Climber</label>

                  const climber = climbers.find((c) => c.id === s.climberId);

                  const climberSessions = sessions                Add Session                <div className="flex gap-2">

                    .filter((sess) => sess.climberId === s.climberId)

                    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());              </Button>                  <select

                  const sessionIndex = climberSessions.findIndex((sess) => sess.id === s.id);

                  const prevSession = sessionIndex > 0 ? climberSessions[sessionIndex - 1] : null;            </form>                    value={selectedClimber || ""}

                  const scoreDiff = prevSession ? s.score - prevSession.score : s.score;

                  const displayScore = scoreDiff >= 0 ? `+${scoreDiff.toFixed(2)}` : scoreDiff.toFixed(2);          </CardContent>                    onChange={(e) => setSelectedClimber(Number(e.target.value))}



                  return (        </Card>                    className="flex-1 px-4 py-2.5 rounded-lg bg-slate-900/50 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"

                    <tr key={s.id} className="border-b">

                      <td className="p-2">{s.date}</td>                  >

                      <td className="p-2">{climber?.name}</td>

                      <td className="p-2 text-green-600 font-bold">{displayScore}</td>        {/* Live Score Preview */}                    <option value="">Select climber...</option>

                    </tr>

                  );        <Card>                    {climbers.map((c) => (

                })}

            </tbody>          <CardHeader>                      <option key={c.id} value={c.id}>

          </table>

        </CardContent>            <CardTitle>Score Preview</CardTitle>                        {c.name}

      </Card>

    </div>          </CardHeader>                      </option>

  );

}          <CardContent className="space-y-6">                    ))}


            <div className="text-center py-6 border-b border-slate-800">                  </select>

              <div className="text-sm text-slate-400 mb-2">Current Score</div>                </div>

              <div className="text-5xl font-bold text-transparent bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text">                <div className="flex gap-2 mt-2">

                <AnimatedNumber value={currentScore} />                  <Input

              </div>                    placeholder="New climber name"

            </div>                    value={newClimberName}

                    onChange={(e) => setNewClimberName(e.target.value)}

            <div>                  />

              <h4 className="text-sm font-medium mb-3 text-slate-300">Marginal Gains (add +1)</h4>                  <Button type="button" onClick={handleAddClimber} variant="outline">

              <div className="space-y-2">                    Add

                {ORDER.map((color) => {                  </Button>

                  const gain = marginalGain(counts, color, 1);                </div>

                  return (              </div>

                    <div

                      key={color}              {/* Date */}

                      className="flex justify-between items-center p-2 rounded bg-slate-900/30"              <div>

                    >                <label className="block text-sm font-medium mb-2">Date</label>

                      <span className="text-sm text-slate-400">{COLOR_NAMES[color]}</span>                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />

                      <span className="text-sm font-medium text-blue-400">              </div>

                        +{gain.toFixed(2)}

                      </span>              {/* Color Counts */}

                    </div>              <div>

                  );                <label className="block text-sm font-medium mb-3">Boulder Counts</label>

                })}                <div className="grid grid-cols-2 gap-3">

              </div>                  {ORDER.map((color) => (

            </div>                    <div key={color} className={`p-3 rounded-lg border ${getColorClass(color)}`}>

          </CardContent>                      <label className="block text-xs font-medium mb-1 text-slate-300">

        </Card>                        {COLOR_NAMES[color]} ({BASE[color]}pts)

      </div>                      </label>

                      <Input

      {/* Sessions Table */}                        type="number"

      <Card>                        min="0"

        <CardHeader>                        value={counts[color] || ""}

          <CardTitle>Recent Sessions</CardTitle>                        onChange={(e) => updateCount(color, e.target.value)}

        </CardHeader>                        placeholder="0"

        <CardContent>                        className="text-center"

          <div className="overflow-x-auto">                      />

            <table className="w-full">                    </div>

              <thead>                  ))}

                <tr className="border-b border-slate-800">                </div>

                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">Date</th>              </div>

                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">

                    Climber              {/* Notes */}

                  </th>              <div>

                  {ORDER.map((color) => (                <label className="block text-sm font-medium mb-2">Notes (optional)</label>

                    <th                <Input

                      key={color}                  placeholder="Wall sections, observations..."

                      className="text-center py-3 px-2 text-xs font-medium text-slate-400"                  value={notes}

                    >                  onChange={(e) => setNotes(e.target.value)}

                      {color.charAt(0).toUpperCase()}                />

                    </th>              </div>

                  ))}

                  <th className="text-right py-3 px-4 text-sm font-medium text-slate-400">              <Button type="submit" className="w-full" disabled={!selectedClimber}>

                    Score                Add Session

                  </th>              </Button>

                </tr>            </form>

              </thead>          </CardContent>

              <tbody>        </Card>

                {sessions.map((session) => {

                  const climber = climbers.find((c) => c.id === session.climberId);        {/* Live Score Preview */}

                  return (        <Card>

                    <tr key={session.id} className="border-b border-slate-800/50 hover:bg-slate-900/30">          <CardHeader>

                      <td className="py-3 px-4 text-sm">{session.date}</td>            <CardTitle>Score Preview</CardTitle>

                      <td className="py-3 px-4 text-sm">{climber?.name || "Unknown"}</td>          </CardHeader>

                      {ORDER.map((color) => (          <CardContent className="space-y-6">

                        <td key={color} className="py-3 px-2 text-center text-sm text-slate-400">            <div className="text-center py-6 border-b border-slate-800">

                          {session[color] || 0}              <div className="text-sm text-slate-400 mb-2">Current Score</div>

                        </td>              <div className="text-5xl font-bold text-transparent bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text">

                      ))}                <AnimatedNumber value={currentScore} />

                      <td className="py-3 px-4 text-right text-sm font-medium text-blue-400">              </div>

                        {session.score.toFixed(2)}            </div>

                      </td>

                    </tr>            <div>

                  );              <h4 className="text-sm font-medium mb-3 text-slate-300">Marginal Gains (add +1)</h4>

                })}              <div className="space-y-2">

                {sessions.length === 0 && (                {ORDER.map((color) => {

                  <tr>                  const gain = marginalGain(counts, color, 1);

                    <td colSpan={9} className="py-8 text-center text-slate-500">                  return (

                      No sessions yet. Add your first session above!                    <div

                    </td>                      key={color}

                  </tr>                      className="flex justify-between items-center p-2 rounded bg-slate-900/30"

                )}                    >

              </tbody>                      <span className="text-sm text-slate-400">{COLOR_NAMES[color]}</span>

            </table>                      <span className="text-sm font-medium text-blue-400">

          </div>                        +{gain.toFixed(2)}

        </CardContent>                      </span>

      </Card>                    </div>

    </div>                  );

  );                })}

}              </div>

            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sessions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Sessions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">Date</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">
                    Climber
                  </th>
                  {ORDER.map((color) => (
                    <th
                      key={color}
                      className="text-center py-3 px-2 text-xs font-medium text-slate-400"
                    >
                      {color.charAt(0).toUpperCase()}
                    </th>
                  ))}
                  <th className="text-right py-3 px-4 text-sm font-medium text-slate-400">
                    Score
                  </th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((session) => {
                  const climber = climbers.find((c) => c.id === session.climberId);
                  return (
                    <tr key={session.id} className="border-b border-slate-800/50 hover:bg-slate-900/30">
                      <td className="py-3 px-4 text-sm">{session.date}</td>
                      <td className="py-3 px-4 text-sm">{climber?.name || "Unknown"}</td>
                      {ORDER.map((color) => (
                        <td key={color} className="py-3 px-2 text-center text-sm text-slate-400">
                          {session[color] || 0}
                        </td>
                      ))}
                      <td className="py-3 px-4 text-right text-sm font-medium text-blue-400">
                        {session.score.toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
                {sessions.length === 0 && (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-500">
                      No sessions yet. Add your first session above!
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
