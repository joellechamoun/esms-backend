const router = require("express").Router();
const { auth, requireRole } = require("../middleware/auth");
const ctrl = require("../controllers/majors.controller");

router.use(auth);

router.get(
  "/",
  requireRole(["Admin", "Student", "HeadOfDepartment"]),
  ctrl.getMajors
);
router.get(
  "/:id",
  requireRole(["Admin", "Student", "HeadOfDepartment"]),
  ctrl.getMajorById
);

router.post("/", requireRole(["Admin"]), ctrl.createMajor);
router.put("/:id", requireRole(["Admin"]), ctrl.updateMajor);
router.delete("/:id", requireRole(["Admin"]), ctrl.deleteMajor);

module.exports = router;