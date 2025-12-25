'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  FolderOpen,
  FileCode,
  ArrowUp,
  Globe,
  Database,
  AlertCircle,
  Loader2,
  Search,
  Layout,
  History,
  FileText
} from 'lucide-react';

type NodeItem = {
  id: string;
  label: string;
  content?: string;
  type?: 'root' | 'page';
};

type ExplorerData = {
  current: NodeItem | null;
  children: NodeItem[];
  parents: NodeItem[];
  nodes?: NodeItem[]; // Fallback for root view (History)
};

export default function Home() {
  const [viewMode, setViewMode] = useState<'landing' | 'explorer'>('landing');
  const [url, setUrl] = useState('');
  const [status, setStatus] = useState('');
  const [history, setHistory] = useState<NodeItem[]>([]);
  const [data, setData] = useState<ExplorerData>({ current: null, children: [], parents: [] });
  const [loading, setLoading] = useState(false);

  // Fetch History (Roots)
  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/tree`);
      if (res.ok) {
        const json = await res.json();
        if (json.nodes) {
          setHistory(json.nodes);
        }
      }
    } catch (error) {
      console.error("Failed to fetch history:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch Focused Node
  const fetchNode = useCallback(async (targetUrl: string) => {
    if (!targetUrl) return;
    setLoading(true);
    try {
      const query = `?url=${encodeURIComponent(targetUrl)}`;
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/tree${query}`);
      if (res.ok) {
        const json = await res.json();
        if (!json.error) {
          setData(json);
          setViewMode('explorer');
        } else {
          setStatus("Node not found");
        }
      }
    } catch (error) {
      console.error("Failed to fetch node:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // Triggers a shallow scan (depth=1)
  const triggerScan = useCallback(async (targetUrl: string) => {
    if (!targetUrl) return;
    setStatus(`Scanning ${targetUrl}...`);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: targetUrl, max_depth: 1 }),
      });
      if (res.ok) {
        const resJson = await res.json();
        setStatus(`Scan started: ${resJson.task_id}`);
        // Refresh data after a short delay
        setTimeout(() => fetchNode(targetUrl), 2000);
        setTimeout(() => fetchNode(targetUrl), 5000);
      } else {
        setStatus('Failed to start scan');
      }
    } catch (error) {
      console.error(error);
      setStatus('scan error');
    }
  }, [fetchNode]);

  const handleNavigate = (targetUrl: string) => {
    setUrl(targetUrl);
    fetchNode(targetUrl);
    triggerScan(targetUrl);
  };

  const handleManualScan = () => {
    if (!url) return;
    handleNavigate(url);
  };

  const handleHistoryClick = (targetUrl: string) => {
    setUrl(targetUrl);
    fetchNode(targetUrl);
  };

  const handleReset = async () => {
    if (!confirm("Are you sure you want to delete all data?")) return;
    setStatus('Resetting DB...');
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/reset`, { method: 'POST' });
      if (res.ok) {
        setStatus('Database reset.');
        setUrl('');
        setHistory([]);
        setData({ current: null, children: [], parents: [] });
        setViewMode('landing');
        fetchHistory();
      } else {
        setStatus('Failed to reset DB');
      }
    } catch (error) {
      console.error(error);
      setStatus('Error resetting DB');
    }
  };

  return (
    <div className="flex h-screen w-full flex-col bg-slate-50 text-slate-900 font-sans">
      {/* Header */}
      <header className="flex h-16 items-center justify-between border-b bg-white px-6 shadow-sm z-10">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setViewMode('landing')}>
          <Globe className="h-6 w-6 text-blue-600" />
          <h1 className="text-xl font-bold tracking-tight text-slate-800">Semantic Explorer</h1>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative group">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleManualScan()}
              placeholder="https://example.com"
              className="w-96 rounded-full border border-slate-200 bg-slate-100 px-4 py-2 text-sm transition-all focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 outline-none"
            />
          </div>
          <button
            onClick={handleManualScan}
            className="rounded-full bg-blue-600 px-5 py-2 text-sm font-medium text-white shadow-md hover:bg-blue-700 hover:shadow-lg transition-all active:scale-95 flex items-center gap-2"
          >
            <Search className="h-4 w-4" /> Go
          </button>
          <button onClick={handleReset} className="rounded-full border border-red-200 bg-white px-3 py-2 text-red-600 hover:bg-red-50 hover:border-red-300" title="Reset DB"><Database className="h-4 w-4" /></button>
        </div>
      </header>

      <main className="flex flex-1 overflow-hidden">
        {viewMode === 'landing' ? (
          /* LANDING VIEW */
          <div className="flex flex-1 flex-col items-center justify-center p-10 bg-slate-50">
            <div className="w-full max-w-4xl text-center mb-10">
              <h2 className="text-3xl font-bold text-slate-800 mb-4">Start a New Investigation</h2>
              <p className="text-slate-500">Enter a URL above to begin or select a recent session below.</p>
            </div>

            <div className="w-full max-w-4xl">
              <div className="flex items-center gap-2 mb-4 text-slate-400 font-semibold uppercase text-sm tracking-wider">
                <History className="h-4 w-4" /> Recent Investigations
              </div>
              {loading && history.length === 0 ? (
                <div className="flex justify-center p-10"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /></div>
              ) : history.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400">No recent history found.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {history.map(item => (
                    <div
                      key={item.id}
                      onClick={() => handleHistoryClick(item.id)}
                      className="bg-white rounded-lg border border-slate-200 p-4 hover:shadow-md hover:border-blue-300 cursor-pointer transition-all group flex items-start gap-4"
                    >
                      <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-500 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                        <Globe className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-slate-800 truncate group-hover:text-blue-600">{item.label}</h3>
                        <p className="text-xs text-slate-400 truncate">{item.id}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* EXPLORER VIEW (3-Pane) */
          <div className="flex w-full h-full">
            {/* 1. LEFT PANE: Navigation (25%) */}
            <section className="w-1/4 min-w-[300px] border-r bg-white flex flex-col">
              <div className="p-4 border-b bg-slate-50 font-semibold text-slate-700 flex items-center gap-2">
                <FolderOpen className="h-4 w-4 text-blue-500" /> Structure
              </div>
              <div className="flex-1 overflow-y-auto p-2">
                {/* Parents */}
                {data.parents.map(p => (
                  <div key={p.id} onClick={() => handleNavigate(p.id)} className="flex items-center gap-2 p-2 hover:bg-slate-100 rounded cursor-pointer text-sm text-slate-600 mb-1">
                    <ArrowUp className="h-4 w-4" /> <span className="truncate">.. {p.label}</span>
                  </div>
                ))}
                <hr className="my-2 border-slate-100" />
                {/* Current */}
                <div className="p-2 bg-blue-50 rounded text-sm font-bold text-blue-800 truncate mb-2 border border-blue-100">
                  {data.current?.label || 'Loading...'}
                </div>
                {/* Children */}
                {data.children.map(c => (
                  <div key={c.id} onClick={() => handleNavigate(c.id)} className="flex items-center gap-2 p-2 hover:bg-slate-100 rounded cursor-pointer text-sm group">
                    <FileCode className="h-4 w-4 text-slate-400 group-hover:text-blue-500" />
                    <span className="truncate flex-1">{c.label}</span>
                  </div>
                ))}
                {data.children.length === 0 && !loading && (
                  <div className="text-center p-4 text-slate-400 text-xs italic">No children found.</div>
                )}
              </div>
            </section>

            {/* 2. MIDDLE PANE: Content (50%) */}
            <section className="flex-1 min-w-[400px] bg-white flex flex-col border-r w-full h-full relative">
              {/* Loading Overlay */}
              {loading && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/80">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                </div>
              )}

              <div className="p-4 border-b bg-slate-50 font-semibold text-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-2"><FileText className="h-4 w-4 text-blue-500" /> Page Preview</div>
                <div className="text-xs text-slate-400">{status}</div>
              </div>

              <div className="flex-1 bg-gray-100 relative">
                {data.current?.id ? (
                  <iframe
                    src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/render?url=${encodeURIComponent(data.current.id)}`}
                    className="w-full h-full border-none bg-white"
                    title="Content Preview"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400">
                    <p>Select a page to view content</p>
                  </div>
                )}
              </div>
            </section>

            {/* 3. RIGHT PANE: Data/Analysis (25%) */}
            <section className="w-1/4 min-w-[300px] bg-slate-50 flex flex-col">
              <div className="p-4 border-b bg-white font-semibold text-slate-700 flex items-center gap-2">
                <Database className="h-4 w-4 text-blue-500" /> Structured Data
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                <div className="bg-white rounded border border-slate-200 p-4 shadow-sm mb-4">
                  <span className="text-xs font-bold text-slate-400 uppercase">Metadata</span>
                  <div className="mt-2 text-sm text-slate-700 font-mono break-all">
                    <p><span className="text-slate-400">ID:</span> {data.current?.id}</p>
                    <p className="mt-2"><span className="text-slate-400">Type:</span> Page</p>
                  </div>
                </div>

                {/* Future Placeholders for extracted entities */}
                <div className="bg-white rounded border border-slate-200 p-4 shadow-sm opacity-60">
                  <span className="text-xs font-bold text-slate-400 uppercase">Entities (Coming Soon)</span>
                  <div className="mt-2 h-20 bg-slate-100 rounded flex items-center justify-center text-xs text-slate-400">
                    AI Analysis Pending...
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
