const User = require("../models/User");
const bcrypt = require("bcryptjs");
const productController = require("../controllers/product.controller"); // productController 가져오기
const userController = {};

userController.createUser = async (req, res) => {
  try {
    let { email, password, name, level } = req.body;
    const user = await User.findOne({ email });
    if (user) {
      throw new Error("User already exist");
    }
    const salt = await bcrypt.genSaltSync(10);
    password = await bcrypt.hash(password, salt);
    const newUser = new User({
      email,
      password,
      name,
      level: level ? level : "customer",
    });
    await newUser.save();
    return res.status(200).json({ status: "success" });
  } catch (error) {
    res.status(400).json({ status: "fail", error: error.message });
  }
};
// TODO: 기존 getUser 컨트롤러. 비밀번호까지 넘겨버림
// userController.getUser = async (req, res) => {
//   try {
//     const { userId } = req;
//     const user = await User.findById(userId);
//     if (user) {
//       return res.status(200).json({ status: "success", user });
//     }
//     throw new Error("Invalid token");
//   } catch (error) {
//     res.status(400).json({ status: "error", error: error.message });
//   }
// };

userController.createOrLoginKakaoUser = async (kakaoProfile) => {
  try {
    // 카카오 프로필에서 필요한 정보 추출
    const email = kakaoProfile._json?.kakao_account?.email || `kakao_${kakaoProfile.id}@example.com`;
    const name = kakaoProfile.displayName || kakaoProfile._json?.properties?.nickname || "카카오 사용자";

    // 이미 가입된 사용자인지 확인 (이메일 또는 카카오 ID로)
    let user = await User.findOne({
      $or: [
        { email },
        { kakaoId: kakaoProfile.id }
      ]
    });

    // 가입되지 않은 사용자라면 새로 생성
    if (!user) {
      // 랜덤 비밀번호 생성 (10자리)
      const randomPassword = Math.random().toString(36).substring(2, 12);
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(randomPassword, salt);

      user = new User({
        email,
        name,
        password: hashedPassword,
        provider: 'kakao',
        kakaoId: kakaoProfile.id,
        level: "customer"
      });

      await user.save();
    } else if (!user.kakaoId) {
      // 이메일은 같지만 카카오 연동이 안된 계정이면 kakaoId 추가
      user.kakaoId = kakaoProfile.id;
      user.provider = user.provider || 'kakao';
      await user.save();
    }

    return user;
  } catch (error) {
    console.error("카카오 회원가입 에러:", error);
    throw error;
  }
};

// TODO: 수정된 getUser 컨트롤러. 비밀번호를 제외하고 넘겨줌. 보안 문제 해결
userController.getUser = async (req, res) => {
  try {
    const { userId } = req; // auth 미들웨어에서 설정된 userId
    const user = await User.findById(userId).select("-password"); // 비밀번호 제외

    if (!user) {
      return res.status(404).json({ status: "fail", error: "User not found" });
    }

    return res.status(200).json({ status: "success", user });
  } catch (error) {
    return res.status(500).json({ status: "error", error: error.message });
  }
};


userController.getUsers = async (req, res) => {
  try {
    const users = await User.find(); // 모든 사용자를 가져옵니다.
    return res.status(200).json(users);
  } catch (error) {
    return res.status(500).json({ status: "error", error: error.message });
  }
};



userController.deleteUser = async (req, res) => {
  try {
    const { userId } = req;
    const { currentPassword } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ status: "fail", error: "User not found" });
    }

    // 비밀번호 검증
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ status: "fail", error: "Incorrect password" });
    }

    // 사용자 삭제
    await User.findByIdAndDelete(userId);

    return res.status(200).json({ status: "success", message: "User deleted successfully" });
  } catch (error) {
    return res.status(500).json({ status: "error", error: error.message });
  }
};


userController.updateUserInfo = async (req, res) => {
  try {
    const { userId } = req; // auth 미들웨어에서 추가된 userId
    const { name, newPassword, currentPassword } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ status: "fail", error: "User not found" });
    }

    // 현재 비밀번호 확인
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ status: "fail", error: "Incorrect current password" });
    }

    // 사용자 정보 업데이트
    if (newPassword) {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(newPassword, salt);
    }

    if (name) {
      user.name = name;
    }

    await user.save();

    return res.status(200).json({ status: "success", user });
  } catch (error) {
    return res.status(500).json({ status: "error", error: error.message });
  }
};

userController.addToWishlist = async (req, res) => {
  try {
    const { userId } = req; // auth 미들웨어에서 추가된 userId
    const { productId } = req.body;

    // 요청이 잘못된 경우
    if (!productId) {
      return res.status(400).json({ status: "fail", error: "productId 필드가 없습니다." });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ status: "fail", error: "User not found" });
    }

    // wishlist에 중복된 productId가 있는지 확인
    const wishlistIndex = user.wishlist.indexOf(productId);
    if (wishlistIndex === -1) {
      // productId가 없으면 추가
      user.wishlist.push(productId);
    } else {
      // productId가 이미 있으면 제거
      user.wishlist.splice(wishlistIndex, 1);
    }

    await user.save();

    return res.status(200).json({ status: "success", wishlist: user.wishlist });
  } catch (error) {
    return res.status(500).json({ status: "error", error: error.message });
  }
};

// userController.getWishlistProducts = async (req, res) => {
//   try {
//     const { userId } = req; // auth 미들웨어에서 설정된 userId
//     const user = await User.findById(userId);
    
//     if (!user) {
//       return res.status(404).json({ status: "fail", error: "User not found" });
//     }

//     const wishlistIds = user.wishlist;
//     if (!wishlistIds || wishlistIds.length === 0) {
//       return res.status(200).json({ products: [] }); // 위시리스트가 비어있으면 빈 배열 반환
//     }

//     // 제품 ID 배열을 사용하여 제품 정보 가져오기
//     const products = await Product.find({ _id: { $in: wishlistIds } });

//     return res.status(200).json({ status: "success", products });
//   } catch (error) {
//     console.error("Error fetching wishlist products:", error);
//     return res.status(500).json({ status: "error", error: error.message });
//   }
// };

userController.getWishlistProducts = async (req, res) => {
  try {
    const { userId } = req; // auth 미들웨어에서 설정된 userId

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ status: "fail", error: "User not found" });
    }

    const wishlistIds = user.wishlist;
    if (!wishlistIds || wishlistIds.length === 0) {
      return res.status(200).json({ products: [] }); // 위시리스트가 비어있으면 빈 배열 반환
    }

    // productController를 사용하여 제품 정보 가져오기
    const products = await productController.getProductsByIds(wishlistIds);
  

    return res.status(200).json({ status: "success", products });
  } catch (error) {
    return res.status(500).json({ status: "error", error: error.message });
  }
};

module.exports = userController;

