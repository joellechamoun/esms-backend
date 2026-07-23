const TimeSlot = require("../models/TimeSlot");
const ExamSession = require("../models/ExamSession");
const Exam = require("../models/Exam");

function toDateOnlyString(dateValue) {
  return new Date(dateValue).toISOString().slice(0, 10);
}

function validateTimeRange(startTime, endTime) {
  if (startTime < "08:00" || endTime > "19:00") {
    return {
      valid: false,
      message: "Time slots must be between 08:00 and 19:00",
    };
  }

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

// Generate slots for a given exam session from weekday + time-block params
async function generateTimeSlots(req, res) {
  try {
    const { examSessionId } = req.params;
    const { daysOfWeek, timeBlocks } = req.body;

    if (!Array.isArray(daysOfWeek) || daysOfWeek.length === 0) {
      return res.status(400).json({ message: "daysOfWeek is required" });
    }

    if (!Array.isArray(timeBlocks) || timeBlocks.length === 0) {
      return res.status(400).json({ message: "timeBlocks is required" });
    }

    const session = await ExamSession.findById(examSessionId);

    if (!session) {
      return res.status(404).json({ message: "Exam session not found" });
    }

    for (const block of timeBlocks) {
      const timeValidation = validateTimeRange(block.startTime, block.endTime);

      if (!timeValidation.valid) {
        return res.status(400).json({ message: timeValidation.message });
      }
    }

    const daySet = new Set(daysOfWeek.map(Number));
    const docs = [];

    const cursor = new Date(toDateOnlyString(session.startDate));
    const end = new Date(toDateOnlyString(session.endDate));

    while (cursor <= end) {
      if (daySet.has(cursor.getUTCDay())) {
        const dateStr = cursor.toISOString().slice(0, 10);

        for (const block of timeBlocks) {
          docs.push({
            examSession: examSessionId,
            date: dateStr,
            startTime: block.startTime,
            endTime: block.endTime,
          });
        }
      }

      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    let createdCount = docs.length;
    let skippedCount = 0;

    try {
      await TimeSlot.insertMany(docs, { ordered: false });
    } catch (err) {
      const inserted = err.insertedDocs?.length || 0;
      const failed = err.writeErrors?.length || 0;

      if (failed === 0) {
        throw err;
      }

      createdCount = inserted;
      skippedCount = failed;
    }

    return res.status(201).json({ createdCount, skippedCount });
  } catch (err) {
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
  generateTimeSlots,
};