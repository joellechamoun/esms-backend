const mongoose = require("mongoose");

const examSessionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true }, // e.g. "Spring 2026 - Midterm"
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ["Draft", "Generated", "Published"],
      default: "Draft",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ExamSession", examSessionSchema);
