const router = require("express").Router();
const { auth, requireRole } = require("../middleware/auth");
const ctrl = require("../controllers/examSchedules.controller");

router.use(auth);

router.get(
  "/",
  requireRole(["Admin", "HeadOfDepartment", "Faculty"]),
  ctrl.getExamSchedules
);
router.get(
  "/:id",
  requireRole(["Admin", "HeadOfDepartment", "Faculty"]),
  ctrl.getExamScheduleById
);

// HoD submits their department's draft schedule for approval
router.post(
  "/:id/submit",
  requireRole(["HeadOfDepartment"]),
  ctrl.submitExamSchedule
);

// Admin reviews and publishes
router.post("/:id/approve", requireRole(["Admin"]), ctrl.approveExamSchedule);
router.post("/:id/reject", requireRole(["Admin"]), ctrl.rejectExamSchedule);
router.post("/:id/publish", requireRole(["Admin"]), ctrl.publishExamSchedule);

module.exports = router;
