const router = require("express").Router();
const { auth, requireRole } = require("../middleware/auth");
const ctrl = require("../controllers/examSessions.controller");

router.use(auth);

router.post("/", requireRole(["Admin"]), ctrl.createExamSession);
router.get(
  "/",
  requireRole(["Admin", "HeadOfDepartment", "Faculty"]),
  ctrl.getExamSessions
);
router.put("/:id", requireRole(["Admin"]), ctrl.updateExamSession);
router.delete("/:id", requireRole(["Admin"]), ctrl.deleteExamSession);

module.exports = router;
