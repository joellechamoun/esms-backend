const User = require("../models/User");
const Department = require("../models/Department");
const Major = require("../models/Major");
const Course = require("../models/Course");
const Room = require("../models/Room");
const Registration = require("../models/Registration");
const ExamSchedule = require("../models/ExamSchedule");
const Setting = require("../models/Setting");

const SCHEDULE_STATUSES = ["Draft", "PendingApproval", "Approved", "Published"];

async function getCurrentTerm() {
  const item = await Setting.findOne({ key: "currentTerm" });
  return item ? item.value : null;
}

async function getAdminSummary() {
  const [
    usersByRoleAgg,
    totalDepartments,
    departmentsWithoutHead,
    totalMajors,
    totalCourses,
    totalRooms,
    examSchedulesByStatusAgg,
    pendingApprovals,
    currentTerm,
  ] = await Promise.all([
    User.aggregate([{ $group: { _id: "$role", count: { $sum: 1 } } }]),
    Department.countDocuments(),
    Department.find({ head: null }).select("name code"),
    Major.countDocuments(),
    Course.countDocuments(),
    Room.countDocuments(),
    ExamSchedule.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
    ExamSchedule.find({ status: "PendingApproval" })
      .populate("department", "name")
      .populate("examSession", "name")
      .populate("submittedBy", "name")
      .sort({ submittedAt: 1 }),
    getCurrentTerm(),
  ]);

  const roleCounts = { Admin: 0, HeadOfDepartment: 0, Faculty: 0, Student: 0 };
  usersByRoleAgg.forEach((entry) => {
    roleCounts[entry._id] = entry.count;
  });

  const statusCounts = Object.fromEntries(SCHEDULE_STATUSES.map((s) => [s, 0]));
  examSchedulesByStatusAgg.forEach((entry) => {
    statusCounts[entry._id] = entry.count;
  });

  return {
    role: "Admin",
    currentTerm,
    stats: {
      totalUsers: Object.values(roleCounts).reduce((sum, n) => sum + n, 0),
      usersByRole: roleCounts,
      totalDepartments,
      totalMajors,
      totalCourses,
      totalRooms,
      examSchedulesByStatus: statusCounts,
    },
    needsAttention: {
      pendingApprovals: pendingApprovals.map((s) => ({
        id: s._id,
        departmentName: s.department?.name || "Unknown department",
        examSessionName: s.examSession?.name || "Unknown session",
        submittedByName: s.submittedBy?.name || "Unknown",
      })),
      departmentsWithoutHead: departmentsWithoutHead.map((d) => ({
        id: d._id,
        name: d.name,
        code: d.code,
      })),
    },
  };
}

async function getHodSummary(req) {
  const actingUser = await User.findById(req.user.userId).populate(
    "department",
    "name code"
  );

  const currentTerm = await getCurrentTerm();

  if (!actingUser?.department) {
    return {
      role: "HeadOfDepartment",
      currentTerm,
      department: null,
      stats: { totalCourses: 0, totalRegistrations: 0, registrationsByCourse: [], examSchedules: [] },
      needsAttention: { rejectedSchedules: [] },
    };
  }

  const departmentId = actingUser.department._id;

  const majorIds = await Major.find({ department: departmentId }).distinct("_id");
  const courses = await Course.find({ major: { $in: majorIds } }).select("code name");
  const courseIds = courses.map((c) => c._id);

  const [registrationCounts, totalRegistrations, examSchedules, rejectedSchedules] =
    await Promise.all([
      Registration.aggregate([
        { $match: { course: { $in: courseIds } } },
        { $group: { _id: "$course", count: { $sum: 1 } } },
      ]),
      Registration.countDocuments({ course: { $in: courseIds } }),
      ExamSchedule.find({ department: departmentId })
        .populate("examSession", "name academicYear examType")
        .sort({ updatedAt: -1 })
        .limit(5),
      ExamSchedule.find({
        department: departmentId,
        status: "Draft",
        rejectionReason: { $ne: "" },
      }).populate("examSession", "name"),
    ]);

  const countByCourseId = Object.fromEntries(
    registrationCounts.map((entry) => [entry._id.toString(), entry.count])
  );

  return {
    role: "HeadOfDepartment",
    currentTerm,
    department: {
      id: actingUser.department._id,
      name: actingUser.department.name,
      code: actingUser.department.code,
    },
    stats: {
      totalCourses: courseIds.length,
      totalRegistrations,
      registrationsByCourse: courses.map((c) => ({
        id: c._id,
        code: c.code,
        name: c.name,
        count: countByCourseId[c._id.toString()] || 0,
      })),
      examSchedules: examSchedules.map((s) => ({
        id: s._id,
        status: s.status,
        examSession: s.examSession
          ? {
              name: s.examSession.name,
              academicYear: s.examSession.academicYear,
              examType: s.examSession.examType,
            }
          : null,
      })),
    },
    needsAttention: {
      rejectedSchedules: rejectedSchedules.map((s) => ({
        id: s._id,
        examSessionName: s.examSession?.name || "Unknown session",
        rejectionReason: s.rejectionReason,
      })),
    },
  };
}

async function getSummary(req, res) {
  try {
    if (req.user.role === "Admin") {
      return res.json(await getAdminSummary());
    }

    if (req.user.role === "HeadOfDepartment") {
      return res.json(await getHodSummary(req));
    }

    return res.status(403).json({ message: "Forbidden" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}

module.exports = { getSummary };
