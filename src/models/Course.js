const mongoose = require("mongoose");

const courseSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },

    // NEW (professor requirements)
    year: { type: Number, required: true, min: 1 },
    semester: {
      type: String,
      required: true,
      enum: ["S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8", "S9", "S10"],
    },
    term: { type: String, required: true, trim: true }, // e.g. "Spring 2026"

    // keep it (optional, future constraints)
    faculty: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

// Unique course code PER term (so CS101 can exist in different terms)
courseSchema.index({ code: 1, term: 1 }, { unique: true });

module.exports = mongoose.model("Course", courseSchema);
