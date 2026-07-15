const ExamSchedule = require("../models/ExamSchedule");
const Exam = require("../models/Exam");
const User = require("../models/User");

async function getActingHeadDepartment(req) {
  const actingUser = await User.findById(req.user.userId);
  return actingUser?.department ? actingUser.department.toString() : null;
}

function canAccessSchedule(req, headDepartment, schedule) {
  if (req.user.role === "Admin") return true;
  return headDepartment && schedule.department._id.toString() === headDepartment;
}

// LIST
async function getExamSchedules(req, res) {
  try {
    const { department, examSession, status } = req.query;

    const filter = {};

    if (req.user.role === "HeadOfDepartment") {
      const headDepartment = await getActingHeadDepartment(req);

      if (!headDepartment) {
        return res.json([]);
      }

      filter.department = headDepartment;
    } else if (department) {
      filter.department = department;
    }

    if (examSession) filter.examSession = examSession;
    if (status) filter.status = status;

    const schedules = await ExamSchedule.find(filter)
      .populate("department", "code name")
      .populate("examSession", "name startDate endDate")
      .populate("submittedBy", "name email")
      .populate("reviewedBy", "name email")
      .sort({ createdAt: -1 });

    return res.json(schedules);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}

// GET ONE (with its exams)
async function getExamScheduleById(req, res) {
  try {
    const schedule = await ExamSchedule.findById(req.params.id)
      .populate("department", "code name")
      .populate("examSession", "name startDate endDate")
      .populate("submittedBy", "name email")
      .populate("reviewedBy", "name email");

    if (!schedule) {
      return res.status(404).json({ message: "Exam schedule not found" });
    }

    const headDepartment =
      req.user.role === "HeadOfDepartment"
        ? await getActingHeadDepartment(req)
        : null;

    if (!canAccessSchedule(req, headDepartment, schedule)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const exams = await Exam.find({ examSchedule: schedule._id })
      .populate({
        path: "course",
        select: "code name year semester major",
        populate: { path: "major", select: "code name" },
      })
      .populate("room", "name capacity building")
      .populate("timeSlot", "date startTime endTime");

    return res.json({ ...schedule.toObject(), exams });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}

// SUBMIT (HoD)
async function submitExamSchedule(req, res) {
  try {
    const schedule = await ExamSchedule.findById(req.params.id);

    if (!schedule) {
      return res.status(404).json({ message: "Exam schedule not found" });
    }

    const headDepartment = await getActingHeadDepartment(req);

    if (!headDepartment || schedule.department.toString() !== headDepartment) {
      return res.status(403).json({ message: "Forbidden" });
    }

    if (schedule.status !== "Draft") {
      return res.status(409).json({
        message: `Cannot submit a schedule with status ${schedule.status}`,
      });
    }

    const examCount = await Exam.countDocuments({ examSchedule: schedule._id });

    if (examCount === 0) {
      return res.status(400).json({
        message: "Cannot submit an empty exam schedule",
      });
    }

    schedule.status = "PendingApproval";
    schedule.submittedBy = req.user.userId;
    schedule.submittedAt = new Date();
    schedule.rejectionReason = "";
    await schedule.save();

    return res.json(schedule);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}

// APPROVE (Admin)
async function approveExamSchedule(req, res) {
  try {
    const schedule = await ExamSchedule.findById(req.params.id);

    if (!schedule) {
      return res.status(404).json({ message: "Exam schedule not found" });
    }

    if (schedule.status !== "PendingApproval") {
      return res.status(409).json({
        message: `Cannot approve a schedule with status ${schedule.status}`,
      });
    }

    schedule.status = "Approved";
    schedule.reviewedBy = req.user.userId;
    schedule.reviewedAt = new Date();
    await schedule.save();

    return res.json(schedule);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}

// REJECT (Admin)
async function rejectExamSchedule(req, res) {
  try {
    const { reason } = req.body;

    if (!reason || !reason.trim()) {
      return res.status(400).json({ message: "A rejection reason is required" });
    }

    const schedule = await ExamSchedule.findById(req.params.id);

    if (!schedule) {
      return res.status(404).json({ message: "Exam schedule not found" });
    }

    if (schedule.status !== "PendingApproval") {
      return res.status(409).json({
        message: `Cannot reject a schedule with status ${schedule.status}`,
      });
    }

    schedule.status = "Draft";
    schedule.reviewedBy = req.user.userId;
    schedule.reviewedAt = new Date();
    schedule.rejectionReason = reason.trim();
    await schedule.save();

    return res.json(schedule);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}

// PUBLISH (Admin)
async function publishExamSchedule(req, res) {
  try {
    const schedule = await ExamSchedule.findById(req.params.id);

    if (!schedule) {
      return res.status(404).json({ message: "Exam schedule not found" });
    }

    if (schedule.status !== "Approved") {
      return res.status(409).json({
        message: `Cannot publish a schedule with status ${schedule.status}`,
      });
    }

    schedule.status = "Published";
    await schedule.save();

    return res.json(schedule);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}

module.exports = {
  getExamSchedules,
  getExamScheduleById,
  submitExamSchedule,
  approveExamSchedule,
  rejectExamSchedule,
  publishExamSchedule,
};
