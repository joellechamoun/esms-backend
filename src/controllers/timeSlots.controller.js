const TimeSlot = require("../models/TimeSlot");
const ExamSession = require("../models/ExamSession");

// Create a slot for a given exam session
async function createTimeSlot(req, res) {
  try {
    const { examSessionId } = req.params;
    const { date, startTime, endTime, isActive } = req.body;

    if (!date || !startTime || !endTime) {
      return res.status(400).json({ message: "date, startTime, endTime are required" });
    }

    const session = await ExamSession.findById(examSessionId);
    if (!session) return res.status(404).json({ message: "Exam session not found" });

    const slot = await TimeSlot.create({
      examSession: examSessionId,
      date,
      startTime,
      endTime,
      isActive: isActive !== undefined ? isActive : true,
    });

    return res.status(201).json(slot);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: "This timeslot already exists in the session" });
    }
    return res.status(500).json({ message: err.message });
  }
}

// Get slots for a given exam session
async function getTimeSlots(req, res) {
  const { examSessionId } = req.params;
  const slots = await TimeSlot.find({ examSession: examSessionId }).sort({ date: 1, startTime: 1 });
  return res.json(slots);
}

async function updateTimeSlot(req, res) {
  try {
    const { id } = req.params;
    const { date, startTime, endTime, isActive } = req.body;

    const update = {};
    if (date) update.date = date;
    if (startTime) update.startTime = startTime;
    if (endTime) update.endTime = endTime;
    if (isActive !== undefined) update.isActive = isActive;

    const slot = await TimeSlot.findByIdAndUpdate(id, update, {
      new: true,
      runValidators: true,
    });

    if (!slot) return res.status(404).json({ message: "TimeSlot not found" });

    return res.json(slot);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: "This timeslot already exists in the session" });
    }
    return res.status(500).json({ message: err.message });
  }
}

async function deleteTimeSlot(req, res) {
  const slot = await TimeSlot.findByIdAndDelete(req.params.id);
  if (!slot) return res.status(404).json({ message: "TimeSlot not found" });
  return res.json({ message: "TimeSlot deleted" });
}

module.exports = {
  createTimeSlot,
  getTimeSlots,
  updateTimeSlot,
  deleteTimeSlot,
};
