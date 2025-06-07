const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth.controller");

router.post("/login", authController.loginWithEmail);
router.post("/google", authController.loginWithGoogle);
router.post("/find-email", authController.findEmail);
router.post("/find-password", authController.sendPasswordResetEmail);
router.post("/reset-password", authController.resetPassword);


router.get("/kakao", (req, res, next) => {
    console.log("카카오 로그인 요청 받음");
    next();
}, authController.kakaoLogin);
router.get("/kakao/callback", authController.kakaoLoginCallback);


router.get('/naver', (req, res, next) => {
    console.log('네이버 로그인 요청 받음');
    next();
}, authController.naverLogin);

router.get('/naver/callback', (req, res, next) => {
    console.log('네이버 콜백 요청 받음');
    next();
}, authController.naverLoginCallback);

module.exports = router;
