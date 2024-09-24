const express = require("express");
const router = express.Router();
const userApi = require("./user.api");
const authApi = require("./auth.api");
const productApi = require("./product.api");
const cartApi = require("./cart.api");
const orderApi = require("./order.api");
const collectionApi = require("./collection.api");
const noticesRouter = require("./notices.api");
const shopApi = require("./shop.api");

//const shopApi = require("./shop.api");

router.use("/user", userApi);
router.use("/auth", authApi);
router.use("/product", productApi);
router.use("/cart", cartApi);
router.use("/order", orderApi);
router.use("/collection", collectionApi);
router.use("/notices", noticesRouter);
router.use("/shop", shopApi);

//router.use("/shop", shopApi);

module.exports = router;
