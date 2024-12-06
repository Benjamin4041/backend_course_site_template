const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  fullname: {
    type: String,
    required: false,
    unique: true,
  },
  course: {
    type: String,
    requred: true,
  },
  password: {
    type: String,
    required: true,
    selected: false,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  paymentDetails: {
    type: Object,
    default: { paidSub: false, paymentID: null, status: "incomplete" },
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  roles: {
    type: [String],
    enum: ["Student", "instructor", "admin", "superadmin"],
    default: ["Student"],
  },
});

module.exports = mongoose.model("User", userSchema);
