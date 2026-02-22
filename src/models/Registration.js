const mongoose = require("mongoose");

const registrationSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true }
  },
  { timestamps: true }
);

// Prevent a student from registering the same course twice
registrationSchema.index({ student: 1, course: 1 }, { unique: true });

module.exports = mongoose.model("Registration", registrationSchema);
