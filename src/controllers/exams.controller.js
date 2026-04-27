const Exam = require("../models/Exam");
const Course = require("../models/Course");
const Room = require("../models/Room");
const TimeSlot = require("../models/TimeSlot");
const ExamSession = require("../models/ExamSession");
const Registration = require("../models/Registration");
const Setting = require("../models/Setting");

// CREATE EXAM
async function createExam(req, res) {
  try {
    const { course, room, timeSlot, examSession } = req.body;

    // Step 1: Basic validation
    if (!course || !room || !timeSlot || !examSession) {
      return res.status(400).json({
        message: "course, room, timeSlot, examSession are required",
      });
    }

    // Step 2: Check if related records exist
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

    // Step 3: Prevent same course from being scheduled twice in same exam session
    const existingCourseExam = await Exam.findOne({
      course,
      examSession,
    });

    if (existingCourseExam) {
      return res.status(409).json({
        message: "This course is already scheduled in this exam session",
      });
    }

    // Step 4: Room capacity validation using registrations
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

    // Step 5: Prevent different academic years on the same day
    const sameDayTimeSlots = await TimeSlot.find({
      date: timeSlotExists.date,
    });

    const sameDayTimeSlotIds = sameDayTimeSlots.map((slot) => slot._id);

    const sameDayExams = await Exam.find({
      timeSlot: { $in: sameDayTimeSlotIds },
    }).populate("course");

    for (let existingExam of sameDayExams) {
      if (existingExam.course.year !== courseExists.year) {
        return res.status(409).json({
          message: "Different academic years cannot have exams on the same day",
        });
      }
    }

    // Step 6: Save exam
    const exam = await Exam.create({
      course,
      room,
      timeSlot,
      examSession,
    });

    return res.status(201).json(exam);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}

// GET EXAMS
async function getExams(req, res) {
  try {
    const { examSession, year, term } = req.query;

    const filter = {};

    if (examSession) {
      filter.examSession = examSession;
    }

    const courseFilter = {};

    if (year) {
      courseFilter.year = Number(year);
    }

    if (term) {
      if (term === "current") {
        const current = await Setting.findOne({ key: "currentTerm" });

        if (!current) {
          return res
            .status(400)
            .json({ message: "Current term is not set in settings" });
        }

        courseFilter.term = current.value;
      } else {
        courseFilter.term = term;
      }
    }

    const exams = await Exam.find(filter)
      .populate({
        path: "course",
        select: "code name year semester term",
        match: courseFilter,
      })
      .populate("room", "name capacity building")
      .populate("timeSlot", "date startTime endTime")
      .populate("examSession", "name startDate endDate status");

    const filteredExams = exams
      .filter((exam) => exam.course !== null)
      .sort((a, b) => {
        const dateA = a.timeSlot.date + " " + a.timeSlot.startTime;
        const dateB = b.timeSlot.date + " " + b.timeSlot.startTime;

        return dateA.localeCompare(dateB);
      });

    return res.json(filteredExams);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}

async function getStructuredExams(req, res) {
  try {
    const exams = await Exam.find()
      .populate("course", "code name year")
      .populate("room", "name")
      .populate("timeSlot", "date startTime endTime");

    const structured = {};

    exams.forEach((exam) => {
      const date = exam.timeSlot.date;

      if (!structured[date]) {
        structured[date] = [];
      }

      structured[date].push({
        time: `${exam.timeSlot.startTime} - ${exam.timeSlot.endTime}`,
        course: exam.course.code,
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