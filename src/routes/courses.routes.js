const router = require("express").Router();
const { auth, requireRole } = require("../middleware/auth");
const ctrl = require("../controllers/courses.controller");

router.use(auth); // all routes below require login

// Admin-only CRUD
router.post("/", requireRole(["Admin"]), ctrl.createCourse);
router.get("/", requireRole(["Admin"]), ctrl.getCourses);
router.get("/:id", requireRole(["Admin"]), ctrl.getCourseById);
router.put("/:id", requireRole(["Admin"]), ctrl.updateCourse);
router.delete("/:id", requireRole(["Admin"]), ctrl.deleteCourse);

module.exports = router;
