const router = require("express").Router();
const { auth, requireRole } = require("../middleware/auth");
const ctrl = require("../controllers/facultyAvailability.controller");

router.use(auth);

// Faculty endpoints
router.post("/", requireRole(["Faculty"]), ctrl.createAvailability);
router.get("/me", requireRole(["Faculty"]), ctrl.getMyAvailability);

// Admin view any faculty availability
router.get("/:facultyId", requireRole(["Admin"]), ctrl.getAvailabilityByFaculty);

module.exports = router;
