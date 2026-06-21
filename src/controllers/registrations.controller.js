const Registration = require("../models/Registration");
const Course = require("../models/Course");
const Exam = require("../models/Exam");

async function createRegistration(req, res) {
  try {
    const studentId = req.user.userId;
    const { courseId } = req.body;

    if (!courseId) {
      return res.status(400).json({ message: "courseId is required" });
    }

    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ message: "Course not found" });

    const reg = await Registration.create({
      student: studentId,
      course: courseId,
    });

    return res.status(201).json(reg);
  } catch (err) {
    if (err.code === 11000) {
      return res
        .status(409)
        .json({ message: "Already registered in this course" });
    }

    return res.status(500).json({ message: err.message });
  }
}

async function getMyRegistrations(req, res) {
  try {
    const studentId = req.user.userId;

    const regs = await Registration.find({ student: studentId })
      .populate({
        path: "course",
        select: "code name year semester major",
        populate: {
          path: "major",
          select: "code name",
        },
      })
      .sort({ createdAt: -1 });

    return res.json(regs);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}

async function getMyExamSchedule(req, res) {
  try {
    const studentId = req.user.userId;

    const regs = await Registration.find({ student: studentId });
    const courseIds = regs.map((reg) => reg.course);

    const exams = await Exam.find({ course: { $in: courseIds } })
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

    const validExams = exams.filter((exam) => exam.course);

    const sortedExams = validExams.sort((a, b) => {
      const dateA = `${a.timeSlot?.date || ""} ${a.timeSlot?.startTime || ""}`;
      const dateB = `${b.timeSlot?.date || ""} ${b.timeSlot?.startTime || ""}`;
      return dateA.localeCompare(dateB);
    });

    return res.json(sortedExams);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}

module.exports = {
  createRegistration,
  getMyRegistrations,
  getMyExamSchedule,
};