const mongoose = require("mongoose");

const User = new mongoose.Schema({
  username: {
    type: String,
  },
  password: {
    type: String,
  },
  gender: {
    type: String,
  },
});

module.exports = mongoose.model("User", User);
