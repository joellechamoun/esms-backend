const mongoose = require("mongoose");

const facultyAvailabilitySchema = new mongoose.Schema(
  {
    faculty: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    dayOfWeek: {
      type: Number,
      required: true,
      min: 0,
      max: 6, // 0=Sunday ... 6=Saturday
    },
    startTime: { type: String, required: true }, // "HH:mm"
    endTime: { type: String, required: true },   // "HH:mm"
  },
  { timestamps: true }
);

facultyAvailabilitySchema.index(
  { faculty: 1, dayOfWeek: 1, startTime: 1, endTime: 1 },
  { unique: true }
);

module.exports = mongoose.model("FacultyAvailability", facultyAvailabilitySchema);
