const Department = require("../models/Department");
const Major = require("../models/Major");
const User = require("../models/User");

async function createDepartment(req, res) {
  try {
    const { code, name } = req.body;

    if (!code || !name) {
      return res.status(400).json({ message: "code and name are required" });
    }

    const department = await Department.create({
      code: code.trim().toUpperCase(),
      name: name.trim(),
    });

    return res.status(201).json(department);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: "Department code or name already exists" });
    }

    return res.status(500).json({ message: err.message });
  }
}

async function getDepartments(req, res) {
  try {
    const departments = await Department.find()
      .populate("head", "name email role")
      .sort({ name: 1 });

    return res.json(departments);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}

async function getDepartmentById(req, res) {
  try {
    const department = await Department.findById(req.params.id).populate(
      "head",
      "name email role"
    );

    if (!department) {
      return res.status(404).json({ message: "Department not found" });
    }

    return res.json(department);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}

async function updateDepartment(req, res) {
  try {
    const { code, name } = req.body;

    const update = {};

    if (code) update.code = code.trim().toUpperCase();
    if (name) update.name = name.trim();

    const department = await Department.findByIdAndUpdate(req.params.id, update, {
      new: true,
      runValidators: true,
    }).populate("head", "name email role");

    if (!department) {
      return res.status(404).json({ message: "Department not found" });
    }

    return res.json(department);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: "Department code or name already exists" });
    }

    return res.status(500).json({ message: err.message });
  }
}

async function removeDepartmentHead(req, res) {
  try {
    const department = await Department.findById(req.params.id);

    if (!department) {
      return res.status(404).json({ message: "Department not found" });
    }

    if (!department.head) {
      return res.status(400).json({
        message: "This department has no head to remove",
      });
    }

    await User.findByIdAndUpdate(department.head, {
      role: "Faculty",
    });

    department.head = null;
    await department.save();

    const populatedDepartment = await Department.findById(
      department._id
    ).populate("head", "name email role");

    return res.json(populatedDepartment);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}

async function assignExistingHead(req, res) {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ message: "userId is required" });
    }

    const department = await Department.findById(req.params.id);

    if (!department) {
      return res.status(404).json({ message: "Department not found" });
    }

    if (department.head) {
      return res.status(409).json({
        message: "This department already has a head of department",
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.role === "HeadOfDepartment") {
      return res.status(409).json({
        message: "This user is already head of another department",
      });
    }

    user.role = "HeadOfDepartment";
    user.department = department._id;
    await user.save();

    department.head = user._id;
    await department.save();

    const populatedDepartment = await Department.findById(
      department._id
    ).populate("head", "name email role");

    return res.json(populatedDepartment);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}

async function deleteDepartment(req, res) {
  try {
    const usedByMajor = await Major.findOne({ department: req.params.id });

    if (usedByMajor) {
      return res.status(400).json({
        message: "Cannot delete this department because it is assigned to majors",
      });
    }

    const usedByUser = await User.findOne({ department: req.params.id });

    if (usedByUser) {
      return res.status(400).json({
        message: "Cannot delete this department because it is assigned to users",
      });
    }

    const department = await Department.findByIdAndDelete(req.params.id);

    if (!department) {
      return res.status(404).json({ message: "Department not found" });
    }

    return res.json({ message: "Department deleted" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}

module.exports = {
  createDepartment,
  getDepartments,
  getDepartmentById,
  updateDepartment,
  removeDepartmentHead,
  assignExistingHead,
  deleteDepartment,
};
