const bcrypt = require("bcrypt");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const User = require("../model/userschema");
const jsonwebtoken = require("jsonwebtoken");
require("dotenv").config({ path: "./config/.env" });
const Stripe = require("stripe")(`${process.env.STRIPE_SECRET_KEY}`);
const { transporter, port } = require("../constants/constants");
const courseSchema = require("../model/courseSchema");
const crypto = require("crypto");
const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} = require("@aws-sdk/client-s3");

const s3 = new S3Client({
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
  region: process.env.AWS_REGION,
});

const randomName = () => crypto.randomBytes(32).toString("hex");

const Login = async (req, res) => {
  try {
    let userDetails = req.body;
    if (!userDetails.email.includes("@")) {
      return res.send("email format not acceptable");
    }
    let { email } = userDetails;
    let check = await User.findOne({ email }).select("+password");

    if (!check) {
      return res.status(404).json({ success: true, message: "user not found" });
    }
    if (check.paymentDetails.status === "incomplete") {
      console.log({ "User is not Sunscribed": check });
      return res.status(200).json({ success: true, message: "Unpaid User" });
    }

    let passwordComparison = await bcrypt.compare(
      userDetails.password,
      check.password
    );
    console.log(passwordComparison);
    if (!passwordComparison) {
      return res.send({
        status: 200,
        message: "Username or password is incorrect",
      });
    }
    let JWT = jsonwebtoken.sign(
      { email: check.email },
      process.env.JWT_password,
      {
        expiresIn: 60 * 60,
      }
    );
    let data = { check, JWT };
    delete data.password;
    res.send({ status: 200, message: "successfull", data });
  } catch (error) {
    console.log(error);
  }
};

