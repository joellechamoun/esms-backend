const Exam = require("../models/Exam");
const Course = require("../models/Course");
const TimeSlot = require("../models/TimeSlot");
const ExamSession = require("../models/ExamSession");
const ExamSchedule = require("../models/ExamSchedule");
const Registration = require("../models/Registration");
const User = require("../models/User");

async function getActingHeadDepartment(req) {
  const actingUser = await User.findById(req.user.userId);
  return actingUser?.department ? actingUser.department.toString() : null;
}

// CREATE EXAM
async function createExam(req, res) {
  try {
    const { course, timeSlot, examSession } = req.body;

    if (!course || !timeSlot || !examSession) {
      return res.status(400).json({
        message: "course, timeSlot, examSession are required",
      });
    }

    const courseExists = await Course.findById(course).populate(
      "major",
      "department"
    );
    if (!courseExists) {
      return res.status(404).json({ message: "Course not found" });
    }

    const department = courseExists.major.department;

    if (req.user.role === "HeadOfDepartment") {
      const headDepartment = await getActingHeadDepartment(req);

      if (!headDepartment || department.toString() !== headDepartment) {
        return res.status(403).json({
          message: "You can only schedule exams for courses in your own department",
        });
      }
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

    const sameDayTimeSlots = await TimeSlot.find({
      date: timeSlotExists.date,
    });

    const sameDayTimeSlotIds = sameDayTimeSlots.map((slot) => slot._id);

    const sameDayExams = await Exam.find({
      timeSlot: { $in: sameDayTimeSlotIds },
    }).populate("course", "year major");

    for (let existingExam of sameDayExams) {
      if (!existingExam.course) {
        continue;
      }

      const sameMajor =
        existingExam.course.major?.toString() === courseExists.major._id.toString();

      if (sameMajor && existingExam.course.year !== courseExists.year) {
        return res.status(409).json({
          message:
            "Different academic years cannot have exams on the same day within the same major",
        });
      }
    }

    let examSchedule = await ExamSchedule.findOne({ department, examSession });

    if (!examSchedule) {
      examSchedule = await ExamSchedule.create({ department, examSession });
    } else if (examSchedule.status !== "Draft") {
      return res.status(409).json({
        message: `This department's exam schedule for this session is already ${examSchedule.status} — cannot add exams`,
      });
    }

    const exam = await Exam.create({
      course,
      timeSlot,
      examSession,
      examSchedule: examSchedule._id,
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
      .populate("examSession", "name startDate endDate status")
      .populate("examSchedule", "status");

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

    if (req.user.role === "HeadOfDepartment") {
      const headDepartment = await getActingHeadDepartment(req);

      if (!headDepartment) {
        return res.json([]);
      }

      const schedules = await ExamSchedule.find({
        department: headDepartment,
      }).select("_id");

      filter.examSchedule = { $in: schedules.map((s) => s._id) };
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
    const filter = {};

    if (req.user.role === "HeadOfDepartment") {
      const headDepartment = await getActingHeadDepartment(req);

      if (!headDepartment) {
        return res.json({});
      }

      const schedules = await ExamSchedule.find({
        department: headDepartment,
      }).select("_id");

      filter.examSchedule = { $in: schedules.map((s) => s._id) };
    }

    const exams = await Exam.find(filter)
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
    const exam = await Exam.findById(req.params.id).populate("examSchedule");

    if (!exam) {
      return res.status(404).json({ message: "Exam not found" });
    }

    if (req.user.role === "HeadOfDepartment") {
      const headDepartment = await getActingHeadDepartment(req);

      if (
        !headDepartment ||
        exam.examSchedule.department.toString() !== headDepartment
      ) {
        return res.status(403).json({
          message: "You can only delete exams in your own department",
        });
      }

      if (exam.examSchedule.status !== "Draft") {
        return res.status(409).json({
          message: `Cannot delete an exam from a schedule that is ${exam.examSchedule.status}`,
        });
      }
    }

    await Exam.findByIdAndDelete(req.params.id);

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