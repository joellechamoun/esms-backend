const router = require("express").Router();
const { auth, requireRole } = require("../middleware/auth");
const ctrl = require("../controllers/courses.controller");

router.use(auth);

// Admin + HeadOfDepartment create/update/delete courses (HoD scoped to own department)
router.post("/", requireRole(["Admin", "HeadOfDepartment"]), ctrl.createCourse);

// Admin + Student + HeadOfDepartment can view courses
router.get(
  "/",
  requireRole(["Admin", "Student", "HeadOfDepartment"]),
  ctrl.getCourses
);
router.get(
  "/:id",
  requireRole(["Admin", "Student", "HeadOfDepartment"]),
  ctrl.getCourseById
);

// Admin + HeadOfDepartment update/delete (HoD scoped to own department)
router.put("/:id", requireRole(["Admin", "HeadOfDepartment"]), ctrl.updateCourse);
router.delete(
  "/:id",
  requireRole(["Admin", "HeadOfDepartment"]),
  ctrl.deleteCourse
);

module.exports = router;