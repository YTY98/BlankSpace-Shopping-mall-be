const passport = require('passport');
const { Strategy: NaverStrategy, Profile: NaverProfile } = require('passport-naver-v2');
const User = require('../models/User');
const jwt = require('jsonwebtoken'); // Add this line

// module.exports = () => {
//    passport.use(
//       new NaverStrategy(
//          {
//             clientID: process.env.NAVER_ID,
//             clientSecret: process.env.NAVER_SECRET,
//             callbackURL: '/auth/naver/callback',
//          },
//          async (accessToken, refreshToken, profile, done) => {
//             console.log('naver profile : ', profile);
//             try {
//                const exUser = await User.findOne({
//                   // 네이버 플랫폼에서 로그인 했고 & snsId필드에 네이버 아이디가 일치할경우
//                   where: { snsId: profile.id, provider: 'naver' },
//                });
               
//                // 이미 가입된 네이버 프로필이면 성공
//                if (exUser) {
//                   // JWT 토큰 생성
//                   const token = jwt.sign(
//                     { id: exUser._id, email: exUser.email },
//                     process.env.JWT_SECRET,
//                     { expiresIn: '1d' }
//                   );
//                   done(null, { user: exUser, token });
//                } else {
//                   // 가입되지 않는 유저면 회원가입 시키고 로그인을 시킨다
//                   const newUser = await User.create({
//                      email: profile.email,
//                      name: profile.name,
//                      snsId: profile.id,
//                      provider: 'naver',
//                   });
                  
//                   // JWT 토큰 생성
//                   const token = jwt.sign(
//                     { id: newUser._id, email: newUser.email },
//                     process.env.JWT_SECRET,
//                     { expiresIn: '1d' }
//                   );
//                   done(null, { user: newUser, token });
//                }
//             } catch (error) {
//                console.error(error);
//                done(error);
//             }
//          },
//       ),
//    );
// };

module.exports = () => {
   passport.use(
      new NaverStrategy(
         {
            clientID: process.env.NAVER_ID,
            clientSecret: process.env.NAVER_SECRET,
            callbackURL: '/auth/naver/callback',
            scope: ['account_email', 'profile_nickname']
         },
         async (accessToken, refreshToken, profile, done) => {
            try {
               console.log('네이버 프로필 : ', JSON.stringify(profile, null, 2));
               const email = profile._json?.naver_account?.email || profile._json?.naver_account?.email || `naver_${profile.id}@example.com`;
               const name = profile.displayName || profile._json?.properties?.nickname || "네이버 사용자";
               
               let user = await User.findOne({ 
                  $or: [
                    { email },
                    { naverId: profile.id }
                  ]
                });

               if (!user) {
                  user = new User({
                    email,
                    name,
                    provider: 'naver',
                    naverId: profile.id,
                    password: Math.random().toString(36).slice(-8), // 임의 패스워드
                  });
                  await user.save();
                } else if (!user.naverId) {
                  // 이메일은 같지만 카카오 연동이 안된 계정이면 kakaoId 추가
                  user.naverId = profile.id;
                  await user.save();
                }
                console.log("네이버 로그인 성공, 사용자 ID:", user._id);
                // JWT 토큰 생성
                const token = jwt.sign(
                  { _id: user._id, email: user.email },
                  process.env.JWT_SECRET_KEY,
                  { expiresIn: '1d' }
                );
                return done(null, { user, token });
              } catch (error) {
                console.error("네이버 전략 에러:", error);
                return done(error);
            }
         },
      ),
   );
};