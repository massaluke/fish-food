const express = require("express");
const fs = require("fs");
const crypto = require("crypto");
const path = require("path");
const cors = require("cors");

const app = express();
const corsOptions = {
  origin: /.*/,
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type"],
};

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));
app.use(express.json());

const FEEDS_FILE = path.join(__dirname, "", "feeds.json");
const COMMANDS_FILE = path.join(__dirname, "", "commands.json");
const USERS_FILE = path.join(__dirname, "", "users.json");

function safeReadJSON(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

app.get("/api/feeds", (req, res) => {
  try {
    const feeds = safeReadJSON(FEEDS_FILE, []);

    res.json(feeds);
  } catch (err) {
    res.status(500).json({
      error: "Failed to read feeds",
    });
  }
});

app.post("/api/send-feed-command", (req, res) => {
  try {
    const { uid, user, image } = req.body;

    if (!uid || !user || !image) {
      return res.status(400).json({
        error: "Missing data",
      });
    }

    const command = {
      feedRequested: true,
      uid,
      user,
      image,
      timestamp: Date.now(),
    };

    fs.writeFileSync(COMMANDS_FILE, JSON.stringify(command, null, 2));

    res.json({
      success: true,
      message: "Feed command sent",
      uid,
    });
  } catch (err) {
    res.status(500).json({
      error: "Failed to send command",
    });
  }
});

app.get("/api/check-feed-command", (req, res) => {
  try {
    const command = safeReadJSON(COMMANDS_FILE, {});

    res.json(command);
  } catch (err) {
    res.status(500).json({
      error: "Failed to get command",
    });
  }
});

app.post("/api/fish-fed", (req, res) => {
  try {
    const { likelihood } = req.body;

    const userData = safeReadJSON(COMMANDS_FILE, {});
    const feeds = safeReadJSON(FEEDS_FILE, []);

    const newFeed = {
      timestamp: Date.now(),
      likelihood,
      user: userData.user,
      image: userData.image,
    };
    feeds.push(newFeed);
    fs.writeFileSync(FEEDS_FILE, JSON.stringify(feeds, null, 2));

    fs.writeFileSync(
      COMMANDS_FILE,
      JSON.stringify({
        feedRequested: false,
        likelihood,
        user: userData.user,
        image: userData.image,
      }),
    );

    res.json({
      success: true,
    });
  } catch (err) {
    res.status(500).json({
      error: "Failed to complete fish feeding",
    });
  }
});

app.post("/api/login", (req, res) => {
  try {
    const { username, image } = req.body;

    if (!username || !image) {
      return res.status(400).json({ error: "Missing username or image" });
    }

    const users = safeReadJSON(USERS_FILE, []);
    const uid = crypto.randomUUID();

    const newUser = {
      uid,
      username,
      image,
      createdAt: Date.now(),
    };

    users.push(newUser);

    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));

    res.json({
      uid,
      username,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Login failed" });
  }
});

app.use(express.static(path.join(__dirname, "dist")));

app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});
