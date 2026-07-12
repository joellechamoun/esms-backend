const Exam = require("../models/Exam");
const Course = require("../models/Course");
const Room = require("../models/Room");
const TimeSlot = require("../models/TimeSlot");
const ExamSession = require("../models/ExamSession");
const Registration = require("../models/Registration");

// CREATE EXAM
async function createExam(req, res) {
  try {
    const { course, room, timeSlot, examSession } = req.body;

    if (!course || !room || !timeSlot || !examSession) {
      return res.status(400).json({
        message: "course, room, timeSlot, examSession are required",
      });
    }

    const courseExists = await Course.findById(course);
    if (!courseExists) {
      return res.status(404).json({ message: "Course not found" });
    }

    const roomExists = await Room.findById(room);
    if (!roomExists) {
      return res.status(404).json({ message: "Room not found" });
    }

    const timeSlotExists = await TimeSlot.findById(timeSlot);
    if (!timeSlotExists) {
      return res.status(404).json({ message: "TimeSlot not found" });
    }

    const examSessionExists = await ExamSession.findById(examSession);
    if (!examSessionExists) {
      return res.status(404).json({ message: "ExamSession not found" });
    }

    const existingCourseExam = await Exam.findOne({
      course,
      examSession,
    });

    if (existingCourseExam) {
      return res.status(409).json({
        message: "This course is already scheduled in this exam session",
      });
    }

    const newCourseStudents = await Registration.countDocuments({ course });

    const existingExams = await Exam.find({ room, timeSlot });

    let existingStudents = 0;

    for (let exam of existingExams) {
      const count = await Registration.countDocuments({
        course: exam.course,
      });
      existingStudents += count;
    }

    const totalStudents = existingStudents + newCourseStudents;

    if (totalStudents > roomExists.capacity) {
      return res.status(409).json({
        message: "Room capacity exceeded for this time slot",
      });
    }

    const sameDayTimeSlots = await TimeSlot.find({
      date: timeSlotExists.date,
    });

    const sameDayTimeSlotIds = sameDayTimeSlots.map((slot) => slot._id);

    const sameDayExams = await Exam.find({
      timeSlot: { $in: sameDayTimeSlotIds },
    }).populate("course");

    for (let existingExam of sameDayExams) {
      if (!existingExam.course) {
        continue;
      }
    
      if (existingExam.course.year !== courseExists.year) {
        return res.status(409).json({
          message: "Different academic years cannot have exams on the same day",
        });
      }
    }

    const exam = await Exam.create({
      course,
      room,
      timeSlot,
      examSession,
    });

    const populatedExam = await Exam.findById(exam._id)
      .populate({
        path: "course",
        select: "code name year semester major",
        populate: {
          path: "major",
          select: "code name",
        },
      })
      .populate("room", "name capacity building")
      .populate("timeSlot", "date startTime endTime")
      .populate("examSession", "name startDate endDate status");

    return res.status(201).json(populatedExam);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}

// GET EXAMS
async function getExams(req, res) {
  try {
    const { examSession, year, major } = req.query;

    const filter = {};

    if (examSession) {
      filter.examSession = examSession;
    }

    const courseFilter = {};

    if (year) {
      courseFilter.year = Number(year);
    }

    if (major) {
      courseFilter.major = major;
    }

    const exams = await Exam.find(filter)
      .populate({
        path: "course",
        select: "code name year semester major",
        match: courseFilter,
        populate: {
          path: "major",
          select: "code name",
        },
      })
      .populate("room", "name capacity building")
      .populate("timeSlot", "date startTime endTime")
      .populate("examSession", "name startDate endDate status");

    const filteredExams = exams
      .filter((exam) => exam.course !== null)
      .sort((a, b) => {
        const dateA = examDateTime(a);
        const dateB = examDateTime(b);

        return dateA.localeCompare(dateB);
      });

    return res.json(filteredExams);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}

function examDateTime(exam) {
  return `${exam.timeSlot?.date || ""} ${exam.timeSlot?.startTime || ""}`;
}

async function getStructuredExams(req, res) {
  try {
    const exams = await Exam.find()
      .populate({
        path: "course",
        select: "code name year major",
        populate: {
          path: "major",
          select: "code name",
        },
      })
      .populate("room", "name")
      .populate("timeSlot", "date startTime endTime");

    const structured = {};

    exams.forEach((exam) => {
      if (!exam.course || !exam.room || !exam.timeSlot) {
        return;
      }

      const date = exam.timeSlot.date;

      if (!structured[date]) {
        structured[date] = [];
      }

      structured[date].push({
        time: `${exam.timeSlot.startTime} - ${exam.timeSlot.endTime}`,
        course: exam.course.code,
        courseName: exam.course.name,
        major: exam.course.major,
        year: exam.course.year,
        room: exam.room.name,
      });
    });

    return res.json(structured);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}

async function deleteExam(req, res) {
  try {
    const exam = await Exam.findByIdAndDelete(req.params.id);

    if (!exam) {
      return res.status(404).json({ message: "Exam not found" });
    }

    return res.json({ message: "Exam deleted successfully" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}

module.exports = {
  createExam,
  getExams,
  getStructuredExams,
  deleteExam,
};