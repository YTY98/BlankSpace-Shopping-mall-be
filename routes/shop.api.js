// routes/shop.api.js
const express = require('express');
const router = express.Router();
const shopController = require('../controllers/shop.controller');

// 제품 목록을 가져오는 API 엔드포인트
router.get('/products', shopController.getProducts);

module.exports = router;
