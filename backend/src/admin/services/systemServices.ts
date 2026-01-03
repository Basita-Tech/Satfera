import os from "os";
import v8 from "v8";
import perf_hooks from "perf_hooks";

const CACHE_TTL = 5000;
let cachedReport: any = null;
let cacheTimestamp = 0;
let cachedIp = "";

interface MetricRecord {
  timestamp: number;
  value: number;
}

const metricsHistory: Map<string, MetricRecord[]> = new Map();
const MAX_HISTORY = 100;

export const recordMetric = (name: string, value: number) => {
  if (!metricsHistory.has(name)) {
    metricsHistory.set(name, []);
  }
  const history = metricsHistory.get(name)!;
  history.push({ timestamp: Date.now(), value });
  if (history.length > MAX_HISTORY) {
    history.shift();
  }
};

const getMetricStats = (name: string) => {
  const history = metricsHistory.get(name) || [];
  if (history.length === 0) return null;

  const values = history.map((h) => h.value);
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const min = Math.min(...values);
  const max = Math.max(...values);

  return { avg: avg.toFixed(2), min, max, samples: values.length };
};

export const getQuickHealthStatus = async () => {
  const now = Date.now();

  if (cachedReport && now - cacheTimestamp < CACHE_TTL) {
    return {
      ...cachedReport,
      cached: true,
      cacheAge: `${now - cacheTimestamp}ms`
    };
  }

  const start = Date.now();
  const memUsage = process.memoryUsage();
  const uptime = process.uptime();

  const healthScore = calculateHealthScore(memUsage, uptime);

  const report = {
    status:
      healthScore > 70 ? "healthy" : healthScore > 40 ? "degraded" : "critical",
    healthScore,
    uptime: formatUptime(uptime),
    memory: {
      heapUsed: formatBytes(memUsage.heapUsed),
      heapTotal: formatBytes(memUsage.heapTotal),
      usagePercent:
        ((memUsage.heapUsed / memUsage.heapTotal) * 100).toFixed(2) + "%"
    },
    eventLoop: await measureEventLoopLag(),
    generationTime: `${Date.now() - start}ms`,
    cached: false
  };

  cachedReport = report;
  cacheTimestamp = now;

  return report;
};

export const getDetailedHealthReport = async () => {
  const start = Date.now();

  const raw = (process.report as any)?.getReport();
  if (!raw) throw new Error("Node.js Process Report unavailable");

  const heap = raw.javascriptHeap || {};
  const resources = raw.resourceUsage || {};
  const libuv = raw.libuv || [];
  const memUsage = process.memoryUsage();
  const cpuUsage = process.cpuUsage();

  const eventLoopLag = await measureEventLoopLag();

  const heapStats = v8.getHeapStatistics();
  const heapSpaceStats = v8.getHeapSpaceStatistics();

  const loadAvg = os.loadavg();
  const cpuCount = os.cpus().length;

  const alerts = generateAlerts(
    memUsage,
    heapStats,
    loadAvg,
    cpuCount,
    eventLoopLag
  );
  const healthScore = calculateHealthScore(memUsage, process.uptime());

  return {
    serverIdentity: {
      hostname: os.hostname(),
      ip: getServerIp(),
      platform: os.platform(),
      arch: os.arch(),
      env: process.env.NODE_ENV || "development",
      nodeVersion: process.version
    },
    status: {
      health:
        healthScore > 70
          ? "healthy"
          : healthScore > 40
            ? "degraded"
            : "critical",
      healthScore,
      alerts: alerts.length > 0 ? alerts : ["All systems operational"],
      reportGenerationTime: `${Date.now() - start}ms`
    },
    process: {
      pid: process.pid,
      ppid: process.ppid,
      uptime: formatUptime(process.uptime()),
      version: process.version,
      execPath: process.execPath,
      cwd: process.cwd()
    },
    cpu: {
      usage: {
        user: formatMicroseconds(cpuUsage.user),
        system: formatMicroseconds(cpuUsage.system),
        total: formatMicroseconds(cpuUsage.user + cpuUsage.system)
      },
      loadAverage: {
        "1min": loadAvg[0].toFixed(2),
        "5min": loadAvg[1].toFixed(2),
        "15min": loadAvg[2].toFixed(2)
      },
      cores: cpuCount,
      loadPerCore: (loadAvg[0] / cpuCount).toFixed(2)
    },
    memory: {
      process: {
        rss: formatBytes(memUsage.rss),
        heapTotal: formatBytes(memUsage.heapTotal),
        heapUsed: formatBytes(memUsage.heapUsed),
        external: formatBytes(memUsage.external),
        arrayBuffers: formatBytes(memUsage.arrayBuffers),
        heapUsagePercent:
          ((memUsage.heapUsed / memUsage.heapTotal) * 100).toFixed(2) + "%"
      },
      v8Heap: {
        totalHeapSize: formatBytes(heapStats.total_heap_size),
        usedHeapSize: formatBytes(heapStats.used_heap_size),
        heapSizeLimit: formatBytes(heapStats.heap_size_limit),
        mallocedMemory: formatBytes(heapStats.malloced_memory),
        peakMallocedMemory: formatBytes(heapStats.peak_malloced_memory),
        nativeContexts: heapStats.number_of_native_contexts,
        detachedContexts: heapStats.number_of_detached_contexts
      },
      heapSpaces: heapSpaceStats.map((space) => ({
        name: space.space_name,
        size: formatBytes(space.space_size),
        used: formatBytes(space.space_used_size),
        available: formatBytes(space.space_available_size),
        physicalSize: formatBytes(space.physical_space_size)
      })),
      system: {
        free: formatBytes(os.freemem()),
        total: formatBytes(os.totalmem()),
        usagePercent:
          (((os.totalmem() - os.freemem()) / os.totalmem()) * 100).toFixed(2) +
          "%"
      }
    },
    eventLoop: {
      lag: eventLoopLag,
      status:
        eventLoopLag.current < 10
          ? "optimal"
          : eventLoopLag.current < 50
            ? "acceptable"
            : eventLoopLag.current < 100
              ? "degraded"
              : "critical"
    },
    handles: {
      total: libuv.length,
      types: getHandlesByType(libuv),
      tcp: libuv.filter((h: any) => h.type === "tcp").length,
      udp: libuv.filter((h: any) => h.type === "udp").length,
      pipe: libuv.filter((h: any) => h.type === "pipe").length,
      timer: libuv.filter((h: any) => h.type === "timer").length,
      fs: libuv.filter((h: any) => h.type === "fs").length
    },
    gc: getGCStats(),
    performance: {
      healthChecks: getMetricStats("health_check")
    },
    timestamps: {
      generated: new Date().toISOString(),
      serverStart: new Date(Date.now() - process.uptime() * 1000).toISOString()
    }
  };
};

