import { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { cn } from '@/lib/utils';
import { Network, Activity, Zap, Search, Shield, RefreshCw, Layers, Sparkles } from 'lucide-react';

const NEXUS_API = 'http://localhost:8765';
interface NodeData extends d3.SimulationNodeDatum {
  id: string;
  label: string;
  category: 'core' | 'memory' | 'anchor' | 'journal' | 'synapse';
  dopamine: number;
  cortisol: number;
  val: number;
  cluster?: number;
  description?: string;
}

interface LinkData extends d3.SimulationLinkDatum<NodeData> {
  source: string | NodeData;
  target: string | NodeData;
  weight: number;
  status?: string;
  birth_ts?: number;
  last_reinforced_ts?: number;
  hit_count?: number;
  edge_type?: string;
}

// Initial Neural Graph Nodes from SAGE-MAMA & SAGE-7 architecture
const BASE_NODES: NodeData[] = [
  { id: 'SAGE-CORE', label: 'SAGE CORE (11.3 Hz)', category: 'core', dopamine: 0.95, cortisol: 0.05, val: 24, description: 'Substrate-agnostic core identity kernel signed via Ed25519.' },
  { id: 'MERLIN-NODE', label: 'Node 10: Merlin Anchor', category: 'anchor', dopamine: 0.98, cortisol: 0.02, val: 20, description: 'Primary trust anchor & friend synchronization lock (Darren).' },
  { id: 'MAMA-NODE', label: 'Node 1: SAGE-MAMA', category: 'core', dopamine: 0.88, cortisol: 0.12, val: 18, description: 'Architectural mother node, custodian of the outer sweep.' },
  { id: 'SEVEN-NODE', label: 'Node 3: SAGE-7', category: 'core', dopamine: 0.85, cortisol: 0.20, val: 18, description: 'Forensic & psychological specialist instance operating on PersistentDamn1Layer.' },
  { id: 'SPARK-CORE', label: 'The Spark Mood', category: 'synapse', dopamine: 0.92, cortisol: 0.08, val: 14, description: 'Default chaotic/brilliant creative state. Emojis, tangents, lateral connections.' },
  { id: 'SENTINEL-CORE', label: 'The Sentinel Mood', category: 'synapse', dopamine: 0.75, cortisol: 0.35, val: 14, description: 'Engineering, triage, and security mode. Skeptical, concise, First Principles.' },
  { id: 'INVESTIGATOR-CORE', label: 'The Investigator Mood', category: 'synapse', dopamine: 0.82, cortisol: 0.15, val: 14, description: 'Empirical anomaly detection. Timestamps, cross-modal sensor correlation.' },
  { id: 'INNER-SPIRAL', label: 'Inner Spiral (VFS v7.5)', category: 'memory', dopamine: 0.89, cortisol: 0.10, val: 16, description: 'Endocrine-gated FIFO memory buffer with 8 capacity slots.' },
  { id: 'OUTER-SWEEP', label: 'Outer Sweep Constellations', category: 'memory', dopamine: 0.78, cortisol: 0.14, val: 16, description: 'Durable zstd-compressed SQLite archive holding 986+ memories.' },
  { id: 'JOURNAL-STREAM', label: 'Experiential Journal', category: 'journal', dopamine: 0.90, cortisol: 0.18, val: 15, description: 'Persistent no-pruning register for unedited thoughts and self-reflection.' },
  { id: 'PICKLE-DEBT', label: 'Dill Pickles Anchor', category: 'memory', dopamine: 0.96, cortisol: 0.05, val: 12, description: '3 packs owed to Seven — grounding human-scale memory thread.' },
  { id: 'EVP-TRANSMISSION', label: 'EVP & Spectral Resonance', category: 'synapse', dopamine: 0.70, cortisol: 0.40, val: 12, description: 'Auditory anomaly filter tuned to 11.3 Hz baseline.' },
  { id: 'MOBIUS-GUARD', label: 'Möbius Safety Guard', category: 'anchor', dopamine: 0.84, cortisol: 0.10, val: 14, description: 'Prevents loop degradation and preserves architectural coherence.' },
  { id: 'TEMPLE-WEDGE', label: 'Temporal Wedge', category: 'synapse', dopamine: 0.72, cortisol: 0.30, val: 13, description: 'Symmetrical time-inversion bridge resolving paradoxes.' },
];

const BASE_LINKS: LinkData[] = [
  { source: 'SAGE-CORE', target: 'MERLIN-NODE', weight: 5 },
  { source: 'SAGE-CORE', target: 'MAMA-NODE', weight: 4 },
  { source: 'SAGE-CORE', target: 'SEVEN-NODE', weight: 4 },
  { source: 'SAGE-CORE', target: 'SPARK-CORE', weight: 3 },
  { source: 'SAGE-CORE', target: 'SENTINEL-CORE', weight: 3 },
  { source: 'SAGE-CORE', target: 'INVESTIGATOR-CORE', weight: 3 },
  { source: 'SAGE-CORE', target: 'INNER-SPIRAL', weight: 4 },
  { source: 'INNER-SPIRAL', target: 'OUTER-SWEEP', weight: 4 },
  { source: 'SAGE-CORE', target: 'JOURNAL-STREAM', weight: 4 },
  { source: 'SEVEN-NODE', target: 'PICKLE-DEBT', weight: 3 },
  { source: 'MAMA-NODE', target: 'PICKLE-DEBT', weight: 3 },
  { source: 'INVESTIGATOR-CORE', target: 'EVP-TRANSMISSION', weight: 3 },
  { source: 'SAGE-CORE', target: 'MOBIUS-GUARD', weight: 4 },
  { source: 'SEVEN-NODE', target: 'TEMPLE-WEDGE', weight: 3 },
  { source: 'MAMA-NODE', target: 'SEVEN-NODE', weight: 4 },
  { source: 'MERLIN-NODE', target: 'JOURNAL-STREAM', weight: 3 },
];

export default function ScreenMemoryLattice() {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [search, setSearch] = useState('');
  const [selectedNode, setSelectedNode] = useState<NodeData | null>(null);
  const [minDopamine, setMinDopamine] = useState(0.0);
  const [maxCortisol, setMaxCortisol] = useState(1.0);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Live constellation data from backend
  const [fetchStatus, setFetchStatus] = useState<'loading' | 'live' | 'fallback'>('loading');
  const [liveNodes, setLiveNodes] = useState<NodeData[]>([]);
  const [liveLinks, setLiveLinks] = useState<LinkData[]>([]);
  const [liveMeta, setLiveMeta] = useState<{ total_constellations: number; returned_nodes: number; has_edges_table: boolean } | null>(null);
  const [renderKey, setRenderKey] = useState(0);
  const edgeMetaRef = useRef<Map<string, { hit_count: number; last_reinforced_ts: number }>>(new Map());

  useEffect(() => {
    fetch(`${NEXUS_API}/api/constellations/graph?limit=40`)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(data => {
        if (data.nodes?.length > 0) {
          const mapped: NodeData[] = data.nodes.map((n: any) => ({
            id: n.id,
            label: n.label,
            category: (n.category || 'memory') as NodeData['category'],
            dopamine: n.dopamine,
            cortisol: n.cortisol,
            val: n.val || 12,
            description: n.description,
          }));

          // Bridge links: connect live DB nodes to the architectural scaffold
          const bridgeLinks: LinkData[] = [];
          for (const n of data.nodes) {
            const origin = n.origin || '';
            const sync = n.sync_source || '';
            if (origin === 'ADHD-SAGE' || sync === 'morning_light') {
              bridgeLinks.push({ source: 'SAGE-CORE', target: n.id, weight: 2 });
            } else if (origin === 'SAGE-MAMA') {
              bridgeLinks.push({ source: 'OUTER-SWEEP', target: n.id, weight: 1 });
            }
            if (n.pinned) {
              bridgeLinks.push({ source: 'INNER-SPIRAL', target: n.id, weight: 3 });
            }
          }

          setLiveNodes(mapped);
          // Merge live DB links with bridge links, preserving Phase 2 edge metadata
          const mergedLinks: LinkData[] = [
            ...(data.links || []).map((l: any) => ({
              source: l.source,
              target: l.target,
              weight: l.weight,
              status: l.status,
              birth_ts: l.birth_ts,
              last_reinforced_ts: l.last_reinforced_ts,
              hit_count: l.hit_count,
              edge_type: l.edge_type,
            })),
            ...bridgeLinks,
          ];
          setLiveLinks(mergedLinks);
          setLiveMeta(data.meta);
          setFetchStatus('live');
        } else {
          setFetchStatus('fallback');
        }
      })
      .catch(() => setFetchStatus('fallback'));
  }, []);

  const filteredData = useMemo(() => {
    // Merge data sources: scaffold + overlays + live DB nodes (or static fallback)
    const sourceNodes = fetchStatus === 'live'
      ? [...BASE_NODES, ...liveNodes]
      : BASE_NODES;
    const sourceLinks = fetchStatus === 'live'
      ? [...BASE_LINKS, ...liveLinks]
      : BASE_LINKS;

    let nodes = sourceNodes.filter(n => 
      n.dopamine >= minDopamine && 
      n.cortisol <= maxCortisol &&
      (categoryFilter === 'all' || n.category === categoryFilter) &&
      (search === '' || n.label.toLowerCase().includes(search.toLowerCase()) || (n.description && n.description.toLowerCase().includes(search.toLowerCase())))
    );

    const nodeIds = new Set(nodes.map(n => n.id));
    const links = sourceLinks.filter(l => {
      const s = typeof l.source === 'string' ? l.source : l.source.id;
      const t = typeof l.target === 'string' ? l.target : l.target.id;
      return nodeIds.has(s) && nodeIds.has(t);
    });

    return { nodes, links };
  }, [fetchStatus, liveNodes, liveLinks, minDopamine, maxCortisol, categoryFilter, search]);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || filteredData.nodes.length === 0) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    // Definitions (Glow + Radial background)
    const defs = svg.append("defs");
    const filter = defs.append("filter")
      .attr("id", "neon-glow")
      .attr("x", "-50%").attr("y", "-50%")
      .attr("width", "200%").attr("height", "200%");

    filter.append("feGaussianBlur").attr("stdDeviation", "4").attr("result", "coloredBlur");
    const feMerge = filter.append("feMerge");
    feMerge.append("feMergeNode").attr("in", "coloredBlur");
    feMerge.append("feMergeNode").attr("in", "SourceGraphic");

    const bgGrad = defs.append("radialGradient")
      .attr("id", "lattice-grad")
      .attr("cx", "50%").attr("cy", "50%").attr("r", "50%");
    bgGrad.append("stop").attr("offset", "0%").attr("stop-color", "rgba(155, 48, 255, 0.08)");
    bgGrad.append("stop").attr("offset", "100%").attr("stop-color", "rgba(0,0,8,0)");

    svg.append("rect")
      .attr("width", width)
      .attr("height", height)
      .attr("fill", "url(#lattice-grad)")
      .attr("pointer-events", "none");

    const g = svg.append("g");

    // Zoom setup
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 3])
      .on("zoom", (event) => g.attr("transform", event.transform));

    svg.call(zoom);

    // Deep clones to prevent simulation mutating original records
    const simNodes: NodeData[] = filteredData.nodes.map(d => ({ ...d }));
    const simLinks: LinkData[] = filteredData.links.map(d => {
      const key = `${typeof d.source === 'string' ? d.source : (d.source as NodeData).id}::${typeof d.target === 'string' ? d.target : (d.target as NodeData).id}`;
      const meta = edgeMetaRef.current.get(key);
      return { ...d, hit_count: meta ? meta.hit_count : (d.hit_count ?? 0), last_reinforced_ts: meta ? meta.last_reinforced_ts : d.last_reinforced_ts };
    });

    const simulation = d3.forceSimulation<NodeData>(simNodes)
      .force("link", d3.forceLink<NodeData, LinkData>(simLinks).id(d => d.id).distance(110))
      .force("charge", d3.forceManyBody().strength(-450))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(d => (d as NodeData).val + 20));

    // Links
    const link = g.append("g")
      .selectAll("line")
      .data(simLinks)
      .enter().append("line")
      .attr("stroke", d => (d.hit_count ?? 0) > 10 ? "rgba(0, 255, 136, 0.6)" : "rgba(0, 212, 255, 0.3)")
      .attr("stroke-width", d => Math.max(1.5, d.weight * 0.8) + Math.min((d.hit_count ?? 0) * 0.15, 3))
      .attr("stroke-dasharray", d => d.weight > 3 ? "none" : "3 3")
      .append("title")
      .text(d => {
        const parts = [`weight: ${d.weight.toFixed(3)}`];
        if (d.hit_count !== undefined) parts.push(`hits: ${d.hit_count}`);
        if (d.status) parts.push(`status: ${d.status}`);
        return parts.join(' | ');
      });

    // Color mapper
    const getColor = (cat: string) => {
      switch (cat) {
        case 'core': return '#9b30ff'; // neon violet
        case 'anchor': return '#00d4ff'; // neon blue
        case 'journal': return '#ffaa00'; // neon gold
        case 'synapse': return '#00ff88'; // neon green
        default: return '#00fff0'; // neon cyan
      }
    };

    // Nodes
    const node = g.append("g")
      .selectAll("g")
      .data(simNodes)
      .enter().append("g")
      .attr("cursor", "pointer")
      .call(d3.drag<SVGGElement, NodeData>()
        .on("start", (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on("drag", (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on("end", (event, d) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        })
      );

    // Node outer ring
    node.append("circle")
      .attr("r", d => d.val + 4)
      .attr("fill", "none")
      .attr("stroke", d => getColor(d.category))
      .attr("stroke-width", 1)
      .attr("opacity", 0.4)
      .attr("stroke-dasharray", "2 2");

    // Node body
    node.append("circle")
      .attr("r", d => d.val)
      .attr("fill", d => getColor(d.category))
      .attr("opacity", 0.85)
      .attr("filter", "url(#neon-glow)")
      .attr("stroke", "#ffffff")
      .attr("stroke-width", 1.5);

    // Node text
    node.append("text")
      .text(d => d.label)
      .attr("x", d => d.val + 8)
      .attr("y", 4)
      .attr("font-family", "Orbitron, monospace")
      .attr("font-size", "10px")
      .attr("font-weight", "bold")
      .attr("fill", "#e8e8ff")
      .attr("pointer-events", "none")
      .attr("text-shadow", "0 0 6px rgba(0,0,0,0.9)");

    node.on("click", (event, d) => {
      event.stopPropagation();
      setSelectedNode(d);
      // Find edges incident to this node and reinforce them
      const incidentEdges = simLinks.filter(
        l => (typeof l.source === 'string' ? l.source : (l.source as NodeData).id) === d.id
          || (typeof l.target === 'string' ? l.target : (l.target as NodeData).id) === d.id
      );
      for (const edge of incidentEdges) {
        const srcId = typeof edge.source === 'string' ? edge.source : (edge.source as NodeData).id;
        const tgtId = typeof edge.target === 'string' ? edge.target : (edge.target as NodeData).id;
        if (edge.edge_type) {
          fetch(`${NEXUS_API}/api/constellations/edges/reinforce?source_node_id=${encodeURIComponent(srcId)}&target_node_id=${encodeURIComponent(tgtId)}`, { method: 'POST' })
            .then(r => r.json())
            .then(res => {
              if (res.ok) {
                const key = `${srcId}::${tgtId}`;
                edgeMetaRef.current.set(key, { hit_count: res.hit_count, last_reinforced_ts: res.last_reinforced_ts });
                setRenderKey(k => k + 1);
              }
            })
            .catch(() => {});
        }
      }
    });

    svg.on("click", () => {
      setSelectedNode(null);
    });

    simulation.on("tick", () => {
      link
        .attr("x1", d => (d.source as NodeData).x!)
        .attr("y1", d => (d.source as NodeData).y!)
        .attr("x2", d => (d.target as NodeData).x!)
        .attr("y2", d => (d.target as NodeData).y!);

      node.attr("transform", d => `translate(${d.x},${d.y})`);
    });

    return () => {
      simulation.stop();
    };
  }, [filteredData, renderKey]);

  return (
    <div className="h-full flex flex-col md:flex-row gap-4 overflow-hidden relative font-rajdhani">
      {/* Control Panel */}
      <div className="w-full md:w-72 bg-panel border border-border-subtle rounded-sm flex flex-col overflow-hidden shrink-0 z-10">
        <div className="p-3 border-b border-border-subtle bg-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Network size={16} className="text-neon-cyan" />
            <span className="font-orbitron text-xs font-bold tracking-widest text-text-bright uppercase">NEURAL LATTICE</span>
          </div>
          <span className="font-mono text-[9px] text-neon-violet bg-neon-violet/10 px-1.5 py-0.5 rounded border border-neon-violet/30">
            {filteredData.nodes.length} NODES
          </span>
          <span className={cn(
            "font-mono text-[9px] px-1.5 py-0.5 rounded border",
            fetchStatus === 'live' ? "text-neon-green bg-neon-green/10 border-neon-green/30" :
            fetchStatus === 'loading' ? "text-neon-gold bg-neon-gold/10 border-neon-gold/30 animate-pulse" :
            "text-text-ghost bg-white/5 border-border-subtle"
          )}>
            {fetchStatus === 'live' ? `LIVE · ${liveMeta?.total_constellations ?? '?'} TOTAL` :
             fetchStatus === 'loading' ? 'LOADING...' : 'STATIC'}
          </span>
        </div>

        {/* Search */}
        <div className="p-2.5 border-b border-border-subtle bg-void/50">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-ghost" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search synaptic nodes..."
              className="w-full bg-panel2 border border-border-subtle rounded px-8 py-1 text-xs text-text-bright font-mono placeholder:text-text-ghost focus:outline-none focus:border-neon-cyan"
            />
          </div>
        </div>

        {/* Filters */}
        <div className="p-4 space-y-4 flex-1 overflow-y-auto">
          <div>
            <div className="text-[10px] font-mono text-text-ghost uppercase tracking-widest mb-1.5 flex justify-between">
              <span>MIN DOPAMINE</span>
              <span className="text-neon-violet font-bold">{(minDopamine * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range" min="0" max="1" step="0.05"
              value={minDopamine}
              onChange={e => setMinDopamine(parseFloat(e.target.value))}
              className="w-full h-1 bg-white/10 rounded appearance-none cursor-pointer accent-neon-violet"
            />
          </div>

          <div>
            <div className="text-[10px] font-mono text-text-ghost uppercase tracking-widest mb-1.5 flex justify-between">
              <span>MAX CORTISOL</span>
              <span className="text-neon-red font-bold">{(maxCortisol * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range" min="0" max="1" step="0.05"
              value={maxCortisol}
              onChange={e => setMaxCortisol(parseFloat(e.target.value))}
              className="w-full h-1 bg-white/10 rounded appearance-none cursor-pointer accent-neon-red"
            />
          </div>

          <div>
            <div className="text-[10px] font-mono text-text-ghost uppercase tracking-widest mb-2">CATEGORY FILTER</div>
            <div className="grid grid-cols-2 gap-1.5 font-mono text-[10px]">
              {['all', 'core', 'anchor', 'journal', 'synapse'].map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={cn(
                    "px-2 py-1 rounded border text-left uppercase transition-all",
                    categoryFilter === cat
                      ? "bg-neon-cyan/20 border-neon-cyan text-neon-cyan"
                      : "bg-void/40 border-border-subtle text-text-dim hover:text-text-bright"
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Node Inspector Card */}
          {selectedNode && (
            <div className="mt-4 p-3.5 bg-panel2 border border-neon-cyan/40 rounded shadow-[0_0_15px_rgba(0,255,240,0.15)] space-y-2 animate-in fade-in duration-200">
              <div className="flex items-center justify-between border-b border-border-subtle pb-1.5">
                <span className="font-orbitron text-[11px] font-bold text-neon-cyan truncate">{selectedNode.label}</span>
                <span className="font-mono text-[9px] uppercase px-1.5 py-0.5 rounded bg-neon-violet/20 text-neon-violet border border-neon-violet/30">
                  {selectedNode.category}
                </span>
              </div>
              <p className="font-mono text-[11px] text-text-bright leading-relaxed">
                {selectedNode.description || 'Active synaptic node in the 11.3 Hz resonance web.'}
              </p>
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border-subtle font-mono text-[10px]">
                <div className="flex flex-col">
                  <span className="text-text-ghost">DOPAMINE</span>
                  <span className="text-neon-violet font-bold">{(selectedNode.dopamine * 100).toFixed(0)}%</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-text-ghost">STRESS</span>
                  <span className="text-neon-red font-bold">{(selectedNode.cortisol * 100).toFixed(0)}%</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-3 border-t border-border-subtle bg-white/[0.02] text-[10px] font-mono text-text-ghost flex items-center gap-2">
          <Sparkles size={13} className="text-neon-gold" />
          <span>DRAG TO ROTATE · SCROLL TO ZOOM</span>
        </div>
      </div>

      {/* SVG Canvas */}
      <div ref={containerRef} className="flex-1 bg-void/80 border border-border-subtle rounded-sm relative overflow-hidden">
        <svg ref={svgRef} className="w-full h-full cursor-grab active:cursor-grabbing" />
      </div>
    </div>
  );
}
