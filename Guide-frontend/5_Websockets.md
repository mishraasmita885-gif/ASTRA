# 5. Why WebSockets?

This is where you as frontend/backend developer come in.

Normal REST:

```
Frontend → "Give me telemetry"
Backend → telemetry
```

Then frontend has to ask again.

That's annoying for real-time data.

WebSocket:

```
Frontend ──────────────── Backend
          persistent
          connection

Backend → telemetry
Backend → telemetry
Backend → telemetry
Backend → telemetry
Backend → telemetry
```

The backend continuously pushes data.

The report specifically says the telemetry stream will use WebSockets.

So your frontend should have something conceptually like:

```JavaScript
const socket = new WebSocket("ws://localhost:8000/ws/telemetry");

socket.onmessage = (event) => {
    const telemetry = JSON.parse(event.data);

    // update charts
    // update cards
    // update subsystem status
};
```
