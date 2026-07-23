const router = require("express").Router();
const { auth, requireRole } = require("../middleware/auth");
const ctrl = require("../controllers/exams.controller");

router.use(auth);

// Admin + HeadOfDepartment view exams (HoD scoped to own department)
router.get("/", requireRole(["Admin", "HeadOfDepartment"]), ctrl.getExams);
router.get(
  "/structured",
  requireRole(["Admin", "HeadOfDepartment"]),
  ctrl.getStructuredExams
);

// Admin + HeadOfDepartment schedule exams (HoD scoped to own department)
router.post("/", requireRole(["Admin", "HeadOfDepartment"]), ctrl.createExam);

// Admin + HeadOfDepartment delete exams (HoD scoped to own department + Draft-only)
router.delete(
  "/:id",
  requireRole(["Admin", "HeadOfDepartment"]),
  ctrl.deleteExam
);

module.exports = router;