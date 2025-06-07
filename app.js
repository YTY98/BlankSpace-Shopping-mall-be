const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require("path"); // 경로 모듈 추가
const indexRouter = require("./routes/index");
const app = express();
const userRouter = require("./routes/user.api"); // user 라우터(추가)
const authRouter = require("./routes/auth.api");
const noticesRouter = require('./routes/notice.api');
const qnaRouter = require('./routes/qna.api');
const productRouter = require('./routes/product.api');

const passport = require("passport");
const passportConfig = require("./passport");
const kakao = require("./passport/kakaoStrategy");

const session = require('express-session');

const kakaoStrategy = require("./passport/kakaoStrategy");
const naverStrategy = require("./passport/naverStrategy");
const naverSecret = process.env.NAVER_SECRET;

require("dotenv").config();
require('./passport')(); // passport 설정 불러오기

app.use(cors({
  origin: 'http://localhost:3000', // 프론트엔드 주소
  credentials: true
}));app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json()); // req.body가 객체로 인식이 됩니다
app.use(passport.initialize()); // passport 미들웨어 초기화
app.use("/api", indexRouter);
app.use("/auth", authRouter);
app.use('/notices', noticesRouter);
app.use('/qna', qnaRouter);
app.use('/product', productRouter)
// 라우트 연결
app.use("/api/users", userRouter); // user 라우터 등록(ㅊㄱ)


// 정적 파일 서빙 설정
app.use(express.static(path.join(__dirname, 'public')));

const mongoURI = process.env.LOCAL_DB_ADDRESS;
mongoose
  .connect(mongoURI)
  .then(() => console.log("mongoose connected"))
  .catch((err) => console.log("DB connection fail", err));

app.listen(process.env.PORT || 5000, () => {
  console.log("server on");
});
