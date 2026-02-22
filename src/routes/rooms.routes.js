const router = require("express").Router();
const { auth, requireRole } = require("../middleware/auth");
const ctrl = require("../controllers/rooms.controller");

router.use(auth);

router.post("/", requireRole(["Admin"]), ctrl.createRoom);
router.get("/", requireRole(["Admin"]), ctrl.getRooms);
router.put("/:id", requireRole(["Admin"]), ctrl.updateRoom);
router.delete("/:id", requireRole(["Admin"]), ctrl.deleteRoom);

module.exports = router;
