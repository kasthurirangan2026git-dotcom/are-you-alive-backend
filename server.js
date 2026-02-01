const express = require("express");
const cors = require("cors");
const twilio = require("twilio");

const app = express();
app.use(cors());
app.use(express.json());

// Get from environment variables (Render will provide these)
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhone = process.env.TWILIO_PHONE_NUMBER;

if (!accountSid || !authToken || !twilioPhone) {
  console.error("ERROR: Missing Twilio credentials");
}

const twilioClient = twilio(accountSid, authToken);

const MESSAGES = {
  TIMER_EXPIRED: "⚠️ SAFETY ALERT: I may be unreachable right now. This is an automated message from my Are You Alive app. Please try contacting me.",
  SOS_BUTTON: "🆘 EMERGENCY ALERT: I need help right now. This urgent message was sent from my Are You Alive app. Please contact me immediately."
};

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "Are You Alive Alert Service" });
});

// Send emergency alert
app.post("/send-emergency-alert", async (req, res) => {
  try {
    const { contacts, type } = req.body;

    if (!contacts || !Array.isArray(contacts) || contacts.length === 0) {
      return res.status(400).json({ success: false, error: "Contacts required" });
    }

    if (!["TIMER_EXPIRED", "SOS_BUTTON"].includes(type)) {
      return res.status(400).json({ success: false, error: "Invalid type" });
    }

    const messageBody = MESSAGES[type];
    const results = [];

    for (const contact of contacts) {
      try {
        const message = await twilioClient.messages.create({
          body: messageBody,
          from: twilioPhone,
          to: contact
        });

        results.push({ to: contact, success: true, sid: message.sid });
        console.log(`✓ Message sent to ${contact}`);
      } catch (error) {
        results.push({ to: contact, success: false, error: error.message });
        console.error(`✗ Failed: ${contact}`, error.message);
      }
    }

    const totalSent = results.filter(r => r.success).length;
    const totalFailed = results.filter(r => !r.success).length;

    res.json({
      success: totalFailed === 0,
      totalSent,
      totalFailed,
      results
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// Test endpoint
app.post("/test-alert", async (req, res) => {
  const { testPhone } = req.body;

  if (!testPhone) {
    return res.status(400).json({ success: false, error: "testPhone required" });
  }

  try {
    const message = await twilioClient.messages.create({
      body: "🧪 TEST: Are You Alive app integration working!",
      from: twilioPhone,
      to: testPhone
    });

    res.json({ success: true, sid: message.sid });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✓ Server running on port ${PORT}`);
});