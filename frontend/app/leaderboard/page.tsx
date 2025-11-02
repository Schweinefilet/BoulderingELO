"use client";
import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getLeaderboard } from "@/lib/api";
import { LeaderboardEntry } from "@/lib/types";

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLeaderboard();
  }, [from, to]);

  async function loadLeaderboard() {
    setLoading(true);
    const data = await getLeaderboard({ from: from || undefined, to: to || undefined });
    setEntries(data);
    setLoading(false);
  }

  function clearFilters() {
    setFrom("");
    setTo("");
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Hero Section */}
      <div className="text-center space-y-4 py-8">
        <h1 className="text-5xl font-bold bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 bg-clip-text text-transparent">
          🏆 Leaderboard
        </h1>
        <p className="text-slate-400 text-lg">Compete with fellow climbers and track rankings</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <CardTitle className="text-2xl">Rankings</CardTitle>
            <div className="flex flex-wrap gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">From Date</label>
                <Input
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="w-40"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">To Date</label>
                <Input
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="w-40"
                />
              </div>
              {(from || to) && (
                <div className="flex items-end">
                  <Button onClick={clearFilters} variant="ghost" className="h-[42px]">
                    Clear
                  </Button>
                </div>
              )}
            </div>
          </div>
          {(from || to) && (
            <p className="text-sm text-slate-400 mt-2">
              Showing scores for {from || "start"} to {to || "now"}
            </p>
          )}
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12">
              <div className="text-xl text-slate-400 animate-pulse">Loading...</div>
            </div>
          ) : (
            <div className="space-y-3">
              {entries.map((entry, idx) => (
                <div
                  key={entry.climber}
                  className={`flex items-center justify-between p-5 rounded-xl transition-all duration-200 ${
                    idx === 0
                      ? "bg-gradient-to-r from-yellow-500/20 to-yellow-600/10 border-2 border-yellow-500/40 shadow-lg shadow-yellow-500/20"
                      : idx === 1
                      ? "bg-gradient-to-r from-slate-400/20 to-slate-500/10 border-2 border-slate-400/40"
                      : idx === 2
                      ? "bg-gradient-to-r from-orange-600/20 to-orange-700/10 border-2 border-orange-600/40"
                      : "bg-slate-900/30 border border-slate-700 hover:bg-slate-900/50 hover:border-slate-600"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-14 h-14 rounded-full flex items-center justify-center font-bold text-xl shadow-lg ${
                        idx === 0
                          ? "bg-gradient-to-br from-yellow-400 to-yellow-600 text-yellow-950 shadow-yellow-500/50"
                          : idx === 1
                          ? "bg-gradient-to-br from-slate-300 to-slate-500 text-slate-950 shadow-slate-500/50"
                          : idx === 2
                          ? "bg-gradient-to-br from-orange-500 to-orange-700 text-orange-950 shadow-orange-500/50"
                          : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      {idx + 1}
                    </div>
                    <div>
                      <div className="font-semibold text-white text-lg">{entry.climber}</div>
                      <div className="text-sm text-slate-400">
                        {from || to ? "Period Score" : "Lifetime Score"}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-transparent bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text">
                      {entry.total_score.toFixed(2)}
                    </div>
                    <div className="text-xs text-slate-500">points</div>
                  </div>
                </div>
              ))}
              {entries.length === 0 && (
                <div className="text-center py-20">
                  <div className="text-6xl mb-4">🏔️</div>
                  <div className="text-xl text-slate-500 mb-2">No sessions found</div>
                  <div className="text-sm text-slate-600">
                    {from || to ? "Try adjusting your date filters" : "Start climbing to see rankings!"}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
