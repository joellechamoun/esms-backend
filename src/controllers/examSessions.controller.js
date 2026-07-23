const ExamSession = require("../models/ExamSession");
const Exam = require("../models/Exam");
const TimeSlot = require("../models/TimeSlot");
const ExamSchedule = require("../models/ExamSchedule");

function buildSessionName(sessionOrder, semesterScope, examType, academicYear) {
  const scopeLabel = semesterScope === "Both" ? "S1 & S2" : semesterScope;
  return `${academicYear} - ${sessionOrder} Session (${scopeLabel}) - ${examType}`;
}

function validateExamSessionData({
  sessionOrder,
  semesterScope,
  academicYear,
  examType,
  startDate,
  endDate,
}) {
  const numericYear = Number(academicYear);

  if (
    !sessionOrder ||
    !semesterScope ||
    !academicYear ||
    !examType ||
    !startDate ||
    !endDate
  ) {
    return {
      valid: false,
      message:
        "sessionOrder, semesterScope, academicYear, examType, startDate and endDate are required",
    };
  }

  if (!["First", "Second", "Other"].includes(sessionOrder)) {
    return {
      valid: false,
      message: "Session order must be First, Second, or Other",
    };
  }

  if (!["S1", "S2", "Both"].includes(semesterScope)) {
    return {
      valid: false,
      message: "Semester scope must be S1, S2, or Both",
    };
  }

  if (!["Partial", "Final"].includes(examType)) {
    return {
      valid: false,
      message: "Exam type must be Partial or Final",
    };
  }

  if (
    !Number.isInteger(numericYear) ||
    numericYear < 2020 ||
    numericYear > 2100
  ) {
    return {
      valid: false,
      message: "Academic year must be between 2020 and 2100",
    };
  }

  // First/Second follow the normal academic calendar; Other is a deliberate
  // escape hatch for the rare additional sessions that don't fit that shape.
  if (sessionOrder === "Second") {
    if (semesterScope !== "Both") {
      return {
        valid: false,
        message: "A Second Session must cover both S1 and S2",
      };
    }

    if (examType !== "Final") {
      return {
        valid: false,
        message: "A Second Session must be Final",
      };
    }
  } else if (sessionOrder === "First" && semesterScope === "Both") {
    return {
      valid: false,
      message: "A First Session must cover only S1 or S2, not both",
    };
  }

  if (new Date(startDate) > new Date(endDate)) {
    return {
      valid: false,
      message: "Start date cannot be after end date",
    };
  }

  return {
    valid: true,
    numericYear,
  };
}

// Chronological rank within a year for the three sessions that follow the
// normal academic calendar. "Other" sessions have no fixed position, so they
// only participate in the overlap check below, not the ordering check.
const SESSION_ORDER_RANK = {
  "First:S1": 1,
  "First:S2": 2,
  "Second:Both": 3,
};

function getSessionRank(sessionOrder, semesterScope) {
  return SESSION_ORDER_RANK[`${sessionOrder}:${semesterScope}`] ?? null;
}

async function checkSessionDateConstraints({
  sessionOrder,
  semesterScope,
  academicYear,
  startDate,
  endDate,
  excludeId,
}) {
  const query = { academicYear };

  if (excludeId) {
    query._id = { $ne: excludeId };
  }

  const otherSessions = await ExamSession.find(query);

  const newStart = new Date(startDate);
  const newEnd = new Date(endDate);
  const newRank = getSessionRank(sessionOrder, semesterScope);

  for (const other of otherSessions) {
    const otherStart = new Date(other.startDate);
    const otherEnd = new Date(other.endDate);

    // No two sessions in the same year can have overlapping date ranges,
    // regardless of type - they'd represent conflicting exam periods.
    if (newStart <= otherEnd && newEnd >= otherStart) {
      return {
        valid: false,
        message: `Date range overlaps with an existing session in ${academicYear}: "${other.name}"`,
      };
    }

    if (newRank === null) continue;

    const otherRank = getSessionRank(other.sessionOrder, other.semesterScope);

    if (otherRank === null || otherRank === newRank) continue;

    if (newRank < otherRank && newEnd >= otherStart) {
      return {
        valid: false,
        message: `${sessionOrder} Session (${semesterScope}) must end before "${other.name}" starts`,
      };
    }

    if (newRank > otherRank && newStart <= otherEnd) {
      return {
        valid: false,
        message: `${sessionOrder} Session (${semesterScope}) must start after "${other.name}" ends`,
      };
    }
  }

  return { valid: true };
}

