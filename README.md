# StreamPulse — Real-Time Event Streaming & Analytics Platform

A production-style event-driven analytics project built around **React, Node.js, Mini-Kafka, MongoDB and Socket.io**.

The project demonstrates how user activity can be accepted by an API, partitioned into a streaming log, processed by a consumer group, persisted, aggregated and pushed to a live dashboard.

## Architecture

```text
NovaCart Demo Storefront
     │
     ▼
Express Event API
     │
     ▼
Mini-Kafka
  events topic
  ├── Partition 0
  ├── Partition 1
  └── Partition 2
     │
     ▼
Consumer Group
     │
     ├──────────────► MongoDB
     │
     └──────────────► Stats / Analytics
                           │
                           ▼
                       Socket.io
                           │
                           ▼
                     React Dashboard
```

The repository also contains Docker configuration for Apache Kafka + Zookeeper + Kafka UI, retained as a reference/extension of the original Kafka implementation. The default live application path uses the lightweight Mini-Kafka implementation so the streaming mechanics are visible in source code.

## Features

- Real-time click/view/signup event ingestion
- Unique event IDs and idempotent MongoDB processing
- Partitioned Mini-Kafka topic
- User-key based partition routing
- Persistent JSONL partition logs
- Three-broker cluster mode
- Replication with majority write quorum
- Deterministic leader election / failover
- Consumer groups, heartbeats and automatic rebalancing
- Durable, replicated consumer offsets
- Consumer offsets and lag metrics
- Configurable record retention
- Batch event publishing for load testing
- MongoDB persistence and indexes
- Historical event explorer with search, filters and pagination
- 24-hour analytics timeline
- Unique users and conversion metrics
- Top pages and top users
- Live Socket.io updates
- Streaming-system monitoring
- Responsive SaaS-style dashboard
- Architecture visualization
- API rate limiting and validation
- Graceful backend shutdown

## Stack

- React + TypeScript + Vite
- Recharts
- Lucide React
- Node.js + Express
- Socket.io
- MongoDB + Mongoose
- Custom Mini-Kafka broker over TCP
- Apache Kafka / Zookeeper / Kafka UI via Docker (optional reference stack)

## Run locally

### 1. Start MongoDB

Make sure MongoDB is running locally.

Default connection:

```text
mongodb://127.0.0.1:27017/kafka_demo
```

### 2. Start Mini-Kafka

From `mini-kafka`:

```bash
node src/broker.js
```

You should see:

```text
Mini-Kafka broker running on port 9090
Partitions per topic: 3
```

### 3. Start backend

From `backend`:

```bash
npm install
npm run dev
```

Backend:

```text
http://localhost:3001
```

### 4. Start frontend

From `frontend`:

```bash
npm install
npm run dev
```

Dashboard:

```text
http://localhost:5173
```

### 5. Start the NovaCart demo storefront

From `demo-site`:

```bash
npx serve -l 5500
```

Demo website:

```text
http://localhost:5500
```

## Useful endpoints

| Endpoint | Purpose |
|---|---|
| `GET /health` | API and dependency health |
| `GET /stats` | Current event counters |
| `GET /metrics` | Broker + processing metrics |
| `GET /analytics` | Product analytics |
| `GET /events` | Searchable event history |
| `GET /streaming` | Mini-Kafka topology and lag |
| `POST /events` | Publish one event |
| `POST /events/bulk` | Publish a batch |

## Mini-Kafka concepts implemented

### Topic

A named event stream such as `events`.

### Partition

Each topic contains three independent logs. Events with the same user key are routed deterministically to the same partition.

### Offset

Each record receives an increasing offset within its partition.

### Consumer group

Consumers in the same group share partitions. Different groups maintain independent progress.

### Consumer lag

Lag is calculated as:

```text
partition end offset - consumer committed offset
```

## Resume description

**Real-Time Event Streaming & Analytics Platform** — Built an event-driven analytics platform using React, Node.js, MongoDB, Socket.io and a custom Kafka-inspired broker, implementing partitioned event streams, consumer groups, offsets, real-time processing, persistent event storage, analytics aggregation and live operational monitoring.

## Mini-Kafka Cluster Mode (v3)

The Mini-Kafka layer supports a real three-broker local cluster:

```text
                 Mini-Kafka Cluster
        ┌────────────┬────────────┬────────────┐
        │            │            │
      B1:9090      B2:9091      B3:9092
        │            │            │
        └────── replicated partition logs ─────┘
```

Each partition has three replicas by default. The first live replica in the deterministic replica set is the leader. Producers are routed to the current leader and the leader waits for a majority acknowledgement before marking a record committed. If a leader stops, the next live replica can become leader without losing committed records.

Consumer offsets are stored on disk and replicated to the other brokers. Consumer membership uses heartbeats with automatic stale-member removal and deterministic partition rebalancing. Partition logs are JSONL files under `mini-kafka/data/broker-*`.

### Start the cluster on Windows

From `mini-kafka` in PowerShell:

```powershell
powershell -ExecutionPolicy Bypass -File start-cluster.ps1
```

This opens B1, B2 and B3 on ports 9090, 9091 and 9092. Stop them with:

```powershell
powershell -ExecutionPolicy Bypass -File stop-cluster.ps1
```

### Cluster smoke test

From `mini-kafka`:

```powershell
npm run cluster:test
```

The test publishes replicated records, consumes and acknowledges them, stops the original broker, publishes again through leader failover, and verifies cluster stats.

### What this implementation intentionally does not claim

This is a Kafka-inspired educational broker, not a drop-in Apache Kafka replacement. It does not implement Kafka's binary wire protocol, ISR/controller quorum protocol, exactly-once transactions, or the full Kafka group coordinator protocol. Its goal is to make distributed streaming concepts visible and understandable in source code.