const Register = async (req, res) => {
  try {
    const userDetails = req.body;
    let confirmUser = await User.findOne({ email: userDetails.email });

    if (confirmUser) {
      console.log("Email already exsist");
      return res
        .status(200)
        .json({ success: true, message: "Email already exsist" });
    }
    if (userDetails.password != userDetails.confirmPassword) {
      return res.send("Username or password not correct");
    }
    if (!userDetails.email.includes("@")) {
      return res.send("email format not acceptable");
    }

    let hashedPassword = await bcrypt.hash(userDetails.password, 10);
    userDetails.password = hashedPassword;
    delete userDetails.confirmPassword;

    const session = await Stripe.checkout.sessions.create({
      success_url: "http://127.0.0.1:5500/%3C!DOCTYPE%20html%3E.html",
      cancel_url: "http://127.0.0.1:5500/%3C!DOCTYPE%20html%3E.html",
      line_items: [
        {
          price: process.env.PRICE_ID,
          quantity: 30,
        },
      ],
      mode: "payment",
    });
    console.log("session: ", session.id, session.url, session);
    console.log("stage2");
    // get id, save to user, return url
    const sessionId = session.id;
    console.log("sessionId: ", sessionId);

    let createUser = new User(userDetails);
    let savedUser = await createUser.save();
    console.log(savedUser);
    const userRegisterToken = jsonwebtoken.sign(
      { stripePaymentID: sessionId, userId: savedUser._id},
      process.env.JWT_password,{expiresIn:3500}
    );

    // replace the res.json with a function that would send them email with the user

     // async..await is not allowed in global scope, must use a wrapper
     async function main() {
      // send mail with defined transport object
      const info = await transporter.sendMail({
        from: '"SpencerZill Academy" <academy@spencerzill.com>', // sender address
        to: userDetails.email,
        subject: "SpencerZill Academy Verify Registration", // Subject line
        // text: ``, // plain text body
        html: `
  <div style="font-family: Arial, sans-serif; background-color: #f6f9fc; padding: 40px; color: #4d4d4d;">
    <div style="max-width: 600px; margin: auto; background-color: white; padding: 20px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);">
      <h2 style="color: #3cc82f; text-align: center;">Welcome to Spencerzill Academy!</h2>
      <hr style="border-top: 1px solid #e0e0e0;" />
      <p>Hello,</p>
      <p>Thank you for joining Spencerzill Academy! To complete your registration, please verify your email by clicking the link below.</p>
      <div style="text-align: center;">
        <a href="https://localhost:${port}/verify/${userRegisterToken}"
          style="background-color: #3cc82f; color: white; padding: 10px 20px; border-radius: 4px; text-decoration: none; font-size: 16px; display: inline-block;">
          Verify My Account
        </a>
      </div>
      <p>If you didn't register, or if you need help, <a href=${""} style="color: #3a5fcd;">contact our support team here</a>. No changes will be made to your account unless you confirm.</p>
      <p>- The Spencerzill Academy Team</p>
      <hr style="border-top: 1px solid #e0e0e0;" />
      <p style="text-align: center; color: #999; font-size: 12px;">Spencerzill Academy</p>
    </div>
</div>
`, // html body
      });

      console.log("Message sent: %s", info.messageId);
      // Message sent: <d786aa62-4e0a-070a-47ed-0b0666549519@ethereal.email>
    }

    main().catch((err) => {
      console.log(err);
    });
    res.json({ url: session.url, userRegisterToken, success: true, message: "Email sent"  });
    return 
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

const verifyPayment = async (req, res) => {
  let details = req.params.reference;

  const decoded = jsonwebtoken.verify(
    details,
    process.env.JWT_password,
    (err, decoded) => {
      if (err) {
        console.log("Token verification failed:", err.message);
      } else {
        console.log("Decoded payload:", decoded);
        return decoded;
      }
    }
  );
  let { stripePaymentID } = decoded;

  if (!stripePaymentID) return res.send("fail");

  try {
    // check session
    const session = await Stripe.checkout.sessions.retrieve(stripePaymentID);
    console.log("session: ", session);

    // update the user
    if (session && session.status === "complete") {
      let modifiedUser = await User.findByIdAndUpdate(
        { _id: decoded.userId },
        {
          paymentDetails: {
            paidSub: true,
            paymentID: session.payment_intent,
            status: "complete",
          },
        }
      );

      console.log(modifiedUser);

      return res.send("success");
    } else {
      // update the user
      let modifiedUser = await User.findByIdAndUpdate(
        { _id: decoded.userId },
        {
          paymentDetails: {
            paidSub: false,
            paymentID: session.payment_intent,
            status: "incomplete",
          },
        }
      );
      return res.send("fail");
    }
  } catch (error) {
    // handle the error
    console.error(
      "An error occurred while retrieving the Stripe session:",
      error
    );
    return res.send("fail");
  }
};

const ForgotPassword = async (req, res) => {
  try {
    const email = req.body.email;
    const findUser = await User.findOne({ email });
    if (!findUser) {
      return res.status(200).json({ success: true, message: "User not found" });
    }

    // async..await is not allowed in global scope, must use a wrapper
    async function main() {
      // send mail with defined transport object
      const info = await transporter.sendMail({
        from: '"SpencerZill Academy" <academy@spencerzill.com>', // sender address
        to: email,
        subject: "SpencerZill Academy Password Reset", // Subject line
        // text: ``, // plain text body
        html: `
  <div style="font-family: Arial, sans-serif; background-color: #f6f9fc; padding: 40px; color: #4d4d4d;">
    <div style="max-width: 600px; margin: auto; background-color: white; padding: 20px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);">
      <h2 style="color: #3cc82f; text-align: center;">Spencerzill Academy</h2>
      <hr style="border-top: 1px solid #e0e0e0;" />
      <p>Hello,</p>
      <p>We received a request to reset the password for your Spencerzill Academy account associated with <strong>${email}</strong>.</p>
      <div style="text-align: center;">
        <a href=${"/"} 
          style="background-color: #3cc82f; color: white; padding: 10px 20px; border-radius: 4px; text-decoration: none; font-size: 16px; display: inline-block;">
          Reset your password
        </a>
      </div>
      <p>If you didn't make this request, or if you're having trouble signing in, <a href=${""} style="color: #3a5fcd;">contact us via our support site</a>. No changes have been made to your account.</p>
      <p>- The Spencerzill Academy Team</p>
      <hr style="border-top: 1px solid #e0e0e0;" />
      <p style="text-align: center; color: #999; font-size: 12px;">Spencerzill Academy, </p>
    </div>
  </div>
`, // html body
      });

      console.log("Message sent: %s", info.messageId);
      // Message sent: <d786aa62-4e0a-070a-47ed-0b0666549519@ethereal.email>
    }

    main().catch((err) => {
      console.log(err);
    });
    return res.status(200).json({ success: true, message: "Email sent" });
  } catch (error) {
    console.log(error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

const ResetPassword = async (req, res) => {
  try {
    let id = req.params.id;
    console.log(id);
    let { confirmPassword, password } = req.body;
    if (confirmPassword != password) {
      console.log({
        success: false,
        message: "confirm password and password does not match",
      });
      return res.status(500).json({
        success: false,
        message: "confirm password and password does not match",
      });
    }
    let encryptedPassword = await bcrypt.hash(password, 10);
    let userDetails = await User.findOneAndUpdate(
      { _id: id },
      { password: encryptedPassword },
      { new: true }
    ).select("+password");
    console.log(userDetails);
    return res.status(200).json({
      success: true,
      message: "Password has been change successfully",
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

const getAllUsers = async (req, res) => {
  try {
    let getAllUsers = await User.find();
    console.log(getAllUsers);
    return res
      .status(200)
      .json({ success: true, message: "all users", data: getAllUsers });
  } catch (err) {
    console.log("");
  }
};

const getUser = async (req, res) => {
  try {
    let id = req.params.id;
    let userDetails = await User.findOne({ _id: id });

    return res.status(200).json({
      success: true,
      message: "user details retrived successfully ",
      data: userDetails,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

const deleteUser = async (req, res) => {
  try {
    let id = req.params.id;
    let deletedUser = await User.findOneAndDelete({ _id: id });
    console.log({
      success: true,
      message: "deleted user successfuly",
      data: deleteUser,
    });
    return res.status(200).json({
      success: true,
      message: "deleted user successfuly",
      data: deleteUser,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

const courses = async (req, res) => {
  try {
    let getAllCourse = await courseSchema.find();

    // Map over the courses and handle async URLs generation with Promise.all
    let result = await Promise.all(
      getAllCourse.map(async (item) => {
        // Create the S3 command to generate the signed URL
        const command = new GetObjectCommand({
          Bucket: process.env.S3_BUCKET_NAME,
          Key: item.videoS3Identifyer, // assuming videoS3Identifyer is the property name containing the S3 key
        });

        // Generate the signed URL
        const url = await getSignedUrl(s3, command, { expiresIn: 3600 });
        item.url = url;

        return { ...item._doc, url };
      })
    );

    // Send the resolved result
    return res.send(result);
  } catch (err) {
    console.log(err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

const course = async (req, res) => {
  try {
    let courseCode = req.params.id;

    // Await the database query to get course details
    let getCourse = await courseSchema.findOne({ _id: courseCode });

    // Check if the course was found
    if (!getCourse) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    // Create the S3 command to generate the signed URL
    const command = new GetObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: getCourse.videoS3Identifyer, // assuming videoS3Identifyer is the property name containing the S3 key
    });

    // Generate the signed URL
    const url = await getSignedUrl(s3, command, { expiresIn: 3600 });

    // Respond with course data and signed URL
    return res.status(200).json({
      success: true,
      message: "Here is the details needed",
      data: { ...getCourse.toObject(), url },
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      success: false,
      message: "An error occurred while fetching course details",
    });
  }
};

const uploadCourse = async (req, res) => {
  try {
    let courseDetails = req.body;

    //add the uploading of videos here
    let videoS3Identifyer = randomName();
    const params = {
      Bucket: process.env.S3_BUCKET_NAME,
      Key: videoS3Identifyer,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
    };

    const command = new PutObjectCommand(params);
    await s3.send(command);
    let courseUpload = await courseSchema({
      ...courseDetails,
      videoS3Identifyer: videoS3Identifyer,
    });
    await courseUpload.save();
    res.send("successfull");
  } catch (err) {
    console.log(err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

const deleteCourse = async (req, res) => {
  try {
    let courseId = req.params.id;
    let findCourse = await courseSchema.findOne({ _id: courseId });

    const command = new DeleteObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: findCourse.videoS3Identifyer, // assuming videoS3Identifyer is the property name containing the S3 key
    });
    await s3.send(command)
    const deleteCourse = await courseSchema.findOneAndDelete({ _id: courseId });
    return res.status(200).json({
      success: true,
      message: "Course deleted successfuly",
      data: deleteCourse,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  Login,
  Register,
  ForgotPassword,
  ResetPassword,
  verifyPayment,
  getUser,
  getAllUsers,
  course,
  courses,
  deleteUser,
  uploadCourse,
  deleteCourse,
};
