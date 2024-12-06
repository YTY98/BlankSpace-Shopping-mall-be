const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const jwt = require("jsonwebtoken");
require("dotenv").config();
const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY;
const userSchema = Schema(
  {
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    name: { type: String, required: true },
    level: { type: String, default: "customer" }, // 2types: customer, admin
    wishlist: [{ type: Schema.Types.ObjectId, ref: "Product" }], // Product의 _id 참조
    mileage: { type: Number },
    membership: { 
      type: String, 
      enum: ["bronze", "silver", "gold", "platinum", "diamond"], // 사용 가능한 값 제한
      default: "bronze" 
    }, 
    totalPayment: { type: Number },
    usedMileage: { type: Number },
  },
  { timestamps: true }
);

userSchema.methods.toJSON = function () {
  const obj = this._doc;
  delete obj.password;
  delete obj._v;
  delete obj.updateAt;
  delete obj.createAt;
  return obj;
};

userSchema.methods.generateToken = async function () {
  const token = await jwt.sign({ _id: this.id }, JWT_SECRET_KEY, {
    expiresIn: "1d",
  });
  return token;
};

const User = mongoose.model("User", userSchema);
module.exports = User;
