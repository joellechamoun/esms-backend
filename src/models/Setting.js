const mongoose = require("mongoose");

const settingSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, trim: true },   // e.g. "currentTerm"
    value: { type: String, required: true, trim: true }                // e.g. "Spring 2026"
  },
  { timestamps: true }
);

module.exports = mongoose.model("Setting", settingSchema);
