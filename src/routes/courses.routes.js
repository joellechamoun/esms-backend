const router = require("express").Router();
const { auth, requireRole } = require("../middleware/auth");
const ctrl = require("../controllers/courses.controller");

router.use(auth);

// Admin creates/updates/deletes courses
router.post("/", requireRole(["Admin"]), ctrl.createCourse);

// Admin + Student can view courses
router.get("/", requireRole(["Admin", "Student"]), ctrl.getCourses);
router.get("/:id", requireRole(["Admin", "Student"]), ctrl.getCourseById);

// Admin-only update/delete
router.put("/:id", requireRole(["Admin"]), ctrl.updateCourse);
router.delete("/:id", requireRole(["Admin"]), ctrl.deleteCourse);

module.exports = router;