export const formatBytes = (bytes: number, decimals = 2) => {
  if (!bytes || bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
};

export const formatUptime = (seconds: number) => {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  return `${m}m ${s}s`;
};

const formatMicroseconds = (microseconds: number) => {
  const ms = microseconds / 1000;
  if (ms < 1000) return `${ms.toFixed(2)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
};

const getServerIp = () => {
  if (cachedIp) return cachedIp;
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === "IPv4" && !net.internal) {
        cachedIp = net.address;
        return cachedIp;
      }
    }
  }
  return "Unknown";
};

const getHandlesByType = (libuv: any[]) => {
  const types: Record<string, number> = {};
  libuv.forEach((h) => {
    types[h.type] = (types[h.type] || 0) + 1;
  });
  return types;
};

let lastLagCheck = 0;
let cachedLag = { current: 0, avg: 0, max: 0 };

const measureEventLoopLag = (): Promise<{
  current: number;
  avg: number;
  max: number;
}> => {
  return new Promise((resolve) => {
    const start = Date.now();
    setImmediate(() => {
      const lag = Date.now() - start;
      cachedLag = {
        current: lag,
        avg: (cachedLag.avg + lag) / 2,
        max: Math.max(cachedLag.max, lag)
      };
      lastLagCheck = Date.now();
      resolve(cachedLag);
    });
  });
};

let gcStats = { count: 0, totalDuration: 0, lastGC: 0 };

if (global.gc) {
  const obs = new perf_hooks.PerformanceObserver((list) => {
    const entries = list.getEntries();
    entries.forEach((entry) => {
      if (entry.entryType === "gc") {
        gcStats.count++;
        gcStats.totalDuration += entry.duration;
        gcStats.lastGC = Date.now();
      }
    });
  });
  obs.observe({ entryTypes: ["gc"] });
}

const getGCStats = () => {
  if (gcStats.count === 0) {
    return {
      available: false,
      note: "Start with --expose-gc flag for GC stats"
    };
  }
  return {
    totalCollections: gcStats.count,
    totalDuration: `${gcStats.totalDuration.toFixed(2)}ms`,
    avgDuration: `${(gcStats.totalDuration / gcStats.count).toFixed(2)}ms`,
    lastGC: gcStats.lastGC ? `${Date.now() - gcStats.lastGC}ms ago` : "Never"
  };
};

const calculateHealthScore = (
  memUsage: NodeJS.MemoryUsage,
  uptime: number
): number => {
  let score = 100;

  const memPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
  if (memPercent > 90) score -= 40;
  else if (memPercent > 75) score -= 25;
  else if (memPercent > 60) score -= 10;

  if (uptime < 60) score -= 10;

  return Math.max(0, Math.min(100, score));
};

const generateAlerts = (
  memUsage: NodeJS.MemoryUsage,
  heapStats: any,
  loadAvg: number[],
  cpuCount: number,
  eventLoopLag: any
): string[] => {
  const alerts: string[] = [];

  const heapPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
  if (heapPercent > 90) alerts.push("🔴 CRITICAL: Heap usage > 90%");
  else if (heapPercent > 75) alerts.push("🟡 WARNING: Heap usage > 75%");

  const systemMemPercent =
    ((os.totalmem() - os.freemem()) / os.totalmem()) * 100;
  if (systemMemPercent > 90) alerts.push("🔴 CRITICAL: System memory > 90%");

  const loadPerCore = loadAvg[0] / cpuCount;
  if (loadPerCore > 0.9) alerts.push("🔴 CRITICAL: High CPU load");
  else if (loadPerCore > 0.7) alerts.push("🟡 WARNING: Elevated CPU load");

  if (eventLoopLag.current > 100)
    alerts.push("🔴 CRITICAL: Event loop lag > 100ms");
  else if (eventLoopLag.current > 50)
    alerts.push("🟡 WARNING: Event loop lag > 50ms");

  if (heapStats.number_of_detached_contexts > 10) {
    alerts.push("🟡 WARNING: High detached contexts (possible memory leak)");
  }

  return alerts;
};

export const generateHealthReport = getDetailedHealthReport;
