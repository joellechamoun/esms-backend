const router = require("express").Router();
const { auth, requireRole } = require("../middleware/auth");
const ctrl = require("../controllers/exams.controller");

router.use(auth);

// Admin views exams
router.get("/", requireRole(["Admin"]), ctrl.getExams);
router.get("/structured", requireRole(["Admin"]), ctrl.getStructuredExams);

// Admin schedules exams
router.post("/", requireRole(["Admin"]), ctrl.createExam);

// Admin deletes exams
router.delete("/:id", requireRole(["Admin"]), ctrl.deleteExam); 

module.exports = router;