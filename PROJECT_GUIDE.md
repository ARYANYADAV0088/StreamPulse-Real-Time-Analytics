# StreamPulse Project Guide

## What this project demonstrates

This project is an event-driven analytics system.

A user interaction creates an event. The API validates it and publishes it to a Kafka-style stream. The broker partitions the stream. A consumer group reads records, acknowledges successful processing, stores the event in MongoDB and broadcasts the processed event to connected dashboards.

## Runtime flow

```text
Browser
  |
  | POST /events
  v
Express API
  |
  | eventId + userId key
  v
Mini-Kafka :9090
  |
  | events topic
  | P0 / P1 / P2
  v
Analytics consumer group
  |
  +----> MongoDB
  |
  +----> StatsService
  |
  +----> Socket.io
              |
              v
         React dashboard
```

## Important folders

### backend/

The application server.

- `server.js` — HTTP server, API routes, WebSocket setup, startup and shutdown.
- `config/database.js` — MongoDB connection.
- `models/Event.js` — MongoDB event schema and indexes.
- `kafka/event-producer.js` — application-facing producer adapter.
- `kafka/event-consumer.js` — application-facing consumer and processing pipeline.
- `kafka/mini-kafka-admin.js` — reads broker operational metadata.
- `routes/event-routes.js` — historical event search API.
- `routes/analytics-routes.js` — MongoDB aggregation analytics.
- `routes/streaming-routes.js` — broker topology and lag API.
- `services/stats-service.js` — fast in-memory counters backed by MongoDB at startup.

### mini-kafka/

A small Kafka-inspired broker written from scratch for learning.

- `broker.js` — TCP server, topics, partitions, offsets, groups, acknowledgements and metrics.
- `producer.js` — client used to publish records.
- `consumer.js` — client used to join groups, consume and acknowledge records.
- `client.js` — tiny end-to-end protocol demo.
- `producer-test.js` — producer partitioning test.
- `consumer-test.js` — consumer-group partition assignment test.

### frontend/

React + TypeScript observability dashboard.

The dashboard has four views:

1. Overview
2. Event Explorer
3. Streaming System
4. Architecture

### demo-site/

A small website that produces realistic click/view/signup events.

## Mini-Kafka concepts

### Partitioning

The producer sends `userId` as the key.

The broker hashes the key:

```text
userId -> hash -> partition
```

Therefore the same user consistently maps to the same partition while the partition count remains unchanged.

### Offsets

Every partition has its own sequence:

```text
P0: offset 0, 1, 2, 3...
P1: offset 0, 1, 2...
P2: offset 0, 1, 2, 3...
```

### Consumer groups

Consumers with the same group ID share partitions.

Example:

```text
events
 P0 ───── consumer-1
 P1 ───── consumer-2
 P2 ───── consumer-1
```

A different group gets its own independent progress.

### Acknowledgements

The broker does not advance a consumer's committed offset merely because a record was returned.

The application processes the record first and sends an acknowledgement afterward.

That gives the system a simple at-least-once processing model.

### Idempotency

Every event receives a UUID.

MongoDB has a unique index on `eventId`.

If the same event is processed again, MongoDB reports a duplicate key and the consumer does not double-count it.

## MongoDB

MongoDB is the durable source for historical event analytics.

Indexes support:

- event ID lookup
- event type + time
- user + time
- newest events first

The in-memory `StatsService` is deliberately fast for the live dashboard, while MongoDB provides persistence.

## Analytics

The analytics API uses MongoDB aggregation pipelines to calculate:

- unique users
- event counts
- signup rate
- view-to-signup rate
- top pages
- top users
- hourly event volume

## Real-time behavior

Socket.io is used after successful event processing.

The consumer emits:

```text
event-received
stats-update
```

The React dashboard updates without refreshing the browser.

## Operational monitoring

The Streaming System page reads broker metadata and displays:

- broker health
- partition counts
- partition volume
- consumer groups
- consumer assignments
- consumer lag
- MongoDB/API/WebSocket status

## Limitations worth knowing

Mini-Kafka is intentionally educational rather than production Kafka.

It currently keeps broker state in memory, so restarting the broker loses its stream data. MongoDB remains persistent.

Real Kafka provides many more distributed-system guarantees such as replication, durable logs, leader election, network-aware consumer coordination and fault tolerance.

That distinction is important in an interview.

## Suggested learning order

Do not try to learn the whole repository at once.

1. `server.js`
2. `event-producer.js`
3. `mini-kafka/broker.js`
4. `mini-kafka/producer.js`
5. `event-consumer.js`
6. `mini-kafka/consumer.js`
7. `Event.js`
8. `analytics-routes.js`
9. `App.tsx`
10. `index.css`

Once those are understood, the rest of the repository becomes much easier.

## Strong interview questions

Be ready to explain:

- Why use Kafka instead of directly writing to MongoDB?
- What is a topic?
- Why partition a topic?
- What is an offset?
- Why use a message key?
- What is a consumer group?
- What happens when a consumer fails?
- What is consumer lag?
- Why acknowledge after processing?
- Why can at-least-once processing create duplicates?
- How does the unique event ID prevent double counting?
- Why keep StatsService in memory?
- Why use MongoDB aggregation?
- Why use WebSockets instead of polling?
- What happens if Mini-Kafka goes down?
- What is different between Mini-Kafka and Apache Kafka?
- How would you make the broker distributed?
- How would you add replication?
- How would you scale the consumer layer?

## Mini-Kafka v3 distributed-systems layer

The broker is now a three-node local cluster by default: B1=9090, B2=9091, B3=9092. Each topic partition has a deterministic replica set. The first live replica becomes leader; producers are forwarded to the leader. Leaders append to a persistent JSONL partition log and replicate to followers. A record becomes committed only after a majority acknowledgement. If the leader fails, the next live replica can accept writes using the replicated log.

Consumer groups are stored as replicated membership state with heartbeats. Partition ownership is recalculated deterministically from the sorted active member list, which gives a simple rebalancing model. Consumer offsets are persisted on disk and replicated after ACK, so a new consumer can resume from the group's committed position instead of an individual consumer's position.

Important interview caveat: this is intentionally a Kafka-inspired implementation. It does not implement Apache Kafka's exact binary protocol, controller quorum/KRaft protocol, ISR protocol, transactions, exactly-once semantics, or the complete production group coordinator protocol.
