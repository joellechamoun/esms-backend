const mongoose = require("mongoose");

const examSchema = new mongoose.Schema(
  {
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      required: true,
    },
    timeSlot: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TimeSlot",
      required: true,
    },
    examSession: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ExamSession",
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Exam", examSchema);