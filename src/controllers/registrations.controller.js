const Registration = require("../models/Registration");
const Course = require("../models/Course");

async function createRegistration(req, res) {
  try {
    // student registers themselves
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
      return res.status(409).json({ message: "Already registered in this course" });
    }
    return res.status(500).json({ message: err.message });
  }
}

async function getMyRegistrations(req, res) {
  const studentId = req.user.userId;
  const regs = await Registration.find({ student: studentId }).populate("course", "code name");
  return res.json(regs);
}

module.exports = {
  createRegistration,
  getMyRegistrations,
};
