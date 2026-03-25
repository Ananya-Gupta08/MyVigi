const express = require("express");
const router = express.Router();
const PatrolLog = require("../models/PatrolLog");

router.post("/log", async (req, res) => {
  try {
    const log = new PatrolLog(req.body);
    await log.save();
    res.json({ message: "Patrol logged" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;