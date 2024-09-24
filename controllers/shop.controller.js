// controllers/shop.controller.js
const Product = require('../models/Product'); // Product 모델을 가져옵니다.

exports.getProducts = async (req, res) => {
  try {
    const { name, category } = req.query;
    
    // 검색 조건을 담을 객체를 생성합니다.
    const query = {};
    
    // 이름 필터링이 있는 경우
    if (name) {
      query.name = { $regex: name, $options: 'i' }; // 대소문자 구분 없이 검색합니다.
    }
    
    // 카테고리 필터링이 있는 경우
    if (category) {
      query.category = category;
    }

    // 필터링된 제품 목록을 가져옵니다.
    const products = await Product.find(query);
    
    res.status(200).json(products);
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ message: '서버 오류로 인해 제품 목록을 불러올 수 없습니다.' });
  }
};
