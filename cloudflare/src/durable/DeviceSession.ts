/**
 * DeviceSession Durable Object (cloud only).
 *
 * One instance per MSDS device. Holds the WebSocket fan-out between the installed
 * Electron device and any dashboard viewers. The cloud still never reaches the CCTV:
 * the device pushes, the cloud relays.
 */
export class DeviceSession implements DurableObject {
  private sockets = new Set<WebSocket>();
  private lastStatus: unknown = null;

  constructor(private state: DurableObjectState) {}

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // Server-side fan-out used by the REST routes.
    if (url.pathname === '/broadcast' && request.method === 'POST') {
      const message = await request.text();
      try {
        const parsed = JSON.parse(message);
        if (parsed?.type === 'status') this.lastStatus = parsed.payload;
      } catch { /* keep raw */ }
      this.broadcast(message);
      return new Response(null, { status: 204 });
    }

    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response(JSON.stringify({ error: 'expected_websocket' }), { status: 426 });
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair) as [WebSocket, WebSocket];
    server.accept();
    this.sockets.add(server);

    if (this.lastStatus) server.send(JSON.stringify({ type: 'status', payload: this.lastStatus }));

    server.addEventListener('message', (evt) => {
      // Messages from the device (status/alert/detection) are relayed to viewers.
      const data = typeof evt.data === 'string' ? evt.data : '';
      if (!data) return;
      try {
        const parsed = JSON.parse(data);
        if (parsed?.type === 'status') this.lastStatus = parsed.payload;
        if (parsed?.type === 'ping') { server.send(JSON.stringify({ type: 'pong' })); return; }
      } catch { /* ignore */ }
      this.broadcast(data, server);
    });

    const drop = () => this.sockets.delete(server);
    server.addEventListener('close', drop);
    server.addEventListener('error', drop);

    return new Response(null, { status: 101, webSocket: client });
  }

  private broadcast(message: string, except?: WebSocket) {
    for (const ws of this.sockets) {
      if (ws === except) continue;
      try { ws.send(message); } catch { this.sockets.delete(ws); }
    }
  }
}
