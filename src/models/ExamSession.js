const mongoose = require("mongoose");

const examSessionSchema = new mongoose.Schema(
  {
    season: {
      type: String,
      required: true,
      enum: ["Fall", "Spring"],
    },

    academicYear: {
      type: Number,
      required: true,
      min: 2020,
      max: 2100,
    },

    examType: {
      type: String,
      required: true,
      enum: ["Midterm", "Final"],
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    startDate: {
      type: Date,
      required: true,
    },

    endDate: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true }
);

examSessionSchema.index(
  { season: 1, academicYear: 1, examType: 1 },
  { unique: true }
);

module.exports = mongoose.model("ExamSession", examSessionSchema);