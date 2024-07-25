const nodemailer = require("nodemailer");

const sendEmail = async (options) => {
  // 1) create a transporter
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST_PROD,
    port: process.env.EMAIL_PORT_PROD,
    auth: {
      user: process.env.EMAIL_USERNAME_PROD,
      pass: process.env.EMAIL_PASSWORD_PROD,
    }, // Activate in Gmail "less secure app" option
  });
  // 2) Define the EMAIL options
  const mailOptions = {
    from: "IQRA AFGHANISTAN <info@iqraafg.com>",
    to: options.email,
    subject: options.subject,
    text: options.message,
    // html:
  };

  //3) Send the EMAIL
  await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;
