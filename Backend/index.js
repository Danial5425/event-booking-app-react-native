import express from "express";
import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import cors from "cors";
import cookieParser from "cookie-parser";
import userRoutes from "./routes/user.js";
import eventRoutes from "./routes/eventRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js"
import { startCleanupJob } from './jobs/cleanupExpiredReservations.js';
import bookingRoutes from './routes/bookingRoutes.js';
const app = express();

app.use(
  cors({
    origin: "http://192.168.43.155:8081",
    credentials: true,
  })
);
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cookieParser());

app.use("/auth", userRoutes);
app.use("/events", eventRoutes);
app.use("/payments", paymentRoutes);
app.use('/bookings', bookingRoutes);

mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB error:", err));

// Start the cleanup job for expired reservations
startCleanupJob();
console.log('Started cleanup job for expired reservations');

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});

export default app;
