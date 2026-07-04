const TimeSlot = require("../models/TimeSlot");
const ExamSession = require("../models/ExamSession");
const Exam = require("../models/Exam");

function toDateOnlyString(dateValue) {
  return new Date(dateValue).toISOString().slice(0, 10);
}

function validateTimeRange(startTime, endTime) {
  if (startTime >= endTime) {
    return {
      valid: false,
      message: "Start time must be before end time",
    };
  }

  return { valid: true };
}

function validateSlotDateInsideSession(date, session) {
  const sessionStart = toDateOnlyString(session.startDate);
  const sessionEnd = toDateOnlyString(session.endDate);

  if (date < sessionStart || date > sessionEnd) {
    return {
      valid: false,
      message: `Time slot date must be between ${sessionStart} and ${sessionEnd}`,
    };
  }

  return { valid: true };
}

// Create a slot for a given exam session
async function createTimeSlot(req, res) {
  try {
    const { examSessionId } = req.params;
    const { date, startTime, endTime, isActive } = req.body;

    if (!date || !startTime || !endTime) {
      return res.status(400).json({
        message: "date, startTime, endTime are required",
      });
    }

    const session = await ExamSession.findById(examSessionId);

    if (!session) {
      return res.status(404).json({ message: "Exam session not found" });
    }

    const dateValidation = validateSlotDateInsideSession(date, session);

    if (!dateValidation.valid) {
      return res.status(400).json({ message: dateValidation.message });
    }

    const timeValidation = validateTimeRange(startTime, endTime);

    if (!timeValidation.valid) {
      return res.status(400).json({ message: timeValidation.message });
    }

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
      return res.status(409).json({
        message: "This timeslot already exists in the session",
      });
    }

    return res.status(500).json({ message: err.message });
  }
}

// Get slots for a given exam session
async function getTimeSlots(req, res) {
  try {
    const { examSessionId } = req.params;

    const slots = await TimeSlot.find({ examSession: examSessionId }).sort({
      date: 1,
      startTime: 1,
    });

    return res.json(slots);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}

async function updateTimeSlot(req, res) {
  try {
    const { id } = req.params;
    const { date, startTime, endTime, isActive } = req.body;

    const existingSlot = await TimeSlot.findById(id);

    if (!existingSlot) {
      return res.status(404).json({ message: "TimeSlot not found" });
    }

    const session = await ExamSession.findById(existingSlot.examSession);

    if (!session) {
      return res.status(404).json({ message: "Exam session not found" });
    }

    const finalDate = date || existingSlot.date;
    const finalStartTime = startTime || existingSlot.startTime;
    const finalEndTime = endTime || existingSlot.endTime;

    const dateValidation = validateSlotDateInsideSession(finalDate, session);

    if (!dateValidation.valid) {
      return res.status(400).json({ message: dateValidation.message });
    }

    const timeValidation = validateTimeRange(finalStartTime, finalEndTime);

    if (!timeValidation.valid) {
      return res.status(400).json({ message: timeValidation.message });
    }

    const update = {
      date: finalDate,
      startTime: finalStartTime,
      endTime: finalEndTime,
    };

    if (isActive !== undefined) update.isActive = isActive;

    const slot = await TimeSlot.findByIdAndUpdate(id, update, {
      new: true,
      runValidators: true,
    });

    return res.json(slot);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({
        message: "This timeslot already exists in the session",
      });
    }

    return res.status(500).json({ message: err.message });
  }
}

async function deleteTimeSlot(req, res) {
  try {
    const linkedExam = await Exam.findOne({ timeSlot: req.params.id });

    if (linkedExam) {
      return res.status(400).json({
        message: "Cannot delete this time slot because exams are scheduled in it",
      });
    }

    const slot = await TimeSlot.findByIdAndDelete(req.params.id);

    if (!slot) {
      return res.status(404).json({ message: "TimeSlot not found" });
    }

    return res.json({ message: "TimeSlot deleted" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}

module.exports = {
  createTimeSlot,
  getTimeSlots,
  updateTimeSlot,
  deleteTimeSlot,
};