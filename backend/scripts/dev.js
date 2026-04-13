import { spawn } from "node:child_process";
import net from "node:net";

const port = Number(process.env.PORT || 4001);
const host = process.env.HOST || "127.0.0.1";

function isPortAvailable(targetPort, targetHost) {
  return new Promise((resolve) => {
    const socket = net.createConnection({
      host: targetHost,
      port: targetPort,
    });

    socket.once("connect", () => {
      socket.end();
      resolve(false);
    });

    socket.once("error", (error) => {
      if (error.code === "ECONNREFUSED") {
        resolve(true);
        return;
      }

      resolve(false);
    });
  });
}

const portAvailable = await isPortAvailable(port, host);

if (!portAvailable) {
  console.log(
    `[backend] Port ${port} is already in use. Reusing the existing backend process.`,
  );
  process.exit(0);
}

const child = spawn(process.execPath, ["--watch", "src/server.js"], {
  stdio: "inherit",
  cwd: new URL("..", import.meta.url),
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
