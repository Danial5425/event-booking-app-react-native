import mongoose from "mongoose";
const UserSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  email: { type: String, unique: true },
  age: { type: Number },

  password: String, // hashed
  role: {
    type: String,
    enum: ["admin", "organizer", "customer"],
    default: "customer",
  },
  gender: { type: String, enum: ["Male", "Female", "Other"] },
  mobile: { 
    type: String,
    trim: true,
    validate: {
      validator: function(v) {
        return !v || /^\d{10}$/.test(v); // Allow empty but validate if present
      },
      message: props => `${props.value} is not a valid phone number!`
    }
  },
  profileImage: { type: String },
  bio: { type: String, default: "" },
  address: { type: String, default: "" },
  dateOfBirth: { type: Date },
  interests: { type: [String], default: [] },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },

  // Add OTP and expiration fields
  resetPasswordOTP: { type: String }, // Store OTP
  resetPasswordOTPExpires: { type: Date }, // Store expiration time
});

UserSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

const User = mongoose.models.User || mongoose.model("User", UserSchema);

export { User };
