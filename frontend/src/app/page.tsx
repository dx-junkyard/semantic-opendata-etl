import React from 'react';

export default function Home() {
  return (
    <div className="flex h-screen w-full flex-col bg-gray-50">
      <header className="flex h-16 items-center border-b bg-white px-6 shadow-sm">
        <h1 className="text-xl font-bold text-gray-800">Semantic Opendata ETL Platform</h1>
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
