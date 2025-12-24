'use client';

import React, { useState, useEffect, useCallback } from 'react';

type TreeNode = {
  id: string;
  label: string;
  children: string[];
};

const TreeItem = ({ node, visited = new Set<string>(), onClick }: { node: TreeNode, visited?: Set<string>, onClick: (id: string) => void }) => {
  const isCycle = visited.has(node.id);
  // Simple check: stop if visited or if max recursion depth (optional, but cycle check handles most)
  // Also, we can't easily access nodeMap here unless we pass it or use context. 
  // For simplicity refactor, let's pass children nodes directly or keep it recursive if we pass the whole node structure.
  // Wait, the API returns flat list. To render recursively efficiently without passing the huge map, 
  // maybe we should build the tree object structure once.
  // However, the original code used nodeMap. Let's stick to nodeMap but we need to pass it.

  // Actually, defining it outside requires passing nodeMap.
  // Let's pass nodeMap as prop.
  return (
    <div className="ml-4">
      <div
        className={`cursor-pointer truncate ${isCycle ? 'text-gray-400 italic' : 'text-blue-600 hover:underline'}`}
        onClick={() => onClick(node.id)}
        title={node.id}
      >
        {node.label} {isCycle && '(recursive)'}
      </div>
      {/* We can't render children easily without the map. 
            The previous implementation relied on closure `nodeMap`. 
            We must pass `nodeMap` down. */}
    </div>
  );
};

// Re-implementing TreeItem properly to accept nodeMap
const RecursiveTreeItem = React.memo(({ node, nodeMap, visited = new Set<string>(), onClick }: { node: TreeNode, nodeMap: Record<string, TreeNode>, visited?: Set<string>, onClick: (id: string) => void }) => {
  const isCycle = visited.has(node.id);
  const hasChildren = node.children && node.children.length > 0 && !isCycle;

  const nextVisited = new Set(visited);
  nextVisited.add(node.id);

  return (
    <div className="ml-4">
      <div
        className={`cursor-pointer truncate ${isCycle ? 'text-gray-400 italic' : 'text-blue-600 hover:underline'}`}
        onClick={() => onClick(node.id)}
        title={node.id}
      >
        {node.label} {isCycle && '(recursive)'}
      </div>
      {hasChildren && (
        <div className="border-l border-gray-200 pl-2">
          {node.children.map(childId => {
            const childNode = nodeMap[childId];
            return childNode ? (
              <RecursiveTreeItem
                key={childId}
                node={childNode}
                nodeMap={nodeMap}
                visited={nextVisited}
                onClick={onClick}
              />
            ) : null;
          })}
        </div>
      )}
    </div>
  );
});

export default function Home() {
  const [url, setUrl] = useState('');
  const [status, setStatus] = useState('');
  const [treeData, setTreeData] = useState<TreeNode[]>([]);
  const [roots, setRoots] = useState<TreeNode[]>([]);
  const [nodeMap, setNodeMap] = useState<Record<string, TreeNode>>({});

  const fetchTree = useCallback(async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/tree`);
      if (res.ok) {
        const data = await res.json();
        const nodes: TreeNode[] = data.nodes || [];
        console.log("Nodes count:", nodes.length); // Logging data size
        setTreeData(nodes);

        // Build Tree Structure
        const map: Record<string, TreeNode> = {};
        const childSet = new Set<string>();
        nodes.forEach(n => {
          map[n.id] = n;
          n.children.forEach(c => childSet.add(c));
        });
        setNodeMap(map);

        // Find roots
        const rootNodes = nodes.filter(n => !childSet.has(n.id));
        setRoots(rootNodes.length > 0 ? rootNodes : nodes);
      }
    } catch (error) {
      console.error("Failed to fetch tree:", error);
    }
  }, []);

  useEffect(() => {
    fetchTree();
  }, [fetchTree]);

  const handleScan = async () => {
    if (!url) return;
    setStatus('Scanning...');
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/scan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url, max_depth: 1 }),
      });
      if (res.ok) {
        const data = await res.json();
        setStatus(`Scan started: ${data.task_id}`);
        setTimeout(fetchTree, 2000);
        setTimeout(fetchTree, 5000);
      } else {
        const errorData = await res.json();
        setStatus(`Error: ${errorData.detail || 'Failed to start scan'}`);
      }
    } catch (error) {
      console.error(error);
      setStatus('Error connecting to server');
    }
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
        setTreeData([]);
        setRoots([]);
        setNodeMap({});
      } else {
        setStatus('Failed to reset DB');
      }
    } catch (error) {
      console.error(error);
      setStatus('Error resetting DB');
    }
  };

  const isIncremental = nodeMap[url] !== undefined;
  const buttonLabel = isIncremental ? 'Explore Depth+1' : 'Start Scan';

  // Limit displayed roots to 50
  const displayedRoots = roots.slice(0, 10);

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
            className={`rounded px-4 py-2 text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 ${isIncremental ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500' : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'}`}
          >
            {buttonLabel}
          </button>
          <button
            onClick={handleReset}
            className="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          >
            Reset DB
          </button>
          {status && <span className="text-sm text-gray-500">{status}</span>}
        </div>
      </header>
      <main className="flex flex-1 overflow-hidden">
        {/* Left Pane: Site Tree */}
        <aside className="w-1/4 border-r bg-white p-4 overflow-y-auto">
          <h2 className="mb-4 text-lg font-semibold flex justify-between">
            Site Structure
            <button onClick={fetchTree} className="text-xs text-blue-500 hover:underline">Refresh</button>
          </h2>
          <div className="text-sm">
            {displayedRoots.length === 0 ? (
              <span className="text-gray-500">No data found. Start a scan.</span>
            ) : (
              <>
                {displayedRoots.map(root => (
                  <RecursiveTreeItem
                    key={root.id}
                    node={root}
                    nodeMap={nodeMap}
                    onClick={setUrl}
                  />
                ))}
                {roots.length > 50 && (
                  <div className="text-gray-500 italic mt-2">
                    ... and {roots.length - 50} more items (hidden for performance)
                  </div>
                )}
              </>
            )}
          </div>
        </aside>

        {/* Middle Pane: Node Inspection */}
        <section className="flex-1 overflow-y-auto p-6">
          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold">Node Inspector</h2>
            <div className="space-y-4">
              <div className="h-32 rounded bg-gray-100 p-4">
                {url ? `Selected: ${url}` : 'Select a node or enter URL'}
              </div>
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
