const router = require("express").Router();
const { auth, requireRole } = require("../middleware/auth");
const ctrl = require("../controllers/timeSlots.controller");

// NOTE: this router is mounted at the bare "/api" prefix (see app.js) because
// it serves two different URL shapes (/api/exam-sessions/:id/time-slots and
// /api/time-slots/:id). auth is applied per-route below rather than via
// router.use(auth), so requests that don't match one of these routes fall
// through untouched instead of being intercepted for the entire /api namespace.

// Create + list slots for a specific exam session
router.post(
  "/exam-sessions/:examSessionId/time-slots",
  auth,
  requireRole(["Admin"]),
  ctrl.createTimeSlot
);

router.get(
  "/exam-sessions/:examSessionId/time-slots",
  auth,
  requireRole(["Admin", "HeadOfDepartment"]),
  ctrl.getTimeSlots
);

router.post(
  "/exam-sessions/:examSessionId/time-slots/generate",
  auth,
  requireRole(["Admin"]),
  ctrl.generateTimeSlots
);

// Update/delete a slot by id
router.put("/time-slots/:id", auth, requireRole(["Admin"]), ctrl.updateTimeSlot);
router.delete("/time-slots/:id", auth, requireRole(["Admin"]), ctrl.deleteTimeSlot);

module.exports = router;
