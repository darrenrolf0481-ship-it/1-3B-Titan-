import { useState, useEffect, useRef } from 'react';

const NEXUS_API = 'http://localhost:8765';

export interface SensorData {
  emf: number;
  temp: number;
  ion: number;
  geo: number;
}

export function useNexusState() {
  const [anomalyLevel, setAnomalyLevel] = useState(62);
  const [sensorPrompt, setSensorPrompt] = useState(true);
  const [llmStatus, setLlmStatus] = useState<'online' | 'offline' | 'scanning'>('offline');
  const [serverConnected, setServerConnected] = useState(false);
  const [meters, setMeters] = useState<SensorData>({
    emf: 14.2,
    temp: -8.4,
    ion: 2847,
    geo: 48.3
  });

  // Histories as Ref to avoid React re-render overhead for data storage
  const historiesRef = useRef<Record<string, Float32Array>>({
    emf: new Float32Array(60),
    temp: new Float32Array(60),
    ion: new Float32Array(60),
    geo: new Float32Array(60)
  });

  useEffect(() => {
    let dead = false;

    // ── Try server-backed sensors ──────────────────────────────────
    const pollServer = async () => {
      if (dead) return;
      try {
        const res = await fetch(`${NEXUS_API}/api/sensors/live`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: Record<string, number> = await res.json();

        if (!serverConnected) setServerConnected(true);

        // Update anomaly from server if provided
        if (data.anomaly !== undefined) {
          setAnomalyLevel(data.anomaly);
        }

        setMeters(prev => {
          const next: SensorData = {
            emf: +(data.emf ?? prev.emf).toFixed(1),
            temp: +(data.temp ?? prev.temp).toFixed(1),
            ion: Math.floor(data.ion ?? prev.ion),
            geo: +(data.geo ?? prev.geo).toFixed(1),
          };

          // Update histories (shift left and push)
          (Object.keys(next) as (keyof SensorData)[]).forEach(key => {
            const arr = historiesRef.current[key];
            if (arr) {
              arr.set(arr.subarray(1));
              arr[arr.length - 1] = next[key];
            }
          });

          return next;
        });
      } catch {
        // Server unreachable — fall back to local simulation
        if (serverConnected) setServerConnected(false);
      }
    };

    // Initial poll attempt
    pollServer();

    // Poll every 1s from server (or fall back to 200ms local)
    const pollInterval = setInterval(pollServer, 1000);

    // ── Fallback: local sensor simulation (runs alongside server poll) ─
    let lastLocalUpdate = Date.now();
    const localInterval = setInterval(() => {
      if (dead || document.hidden || serverConnected) return;

      const now = Date.now();
      if (now - lastLocalUpdate < 200) return;
      lastLocalUpdate = now;

      setMeters(prev => {
        const next = {
          emf: +(prev.emf + (Math.random() - 0.5) * 2).toFixed(1),
          temp: +(prev.temp + (Math.random() - 0.5)).toFixed(1),
          ion: Math.floor(prev.ion + (Math.random() - 0.5) * 100),
          geo: +(prev.geo + (Math.random() - 0.5) * 0.5).toFixed(1)
        };

        // Update histories
        (Object.keys(next) as (keyof SensorData)[]).forEach(key => {
          const arr = historiesRef.current[key];
          if (arr) {
            arr.set(arr.subarray(1));
            arr[arr.length - 1] = next[key];
          }
        });

        return next;
      });
    }, 200);

    // ── Anomaly level (local fallback when server not sending it) ──
    const anomalyInterval = setInterval(() => {
      if (dead || document.hidden || serverConnected) return;
      setAnomalyLevel(prev => {
        const change = (Math.random() - 0.48) * 10;
        return Math.min(100, Math.max(0, Math.round(prev + change)));
      });
    }, 5000);

    return () => {
      dead = true;
      clearInterval(pollInterval);
      clearInterval(localInterval);
      clearInterval(anomalyInterval);
    };
  }, [serverConnected]);

  return {
    anomalyLevel,
    llmStatus,
    setLlmStatus,
    meters,
    historiesRef,
    setAnomalyLevel,
    sensorPrompt,
    setSensorPrompt,
    serverConnected,
  };
}