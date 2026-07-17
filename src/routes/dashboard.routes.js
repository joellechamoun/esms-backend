const router = require("express").Router();
const { auth, requireRole } = require("../middleware/auth");
const ctrl = require("../controllers/dashboard.controller");

router.use(auth);

router.get(
  "/summary",
  requireRole(["Admin", "HeadOfDepartment"]),
  ctrl.getSummary
);

module.exports = router;
