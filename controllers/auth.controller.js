const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
require("dotenv").config();
const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;

const authController = {};
const nodemailer = require("nodemailer");
const passport = require('passport');

exports.kakaoLogin = passport.authenticate('kakao');
authController.loginWithEmail = async (req, res) => {
  try {
    const { email, password } = req.body;
    let user = await User.findOne({ email });
    if (user) {
      const isMatch = await bcrypt.compare(password, user.password);
      if (isMatch) {
        //token
        const token = await user.generateToken();
        return res.status(200).json({ status: "success", user, token });
      }
    }
    throw new Error("invalid email or password");
  } catch (error) {
    res.status(400).json({ status: "fail", error: error.message });
  }
};

authController.authenticate = async (req, res, next) => {
  try {
    const tokenString = req.headers.authorization;
    if (!tokenString) throw new Error("Token not found!");
    const token = tokenString.replace("Bearer ", "");
    jwt.verify(token, JWT_SECRET_KEY, (error, payload) => {
      if (error) throw new Error("invalid token");
      req.userId = payload._id;
    });
    next();
  } catch (error) {
    res.status(400).json({ status: "fail", error: error.message });
  }
};

authController.checkAdminPermission = async (req, res, next) => {
  try {
    const { userId } = req;
    const user = await User.findById(userId);
    if (user.level !== "admin") throw new Error("No Permission");
    next();
  } catch (error) {
    res.status(400).json({ status: "fail", error: error.message });
  }
};

authController.loginWithGoogle = async (req, res) => {
  try {
    const { token } = req.body;
    const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);
    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: GOOGLE_CLIENT_ID,
    });
    const { email, name } = ticket.getPayload();
    let user = await User.findOne({ email });
    if (!user) {
      // 유저를 새로 생성
      const randomPassword = "" + Math.floor(Math.random() * 10000000);
      const salt = await bcrypt.genSalt(10);
      const newPassword = await bcrypt.hash(randomPassword, salt);
      user = new User({
        name,
        email,
        password: newPassword,
      });
      await user.save();
    }
    // 토큰 발행 리턴
    const sessionToken = await user.generateToken();
    res.status(200).json({ status: "success", user, token: sessionToken });
  } catch (error) {
    res.status(400).json({ status: "fail", error: error.message });
  }
};


authController.kakaoLogin = passport.authenticate('kakao');

authController.kakaoLoginCallback = (req, res) => {
  passport.authenticate('kakao', { session: false }, async (err, user, info) => {
    if (err || !user) {
      return res.status(err ? 500 : 400).json({
        message: err ? '서버 오류 발생' : (info?.message || '로그인 실패')
      });
    }

    try {
      // 토큰 생성
      const token = jwt.sign(
          { _id: user._id },
          JWT_SECRET_KEY,
          { expiresIn: '7d' }
      );

      // 중요: 전체 사용자 객체를 포함하여 응답
      const redirectUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login?token=${encodeURIComponent(token)}`;
      console.log("리다이렉트 URL:", redirectUrl);
      return res.redirect(redirectUrl);
    } catch (error) {
      console.error("토큰 생성 오류:", error);
      return res.status(500).json({ message: '토큰 생성 실패' });
    }
  })(req, res);
};

authController.naverLogin = passport.authenticate('naver');

authController.naverLoginCallback = (req, res) => {
  passport.authenticate('naver', { session: false }, async (err, user, info) => {
    if (err || !user) {
      return res.status(err ? 500 : 400).json({
        message: err ? '서버 오류 발생' : (info?.message || '로그인 실패')
      });
    }

    try {
      // 토큰 생성
      const token = jwt.sign(
          { _id: user.user._id },
          JWT_SECRET_KEY,
          { expiresIn: '7d' }
      );

      // 중요: 전체 사용자 객체를 포함하여 응답
      const redirectUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login?token=${encodeURIComponent(token)}`;
      console.log("리다이렉트 URL:", redirectUrl);
      return res.redirect(redirectUrl);
    } catch (error) {
      console.error("토큰 생성 오류:", error);
      return res.status(500).json({ message: '토큰 생성 실패' });
    }
  })(req, res);
};



// 이메일 전송을 위한 transporter 설정
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// 이름으로 아이디 찾기
authController.findEmail = async (req, res) => {
  try {
    const { name } = req.body;
    // 이름으로만 사용자를 찾습니다
    const users = await User.find({ name });

    if (!users || users.length === 0) {
      throw new Error("해당 이름으로 등록된 사용자가 없습니다.");
    }

    // 찾은 모든 사용자의 이메일을 마스킹 처리하여 반환
    const maskedEmails = users.map(user => {
      return user.email.replace(/(?<=.{2}).*?(?=@)/g, '***');
    });

    res.status(200).json({
      status: "success",
      message: `찾은 계정의 아이디(이메일)는 다음과 같습니다:\n${maskedEmails.join('\n')}`
    });
  } catch (error) {
    res.status(400).json({ status: "fail", error: error.message });
  }
};

// 비밀번호 재설정 토큰 생성 및 이메일 전송
authController.sendPasswordResetEmail = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      throw new Error("해당 이메일로 등록된 사용자가 없습니다.");
    }

    // 비밀번호 재설정 토큰 생성 (1시간 유효)
    const resetToken = jwt.sign({ userId: user._id }, JWT_SECRET_KEY, { expiresIn: "1h" });

    // 이메일 전송
    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "[BlankSpace] 비밀번호 재설정 링크",
      html: `
        <h3>비밀번호 재설정</h3>
        <p>아래 링크를 클릭하여 비밀번호를 재설정하세요:</p>
        <a href="${resetLink}">비밀번호 재설정하기</a>
        <p>이 링크는 1시간 동안만 유효합니다.</p>
      `
    };

    await transporter.sendMail(mailOptions);
    res.status(200).json({ status: "success", message: "비밀번호 재설정 링크를 이메일로 전송했습니다." });
  } catch (error) {
    res.status(400).json({ status: "fail", error: error.message });
  }
};

// 비밀번호 재설정
authController.resetPassword = async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    // 이메일로 사용자 찾기
    const user = await User.findOne({ email });

    if (!user) {
      throw new Error("해당 이메일로 등록된 사용자가 없습니다.");
    }

    // 새 비밀번호 해시화 및 저장
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.status(200).json({ status: "success", message: "비밀번호가 성공적으로 변경되었습니다." });
  } catch (error) {
    res.status(400).json({ status: "fail", error: error.message });
  }
};
module.exports = authController;
