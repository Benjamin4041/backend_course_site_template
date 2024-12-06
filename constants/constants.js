const nodemailer = require("nodemailer");
require("dotenv").config({ path: "../config/.env" });
const multer  = require('multer')
const upload = multer({ dest: 'uploads/' })




const port = 3000;
const transporter = nodemailer.createTransport({
  host: "smtp.zoho.com",
  port: 465,
  secure: true, // true for port 465, false for other ports
  auth: {
    user: process.env.EMAIL,
    pass: process.env.EMAIL_PASSWORD,
  },
});


/**
 * this is how i would like it to function  the link is created the link would be passed 
 * to the scheduledmail function as an args and then the email is sent to all the users
 */

let createMeetingLink = () => {};

let scheduledMail = () => {
  // async..await is not allowed in global scope, must use a wrapper
  async function main() {
    // send mail with defined transport object
    const info = await transporter.sendMail({
      from: ' Academy ', // sender address
      to: email,
      subject: " Academy Password Reset", // Subject line
      text: `
            This is a reminder that you are booked on the following course:

            Participant: ${''}
            Course: ${''}
            Seminar: ${''}
           
            Date(s) and location(s):

            11 July 2024, 7:30 PM - 11 July 2024, 8:30 PM Europe/London
            Duration: 1 hour
            Room: ${''}
            Building/Webinar Link: ${''}
            Location: Google Meet



            ***Please arrive ten minutes before the course starts***

            `, // plain text body
    });

    console.log("Message sent: %s", info.messageId);
    // Message sent: <d786aa62-4e0a-070a-47ed-0b0666549519@ethereal.email>
  }
  main().catch(console.error);
};

const classScheduleReminderEmail=(name,link)=>{
 const mail =`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Class Schedule Reminder</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            background-color: #f4f4f7;
            margin: 0;
            padding: 0;
            -webkit-text-size-adjust: none;
            width: 100%;
        }
        .email-container {
            background-color: #ffffff;
            margin: 0 auto;
            padding: 20px;
            max-width: 600px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        .header {
            text-align: center;
            padding: 10px 0;
        }
        .header img {
            max-width: 150px;
        }
        .content {
            text-align: center;
        }
        .content h1 {
            font-size: 22px;
            color: #333333;
        }
        .content p {
            font-size: 16px;
            color: #666666;
        }
        .schedule-table {
            width: 100%;
            margin: 20px 0;
            border-collapse: collapse;
        }
        .schedule-table th, .schedule-table td {
            padding: 12px;
            border: 1px solid #dddddd;
            text-align: left;
            font-size: 14px;
        }
        .schedule-table th {
            background-color: #f8f8f8;
            font-weight: bold;
        }
        .button {
            display: inline-block;
            padding: 12px 24px;
            margin: 20px 0;
            background-color: #007bff;
            color: #ffffff;
            text-decoration: none;
            font-size: 16px;
            border-radius: 5px;
        }
        .footer {
            text-align: center;
            font-size: 12px;
            color: #999999;
            margin-top: 20px;
        }
        .footer a {
            color: #007bff;
            text-decoration: none;
        }
    </style>
</head>
<body>

<div class="email-container">
    <!-- Header -->
    <div class="header">
        <img src="https://via.placeholder.com/150" alt=" Academy Logo">
    </div>

    <!-- Content -->
    <div class="content">
        <h1>Reminder: Your Upcoming Class</h1>
        <p>Hello ${name},</p>
        <p>This is a reminder that you are booked for the following course:</p>

        <!-- Schedule Table -->
        <table class="schedule-table">
            <tr>
                <th>Course</th>
                <td>Bolder in Retail - Kick-Off - Taking Responsibility</td>
            </tr>
            <tr>
                <th>Seminar</th>
                <td></td>
            </tr>
            <tr>
                <th>Date & Time</th>
                <td>11 July 2024, 7:30 PM - 8:30 PM (Europe/London)</td>
            </tr>
            <tr>
                <th>Duration</th>
                <td>1 hour</td>
            </tr>
            <tr>
                <th>Location</th>
                <td>
                    <a href=${link + ""}>Join Webinar</a>
                    <br>
                    <a href="https://location-link.com">Google meeting</a>
                </td>
            </tr>
        </table>

        <!-- Call to Action Button -->
        <a href=${link + ""} class="button">Join Webinar</a>

        <p>Please arrive 10 minutes before the course starts.</p>
    </div>

    <!-- Footer -->
    <div class="footer">
        <p>">Contact Us</a></p>
        <p><a href="#">Unsubscribe</a></p>
    </div>
</div>

</body>
</html>
`
  return mail;
}

module.exports = {
  transporter,
  classScheduleReminderEmail,
  port
};
