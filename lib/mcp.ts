// Minimal Model Context Protocol (MCP) client over Streamable HTTP.
// Speaks JSON-RPC 2.0: initialize -> notifications/initialized -> tools/list -> tools/call.
// Works with any MCP server exposing the Streamable HTTP transport (2025-03-26 spec).

export interface McpTool {
  name: string;
  description?: string;
  inputSchema: Record<string, unknown>;
}

interface JsonRpcResponse {
  jsonrpc: '2.0';
  id?: number | string | null;
  result?: any;
  error?: { code: number; message: string; data?: unknown };
}

export class McpClient {
  readonly endpoint: string;
  readonly name: string;
  private sessionId: string | null = null;
  private nextId = 1;
  tools: McpTool[] = [];
  serverInfo: { name?: string; version?: string } = {};

  constructor(endpoint: string, name?: string) {
    this.endpoint = endpoint.replace(/\/$/, '');
    this.name = name || endpoint;
  }

  private async rpc(method: string, params?: Record<string, unknown>, notification = false): Promise<any> {
    const body: Record<string, unknown> = { jsonrpc: '2.0', method };
    if (params) body.params = params;
    if (!notification) body.id = this.nextId++;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream',
    };
    if (this.sessionId) headers['Mcp-Session-Id'] = this.sessionId;

    const res = await fetch(this.endpoint, { method: 'POST', headers, body: JSON.stringify(body) });
    const sid = res.headers.get('Mcp-Session-Id');
    if (sid) this.sessionId = sid;

    if (notification) {
      if (!res.ok && res.status !== 202) throw new Error(`MCP notification failed: HTTP ${res.status}`);
      return undefined;
    }
    if (!res.ok) throw new Error(`MCP request failed: HTTP ${res.status}`);

    const contentType = res.headers.get('Content-Type') || '';
    let msg: JsonRpcResponse | undefined;
    if (contentType.includes('text/event-stream')) {
      // Streamable HTTP servers may answer a POST with an SSE stream; take the
      // response message matching our request id.
      const text = await res.text();
      for (const chunk of text.split('\n\n')) {
        const data = chunk.split('\n').filter(l => l.startsWith('data:')).map(l => l.slice(5).trim()).join('');
        if (!data) continue;
        try {
          const parsed = JSON.parse(data) as JsonRpcResponse;
          if (parsed.id !== undefined && parsed.id !== null) { msg = parsed; break; }
        } catch { /* ignore non-JSON keepalives */ }
      }
    } else {
      msg = await res.json();
    }
    if (!msg) throw new Error('MCP: no response message received');
    if (msg.error) throw new Error(`MCP error ${msg.error.code}: ${msg.error.message}`);
    return msg.result;
  }

  async connect(): Promise<McpTool[]> {
    const init = await this.rpc('initialize', {
      protocolVersion: '2025-03-26',
      capabilities: {},
      clientInfo: { name: 'sage7-neural-terminal', version: '1.0.0' },
    });
    this.serverInfo = init?.serverInfo || {};
    await this.rpc('notifications/initialized', undefined, true);
    const listed = await this.rpc('tools/list', {});
    this.tools = (listed?.tools || []).map((t: any) => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema || { type: 'object', properties: {} },
    }));
    return this.tools;
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<string> {
    const result = await this.rpc('tools/call', { name, arguments: args });
    if (result?.isError) {
      const errText = (result.content || []).map((c: any) => c.text || '').join('\n');
      throw new Error(errText || `Tool ${name} returned an error`);
    }
    return (result?.content || [])
      .map((c: any) => (c.type === 'text' ? c.text : `[${c.type} content]`))
      .join('\n') || '(empty result)';
  }
}
