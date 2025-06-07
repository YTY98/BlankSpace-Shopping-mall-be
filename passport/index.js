const passport = require('passport');
const naver = require('./naverStrategy'); // 네이버서버로 로그인할때
const kakao = require('./kakaoStrategy'); // Add this line

const User = require('../models/User');

module.exports = () => {
  passport.serializeUser((user, done) => {
      done(null, user.id);
   });

  passport.deserializeUser((id, done) => {
      User.findOne({ where: { id } })
         .then(user => done(null, user))
         .catch(err => done(err));
   });
   naver(); // 네이버 전략 등록
   kakao(); 
};