"use client";
import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { getSessions, getClimbers } from "@/lib/api";
import { Session, Climber } from "@/lib/types";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { ORDER, COLOR_NAMES } from "@/lib/scoring";

export default function AnalyticsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [climbers, setClimbers] = useState<Climber[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const [s, c] = await Promise.all([getSessions(), getClimbers()]);
    setSessions(s.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
    setClimbers(c);
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-xl text-slate-400 animate-pulse">Loading...</div>
      </div>
    );
  }

  const scoreOverTimeData = sessions.map((s) => {
    const climber = climbers.find((c) => c.id === s.climberId);
    return { date: s.date, score: s.score, climber: climber?.name || "Unknown" };
  });

  const colorTotalsData = climbers.map((climber) => {
    const climberSess = sessions.filter((s) => s.climberId === climber.id);
    const totals: any = { climber: climber.name };
    ORDER.forEach((color) => {
      totals[color] = climberSess.reduce((sum, s) => sum + (s[color] || 0), 0);
    });
    return totals;
  });

  const topSessions = [...sessions].sort((a, b) => b.score - a.score).slice(0, 10).map((s) => {
    const climber = climbers.find((c) => c.id === s.climberId);
    return { label: `${climber?.name || "Unknown"} - ${s.date}`, score: s.score };
  });

  const colors = ["#3b82f6", "#a855f7", "#ec4899", "#f59e0b", "#10b981", "#06b6d4"];

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="text-center space-y-4 py-8">
        <h1 className="text-5xl font-bold bg-gradient-to-r from-green-400 via-blue-500 to-purple-500 bg-clip-text text-transparent">
          📊 Analytics
        </h1>
        <p className="text-slate-400 text-lg">Visualize your climbing progress and performance metrics</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>📈 Session Score Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          {sessions.length > 0 ? (
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={scoreOverTimeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="date" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #475569" }} />
                <Legend />
                {climbers.map((climber, idx) => (
                  <Line
                    key={climber.id}
                    type="monotone"
                    dataKey={(d) => (d.climber === climber.name ? d.score : null)}
                    name={climber.name}
                    stroke={colors[idx % colors.length]}
                    strokeWidth={3}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-16 text-slate-500">No data yet</div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>🎨 Total Sends by Difficulty</CardTitle>
        </CardHeader>
        <CardContent>
          {climbers.length > 0 ? (
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={colorTotalsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="climber" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #475569" }} />
                <Legend />
                {ORDER.map((color, idx) => (
                  <Bar key={color} dataKey={color} name={COLOR_NAMES[color]} fill={colors[idx % colors.length]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-16 text-slate-500">No data yet</div>
          )}
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/30">
          <CardContent className="pt-6 text-center">
            <div className="text-5xl font-bold text-transparent bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text">
              {sessions.length}
            </div>
            <div className="text-slate-400 mt-2">Total Sessions</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/30">
          <CardContent className="pt-6 text-center">
            <div className="text-5xl font-bold text-transparent bg-gradient-to-r from-purple-400 to-purple-600 bg-clip-text">
              {climbers.length}
            </div>
            <div className="text-slate-400 mt-2">Active Climbers</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/30">
          <CardContent className="pt-6 text-center">
            <div className="text-5xl font-bold text-transparent bg-gradient-to-r from-green-400 to-green-600 bg-clip-text">
              {sessions.reduce((sum, s) => sum + ORDER.reduce((total, color) => total + (s[color] || 0), 0), 0)}
            </div>
            <div className="text-slate-400 mt-2">Total Climbs</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