async function createExamSession(req, res) {
  try {
    const { sessionOrder, semesterScope, academicYear, examType, startDate, endDate } =
      req.body;

    const validation = validateExamSessionData({
      sessionOrder,
      semesterScope,
      academicYear,
      examType,
      startDate,
      endDate,
    });

    if (!validation.valid) {
      return res.status(400).json({ message: validation.message });
    }

    const dateConstraint = await checkSessionDateConstraints({
      sessionOrder,
      semesterScope,
      academicYear: validation.numericYear,
      startDate,
      endDate,
    });

    if (!dateConstraint.valid) {
      return res.status(409).json({ message: dateConstraint.message });
    }

    const name = buildSessionName(
      sessionOrder,
      semesterScope,
      examType,
      validation.numericYear
    );

    const session = await ExamSession.create({
      sessionOrder,
      semesterScope,
      academicYear: validation.numericYear,
      examType,
      name,
      startDate,
      endDate,
    });

    return res.status(201).json(session);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({
        message: "This exam session already exists",
      });
    }

    return res.status(500).json({ message: err.message });
  }
}

async function getExamSessions(req, res) {
  try {
    const sessions = await ExamSession.find().sort({
      academicYear: -1,
      sessionOrder: 1,
      semesterScope: 1,
      examType: 1,
    });

    return res.json(sessions);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}

async function updateExamSession(req, res) {
  try {
    const existingSession = await ExamSession.findById(req.params.id);

    if (!existingSession) {
      return res.status(404).json({ message: "Exam session not found" });
    }

    const sessionOrder = req.body.sessionOrder ?? existingSession.sessionOrder;
    const semesterScope = req.body.semesterScope ?? existingSession.semesterScope;
    const academicYear = req.body.academicYear ?? existingSession.academicYear;
    const examType = req.body.examType ?? existingSession.examType;
    const startDate = req.body.startDate ?? existingSession.startDate;
    const endDate = req.body.endDate ?? existingSession.endDate;

    const validation = validateExamSessionData({
      sessionOrder,
      semesterScope,
      academicYear,
      examType,
      startDate,
      endDate,
    });

    if (!validation.valid) {
      return res.status(400).json({ message: validation.message });
    }

    const dateConstraint = await checkSessionDateConstraints({
      sessionOrder,
      semesterScope,
      academicYear: validation.numericYear,
      startDate,
      endDate,
      excludeId: req.params.id,
    });

    if (!dateConstraint.valid) {
      return res.status(409).json({ message: dateConstraint.message });
    }

    const name = buildSessionName(
      sessionOrder,
      semesterScope,
      examType,
      validation.numericYear
    );

    const session = await ExamSession.findByIdAndUpdate(
      req.params.id,
      {
        sessionOrder,
        semesterScope,
        academicYear: validation.numericYear,
        examType,
        name,
        startDate,
        endDate,
      },
      { new: true, runValidators: true }
    );

    return res.json(session);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({
        message: "This exam session already exists",
      });
    }

    return res.status(500).json({ message: err.message });
  }
}

async function deleteExamSession(req, res) {
  try {
    const linkedExam = await Exam.findOne({ examSession: req.params.id });

    if (linkedExam) {
      return res.status(400).json({
        message:
          "Cannot delete this exam session because exams are scheduled in it",
      });
    }

    const linkedTimeSlot = await TimeSlot.findOne({
      examSession: req.params.id,
    });

    if (linkedTimeSlot) {
      return res.status(400).json({
        message:
          "Cannot delete this exam session because it has time slots. Delete its time slots first.",
      });
    }

    const linkedSchedule = await ExamSchedule.findOne({
      examSession: req.params.id,
    });

    if (linkedSchedule) {
      return res.status(400).json({
        message:
          "Cannot delete this exam session because a department exam schedule is linked to it",
      });
    }

    const session = await ExamSession.findByIdAndDelete(req.params.id);

    if (!session) {
      return res.status(404).json({ message: "Exam session not found" });
    }

    return res.json({ message: "Exam session deleted" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}

module.exports = {
  createExamSession,
  getExamSessions,
  updateExamSession,
  deleteExamSession,
};