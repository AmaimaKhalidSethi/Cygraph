import { useState, useEffect } from 'react';
import api from '../api/axios';

export function useGraph() {
  const [nodes,   setNodes  ] = useState([]);
  const [edges,   setEdges  ] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError  ] = useState(null);

  useEffect(() => {
    async function fetchGraph() {
      try {
        const [nodesRes, edgesRes] = await Promise.all([
          api.get('/api/nodes'),
          api.get('/api/edges'),
        ]);
        setNodes(nodesRes.data.data.filter(n => n && n._id));
        setEdges(edgesRes.data.data.filter(e => e && e.source && e.target));
      } catch (err) {
        setError(err.message);
        console.error('Graph fetch error:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchGraph();
  }, []);

  return { nodes, setNodes, edges, setEdges, loading, error };
}