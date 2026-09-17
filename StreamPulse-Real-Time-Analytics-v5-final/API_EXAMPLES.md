# API Examples

Base URL: `http://localhost:3001`

## Health

```http
GET /health
```

## Send one event

```bash
curl -X POST http://localhost:3001/events   -H "Content-Type: application/json"   -d '{"eventType":"click","userId":"user-123","page":"/features","source":"demo-website"}'
```

The API returns `202 Accepted` because the event has been accepted by the streaming pipeline; persistence happens asynchronously.

## Generate a batch

```bash
curl -X POST http://localhost:3001/events/bulk   -H "Content-Type: application/json"   -d '{"count":1000}'
```

## Current counters

```http
GET /stats
```

## Analytics

```http
GET /analytics?hours=24
```

Supported range: 1–168 hours.

## Event history

```http
GET /events?page=1&limit=12
```

Filter:

```http
GET /events?type=signup
```

Search:

```http
GET /events?search=user-123
```

## Streaming metadata

```http
GET /streaming
```

Returns broker status, topics, partitions, consumer groups and consumer lag.

## Operational metrics

```http
GET /metrics
```

Returns API uptime, WebSocket client count, processing counters and broker metrics.

## Event contract

```json
{
  "eventType": "click",
  "userId": "user-123",
  "page": "/features",
  "source": "demo-website"
}
```

Supported event types:

- `click`
- `view`
- `signup`
