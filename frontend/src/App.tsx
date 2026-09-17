import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { io, Socket } from "socket.io-client";
import {
  Activity,
  BarChart3,
  CheckCircle2,
  Clock3,
  Database,
  Gauge,
  Globe2,
  Layers3,
  Menu,
  Network,
  Play,
  Radio,
  RefreshCw,
  Search,
  Server,
  ShieldCheck,
  Sparkles,
  UserPlus,
  Users,
  Wifi,
  X,
  Zap,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

type EventType = "click" | "view" | "signup";
type Tab = "overview" | "events" | "streaming" | "architecture";

interface Stats {
  clicks: number;
  views: number;
  signups: number;
  total: number;
  lastUpdated: string;
  processedSinceStart?: number;
  uptimeSeconds?: number;
}

interface EventRecord {
  _id?: string;
  eventId: string;
  eventType: EventType;
  userId: string;
  timestamp: string;
  metadata?: { page?: string; source?: string };
  partition?: number;
  offset?: number;
}

interface Analytics {
  uniqueUsers: number;
  signupRate: number;
  viewToSignupRate: number;
  topPages: { page: string; count: number }[];
  topUsers: { userId: string; count: number }[];
  timeline: {
    time: string;
    clicks: number;
    views: number;
    signups: number;
    total: number;
  }[];
}

interface Streaming {
  broker: {
    status: string;
    port: number;
    partitionCount: number;
    topics: Record<
      string,
      {
        partitionCount: number;
        totalMessages: number;
        partitions: { partition: number; messages: number; nextOffset: number; replicas?: string[]; leader?: string | null }[];
      }
    >;
    replicationFactor?: number;
    replication?: { factor: number; quorum: number };
    cluster?: { id: string; host: string; port: number; alive: boolean }[];
    consumerGroups: {
      groupId: string;
      consumers: string[];
      assignments: {
        consumerId: string;
        partitions: number[];
        lag: Record<string, { partition: number; committedOffset: number; endOffset: number; lag: number }[]>;
      }[];
    }[];
  };
}

const emptyAnalytics: Analytics = {
  uniqueUsers: 0,
  signupRate: 0,
  viewToSignupRate: 0,
  topPages: [],
  topUsers: [],
  timeline: [],
};

function formatNumber(value: number) {
  return value.toLocaleString();
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StatCard({
  label,
  value,
  icon,
  tone = "blue",
  detail,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  tone?: string;
  detail?: string;
}) {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${tone}`}>{icon}</div>
      <div className="stat-content">
        <span>{label}</span>
        <strong>{value}</strong>
        {detail && <small>{detail}</small>}
      </div>
    </div>
  );
}

function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: string }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

function App() {
  const [tab, setTab] = useState<Tab>("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [connected, setConnected] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<Stats>({
    clicks: 0,
    views: 0,
    signups: 0,
    total: 0,
    lastUpdated: new Date().toISOString(),
  });
  const [analytics, setAnalytics] = useState<Analytics>(emptyAnalytics);
  const [streaming, setStreaming] = useState<Streaming | null>(null);
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [sending, setSending] = useState<EventType | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generatorResult, setGeneratorResult] = useState("");
  const [search, setSearch] = useState("");
  const [eventFilter, setEventFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalEvents, setTotalEvents] = useState(0);
  const [selectedEvent, setSelectedEvent] = useState<EventRecord | null>(null);

  const loadAnalytics = async () => {
    try {
      const response = await axios.get(`${API}/analytics?hours=24`);
      if (response.data.success) setAnalytics(response.data.analytics);
    } catch (error) {
      console.error("Analytics error:", error);
    }
  };

  const loadStreaming = async () => {
    try {
      const response = await axios.get(`${API}/streaming`);
      if (response.data.success) setStreaming(response.data.streaming);
    } catch (error) {
      setStreaming(null);
    }
  };

  const loadEvents = async (nextPage = page) => {
    try {
      const params = new URLSearchParams({
        page: String(nextPage),
        limit: "12",
      });
      if (eventFilter !== "all") params.set("type", eventFilter);
      if (search.trim()) params.set("search", search.trim());

      const response = await axios.get(`${API}/events?${params}`);
      if (response.data.success) {
        setEvents(response.data.events);
        setTotalPages(response.data.pagination.totalPages);
        setTotalEvents(response.data.pagination.total);
        setPage(response.data.pagination.page);
      }
    } catch (error) {
      console.error("Event history error:", error);
    }
  };

  useEffect(() => {
    let socket: Socket | undefined;

    try {
      socket = io(API, { transports: ["websocket", "polling"] });

      socket.on("connect", () => setConnected(true));
      socket.on("disconnect", () => setConnected(false));
      socket.on("stats-update", (nextStats: Stats) => setStats(nextStats));
      socket.on("event-received", (event: EventRecord) => {
        setEvents((current) => [event, ...current].slice(0, 12));
        setTotalEvents((current) => current + 1);
        loadAnalytics();
      });
    } catch {
      setConnected(false);
    }

    loadAnalytics();
    loadStreaming();
    loadEvents(1);

    const interval = window.setInterval(() => {
      loadStreaming();
    }, 5000);

    return () => {
      window.clearInterval(interval);
      socket?.disconnect();
    };
  }, []);

  useEffect(() => {
    loadEvents(1);
  }, [eventFilter, search]);

  const sendEvent = async (eventType: EventType) => {
    setSending(eventType);
    try {
      await axios.post(`${API}/events`, {
        eventType,
        userId: `dashboard_${Math.random().toString(36).slice(2, 9)}`,
        page: "/dashboard",
        source: "dashboard",
      });
    } catch (error) {
      console.error(error);
    } finally {
      setSending(null);
    }
  };

  const refreshDashboard = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await Promise.all([loadAnalytics(), loadStreaming(), loadEvents(page)]);
    } finally {
      setRefreshing(false);
    }
  };

  const generateEvents = async (count: number) => {
    setGenerating(true);
    setGeneratorResult(`Generating ${formatNumber(count)} events…`);
    try {
      const response = await axios.post(`${API}/events/bulk`, { count }, { timeout: 45000 });
      setGeneratorResult(
        `${formatNumber(response.data.count)} events accepted in ${formatNumber(response.data.durationMs)} ms`
      );
      await Promise.all([loadAnalytics(), loadStreaming(), loadEvents(1)]);
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? error.response?.data?.error || error.message
        : "Unknown generator error";
      setGeneratorResult(`Generator failed: ${message}`);
    } finally {
      setGenerating(false);
      loadStreaming();
    }
  };

  const distribution = [
    { name: "Clicks", value: stats.clicks },
    { name: "Views", value: stats.views },
    { name: "Signups", value: stats.signups },
  ];

  const partitionData = useMemo(() => {
    const topic = streaming?.broker.topics?.events;
    return (
      topic?.partitions.map((item) => ({
        name: `P${item.partition}`,
        events: item.messages,
      })) || []
    );
  }, [streaming]);

  const navigation: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "overview", label: "Overview", icon: <Gauge size={18} /> },
    { id: "events", label: "Event Explorer", icon: <Radio size={18} /> },
    { id: "streaming", label: "Streaming System", icon: <Network size={18} /> },
    { id: "architecture", label: "Architecture", icon: <Layers3 size={18} /> },
  ];

  return (
    <div className="app-shell">
      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="brand">
          <div className="brand-mark"><Zap size={20} /></div>
          <div>
            <strong>StreamPulse</strong>
            <span>Event Intelligence</span>
          </div>
          <button className="icon-button mobile-close" onClick={() => setSidebarOpen(false)}>
            <X size={18} />
          </button>
        </div>

        <nav>
          <p className="nav-label">Workspace</p>
          {navigation.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${tab === item.id ? "active" : ""}`}
              onClick={() => {
                setTab(item.id);
                setSidebarOpen(false);
              }}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="mini-status">
            <span className={`status-dot ${connected ? "online" : ""}`} />
            <div>
              <strong>{connected ? "Live connection" : "Reconnecting"}</strong>
              <span>Socket.io stream</span>
            </div>
          </div>
          <div className="stack-pill">
            <span>STACK</span>
            <strong>React · Node · Mongo · Kafka</strong>
          </div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <button className="icon-button menu-button" onClick={() => setSidebarOpen(true)}>
            <Menu size={20} />
          </button>
          <div>
            <p className="eyebrow">OBSERVABILITY / REAL-TIME</p>
            <h1>{navigation.find((item) => item.id === tab)?.label}</h1>
          </div>
          <div className="topbar-actions">
            <div className="live-pill">
              <span className={`status-dot ${connected ? "online" : ""}`} />
              {connected ? "LIVE" : "OFFLINE"}
            </div>
            <button type="button" className="refresh-button" disabled={refreshing} onClick={refreshDashboard}>
              <RefreshCw size={16} className={refreshing ? "spin" : ""} />
              {refreshing ? "Refreshing…" : "Refresh"}
            </button>
          </div>
        </header>

        {tab === "overview" && (
          <>
            <section className="hero-card">
              <div>
                <Badge tone="success"><span className="status-dot online" /> Streaming healthy</Badge>
                <h2>Event intelligence, <span>in real time.</span></h2>
                <p>
                  Watch user activity travel from the event API through Mini-Kafka,
                  into MongoDB, and back to this dashboard over WebSockets.
                </p>
              </div>
              <div className="hero-orbit">
                <div className="orbit-ring ring-one" />
                <div className="orbit-ring ring-two" />
                <div className="orbit-core"><Activity size={30} /></div>
              </div>
            </section>

            <div className="section-heading">
              <div>
                <p className="eyebrow">SYSTEM SNAPSHOT</p>
                <h2>Live metrics</h2>
              </div>
              <span className="muted">Updated {new Date(stats.lastUpdated).toLocaleTimeString()}</span>
            </div>

            <section className="stats-grid">
              <StatCard label="Total events" value={formatNumber(stats.total)} icon={<Activity size={20} />} tone="blue" detail="All-time persisted" />
              <StatCard label="Unique users" value={formatNumber(analytics.uniqueUsers)} icon={<Users size={20} />} tone="purple" detail="MongoDB distinct users" />
              <StatCard label="Signups" value={formatNumber(stats.signups)} icon={<UserPlus size={20} />} tone="green" detail={`${analytics.signupRate}% signup / user`} />
              <StatCard label="Processed" value={formatNumber(stats.processedSinceStart || 0)} icon={<Zap size={20} />} tone="orange" detail="Since backend start" />
            </section>

            <section className="two-column">
              <div className="panel chart-panel">
                <div className="panel-heading">
                  <div><p className="eyebrow">LAST 24 HOURS</p><h3>Event volume</h3></div>
                  <Badge>Hourly</Badge>
                </div>
                <div className="chart">
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={analytics.timeline}>
                      <CartesianGrid vertical={false} stroke="var(--line)" />
                      <XAxis dataKey="time" tickFormatter={formatTime} stroke="var(--muted)" fontSize={11} />
                      <YAxis stroke="var(--muted)" fontSize={11} allowDecimals={false} />
                      <Tooltip contentStyle={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 12 }} />
                      <Legend />
                      <Line type="monotone" dataKey="clicks" stroke="#7c6cff" strokeWidth={2.5} dot={false} />
                      <Line type="monotone" dataKey="views" stroke="#26c6a5" strokeWidth={2.5} dot={false} />
                      <Line type="monotone" dataKey="signups" stroke="#ff9f43" strokeWidth={2.5} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="panel chart-panel">
                <div className="panel-heading">
                  <div><p className="eyebrow">EVENT MIX</p><h3>Distribution</h3></div>
                </div>
                <div className="chart donut-wrap">
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie data={distribution} dataKey="value" nameKey="name" innerRadius={78} outerRadius={108} paddingAngle={4}>
                        <Cell fill="#7c6cff" /><Cell fill="#26c6a5" /><Cell fill="#ff9f43" />
                      </Pie>
                      <Tooltip contentStyle={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 12 }} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </section>

            <section className="two-column">
              <div className="panel">
                <div className="panel-heading">
                  <div><p className="eyebrow">PRODUCT SIGNAL</p><h3>Top pages</h3></div>
                  <Globe2 size={18} className="muted" />
                </div>
                <div className="rank-list">
                  {analytics.topPages.length ? analytics.topPages.map((item, index) => (
                    <div className="rank-row" key={item.page}>
                      <span className="rank-number">0{index + 1}</span>
                      <div className="rank-bar"><span style={{ width: `${Math.min(100, (item.count / analytics.topPages[0].count) * 100)}%` }} /></div>
                      <strong>{item.page}</strong>
                      <b>{formatNumber(item.count)}</b>
                    </div>
                  )) : <div className="empty">No page events yet.</div>}
                </div>
              </div>

              <div className="panel">
                <div className="panel-heading">
                  <div><p className="eyebrow">QUICK TEST</p><h3>Generate events</h3></div>
                  <Play size={18} className="muted" />
                </div>
                <p className="panel-copy">Push a controlled burst through the same production event pipeline.</p>
                <div className="generator-grid">
                  {[10, 100, 1000].map((count) => (
                    <button type="button" key={count} className="generator-button" disabled={generating} onClick={() => generateEvents(count)}>
                      {generating ? <RefreshCw className="spin" size={16} /> : <Zap size={16} />}
                      {count.toLocaleString()}
                    </button>
                  ))}
                </div>
                {generatorResult && <div className="result-note"><CheckCircle2 size={15} />{generatorResult}</div>}
              </div>
            </section>
          </>
        )}

        {tab === "events" && (
          <section className="panel event-explorer">
            <div className="explorer-header">
              <div>
                <p className="eyebrow">PERSISTENT EVENT LOG</p>
                <h2>Event Explorer</h2>
                <p>Search and inspect events persisted by the consumer.</p>
              </div>
              <Badge>{formatNumber(totalEvents)} events</Badge>
            </div>

            <div className="filters">
              <div className="search-box">
                <Search size={17} />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search user, event ID or page..." />
                {search && <button onClick={() => setSearch("")}><X size={15} /></button>}
              </div>
              <select value={eventFilter} onChange={(e) => setEventFilter(e.target.value)}>
                <option value="all">All events</option>
                <option value="click">Clicks</option>
                <option value="view">Views</option>
                <option value="signup">Signups</option>
              </select>
            </div>

            <div className="event-table-wrap">
              <table>
                <thead><tr><th>Type</th><th>User</th><th>Page</th><th>Partition</th><th>Offset</th><th>Timestamp</th><th /></tr></thead>
                <tbody>
                  {events.map((event) => (
                    <tr key={event._id || event.eventId} onClick={() => setSelectedEvent(event)}>
                      <td><Badge tone={event.eventType}>{event.eventType}</Badge></td>
                      <td><strong className="mono">{event.userId}</strong></td>
                      <td>{event.metadata?.page || "—"}</td>
                      <td><span className="partition-chip">P{event.partition ?? "—"}</span></td>
                      <td className="mono">{event.offset ?? "—"}</td>
                      <td>{new Date(event.timestamp).toLocaleString()}</td>
                      <td><span className="view-link">Inspect →</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!events.length && <div className="empty large">No events match your filters.</div>}
            </div>

            <div className="pagination">
              <span>Page {page} of {totalPages}</span>
              <div>
                <button disabled={page <= 1} onClick={() => loadEvents(page - 1)}>Previous</button>
                <button disabled={page >= totalPages} onClick={() => loadEvents(page + 1)}>Next</button>
              </div>
            </div>
          </section>
        )}

        {tab === "streaming" && (
          <>
            <section className="stats-grid">
              <StatCard label="Broker" value={streaming ? "Healthy" : "Offline"} icon={<Server size={20} />} tone="green" detail="Mini-Kafka :9090" />
              <StatCard label="Partitions" value={streaming?.broker.partitionCount || 0} icon={<Layers3 size={20} />} tone="purple" detail="Per topic" />
              <StatCard label="Consumers" value={streaming?.broker.consumerGroups?.reduce((sum, g) => sum + g.consumers.length, 0) || 0} icon={<Users size={20} />} tone="blue" detail="Active group members" />
              <StatCard label="WebSocket" value={connected ? "Connected" : "Offline"} icon={<Wifi size={20} />} tone="orange" detail="Live dashboard feed" />
            </section>

            <section className="panel cluster-panel">
              <div className="panel-heading"><div><p className="eyebrow">CLUSTER TOPOLOGY</p><h3>Broker cluster & replication</h3></div><Badge tone="purple">RF {streaming?.broker.replicationFactor || 1}</Badge></div>
              <div className="cluster-node-grid">
                {(streaming?.broker.cluster || []).map((broker) => (
                  <div className="cluster-node" key={broker.id}>
                    <div><span className={`status-dot ${broker.alive ? "online" : "offline"}`} /><strong>Broker {broker.id}</strong></div>
                    <small>{broker.host}:{broker.port}</small>
                    <Badge tone={broker.alive ? "success" : "danger"}>{broker.alive ? "LIVE" : "OFFLINE"}</Badge>
                  </div>
                ))}
              </div>
              <div className="cluster-summary"><span>Replication factor: <b>{streaming?.broker.replication?.factor || streaming?.broker.replicationFactor || 1}</b></span><span>Write quorum: <b>{streaming?.broker.replication?.quorum || 1}</b></span><span>Committed records survive a single broker failure when quorum is available.</span></div>
            </section>

            <section className="two-column">
              <div className="panel chart-panel">
                <div className="panel-heading">
                  <div><p className="eyebrow">TOPIC / EVENTS</p><h3>Partition distribution</h3></div>
                  <Badge tone="success">3 partitions</Badge>
                </div>
                <ResponsiveContainer width="100%" height={330}>
                  <BarChart data={partitionData}>
                    <CartesianGrid vertical={false} stroke="var(--line)" />
                    <XAxis dataKey="name" stroke="var(--muted)" />
                    <YAxis stroke="var(--muted)" allowDecimals={false} />
                    <Tooltip contentStyle={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 12 }} />
                    <Bar dataKey="events" fill="#7c6cff" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="panel">
                <div className="panel-heading"><div><p className="eyebrow">BROKER TOPOLOGY</p><h3>Consumers & groups</h3></div><Network size={18} className="muted" /></div>
                {streaming?.broker.consumerGroups?.map((group) => (
                  <div className="consumer-group" key={group.groupId}>
                    <div><span className="status-dot online" /><strong>{group.groupId}</strong></div>
                    {group.assignments?.map((assignment) => (
                      <span key={assignment.consumerId} className="consumer-chip">
                        {assignment.consumerId} · P{assignment.partitions.join(", P")}
                      </span>
                    ))}
                  </div>
                )) || <div className="empty">No consumer groups detected.</div>}
                <div className="lag-panel">
                  <div className="lag-title"><span>CONSUMER LAG</span><small>unprocessed records</small></div>
                  {streaming?.broker.consumerGroups?.flatMap((group) =>
                    group.assignments?.flatMap((assignment) =>
                      Object.entries(assignment.lag).flatMap(([topic, rows]) =>
                        rows.map((row) => (
                          <div className="lag-row" key={`${group.groupId}-${assignment.consumerId}-${topic}-${row.partition}`}>
                            <span>{assignment.consumerId} / {topic} / P{row.partition}</span>
                            <b className={row.lag > 0 ? "lag-warning" : ""}>{row.lag}</b>
                          </div>
                        ))
                      )
                    )
                  )}
                </div>
                <div className="health-grid">
                  <div><Database size={16} /><span>MongoDB</span><Badge tone="success">Connected</Badge></div>
                  <div><ShieldCheck size={16} /><span>API</span><Badge tone="success">Healthy</Badge></div>
                  <div><Radio size={16} /><span>Mini-Kafka</span><Badge tone={streaming ? "success" : "danger"}>{streaming ? "Healthy" : "Offline"}</Badge></div>
                  <div><Wifi size={16} /><span>Socket.io</span><Badge tone={connected ? "success" : "danger"}>{connected ? "Live" : "Offline"}</Badge></div>
                </div>
              </div>
            </section>

            <section className="panel">
              <div className="panel-heading"><div><p className="eyebrow">STREAM DETAILS</p><h3>events topic</h3></div><Clock3 size={18} className="muted" /></div>
              {streaming?.broker.topics?.events ? (
                <div className="partition-cards">
                  {streaming.broker.topics.events.partitions.map((p) => (
                    <div className="partition-card" key={p.partition}>
                      <div><span>PARTITION</span><strong>P{p.partition}</strong></div>
                      <b>{formatNumber(p.messages)}</b>
                      <small>messages · next offset {p.nextOffset} · leader B{p.leader || "—"} · replicas {p.replicas?.map((r) => `B${r}`).join(", ") || "—"}</small>
                    </div>
                  ))}
                </div>
              ) : <div className="empty">Waiting for broker metadata…</div>}
            </section>
          </>
        )}

        {tab === "architecture" && (
          <>
            <section className="hero-card architecture-hero">
              <div>
                <Badge tone="purple"><Sparkles size={13} /> Event-driven architecture</Badge>
                <h2>From interaction to <span>insight.</span></h2>
                <p>A visual map of the production-style flow implemented in this project.</p>
              </div>
            </section>

            <section className="architecture-flow">
              {[
                ["01", "Demo Website", "Browser interactions create click, view and signup events.", "Globe2"],
                ["02", "Event API", "Express validates and accepts events with a unique event ID.", "Server"],
                ["03", "Mini-Kafka", "Partitioned topic stores records by user key and tracks offsets.", "Layers3"],
                ["04", "Consumer", "Consumer group reads assigned partitions and processes events.", "Radio"],
                ["05", "MongoDB", "Events become a durable, queryable historical data set.", "Database"],
                ["06", "Analytics", "Aggregation pipelines calculate product and operational metrics.", "BarChart3"],
                ["07", "Socket.io", "Processed events and updated counters are pushed live.", "Wifi"],
                ["08", "React Dashboard", "Operators explore the stream, health and business signals.", "Activity"],
              ].map(([number, title, description, iconName], index) => {
                const icons: Record<string, React.ReactNode> = {
                  Globe2: <Globe2 />, Server: <Server />, Layers3: <Layers3 />, Radio: <Radio />,
                  Database: <Database />, BarChart3: <BarChart3 />, Wifi: <Wifi />, Activity: <Activity />,
                };
                return (
                  <div className="flow-step" key={title}>
                    <span className="flow-number">{number}</span>
                    <div className="flow-icon">{icons[iconName]}</div>
                    <div><h3>{title}</h3><p>{description}</p></div>
                    {index < 7 && <div className="flow-arrow">↓</div>}
                  </div>
                );
              })}
            </section>
          </>
        )}

        <footer>
          <span>StreamPulse · Real-Time Event Streaming & Analytics</span>
          <span>React · Express · Mini-Kafka · MongoDB · Socket.io</span>
        </footer>
      </main>

      {selectedEvent && (
        <div className="modal-backdrop" onClick={() => setSelectedEvent(null)}>
          <div className="event-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-heading">
              <div><p className="eyebrow">EVENT DETAIL</p><h2>{selectedEvent.eventType}</h2></div>
              <button className="icon-button" onClick={() => setSelectedEvent(null)}><X size={18} /></button>
            </div>
            <div className="detail-grid">
              <div><span>Event ID</span><strong className="mono">{selectedEvent.eventId}</strong></div>
              <div><span>User ID</span><strong className="mono">{selectedEvent.userId}</strong></div>
              <div><span>Partition</span><strong>P{selectedEvent.partition ?? "—"}</strong></div>
              <div><span>Offset</span><strong>{selectedEvent.offset ?? "—"}</strong></div>
              <div><span>Page</span><strong>{selectedEvent.metadata?.page || "—"}</strong></div>
              <div><span>Source</span><strong>{selectedEvent.metadata?.source || "—"}</strong></div>
              <div><span>Timestamp</span><strong>{new Date(selectedEvent.timestamp).toLocaleString()}</strong></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
