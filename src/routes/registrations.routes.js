const router = require("express").Router();
const { auth, requireRole } = require("../middleware/auth");
const ctrl = require("../controllers/registrations.controller");

router.use(auth);

// Student endpoints
router.post("/", requireRole(["Student"]), ctrl.createRegistration);
router.get("/me", requireRole(["Student"]), ctrl.getMyRegistrations);
router.get("/me/schedule", requireRole(["Student"]), ctrl.getMyExamSchedule);

module.exports = router;
