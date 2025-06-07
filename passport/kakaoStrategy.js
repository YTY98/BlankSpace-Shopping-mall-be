// // // passport/kakaoStrategy.js
// // const passport = require('passport');
// // const KakaoStrategy = require('passport-kakao').Strategy;
// // const User = require('../models/User');
// // const jwt = require('jsonwebtoken');


// // // kakaoStrategy.js 수정
// // module.exports = () => {
// //   passport.use(
// //     new KakaoStrategy(
// //       {
// //         clientID: process.env.KAKAO_CLIENT_ID,
// //         clientSecret: process.env.KAKAO_CLIENT_SECRET,
// //         callbackURL: '/auth/kakao/callback',
// //         scope: ['account_email', 'profile_nickname'], // 스코프 명시
// //       },
// //       async (accessToken, refreshToken, profile, done) => {
// //         try {
// //           console.log("카카오 프로필:", JSON.stringify(profile, null, 2));
          
// //           // 이메일이 없는 경우 대체 식별자 사용
// //           const email = profile._json?.kakao_account?.email || `kakao_${profile.id}@example.com`;
// //           const name = profile.displayName || profile._json?.properties?.nickname || "카카오 사용자";
          
// //           console.log("사용할 이메일:", email, "이름:", name);
          
// //           // 이미 가입된 사용자인지 확인 (이메일 또는 카카오 ID로)
// //           let user = await User.findOne({ 
// //             $or: [
// //               { email },
// //               { kakaoId: profile.id }
// //             ]
// //           });

// //           // 가입되지 않은 사용자라면 새로 생성
// //           if (!user) {
// //             user = await User.create({
// //               email,
// //               name,
// //               provider: 'kakao',
// //               kakaoId: profile.id,
// //               password: Math.random().toString(36).slice(-8), // 임의 패스워드
// //             });
// //           } else if (!user.kakaoId) {
// //             // 이메일은 같지만 카카오 연동이 안된 계정이면 kakaoId 추가
// //             user.kakaoId = profile.id;
// //             await user.save();
// //           }

// //           // JWT 토큰 생성 - User 모델의 generateToken 메서드 사용
// //           const token = await user.generateToken();
          
// //           // 중요: user 객체에 token 추가
// //           user = user.toObject();
// //           user.token = token;

// //           console.log("카카오 로그인 성공, 토큰 생성:", token);
// //           return done(null, user);
// //         } catch (error) {
// //           console.error("카카오 전략 에러:", error);
// //           return done(error);
// //         }
// //       }
// //     )
// //   );
// // };


// // passport/kakaoStrategy.js
// const passport = require('passport');
// const KakaoStrategy = require('passport-kakao').Strategy;
// const User = require('../models/User');

// module.exports = () => {
//   passport.use(
//     new KakaoStrategy(
//       {
//         clientID: process.env.KAKAO_CLIENT_ID,
//         clientSecret: process.env.KAKAO_CLIENT_SECRET,
//         callbackURL: '/auth/kakao/callback',
//         scope: ['account_email', 'profile_nickname'],
//       },
//       async (accessToken, refreshToken, profile, done) => {
//         try {
//           console.log("카카오 프로필:", JSON.stringify(profile, null, 2));
          
//           // 이메일이 없는 경우 대체 식별자 사용
//           const email = profile._json?.kakao_account?.email || `kakao_${profile.id}@example.com`;
//           const name = profile.displayName || profile._json?.properties?.nickname || "카카오 사용자";
          
//           console.log("사용할 이메일:", email, "이름:", name);
          
//           // 이미 가입된 사용자인지 확인 (이메일 또는 카카오 ID로)
//           let user = await User.findOne({ 
//             $or: [
//               { email },
//               { kakaoId: profile.id }
//             ]
//           });

//           // 가입되지 않은 사용자라면 새로 생성
//           if (!user) {
//             user = new User({
//               email,
//               name,
//               provider: 'kakao',
//               kakaoId: profile.id,
//               password: Math.random().toString(36).slice(-8), // 임의 패스워드
//             });
//             await user.save();
//           } else if (!user.kakaoId) {
//             // 이메일은 같지만 카카오 연동이 안된 계정이면 kakaoId 추가
//             user.kakaoId = profile.id;
//             await user.save();
//           }

//           // MongoDB 문서 객체를 그대로 반환 (toObject 사용하지 않음)
//           console.log("카카오 로그인 성공, 사용자 ID:", user._id);
//           return done(null, user);
//         } catch (error) {
//           console.error("카카오 전략 에러:", error);
//           return done(error);
//         }
//       }
//     )
//   );
// };


const passport = require('passport');
const { Strategy: KakaoStrategy, Profile: KakaoProfile } = require('passport-kakao');
const User = require('../models/User');
const jwt = require('jsonwebtoken');

module.exports = () => {
   passport.use(
      new KakaoStrategy(
         {
            clientID: process.env.KAKAO_CLIENT_ID,
            clientSecret: process.env.KAKAO_CLIENT_SECRET,
            callbackURL: '/auth/kakao/callback',
            scope: ['account_email', 'profile_nickname']
         },
         async (accessToken, refreshToken, profile, done) => {
            try {
               console.log('카카오 프로필 : ', JSON.stringify(profile, null, 2));
               
               // 이메일과 이름 추출 (카카오 API 응답 구조에 맞게 수정)
               const email = profile.email || profile._json?.response?.email || `kakao_${profile.id}@example.com`;
               const name = profile.name || profile._json?.response?.name || "카카오 사용자";
               
               console.log("사용할 이메일:", email, "이름:", name);
               
               let user = await User.findOne({ 
                  $or: [
                    { email },
                    { kakaoId: profile.id }
                  ]
                });

               if (!user) {
                  user = new User({
                    email,
                    name,
                    provider: 'kakao',
                    kakaoId: profile.id,
                    password: Math.random().toString(36).slice(-8), // 임의 패스워드
                  });
                  await user.save();
                } else if (!user.kakaoId) {
                  // 이메일은 같지만 카카오 연동이 안된 계정이면 kakaoId 추가
                  user.kakaoId = profile.id;
                  await user.save();
                }
                
                console.log("카카오 로그인 성공, 사용자 ID:", user._id);
                
                // MongoDB 문서 객체를 그대로 반환 (카카오 전략과 동일하게)
                return done(null, user);
                
              } catch (error) {
                console.error("카카오오 전략 에러:", error);
                return done(error);
            }
         },
      ),
   );
};