import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import api from '../../api/axios';

// ── Node colors by type ─────────────────────────────────
const NODE_COLORS = {
  server:      '#00d4ff',
  workstation: '#52b788',
  router:      '#f4a261',
  database:    '#aa44ff',
  iot:         '#ffcc00',
};

const NODE_RADIUS = {
  server:      18,
  workstation: 14,
  router:      16,
  database:    15,
  iot:         11,
};

function getNodeColor(node) {
  if (node.status === 'compromised') return '#ff2244';
  if (node.status === 'warning')     return '#f4a261';
  return NODE_COLORS[node.type] || '#8ab4d4';
}

export default function NetworkGraph({ nodes, edges }) {
  const svgRef        = useRef(null);
  const simulationRef = useRef(null);

  useEffect(() => {
    if (!nodes.length || !edges.length) return;

    const container = svgRef.current.parentElement;
    const W = container.offsetWidth;
    const H = container.offsetHeight;

    // ── Clear previous render ───────────────────────────
    d3.select(svgRef.current).selectAll('*').remove();

    const svg = d3.select(svgRef.current)
      .attr('width',  W)
      .attr('height', H);

    // ── Grid background ─────────────────────────────────
    const defs    = svg.append('defs');
    const pattern = defs.append('pattern')
      .attr('id',           'grid')
      .attr('width',        40)
      .attr('height',       40)
      .attr('patternUnits', 'userSpaceOnUse');

    pattern.append('path')
      .attr('d',      'M 40 0 L 0 0 0 40')
      .attr('fill',   'none')
      .attr('stroke', '#0d244420')
      .attr('stroke-width', 0.5);

    svg.append('rect')
      .attr('width',  '100%')
      .attr('height', '100%')
      .attr('fill',   'url(#grid)');

    // ── Build D3-friendly data ──────────────────────────
    const nodeMap = {};
    nodes.forEach(n => { nodeMap[n._id] = n; });

    const d3Nodes = nodes.map(n => ({
      ...n,
      id: n._id,
      x:  n.position?.x || W / 2,
      y:  n.position?.y || H / 2,
    }));

    const d3Links = edges
      .map(e => ({
        source: typeof e.source === 'object' ? e.source._id : e.source,
        target: typeof e.target === 'object' ? e.target._id : e.target,
        encrypted: e.encrypted,
      }))
      .filter(e =>
        d3Nodes.find(n => n.id === e.source) &&
        d3Nodes.find(n => n.id === e.target)
      );

    // ── Force simulation ────────────────────────────────
    simulationRef.current = d3.forceSimulation(d3Nodes)
      .force('link', d3.forceLink(d3Links)
        .id(d => d.id)
        .distance(120))
      .force('charge', d3.forceManyBody().strength(-400))
      .force('center',  d3.forceCenter(W / 2, H / 2))
      .force('collide', d3.forceCollide(30));

    // ── Draw edges ──────────────────────────────────────
    const linkGroup = svg.append('g').attr('class', 'links');
    const link = linkGroup.selectAll('line')
      .data(d3Links)
      .join('line')
      .attr('stroke',       d => d.encrypted ? '#52b788' : '#0d2444')
      .attr('stroke-width', d => d.encrypted ? 2.5 : 1.5)
      .attr('opacity',      d => d.encrypted ? 0.9 : 0.6)
      .attr('stroke-dasharray', d => d.encrypted ? null : '3,3');

    // ── Draw nodes group ────────────────────────────────
    const nodeGroup = svg.append('g').attr('class', 'nodes');
    const node = nodeGroup.selectAll('g')
      .data(d3Nodes)
      .join('g')
      .attr('class',  'node')
      .attr('cursor', 'pointer')
      .call(d3.drag()
        .on('start', dragStart)
        .on('drag',  dragged)
        .on('end',   dragEnd)
      );

    // ── Ripple circle (for compromised animation) ───────
    node.append('circle')
      .attr('class',   'ripple')
      .attr('r',        d => NODE_RADIUS[d.type] || 14)
      .attr('fill',    'none')
      .attr('stroke',  d => getNodeColor(d))
      .attr('opacity', 0);

    // ── Main circle ─────────────────────────────────────
    node.append('circle')
      .attr('class',        'main-circle')
      .attr('r',             d => NODE_RADIUS[d.type] || 14)
      .attr('fill',          d => getNodeColor(d) + '22')
      .attr('stroke',        d => getNodeColor(d))
      .attr('stroke-width',  2);

    // ── Type letter inside node ─────────────────────────
    node.append('text')
      .attr('text-anchor',   'middle')
      .attr('dominant-baseline', 'middle')
      .attr('fill',          d => getNodeColor(d))
      .attr('font-family',  'Orbitron, monospace')
      .attr('font-size',     d => (NODE_RADIUS[d.type] || 14) * 0.7)
      .attr('font-weight',  'bold')
      .attr('pointer-events','none')
      .text(d => d.type[0].toUpperCase());

    // ── Node name label ─────────────────────────────────
    node.append('text')
      .attr('text-anchor',  'middle')
      .attr('dy',            d => (NODE_RADIUS[d.type] || 14) + 14)
      .attr('fill',          d => getNodeColor(d))
      .attr('font-family',  'Share Tech Mono, monospace')
      .attr('font-size',     9)
      .attr('pointer-events','none')
      .text(d => d.name);

    // ── No-firewall warning ─────────────────────────────
    node.filter(d => !d.hasFirewall)
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dy',           d => -(NODE_RADIUS[d.type] || 14) - 6)
      .attr('fill',        '#f4a261')
      .attr('font-size',    9)
      .attr('font-family', 'Share Tech Mono, monospace')
      .attr('pointer-events','none')
      .text('⚠ NO FW');

    // ── Tick update ─────────────────────────────────────
    simulationRef.current.on('tick', () => {
      link
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y);

      node.attr('transform', d => `translate(${d.x},${d.y})`);
    });

    // ── Drag handlers ────────────────────────────────────
    function dragStart(event, d) {
      if (!event.active) simulationRef.current.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event, d) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragEnd(event, d) {
      if (!event.active) simulationRef.current.alphaTarget(0);
      // Save position to MongoDB
      api.put(`/api/nodes/${d.id}`, {
        position: { x: Math.round(d.x), y: Math.round(d.y) },
      }).catch(err => console.error('Position save error:', err));

      d.fx = null;
      d.fy = null;
    }

    // ── Store refs for external use ──────────────────────
    svgRef.current._nodeSelection = node;
    svgRef.current._d3Nodes       = d3Nodes;

    return () => {
      if (simulationRef.current) simulationRef.current.stop();
    };
  }, [nodes, edges]);

  // ── Update colors when node status changes ──────────────
  useEffect(() => {
    if (!svgRef.current?._nodeSelection) return;

    const node = svgRef.current._nodeSelection;

    node.select('.main-circle')
      .transition().duration(600)
      .attr('stroke', d => {
        const updated = nodes.find(n => n._id === d.id);
        return updated ? getNodeColor(updated) : getNodeColor(d);
      })
      .attr('fill', d => {
        const updated = nodes.find(n => n._id === d.id);
        const color   = updated ? getNodeColor(updated) : getNodeColor(d);
        return color + '22';
      });

    node.select('text:nth-child(3)')
      .attr('fill', d => {
        const updated = nodes.find(n => n._id === d.id);
        return updated ? getNodeColor(updated) : getNodeColor(d);
      });

    // Ripple animation on compromised nodes
    node.each(function(d) {
      const updated = nodes.find(n => n._id === d.id);
      if (updated?.status === 'compromised') {
        const ripple = d3.select(this).select('.ripple');
        function pulse() {
          ripple
            .attr('opacity', 0.8)
            .attr('r', NODE_RADIUS[d.type] || 14)
            .transition().duration(1200)
            .attr('r',       (NODE_RADIUS[d.type] || 14) * 3.5)
            .attr('opacity', 0)
            .on('end', pulse);
        }
        pulse();
      }
    });
  }, [nodes]);

  return (
    <svg
      ref={svgRef}
      style={{ width: '100%', height: '100%', display: 'block' }}
    />
  );
}