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
    return <div className="text-center py-12 text-slate-400">Loading...</div>;
  }

  // Group sessions by climber for time series
  const climberSessions = climbers.map((climber) => ({
    name: climber.name,
    sessions: sessions.filter((s) => s.climberId === climber.id),
  }));

  // Score over time data
  const scoreOverTimeData = sessions.map((s) => {
    const climber = climbers.find((c) => c.id === s.climberId);
    return {
      date: s.date,
      score: s.score,
      climber: climber?.name || "Unknown",
    };
  });

  // Total sends by color per climber
  const colorTotalsData = climbers.map((climber) => {
    const climberSess = sessions.filter((s) => s.climberId === climber.id);
    const totals: any = { climber: climber.name };
    ORDER.forEach((color) => {
      totals[color] = climberSess.reduce((sum, s) => sum + (s[color] || 0), 0);
    });
    return totals;
  });

  // Top sessions
  const topSessions = [...sessions]
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
    .map((s) => {
      const climber = climbers.find((c) => c.id === s.climberId);
      return {
        label: `${climber?.name || "Unknown"} - ${s.date}`,
        score: s.score,
      };
    });

  const colors = ["#3b82f6", "#a855f7", "#ec4899", "#f59e0b", "#10b981"];

  return (
    <div className="space-y-8">
      {/* Session Score Over Time */}
      <Card>
        <CardHeader>
          <CardTitle>Session Score Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={scoreOverTimeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="date" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip
                contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #475569" }}
              />
              <Legend />
              {climbers.map((climber, idx) => (
                <Line
                  key={climber.id}
                  type="monotone"
                  dataKey={(d) => (d.climber === climber.name ? d.score : null)}
                  name={climber.name}
                  stroke={colors[idx % colors.length]}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Total Sends by Color */}
      <Card>
        <CardHeader>
          <CardTitle>Total Sends by Color</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={colorTotalsData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="climber" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip
                contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #475569" }}
              />
              <Legend />
              {ORDER.map((color, idx) => (
                <Bar key={color} dataKey={color} name={COLOR_NAMES[color]} fill={colors[idx % colors.length]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Top Sessions */}
      <Card>
        <CardHeader>
          <CardTitle>Top 10 Sessions</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topSessions} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis type="number" stroke="#94a3b8" />
              <YAxis dataKey="label" type="category" width={200} stroke="#94a3b8" />
              <Tooltip
                contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #475569" }}
              />
              <Bar dataKey="score" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
