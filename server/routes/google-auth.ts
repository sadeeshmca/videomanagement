import { Router } from "express";
import { requireAuth, isSuperAdmin } from "../middleware/auth.js";
import { getAuthUrl, handleCallback, isDriveConnected } from "../google-drive.js";

const router = Router();

router.get("/api/auth/google", requireAuth, async (req, res) => {
  try {
    const url = getAuthUrl();
    res.json({ url });
  } catch (err) {
    console.error("Google auth error:", err);
    res.status(500).json({ error: "Failed to generate Google auth URL" });
  }
});

router.get("/api/auth/google/callback", async (req, res) => {
  try {
    const code = req.query.code as string;
    if (!code) {
      res.status(400).send("Missing authorization code");
      return;
    }
    await handleCallback(code);
    res.send(`
      <html><body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0">
        <div style="text-align:center">
          <h2>Google Drive connected!</h2>
          <p>You can close this window and return to the app.</p>
          <script>window.opener?.postMessage("google-drive-connected","*");setTimeout(()=>window.close(),2000);</script>
        </div>
      </body></html>
    `);
  } catch (err) {
    console.error("Google callback error:", err);
    res.status(500).send("Failed to connect Google Drive. Please try again.");
  }
});

router.get("/api/drive/status", requireAuth, async (_req, res) => {
  try {
    const connected = await isDriveConnected();
    res.json({ connected });
  } catch {
    res.json({ connected: false });
  }
});

export default router;
