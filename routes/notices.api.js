const express = require('express');
const router = express.Router();
const noticeController = require('../controllers/notice.controller');

// 모든 공지사항 가져오기
router.get('/', noticeController.getAllNotices);

// 특정 공지사항 가져오기
router.get('/:id', noticeController.getNoticeById);

// 공지사항 생성
router.post('/', noticeController.createNotice);

// 공지사항 수정
router.put('/:id', noticeController.updateNotice);

// 공지사항 삭제
router.delete('/:id', noticeController.deleteNotice);

module.exports = router;



