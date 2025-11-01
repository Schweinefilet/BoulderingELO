"use client";
import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Leaderboard</CardTitle>
            <div className="flex gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">From</label>
                <Input
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="w-40"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">To</label>
                <Input
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="w-40"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12 text-slate-400">Loading...</div>
          ) : (
            <div className="space-y-3">
              {entries.map((entry, idx) => (
                <div
                  key={entry.climber}
                  className="flex items-center justify-between p-4 rounded-lg bg-slate-900/30 hover:bg-slate-900/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${
                        idx === 0
                          ? "bg-gradient-to-br from-yellow-500 to-yellow-600 text-yellow-950"
                          : idx === 1
                          ? "bg-gradient-to-br from-slate-400 to-slate-500 text-slate-950"
                          : idx === 2
                          ? "bg-gradient-to-br from-orange-600 to-orange-700 text-orange-950"
                          : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      {idx + 1}
                    </div>
                    <div>
                      <div className="font-medium text-white">{entry.climber}</div>
                      <div className="text-sm text-slate-400">
                        {from || to ? "Filtered Score" : "Lifetime Score"}
                      </div>
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-transparent bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text">
                    {entry.total_score.toFixed(2)}
                  </div>
                </div>
              ))}
              {entries.length === 0 && (
                <div className="text-center py-12 text-slate-500">
                  No sessions found for this date range.
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
