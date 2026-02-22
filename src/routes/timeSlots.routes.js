const router = require("express").Router();
const { auth, requireRole } = require("../middleware/auth");
const ctrl = require("../controllers/timeSlots.controller");

router.use(auth);

// Create + list slots for a specific exam session
router.post(
  "/exam-sessions/:examSessionId/time-slots",
  requireRole(["Admin"]),
  ctrl.createTimeSlot
);

router.get(
  "/exam-sessions/:examSessionId/time-slots",
  requireRole(["Admin"]),
  ctrl.getTimeSlots
);

// Update/delete a slot by id
router.put("/time-slots/:id", requireRole(["Admin"]), ctrl.updateTimeSlot);
router.delete("/time-slots/:id", requireRole(["Admin"]), ctrl.deleteTimeSlot);

module.exports = router;
