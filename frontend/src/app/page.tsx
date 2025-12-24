'use client';

import React, { useState, useEffect, useCallback } from 'react';

type TreeNode = {
  id: string;
  label: string;
  children: string[];
};

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
        setTreeData(nodes);

        // Build Tree Structure
        const map: Record<string, TreeNode> = {};
        const childSet = new Set<string>();
        nodes.forEach(n => {
          map[n.id] = n;
          n.children.forEach(c => childSet.add(c));
        });
        setNodeMap(map);

        // Find roots (nodes not in any children list)
        const rootNodes = nodes.filter(n => !childSet.has(n.id));
        // If no roots (cycle), use all nodes as fallback or pick one? 
        // For now, if empty, just show all nodes to ensure visibility
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
        // Refresh tree after a delay or separate mechanism? 
        // For now, let's poll or just wait a bit? 
        // Optimistic update or manual refresh button might be needed, but let's try auto-refresh after 2s
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

  const TreeItem = ({ node, visited = new Set<string>() }: { node: TreeNode, visited?: Set<string> }) => {
    const isCycle = visited.has(node.id);
    const hasChildren = node.children && node.children.length > 0 && !isCycle;

    // Create new set for next level to avoid mutation affecting siblings
    const nextVisited = new Set(visited);
    nextVisited.add(node.id);

    return (
      <div className="ml-4">
        <div
          className={`cursor-pointer truncate ${isCycle ? 'text-gray-400 italic' : 'text-blue-600 hover:underline'}`}
          onClick={() => setUrl(node.id)}
          title={node.id}
        >
          {node.label} {isCycle && '(recursive)'}
        </div>
        {hasChildren && (
          <div className="border-l border-gray-200 pl-2">
            {node.children.map(childId => {
              const childNode = nodeMap[childId];
              return childNode ? <TreeItem key={childId} node={childNode} visited={nextVisited} /> : null;
            })}
          </div>
        )}
      </div>
    );
  };

  const isIncremental = nodeMap[url] !== undefined;
  const buttonLabel = isIncremental ? 'Explore Depth+1' : 'Start Scan';

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
            {roots.length === 0 ? (
              <span className="text-gray-500">No data found. Start a scan.</span>
            ) : (
              roots.map(root => <TreeItem key={root.id} node={root} />)
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
