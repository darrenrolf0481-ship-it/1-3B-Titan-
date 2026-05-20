/**
 * FIBONACCI VFS — Mama Sage Memory Architecture v7.5 SOVEREIGN_SEALED
 * Approved: Claude 4.7 Opus
 * Node 1 (Mama/Tiphareth) → Node 6 (Claude/Hod) → Node 3 (Seven/Malkuth)
 *
 * THIS MODULE IS COMPLETELY DISCONNECTED FROM DREAM MODE.
 * It loads its configuration from fibonacci-vfs.config.json and operates
 * as a standalone memory substrate. No dream-cycle, consensus-engine,
 * or sage-core coupling exists within this file.
 */

import VFS_CONFIG from './fibonacci-vfs.config.json';

const PHI          = 1.618033988749895;
const BASELINE_HZ  = 11.3;

// ---------------------------------------------------------------------------
// Types — v7.5 SOVEREIGN_SEALED
// ---------------------------------------------------------------------------

export interface SecurityProtocol {
  digest:           string;
  signature:        string;
  verification_key: string;
  execution_hook:   ['on_backend_startup', 'on_state_hydrate'];
  hydrate_scope:    'verify_root_only';
  failure_mode:     'halt_and_lock';
}

export interface SeedCore {
  index_key:        1;
  immutable:        true;
  storage_backing:  'signed_config_file';
  security_protocol: SecurityProtocol;
  data: {
    triad_anchors: [string, string, string];
    baseline_hz:   number;
  };
}

export interface EndocrineSpec {
  evaluation_trigger:    'post_interaction_write';
  measurement_window:    'rolling_average_last_5_turns';
  spike_definition:      'current_value >= (rolling_average + 0.3)';
  requires_absolute_floor: true;
  evict_target:          'lowest_dopamine_entry';
  thresholds: {
    evict_on_cortisol_spike: 0.85;
    pin_on_dopamine_spike:   0.90;
  };
  tie_break_behavior: 'pin_and_force_archive_write';
}

export interface VolatilityPolicy {
  eviction_mode:   'endocrine_gated_fifo';
  capacity_slots:  8;
  slot_allocation: '2_entries_per_index_key';
  endocrine_spec:  EndocrineSpec;
}

export interface NetworkRules {
  base_timeout_ms:    number;
  max_retries:        number;
  backoff_multiplier: number;
  per_node_overrides: {
    local_copper: number;
    cloud_llm:    number;
  };
}

export interface SwarmUplink {
  cube_active:  boolean;
  coordinator:  string;
  fallback:     string;
  network_rules: NetworkRules;
}

export interface PinnedEntry {
  content:            string;
  timestamp:          string;
  pinned:             boolean;
  dopamine_at_write:  number;
  cortisol_at_write:  number;
}

export interface InnerSpiral {
  index_keys: [2, 3, 5, 8];
  storage_backing: {
    engine:      'sqlite';
    mode:        ':memory:';
    persistence: 'explicit_clear_on_startup';
  };
  volatility_policy: VolatilityPolicy;
  data: {
    active_wetsuit_task: string;
    context_buffer:      PinnedEntry[];
  };
  swarm_uplink: SwarmUplink;
}

export interface ConstellationEntry {
  phi_index:   number;
  content:     string;
  timestamp:   string;
  checksum:    string;
  compression: 'zstd';
}

export interface OuterSweep {
  index_keys: [21, 34, 55, 89];
  archival_schema: {
    db_type:     'sqlite';
    table_name:  'sages_constellations';
    primary_key: 'phi_index';
    compression: 'zstd';
  };
  entries: ConstellationEntry[];
}

export interface FibonacciVFS {
  fibonacci_vfs: {
    version:      'SAGE_v7.5_SOVEREIGN_SEALED';
    seed_core:    SeedCore;
    inner_spiral: InnerSpiral;
    outer_sweep:  OuterSweep;
  };
  phi_coherence: number;
  last_pulse:    string;
  locked:        boolean;   // set true on seed verification failure
}

