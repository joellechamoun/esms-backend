const Room = require("../models/Room");

function validateCapacity(capacity) {
  const numericCapacity = Number(capacity);

  if (!Number.isInteger(numericCapacity) || numericCapacity < 1) {
    return {
      valid: false,
      message: "Room capacity must be at least 1",
    };
  }

  return {
    valid: true,
    numericCapacity,
  };
}

async function createRoom(req, res) {
  try {
    const { name, capacity, building } = req.body;

    if (!name || capacity === undefined) {
      return res.status(400).json({
        message: "name and capacity are required",
      });
    }

    const validation = validateCapacity(capacity);

    if (!validation.valid) {
      return res.status(400).json({ message: validation.message });
    }

    const room = await Room.create({
      name: name.trim(),
      capacity: validation.numericCapacity,
      building: building?.trim() || "",
    });

    return res.status(201).json(room);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: "Room name already exists" });
    }

    return res.status(500).json({ message: err.message });
  }
}

async function getRooms(req, res) {
  try {
    const rooms = await Room.find().sort({ name: 1 });
    return res.json(rooms);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}

async function updateRoom(req, res) {
  try {
    const { name, capacity, building } = req.body;

    const update = {};

    if (name) update.name = name.trim();

    if (capacity !== undefined) {
      const validation = validateCapacity(capacity);

      if (!validation.valid) {
        return res.status(400).json({ message: validation.message });
      }

      update.capacity = validation.numericCapacity;
    }

    if (building !== undefined) {
      update.building = building.trim();
    }

    const room = await Room.findByIdAndUpdate(req.params.id, update, {
      new: true,
      runValidators: true,
    });

    if (!room) return res.status(404).json({ message: "Room not found" });

    return res.json(room);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: "Room name already exists" });
    }

    return res.status(500).json({ message: err.message });
  }
}

async function deleteRoom(req, res) {
  try {
    const room = await Room.findByIdAndDelete(req.params.id);

    if (!room) return res.status(404).json({ message: "Room not found" });

    return res.json({ message: "Room deleted" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}

module.exports = {
  createRoom,
  getRooms,
  updateRoom,
  deleteRoom,
};