/**
 * 《泰坦陨落 2》BT-7274 助手 MSP World（移植自 cortico-world-titanfall2-assistant）：
 * - 工具：titanfall2_scan, titanfall2_say, titanfall2_missiles
 * - 信号：tf2.intel, tf2.combat
 */
import type { MSPNode } from "../shared/msp.ts";

export type FetchImpl = (url: string, init?: RequestInit) => Promise<Response>;

export class Titanfall2World {
  private readonly bridgeUrl: string;
  private readonly pollIntervalMs: number;
  private readonly fetchImpl: FetchImpl;
  private node: MSPNode | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private lastLevel = "";

  constructor(config: { bridgeUrl?: string; pollIntervalMs?: number } = {}, fetchImpl?: FetchImpl) {
    this.bridgeUrl = (config.bridgeUrl ?? "http://127.0.0.1:17760").replace(/\/+$/, "");
    this.pollIntervalMs = config.pollIntervalMs ?? 2000;
    this.fetchImpl = fetchImpl ?? ((u, i) => fetch(u, i));
  }

  attach(node: MSPNode): void {
    this.node = node;
    node.declareSignal("tf2.intel", "泰坦陨落2关卡与敌情更新");
    node.declareSignal("tf2.combat", "铁驭/BT 交火或危机事件");

    node.tool(
      "titanfall2_scan",
      "读取完整战局情报：关卡目标、铁驭与 BT 状态、冷却以及敌人编号/方位/距离",
      async (args) => {
        const only = typeof args.only === "string" ? args.only : "all";
        const res = await this.fetchImpl(`${this.bridgeUrl}/scan?only=${encodeURIComponent(only)}`, {
          signal: AbortSignal.timeout(3000),
        });
        if (!res.ok) throw new Error(`TF2 bridge HTTP ${res.status}`);
        return (await res.json()) as Record<string, unknown>;
      },
      { type: "object", properties: { only: { type: "string", enum: ["all", "engaging", "visible", "titans"], default: "all" } } },
    );

    node.tool(
      "titanfall2_say",
      "以 BT-7274 身份对铁驭说话（游戏内字幕 + 语音）",
      async (args) => {
        const res = await this.fetchImpl(`${this.bridgeUrl}/say`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(args),
          signal: AbortSignal.timeout(5000),
        });
        if (!res.ok) throw new Error(`TF2 bridge HTTP ${res.status}`);
        return (await res.json()) as Record<string, unknown>;
      },
      {
        type: "object",
        required: ["text"],
        properties: { text: { type: "string" }, interrupt: { type: "boolean", default: false } },
      },
    );

    node.tool(
      "titanfall2_missiles",
      "命令 BT 发射多目标追踪飞弹（按敌人编号如 E3/E7）",
      async (args) => {
        const res = await this.fetchImpl(`${this.bridgeUrl}/missiles`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(args),
          signal: AbortSignal.timeout(5000),
        });
        if (!res.ok) throw new Error(`TF2 bridge HTTP ${res.status}`);
        return (await res.json()) as Record<string, unknown>;
      },
      {
        type: "object",
        required: ["targets"],
        properties: {
          targets: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 12 },
          count: { type: "integer", minimum: 1, maximum: 12 },
        },
      },
    );
  }

  start(): void {
    if (this.timer) return;
    void this.pollOnce();
    if (this.pollIntervalMs > 0) {
      this.timer = setInterval(() => void this.pollOnce(), this.pollIntervalMs);
      this.timer.unref?.();
    }
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async pollOnce(): Promise<void> {
    try {
      const res = await this.fetchImpl(`${this.bridgeUrl}/scan?only=all`, { signal: AbortSignal.timeout(1500) });
      if (!res.ok) return;
      const data = (await res.json()) as Record<string, unknown>;
      if (data.level && String(data.level) !== this.lastLevel) {
        this.lastLevel = String(data.level);
        this.node?.publish("tf2.intel", data);
      }
      if (Array.isArray(data.hostiles) && data.hostiles.length > 0) {
        this.node?.publish("tf2.combat", { count: data.hostiles.length, hostiles: data.hostiles });
      }
    } catch {
      /* ignore */
    }
  }
}