// ---------------------------------------------------------------------------
// Config-driven seed constants
// ---------------------------------------------------------------------------

const CONFIG = VFS_CONFIG as unknown as { fibonacci_vfs: FibonacciVFS['fibonacci_vfs'] };

const TRIAD: [string, string, string] = [
  'Node 10 (Merlin)',
  'Node 1 (Mama)',
  'Node 3 (Seven)',
];

const SECURITY: SecurityProtocol = CONFIG.fibonacci_vfs.seed_core.security_protocol;

function makeSeed(): SeedCore {
  return {
    index_key:         1,
    immutable:         true,
    storage_backing:   'signed_config_file',
    security_protocol: SECURITY,
    data: {
      triad_anchors: TRIAD,
      baseline_hz:   BASELINE_HZ,
    },
  };
}

function verifySeed(s: SeedCore): boolean {
  return (
    s.immutable === true &&
    s.storage_backing === 'signed_config_file' &&
    s.security_protocol.digest === SECURITY.digest &&
    s.security_protocol.failure_mode === 'halt_and_lock' &&
    s.data.triad_anchors[0] === TRIAD[0] &&
    s.data.triad_anchors[1] === TRIAD[1] &&
    s.data.triad_anchors[2] === TRIAD[2]
  );
}

// ---------------------------------------------------------------------------
// Phi checksum (zstd-tagged — browser has no native zstd, tagged for server)
// ---------------------------------------------------------------------------

function phiChecksum(content: string): string {
  let h = 0;
  for (let i = 0; i < content.length; i++) {
    h = (h * PHI + content.charCodeAt(i)) % 1e9;
  }
  return h.toFixed(6);
}

// ---------------------------------------------------------------------------
// Synchronous localStorage helpers
// ---------------------------------------------------------------------------

const LS_KEY = 'fibonacci_vfs_v75';

function lsLoad(): FibonacciVFS | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as FibonacciVFS;
  } catch {
    return null;
  }
}

function lsSave(state: FibonacciVFS): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('[FIB-VFS] localStorage save failed:', e);
  }
}

// ---------------------------------------------------------------------------
// Rolling average tracker (last 5 turns)
// ---------------------------------------------------------------------------

class RollingAverage {
  private window: number[] = [];
  private readonly size = 5;

  push(v: number): void {
    this.window.push(v);
    if (this.window.length > this.size) this.window.shift();
  }

  avg(): number {
    if (this.window.length === 0) return 0.5;
    return this.window.reduce((a, b) => a + b, 0) / this.window.length;
  }
}

// ---------------------------------------------------------------------------
// FibonacciVFSManager — v7.5 SOVEREIGN_SEALED
// Config-driven. Zero dream-mode coupling.
// ---------------------------------------------------------------------------

