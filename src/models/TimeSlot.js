const mongoose = require("mongoose");

const timeSlotSchema = new mongoose.Schema(
  {
    examSession: { type: mongoose.Schema.Types.ObjectId, ref: "ExamSession", required: true },

    // We keep date + times as strings for simplicity (easy to validate and display)
    date: { type: String, required: true },      // "YYYY-MM-DD"
    startTime: { type: String, required: true }, // "HH:mm"
    endTime: { type: String, required: true },   // "HH:mm"

    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

// Prevent duplicate exact slots within same session
timeSlotSchema.index({ examSession: 1, date: 1, startTime: 1, endTime: 1 }, { unique: true });

module.exports = mongoose.model("TimeSlot", timeSlotSchema);
