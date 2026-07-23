const router = require("express").Router();
const { auth, requireRole } = require("../middleware/auth");
const ctrl = require("../controllers/departments.controller");

router.use(auth);

router.post("/", requireRole(["Admin"]), ctrl.createDepartment);
router.get("/", requireRole(["Admin", "HeadOfDepartment"]), ctrl.getDepartments);
router.get("/:id", requireRole(["Admin", "HeadOfDepartment"]), ctrl.getDepartmentById);
router.put("/:id", requireRole(["Admin"]), ctrl.updateDepartment);
router.put("/:id/head", requireRole(["Admin"]), ctrl.assignExistingHead);
router.delete("/:id/head", requireRole(["Admin"]), ctrl.removeDepartmentHead);
router.delete("/:id", requireRole(["Admin"]), ctrl.deleteDepartment);

module.exports = router;
