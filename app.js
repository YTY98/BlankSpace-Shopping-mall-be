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
const cartRouter = require('./routes/cart.api');
const orderRouter = require('./routes/order.api');
const llmApiRouter = require('./routes/llm.api'); // AI 프록시 라우터 추가
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
}));

// STT 경로는 body-parser를 건너뛰도록 설정
app.use((req, res, next) => {
  if (req.path === '/api/llm/stt' && req.method === 'POST') {
    // STT 경로는 body-parser를 건너뜀
    next();
  } else {
    // 다른 경로는 body-parser 적용
    bodyParser.urlencoded({ extended: false })(req, res, () => {
      bodyParser.json()(req, res, next);
    });
  }
});

app.use(passport.initialize()); // passport 미들웨어 초기화
app.use('/api/llm', llmApiRouter); // AI 프록시 라우터 등록

// AI 서버 상태 체크 라우트 (프록시 밖에서 직접 처리)
app.get('/api/ai-health', (req, res) => {
  const axios = require('axios');
  const aiApiUrl = 'http://127.0.0.1:62000';
  
  axios.get(`${aiApiUrl}/health`, { timeout: 3000 })
    .then(() => {
      res.json({ status: 'healthy', message: 'AI 서버가 정상 작동 중입니다.' });
    })
    .catch(() => {
      res.status(503).json({ status: 'unhealthy', message: 'AI 서버에 연결할 수 없습니다.' });
    });
});

app.use("/api", indexRouter);
app.use("/auth", authRouter);
app.use('/notices', noticesRouter);
app.use('/qna', qnaRouter);
app.use('/product', productRouter);
app.use('/api/cart', cartRouter);
app.use('/api/order', orderRouter);
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

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  // ... existing code ...
});
