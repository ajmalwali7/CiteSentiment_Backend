const express = require("express");
const bodyparser = require("body-parser");
const path = require("path");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimiter = require("express-rate-limit");
const mongoSanitize = require("express-mongo-sanitize");
const xss = require("xss-clean");
const cookieParser = require("cookie-parser");
const hpp = require("hpp");
const compression = require("compression");
const cors = require("cors");

const AppError = require("./utilities/appError");
const userRouter = require("./routes/userRouter");
const paperRouter = require("./routes/paperRouter");
const errorHandler = require("./controllers/errorController");

const app = express();

app.enable("trust proxy");

// Implement CORS
app.use(cors());
// Access-Control-Allow-Origin *
// api.natours.com, front-end natours.com
// app.use(
//   cors({
//     origin: "https://www.iqraafg.netlify.app",
//   })
// );

// app.options("*", cors());
// app.options('/api/v1/tours/:id', cors());

// serving static files
app.use(express.static(path.join(__dirname, "public")));
// set security http headers
app.use(helmet());

// Dev Logging
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}
// rate limiter against dos attacks
// const limiter = rateLimiter({
//   max: 100,
//   windowMs: 60 * 60 * 1000,
//   message: "Too Many Requests! Please Try Again Later!",
// });

// app.use(limiter);
// body parser  req.body
// app.use(bodyparser.json({ limit: "200kb" }));
// app.use(bodyparser.urlencoded({ extended: true, limit: "200kb" }));

// body parser  req.body
app.use(bodyparser.json());
app.use(bodyparser.urlencoded({ extended: false }));
app.use(cookieParser());

// Data Sanitization against NoSQL injection
app.use(mongoSanitize());
// Data Sanitization against XSS
app.use(xss());
// prevent parameter polution.   we can whitelist parameters by hpp({whitelist: [ "name" ]})
app.use(
  hpp({
    whitelist: [
      "duration",
      "ratingsQuantity",
      "ratingsAverage",
      "maxGroupSize",
      "difficulty",
      "price",
    ],
  })
);

app.use(compression());

app.use("/api/users", userRouter);
app.use("/api/papers", paperRouter);

app.all("*", (req, res, next) => {
  next(new AppError(`${req.originalUrl} Not Found on this Server!`, 404));
});
app.use(errorHandler);

module.exports = app;
