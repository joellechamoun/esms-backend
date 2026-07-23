const router = require("express").Router();
const { auth, requireRole } = require("../middleware/auth");
const ctrl = require("../controllers/settings.controller");

router.use(auth);

// Admin can view current term too (protected)
router.get("/current-term", requireRole(["Admin"]), ctrl.getCurrentTerm);

// Admin sets current term
router.put("/current-term", requireRole(["Admin"]), ctrl.setCurrentTerm);

module.exports = router;