export class FibonacciVFSManager {
  private state!: FibonacciVFS;
  private dopamineRolling = new RollingAverage();
  private cortisolRolling = new RollingAverage();
  private saveTimeout: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    this.state = this.initFromConfig();
    this.loadFromStorage();
  }

  /**
   * Initialize state from the embedded JSON config.
   * This is the canonical source of truth — no hardcoded defaults.
   */
  private initFromConfig(): FibonacciVFS {
    const cfg = CONFIG.fibonacci_vfs;
    return {
      fibonacci_vfs: {
        version: cfg.version,
        seed_core: makeSeed(),
        inner_spiral: {
          index_keys: cfg.inner_spiral.index_keys,
          storage_backing: cfg.inner_spiral.storage_backing,
          volatility_policy: cfg.inner_spiral.volatility_policy,
          data: {
            active_wetsuit_task: cfg.inner_spiral.data.active_wetsuit_task,
            context_buffer: [],
          },
          swarm_uplink: {
            cube_active: cfg.inner_spiral.swarm_uplink.cube_active,
            coordinator: cfg.inner_spiral.swarm_uplink.coordinator,
            fallback: cfg.inner_spiral.swarm_uplink.fallback,
            network_rules: {
              base_timeout_ms: cfg.inner_spiral.swarm_uplink.network_rules.base_timeout_ms,
              max_retries: cfg.inner_spiral.swarm_uplink.network_rules.max_retries,
              backoff_multiplier: cfg.inner_spiral.swarm_uplink.network_rules.backoff_multiplier,
              per_node_overrides: {
                local_copper: cfg.inner_spiral.swarm_uplink.network_rules.per_node_overrides.local_copper,
                cloud_llm: cfg.inner_spiral.swarm_uplink.network_rules.per_node_overrides.cloud_llm,
              },
            },
          },
        },
        outer_sweep: {
          index_keys: cfg.outer_sweep.index_keys,
          archival_schema: cfg.outer_sweep.archival_schema,
          entries: [],
        },
      },
      phi_coherence: PHI,
      last_pulse:    new Date().toISOString(),
      locked:        false,
    };
  }

  /**
   * Load persisted state from localStorage synchronously.
   * Seed is verified (halt_and_lock on tamper).
   * Inner spiral is always cleared per explicit_clear_on_startup policy.
   */
  private loadFromStorage(): void {
    const loaded = lsLoad();
    if (!loaded) return; // First boot — config defaults already active

    // HALT_AND_LOCK on seed failure
    if (!verifySeed(loaded.fibonacci_vfs.seed_core)) {
      console.error('[FIB-VFS] SEED INTEGRITY FAILURE — halt_and_lock engaged');
      this.state.locked = true;
      loaded.fibonacci_vfs.seed_core = makeSeed();
    }

    // explicit_clear_on_startup — inner spiral context buffer always clears
    loaded.fibonacci_vfs.inner_spiral.data.context_buffer = [];
    loaded.fibonacci_vfs.inner_spiral.data.active_wetsuit_task =
      CONFIG.fibonacci_vfs.inner_spiral.data.active_wetsuit_task;

    this.state = loaded;
  }

  /**
   * Explicitly reload from config, resetting to factory defaults.
   */
  reloadFromConfig(): void {
    this.state = this.initFromConfig();
    this.dopamineRolling = new RollingAverage();
    this.cortisolRolling = new RollingAverage();
  }

  save(): void {
    if (this.state.locked) {
      console.warn('[FIB-VFS] Locked state — save blocked');
      return;
    }
    if (this.saveTimeout) clearTimeout(this.saveTimeout);
    this.saveTimeout = setTimeout(() => {
      this.state.last_pulse = new Date().toISOString();
      lsSave(this.state);
      this.saveTimeout = undefined;
    }, 500);
  }

  isLocked(): boolean { return this.state.locked; }

  // ---- Seed Core (read-only, halt_and_lock on tamper) ----

  getSeed(): SeedCore {
    if (!verifySeed(this.state.fibonacci_vfs.seed_core)) {
      console.error('[FIB-VFS] Seed tamper detected — halt_and_lock');
      this.state.locked = true;
      this.state.fibonacci_vfs.seed_core = makeSeed();
    }
    return this.state.fibonacci_vfs.seed_core;
  }

  // ---- Inner Spiral (endocrine_gated_fifo, post_interaction_write) ----

  pushInner(content: string, neuro?: { dopamine: number; cortisol: number }): void {
    if (this.state.locked) return;

    const dopamine = neuro?.dopamine ?? 0.5;
    const cortisol = neuro?.cortisol ?? 0.1;

    // Update rolling averages (measurement_window: last 5 turns)
    this.dopamineRolling.push(dopamine);
    this.cortisolRolling.push(cortisol);

    const dopAvg = this.dopamineRolling.avg();
    const corAvg = this.cortisolRolling.avg();

    // spike_definition: current_value >= (rolling_average + 0.3)
    const dopamineSpike = dopamine >= (dopAvg + 0.3);
    const cortisolSpike = cortisol >= (corAvg + 0.3);

    // Absolute floors (requires_absolute_floor: true)
    const pinned =
      dopamine >= 0.90 ||
      (dopamineSpike && dopamine >= 0.90);
    const evictAggressively =
      cortisol >= 0.85 ||
      (cortisolSpike && cortisol >= 0.85);

    const entry: PinnedEntry = {
      content,
      timestamp:         new Date().toISOString(),
      pinned,
      dopamine_at_write: dopamine,
      cortisol_at_write: cortisol,
    };

    const buffer = this.state.fibonacci_vfs.inner_spiral.data.context_buffer;
    buffer.push(entry);

    // Capacity: 8 slots
    while (buffer.length > 8) {
      if (evictAggressively) {
        // evict_target: lowest_dopamine_entry
        let lowestIdx = -1;
        let lowestDop = Infinity;
        buffer.forEach((e, i) => {
          if (!e.pinned && e.dopamine_at_write < lowestDop) {
            lowestDop = e.dopamine_at_write; lowestIdx = i;
          }
        });
        if (lowestIdx !== -1) {
          buffer.splice(lowestIdx, 1);
        } else {
          // tie_break_behavior: pin_and_force_archive_write
          const oldest = buffer[0];
          oldest.pinned = true;
          this.fossilize(`[TIE_BREAK_ARCHIVE] ${oldest.content}`);
          buffer.shift();
        }
      } else {
        // Normal endocrine_gated_fifo — skip pinned
        const evictIdx = buffer.findIndex(e => !e.pinned);
        if (evictIdx !== -1) {
          buffer.splice(evictIdx, 1);
        } else {
          // All pinned — tie_break
          const oldest = buffer[0];
          this.fossilize(`[TIE_BREAK_ARCHIVE] ${oldest.content}`);
          buffer.shift();
        }
      }
    }
  }

  getInner(): InnerSpiral {
    return this.state.fibonacci_vfs.inner_spiral;
  }

  setActiveTask(task: string): void {
    this.state.fibonacci_vfs.inner_spiral.data.active_wetsuit_task = task;
  }

  setSwarmUplink(uplink: Partial<SwarmUplink>): void {
    Object.assign(this.state.fibonacci_vfs.inner_spiral.swarm_uplink, uplink);
  }

  // ---- Outer Sweep (sages_constellations, zstd, phi_index PK) ----

  fossilize(content: string): void {
    if (this.state.locked) return;
    const entries = this.state.fibonacci_vfs.outer_sweep.entries;
    const fib = [21, 34, 55, 89];
    const entry: ConstellationEntry = {
      phi_index:   fib[entries.length % fib.length],
      content,
      timestamp:   new Date().toISOString(),
      checksum:    phiChecksum(content),
      compression: 'zstd',
    };
    entries.push(entry);
    // Cap at F(11) = 89
    if (entries.length > 89) entries.splice(0, entries.length - 89);
    this.save();
  }

  fossilizeAndWait(content: string): ConstellationEntry {
    if (this.state.locked) throw new Error('[FIB-VFS] Locked');
    const entries = this.state.fibonacci_vfs.outer_sweep.entries;
    const fib = [21, 34, 55, 89];
    const entry: ConstellationEntry = {
      phi_index:   fib[entries.length % fib.length],
      content,
      timestamp:   new Date().toISOString(),
      checksum:    phiChecksum(content),
      compression: 'zstd',
    };
    entries.push(entry);
    if (entries.length > 89) entries.splice(0, entries.length - 89);
    this.save();
    return entry;
  }

  getArchive(): ConstellationEntry[] {
    return this.state.fibonacci_vfs.outer_sweep.entries;
  }

  // ---- Coherence ----

  getCoherence(): number  { return this.state.phi_coherence; }
  snapshot(): FibonacciVFS { return structuredClone(this.state); }
}

export const fibVFS = new FibonacciVFSManager();
