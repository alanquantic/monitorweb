export default async function handler(req, res) {
  try {
    const healthData = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      service: "Website Monitor 24/7",
      version: "1.0.0",
      environment: process.env.NODE_ENV || "development",
      uptime: process.uptime(),
      endpoints: {
        monitor: "/api/monitor",
        health: "/api/health"
      },
      config: {
        mailgun: {
          domain: process.env.MAILGUN_DOMAIN || "not-configured",
          apiKey: process.env.MAILGUN_API_KEY ? "configured" : "missing",
          recipient: process.env.MAILGUN_TO || "not-configured"
        },
        monitoring: {
          interval: process.env.MONITOR_INTERVAL_HOURS || "8",
          maxScreenshots: process.env.MAX_SCREENSHOTS_PER_SITE || "15",
          emailNotifications: process.env.ENABLE_EMAIL_NOTIFICATIONS || "true"
        }
      }
    };

    res.status(200).json(healthData);
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
} 