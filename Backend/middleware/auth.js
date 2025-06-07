import { User } from "../Models/User.js";
import jwt from "jsonwebtoken";

export const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ status: false, message: "Unauthorized: No token provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.KEY);

    req.user = { userId: decoded.userId };

    next();
  } catch (err) {
    console.error("Token error:", err.message);
    return res.status(401).json({ status: false, message: "Invalid or expired token" });
  }
};
