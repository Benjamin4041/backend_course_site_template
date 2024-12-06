const express = require("express");

const app = express();
const mongoose = require("mongoose");
const cors = require("cors");
const {
  Login,
  Register,
  ForgotPassword,
  ResetPassword,
  verifyPayment,
  getAllUsers,
  getUser,
  deleteUser,
  courses,
  course,
  uploadCourse,
  deleteCourse,
} = require("./controller/controllers");
const { port } = require("./constants/constants");
const multer = require("multer");
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

require("dotenv").config({ path: "./config/.env" });

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors());

mongoose
  .connect(process.env.MONGO_DB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("Connected to MongoDB");
    //here would be where i would add the function for sending emails
  })
  .catch((err) => console.error("MongoDB connection error:", err));

app.get("/", (req, res) => {
  res.send("Spencerzill academy");
});


//routes

app.post("/login", Login);

app.post("/register/pay", Register);
/**
 * i want this to besent to the users email that they provided 
 * then when they click the link it takes them to their dashboard
 * 
 */
app.post("/verify/:reference", verifyPayment);

app.post("/forgot-password", ForgotPassword);

app.post("/reset-password/:id", ResetPassword);

app.get("/allusers", getAllUsers);

app.get("/user/:id", getUser);

app.delete("/delete/user/:id", deleteUser);

app.get("/courses",  courses);

app.get("/course/:id", course);

app.post("/upload-course",upload.single("courseVideo"), uploadCourse);

app.delete("/course/:id", deleteCourse);

app.listen(port, () => {
  console.log(`Sandbox listening on port ${port}`);
});
