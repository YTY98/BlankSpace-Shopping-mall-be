const mongoose = require('mongoose');

const noticeSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required']
    },
    content: {
      type: String,
      required: [true, 'Content is required']
    },
    date: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true 
  }
);

const Notice = mongoose.model('Notice', noticeSchema);
module.exports = Notice;
