import { createApp } from "./app.js";

async function main() {
  const app = await createApp();
  const port = Number(process.env.PORT ?? 8084);
  await app.listen({
    host: "0.0.0.0",
    port,
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
