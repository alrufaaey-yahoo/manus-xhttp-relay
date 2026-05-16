import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { handleProxyRequest } from "../proxy";
// import { appRouter } from "../routers";
// import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  
  // معالج Proxy الرئيسي - يعيد توجيه جميع الطلبات إلى النطاق المستهدف
  // يجب أن يكون قبل معالجات الأجسام لضمان تمرير raw body والـ streaming
  app.all('*', (req, res) => {
    handleProxyRequest(req, res);
  });
  
  // معالجات الأجسام (لن تُستخدم لأن Proxy يعالج جميع الطلبات)
  // app.use(express.json({ limit: "50mb" }));
  // app.use(express.urlencoded({ limit: "50mb", extended: true }));
  
  registerStorageProxy(app);
  registerOAuthRoutes(app);
  // ملاحظة: في وضع الإنتاج، سيتم تقديم الملفات الثابتة
  // لكن لأن Proxy يعالج جميع الطلبات، لن يتم الوصول إلى هذه الملفات
  // if (process.env.NODE_ENV === "development") {
  //   await setupVite(app, server);
  // } else {
  //   serveStatic(app);
  // }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
