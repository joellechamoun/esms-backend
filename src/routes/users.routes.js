const router = require("express").Router();
const { auth, requireRole } = require("../middleware/auth");
const ctrl = require("../controllers/users.controller");

router.use(auth);

router.get("/", requireRole(["Admin"]), ctrl.getUsers);
router.put("/:id", requireRole(["Admin"]), ctrl.updateUser);
router.delete("/:id", requireRole(["Admin"]), ctrl.deleteUser);

module.exports = router;
