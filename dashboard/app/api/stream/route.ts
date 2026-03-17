import { getDashboardSnapshot, subscribeToSnapshots } from "@/lib/telemetry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const encoder = new TextEncoder();

function encode(payload: unknown) {
  return encoder.encode(`data: ${JSON.stringify(payload)}\n\n`);
}

export async function GET() {
  let unsubscribe: (() => void) | undefined;
  let heartbeat: ReturnType<typeof setInterval> | undefined;

  const stream = new ReadableStream({
    async start(controller) {
      const initial = await getDashboardSnapshot();
      controller.enqueue(encoder.encode("retry: 4000\n\n"));
      controller.enqueue(encode(initial));

      unsubscribe = await subscribeToSnapshots((snapshot) => {
        try {
          controller.enqueue(encode(snapshot));
        } catch {
          unsubscribe?.();
          clearInterval(heartbeat);
        }
      });

      heartbeat = setInterval(() => {
        controller.enqueue(encoder.encode(`: heartbeat ${Date.now()}\n\n`));
      }, 15_000);
    },
    cancel() {
      unsubscribe?.();
      clearInterval(heartbeat);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
