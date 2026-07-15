const User = require("../models/User");
const Department = require("../models/Department");

async function getUsers(req, res) {
  try {
    const users = await User.find()
      .select("-passwordHash")
      .populate("department", "code name")
      .sort({ name: 1 });

    return res.json(users);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}

async function updateUser(req, res) {
  try {
    const { name, email, role, department } = req.body;

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const finalRole = role || user.role;
    const finalDepartmentId =
      department !== undefined
        ? department
        : user.department
        ? user.department.toString()
        : null;

    if (!finalDepartmentId) {
      return res.status(400).json({ message: "department is required" });
    }

    const departmentDoc = await Department.findById(finalDepartmentId);

    if (!departmentDoc) {
      return res.status(404).json({ message: "Department not found" });
    }

    const wasHead = user.role === "HeadOfDepartment";
    const willBeHead = finalRole === "HeadOfDepartment";
    const oldDepartmentId = user.department ? user.department.toString() : null;

    if (
      willBeHead &&
      departmentDoc.head &&
      departmentDoc.head.toString() !== user._id.toString()
    ) {
      return res.status(409).json({
        message: "This department already has a head of department",
      });
    }

    if (wasHead && oldDepartmentId && (!willBeHead || oldDepartmentId !== finalDepartmentId)) {
      await Department.findByIdAndUpdate(oldDepartmentId, { head: null });
    }

    if (willBeHead) {
      departmentDoc.head = user._id;
      await departmentDoc.save();
    }

    const update = { role: finalRole, department: departmentDoc._id };

    if (name) update.name = name.trim();
    if (email) update.email = email.toLowerCase().trim();

    const updatedUser = await User.findByIdAndUpdate(req.params.id, update, {
      new: true,
      runValidators: true,
    })
      .select("-passwordHash")
      .populate("department", "code name");

    return res.json(updatedUser);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: "Email already exists" });
    }

    return res.status(500).json({ message: err.message });
  }
}

async function deleteUser(req, res) {
  try {
    if (req.user.userId === req.params.id) {
      return res.status(400).json({
        message: "You cannot delete your own account",
      });
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.role === "HeadOfDepartment" && user.department) {
      await Department.findByIdAndUpdate(user.department, { head: null });
    }

    await User.findByIdAndDelete(req.params.id);

    return res.json({ message: "User deleted" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}

module.exports = {
  getUsers,
  updateUser,
  deleteUser,
};
