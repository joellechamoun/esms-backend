const mongoose = require("mongoose");

const examSessionSchema = new mongoose.Schema(
  {
    sessionOrder: {
      type: String,
      required: true,
      enum: ["First", "Second", "Other"],
    },

    semesterScope: {
      type: String,
      required: true,
      enum: ["S1", "S2", "Both"],
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
      enum: ["Partial", "Final"],
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
  { sessionOrder: 1, semesterScope: 1, examType: 1, academicYear: 1 },
  { unique: true }
);

module.exports = mongoose.model("ExamSession", examSessionSchema);
