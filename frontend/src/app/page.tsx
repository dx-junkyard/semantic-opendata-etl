'use client';

import React, { useState } from 'react';

export default function Home() {
  const [url, setUrl] = useState('');
  const [status, setStatus] = useState('');

  const handleScan = async () => {
    if (!url) return;
    setStatus('Scanning...');
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/scan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });
      if (res.ok) {
        const data = await res.json();
        setStatus(`Scan started: ${data.task_id}`);
      } else {
         const errorData = await res.json();
        setStatus(`Error: ${errorData.detail || 'Failed to start scan'}`);
      }
    } catch (error) {
      console.error(error);
      setStatus('Error connecting to server');
    }
  };

  return (
    <div className="flex h-screen w-full flex-col bg-gray-50">
      <header className="flex h-16 items-center justify-between border-b bg-white px-6 shadow-sm">
        <h1 className="text-xl font-bold text-gray-800">Semantic Opendata ETL Platform</h1>
        <div className="flex items-center gap-2">
            <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Enter URL to scan"
                className="w-96 rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
            <button
                onClick={handleScan}
                className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
                Start Scan
            </button>
            {status && <span className="text-sm text-gray-500">{status}</span>}
        </div>
      </header>
      <main className="flex flex-1 overflow-hidden">
        {/* Left Pane: Site Tree */}
        <aside className="w-1/4 border-r bg-white p-4 overflow-y-auto">
          <h2 className="mb-4 text-lg font-semibold">Site Structure</h2>
          <div className="text-sm text-gray-500">Tree view will be here</div>
        </aside>

        {/* Middle Pane: Node Inspection */}
        <section className="flex-1 overflow-y-auto p-6">
          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold">Node Inspector</h2>
            <div className="space-y-4">
              <div className="h-32 rounded bg-gray-100 p-4">Content Preview</div>
              <div className="flex gap-2">
                <button className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">Analyze with AI</button>
                <button className="rounded border border-gray-300 px-4 py-2 hover:bg-gray-50">Explore Children</button>
              </div>
            </div>
          </div>
        </section>

        {/* Right Pane: Validation */}
        <aside className="w-1/4 border-l bg-white p-4 overflow-y-auto">
          <h2 className="mb-4 text-lg font-semibold">Data Validation</h2>
          <div className="space-y-2">
             <div className="text-sm text-gray-500">Extracted data will appear here.</div>
          </div>
        </aside>
      </main>
    </div>
  );
}
