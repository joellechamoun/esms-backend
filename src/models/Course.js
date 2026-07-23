const mongoose = require("mongoose");

const courseSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      unique: true,
    },
    name: { type: String, required: true, trim: true },

    year: { type: Number, required: true, min: 1, max: 5 },
    semester: {
      type: String,
      required: true,
      enum: ["S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8", "S9", "S10"],
    },
    major: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Major",
      required: true,
    },

    // Kept temporarily so old database records do not crash.
    // New course creation will stop using it.
    term: { type: String, trim: true, default: "" },

    faculty: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Course", courseSchema);