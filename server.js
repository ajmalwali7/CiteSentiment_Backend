const mongoose = require("mongoose");
const dotenv = require("dotenv");

process.on("uncaughtException", (err) => {
  console.log(
    "UNCAUGHT EXCEPTION💥💥 Shutting down...\n",
    err.name,
    err.message
  );
  process.exit(1);
});

dotenv.config({ path: "./config.env" });
const app = require("./app");

const db = process.env.DATABASE.replace(
  "<PASSWORD>",
  process.env.DATABASE_PASSWORD
);

const port = process.env.PORT || 3000;
mongoose
  .connect(db, {
    serverApi: { version: "1", strict: true, deprecationErrors: true },
  })
  .then(() => {
    const server = app.listen(port, () => {
      console.log("DB Connection Successful!");
      console.log(`App running on port ${port}...`);
    });
  });

process.on("unhandledRejection", (err) => {
  console.log(
    "UNHANDLED REJECTION💥💥 Shutting down...\n",
    err.name,
    err.message
  );
  server.close(() => {
    process.exit(1);
  });
});
