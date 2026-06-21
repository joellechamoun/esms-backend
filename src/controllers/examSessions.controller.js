const ExamSession = require("../models/ExamSession");
const Exam = require("../models/Exam");

function buildSessionName(season, academicYear, examType) {
  return `${season} ${academicYear} - ${examType}`;
}

function validateExamSessionData({
  season,
  academicYear,
  examType,
  startDate,
  endDate,
}) {
  const numericYear = Number(academicYear);

  if (!season || !academicYear || !examType || !startDate || !endDate) {
    return {
      valid: false,
      message:
        "season, academicYear, examType, startDate and endDate are required",
    };
  }

  if (!["Fall", "Spring"].includes(season)) {
    return {
      valid: false,
      message: "Season must be Fall or Spring",
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

  if (!["Midterm", "Final"].includes(examType)) {
    return {
      valid: false,
      message: "Exam type must be Midterm or Final",
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

async function createExamSession(req, res) {
  try {
    const { season, academicYear, examType, startDate, endDate } = req.body;

    const validation = validateExamSessionData({
      season,
      academicYear,
      examType,
      startDate,
      endDate,
    });

    if (!validation.valid) {
      return res.status(400).json({ message: validation.message });
    }

    const name = buildSessionName(season, validation.numericYear, examType);

    const session = await ExamSession.create({
      season,
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
      season: 1,
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

    const season = req.body.season ?? existingSession.season;
    const academicYear = req.body.academicYear ?? existingSession.academicYear;
    const examType = req.body.examType ?? existingSession.examType;
    const startDate = req.body.startDate ?? existingSession.startDate;
    const endDate = req.body.endDate ?? existingSession.endDate;

    const validation = validateExamSessionData({
      season,
      academicYear,
      examType,
      startDate,
      endDate,
    });

    if (!validation.valid) {
      return res.status(400).json({ message: validation.message });
    }

    const name = buildSessionName(season, validation.numericYear, examType);

    const session = await ExamSession.findByIdAndUpdate(
      req.params.id,
      {
        season,
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