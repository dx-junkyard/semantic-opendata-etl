'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  FolderOpen,
  FileCode,
  ArrowUp,
  Globe,
  Database,
  AlertCircle,
  Loader2
} from 'lucide-react';

type NodeItem = {
  id: string;
  label: string;
  type?: 'root' | 'page';
};

type ExplorerData = {
  current: NodeItem | null;
  children: NodeItem[];
  parents: NodeItem[];
  nodes?: NodeItem[]; // Fallback for root view
};

export default function Home() {
  const [url, setUrl] = useState('');
  const [status, setStatus] = useState('');
  const [data, setData] = useState<ExplorerData>({ current: null, children: [], parents: [] });
  const [loading, setLoading] = useState(false);

  // Fetch focused data for a specific URL (or roots if empty)
  const fetchData = useCallback(async (targetUrl: string) => {
    setLoading(true);
    try {
      const query = targetUrl ? `?url=${encodeURIComponent(targetUrl)}` : '';
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/tree${query}`);
      if (res.ok) {
        const json = await res.json();
        // Handle "root view" vs "focused view" structure
        if (json.nodes) {
          setData({ current: null, children: json.nodes, parents: [] });
        } else {
          setData(json);
        }
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchData('');
  }, [fetchData]);

  // Triggers a shallow scan (depth=1)
  const triggerScan = useCallback(async (targetUrl: string) => {
    if (!targetUrl) return;
    setStatus(`Scanning ${targetUrl}...`);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/scan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: targetUrl, max_depth: 1 }),
      });
      if (res.ok) {
        const resJson = await res.json();
        setStatus(`Scan started: ${resJson.task_id}`);
        // Refresh data after a short delay
        setTimeout(() => fetchData(targetUrl), 2000);
        setTimeout(() => fetchData(targetUrl), 5000);
      } else {
        setStatus('Failed to start scan');
      }
    } catch (error) {
      console.error(error);
      setStatus('scan error');
    }
  }, [fetchData]);

  // Handle navigation
  const handleNavigate = (targetUrl: string) => {
    setUrl(targetUrl);
    fetchData(targetUrl);
    // User requested auto-scan on navigation
    triggerScan(targetUrl);
  };

  const handleManualScan = () => {
    handleNavigate(url);
  };

  const handleReset = async () => {
    if (!confirm("Are you sure you want to delete all data?")) return;
    setStatus('Resetting DB...');
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/reset`, {
        method: 'POST'
      });
      if (res.ok) {
        setStatus('Database reset.');
        setUrl('');
        fetchData('');
        setData({ current: null, children: [], parents: [] });
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
        <div className="flex items-center gap-2">
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
            className="rounded-full bg-blue-600 px-5 py-2 text-sm font-medium text-white shadow-md hover:bg-blue-700 hover:shadow-lg transition-all active:scale-95"
          >
            Go / Scan
          </button>
          <button
            onClick={handleReset}
            className="rounded-full border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 hover:border-red-300 transition-all"
            title="Clear Analysis Data"
          >
            <Database className="h-4 w-4" />
          </button>
        </div>
      </header>

      <main className="flex flex-1 overflow-hidden">
        {/* Explorer Pane */}
        <section className="flex flex-1 flex-col overflow-hidden bg-white">
          {/* Breadcrumb / Current Location */}
          <div className="flex items-center gap-2 border-b bg-slate-50 px-6 py-3 text-sm font-medium text-slate-600">
            <FolderOpen className="h-4 w-4 text-blue-500" />
            <span className="truncate">{data.current ? data.current.id : 'Root / Recent Items'}</span>
            {loading && <Loader2 className="h-4 w-4 animate-spin ml-auto text-slate-400" />}
            {status && <span className="ml-4 text-xs font-normal text-slate-400 italic">{status}</span>}
          </div>

          {/* File List */}
          <div className="flex-1 overflow-y-auto p-6">

            {/* Parents (Up) */}
            {data.parents.map(p => (
              <div
                key={p.id}
                onClick={() => handleNavigate(p.id)}
                className="flex items-center gap-3 rounded-lg px-4 py-3 hover:bg-slate-100 cursor-pointer group transition-colors mb-1"
              >
                <ArrowUp className="h-5 w-5 text-slate-400 group-hover:text-slate-600" />
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-slate-700 group-hover:text-blue-700">.. (Parent)</span>
                  <span className="text-xs text-slate-400 truncate max-w-xl">{p.label}</span>
                </div>
              </div>
            ))}

            {/* Divider if parents exist */}
            {data.parents.length > 0 && <hr className="my-2 border-slate-100" />}

            {/* Children / Current Items */}
            {data.children.length === 0 && !loading ? (
              <div className="flex flex-col items-center justify-center h-40 text-slate-400">
                <AlertCircle className="h-8 w-8 mb-2 opacity-20" />
                <p>No links found or not scanned yet.</p>
                <button onClick={() => triggerScan(data.current?.id || url)} className="mt-2 text-blue-500 hover:underline text-sm">Force Scan Current</button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-1">
                {data.children.map(child => (
                  <div
                    key={child.id}
                    onClick={() => handleNavigate(child.id)}
                    className="group flex items-center gap-3 rounded-lg border border-transparent px-4 py-3 hover:border-slate-200 hover:bg-slate-50 hover:shadow-sm cursor-pointer transition-all"
                    title={child.label} // Tooltip
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-500 group-hover:bg-blue-100 group-hover:text-blue-600">
                      <FileCode className="h-5 w-5" />
                    </div>
                    <div className="flex flex-col flex-1 min-w-0">
                      <span className="text-sm font-medium text-slate-700 truncate group-hover:text-blue-700">
                        {child.label}
                      </span>
                      <span className="text-xs text-slate-400 truncate">{child.id}</span>
                    </div>
                    <span className="opacity-0 group-hover:opacity-100 text-xs text-blue-400 font-medium px-2 py-1 bg-blue-50 rounded">
                      Explore & Scan
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Right Info Pane */}
        <aside className="w-80 border-l bg-slate-50 p-6 hidden md:block">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">Details</h3>

          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm mb-4">
            <span className="text-xs font-semibold text-slate-400 uppercase">Current URL</span>
            <p className="text-sm text-slate-800 break-all mt-1 font-mono">{url || 'None'}</p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <span className="text-xs font-semibold text-slate-400 uppercase">Stats</span>
            <div className="mt-2 text-sm text-slate-600 space-y-1">
              <p>Children: <span className="font-medium text-slate-900">{data.children.length}</span></p>
              <p>Parents: <span className="font-medium text-slate-900">{data.parents.length}</span></p>
            </div>
          </div>

        </aside>
      </main>
    </div>
  );
}
