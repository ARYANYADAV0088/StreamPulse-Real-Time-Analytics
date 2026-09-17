# Quick Start

## Terminal 1 — Mini-Kafka cluster

Open a **VS Code terminal** in `mini-kafka` and run:

```powershell
cd C:\Users\HP\Desktop\StreamPulse-Real-Time-Analytics-v5-final\StreamPulse-Real-Time-Analytics\mini-kafka
npm install
npm run cluster
```

This opens three PowerShell windows automatically:

- Broker 1 → `9090`
- Broker 2 → `9091`
- Broker 3 → `9092`

Leave all three broker windows running.

## Terminal 2 — Backend

```powershell
cd C:\Users\HP\Desktop\StreamPulse-Real-Time-Analytics-v5-final\StreamPulse-Real-Time-Analytics\backend
npm install
npm run dev
```

## Terminal 3 — Frontend

```powershell
cd C:\Users\HP\Desktop\StreamPulse-Real-Time-Analytics-v5-final\StreamPulse-Real-Time-Analytics\frontend
npm install
npm run dev
```

## Terminal 4 — Demo Website

```powershell
cd C:\Users\HP\Desktop\StreamPulse-Real-Time-Analytics-v5-final\StreamPulse-Real-Time-Analytics\demo-site
npx serve -l 5500
```

Open:

- Dashboard: http://localhost:5173
- Demo site: http://localhost:5500
- Backend health: http://localhost:3001/health
- Streaming metrics: http://localhost:3001/streaming

MongoDB must be running locally.

Docker Kafka is optional; the application uses Mini-Kafka by default.
