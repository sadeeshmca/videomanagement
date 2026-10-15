import express from "express";
import cors from "cors";
import path from "node:path";
import { fileURLToPath } from "node:url";

import authRoutes from "./routes/auth.js";
import dashboardRoutes from "./routes/dashboard.js";
import videosRoutes from "./routes/videos.js";
import backupsRoutes from "./routes/backups.js";
import usersRoutes from "./routes/users.js";
import auditRoutes from "./routes/audit.js";
import broadcastsRoutes from "./routes/broadcasts.js";
import uploadRoutes from "./routes/upload.js";
import profileRoutes from "./routes/profile.js";
import sitesRoutes from "./routes/sites.js";
import googleAuthRoutes from "./routes/google-auth.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = Number(process.env.PORT) || 3001;
const isProduction = process.env.NODE_ENV === "production";

const allowedOrigins = isProduction
  ? [process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : ""].filter(Boolean)
  : ["http://localhost:8080", "http://localhost:5173"];

app.use(cors({ origin: allowedOrigins.length ? allowedOrigins : true, credentials: true }));
app.use(express.json({ limit: "10mb" }));

app.set("trust proxy", true);

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// API routes
app.use(authRoutes);
app.use(dashboardRoutes);
app.use(videosRoutes);
app.use(backupsRoutes);
app.use(usersRoutes);
app.use(auditRoutes);
app.use(broadcastsRoutes);
app.use(uploadRoutes);
app.use(profileRoutes);
app.use(sitesRoutes);
app.use(googleAuthRoutes);

// Serve static files in production
const clientDir = path.join(__dirname, "..", "dist");
app.use(express.static(clientDir, {
  maxAge: isProduction ? "1y" : 0,
  immutable: isProduction,
}));

// SPA fallback — serve index.html for any non-API route
app.get("/{*splat}", (_req, res) => {
  res.sendFile(path.join(clientDir, "index.html"));
});

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT} (${isProduction ? "production" : "development"})`);
});
