'use client';

import { useEffect, useState } from 'react';
import { getVideos, voteOnVideo, approveVideo, rejectVideo } from '@/lib/api';
import { VideoReview } from '@/lib/types';

export default function VideosPage() {
  const [videos, setVideos] = useState<VideoReview[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
    loadVideos();
  }, [filter]);

  const checkAuth = () => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('userRole');
    setIsAuthenticated(!!token);
    setIsAdmin(role === 'admin');
  };

  const loadVideos = async () => {
    setLoading(true);
    const status = filter === 'all' ? undefined : filter;
    const data = await getVideos(status);
    setVideos(data);
    setLoading(false);
  };

  const handleVote = async (videoId: number, vote: 'up' | 'down') => {
    if (!isAuthenticated) {
      alert('Please log in to vote');
      return;
    }

    try {
      await voteOnVideo(videoId, vote);
      await loadVideos();
    } catch (error) {
      console.error('Vote failed:', error);
      alert('Failed to submit vote');
    }
  };

  const handleApprove = async (videoId: number) => {
    if (!isAdmin) {
      alert('Admin access required');
      return;
    }

    try {
      await approveVideo(videoId);
      await loadVideos();
    } catch (error) {
      console.error('Approval failed:', error);
      alert('Failed to approve video');
    }
  };

  const handleReject = async (videoId: number) => {
    if (!isAdmin) {
      alert('Admin access required');
      return;
    }

    try {
      await rejectVideo(videoId);
      await loadVideos();
    } catch (error) {
      console.error('Rejection failed:', error);
      alert('Failed to reject video');
    }
  };

  const getVoteCount = (video: VideoReview) => {
    const votes = video.votes || [];
    const upvotes = votes.filter(v => v.vote === 'up').length;
    const downvotes = votes.filter(v => v.vote === 'down').length;
    return { upvotes, downvotes, total: upvotes - downvotes };
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-purple-900/20 to-gray-900 px-4 py-12">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-purple-400 via-pink-400 to-red-400 text-transparent bg-clip-text">
            🎥 Video Evidence Review
          </h1>
          <p className="text-gray-400 text-lg">
            Review and vote on climbing video submissions
          </p>
          {!isAuthenticated && (
            <div className="mt-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 max-w-2xl mx-auto">
              <p className="text-yellow-300 text-sm">
                👀 Viewing mode: Log in to vote on videos
              </p>
            </div>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-8 justify-center flex-wrap">
          {(['all', 'pending', 'approved', 'rejected'] as const).map(status => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-6 py-2 rounded-lg font-medium transition-all ${
                filter === status
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-gray-400 mt-4">Loading videos...</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && videos.length === 0 && (
          <div className="text-center py-12 bg-white/5 rounded-xl border border-white/10">
            <p className="text-gray-400 text-lg">No videos found</p>
            <p className="text-gray-500 text-sm mt-2">
              {filter === 'pending' && 'No videos waiting for review'}
              {filter === 'approved' && 'No approved videos yet'}
              {filter === 'rejected' && 'No rejected videos'}
              {filter === 'all' && 'No video submissions yet'}
            </p>
          </div>
        )}

        {/* Video Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {videos.map(video => {
            const { upvotes, downvotes, total } = getVoteCount(video);
            
            return (
              <div
                key={video.id}
                className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden hover:border-purple-500/50 transition-all"
              >
                {/* Video Player */}
                <div className="aspect-video bg-black">
                  <video
                    src={video.video_url}
                    controls
                    className="w-full h-full"
                  />
                </div>

                {/* Video Info */}
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-1">
                        {video.climber_name}
                      </h3>
                      <p className="text-sm text-gray-400">
                        {video.color} • {video.wall}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(video.created_at).toLocaleDateString()}
                      </p>
                    </div>

                    {/* Status Badge */}
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        video.status === 'approved'
                          ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                          : video.status === 'rejected'
                          ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                          : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                      }`}
                    >
                      {video.status}
                    </span>
                  </div>

                  {/* Vote Counts */}
                  <div className="flex items-center gap-4 mb-4 pb-4 border-b border-white/10">
                    <div className="flex items-center gap-2">
                      <span className="text-green-400">👍</span>
                      <span className="text-white font-medium">{upvotes}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-red-400">👎</span>
                      <span className="text-white font-medium">{downvotes}</span>
                    </div>
                    <div className="ml-auto">
                      <span className="text-gray-400 text-sm">Score: </span>
                      <span className={`font-semibold ${total >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {total > 0 ? '+' : ''}{total}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    {/* Voting Buttons */}
                    <button
                      onClick={() => handleVote(video.id, 'up')}
                      disabled={!isAuthenticated}
                      className="flex-1 px-4 py-2 bg-green-500/20 hover:bg-green-500/30 disabled:bg-gray-500/10 disabled:cursor-not-allowed text-green-400 disabled:text-gray-500 rounded-lg font-medium transition-all border border-green-500/30 disabled:border-gray-500/20"
                    >
                      👍 Upvote
                    </button>
                    <button
                      onClick={() => handleVote(video.id, 'down')}
                      disabled={!isAuthenticated}
                      className="flex-1 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 disabled:bg-gray-500/10 disabled:cursor-not-allowed text-red-400 disabled:text-gray-500 rounded-lg font-medium transition-all border border-red-500/30 disabled:border-gray-500/20"
                    >
                      👎 Downvote
                    </button>
                  </div>

                  {/* Admin Controls */}
                  {isAdmin && video.status === 'pending' && (
                    <div className="flex gap-2 mt-3 pt-3 border-t border-white/10">
                      <button
                        onClick={() => handleApprove(video.id)}
                        className="flex-1 px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg font-medium transition-all border border-blue-500/30"
                      >
                        ✅ Approve
                      </button>
                      <button
                        onClick={() => handleReject(video.id)}
                        className="flex-1 px-4 py-2 bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 rounded-lg font-medium transition-all border border-orange-500/30"
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
      </div>
    </div>
  );
}
