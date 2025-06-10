// Review.js (Mongoose Schema)
const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Product',
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
  },
  text: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  imageUrls: {
    type: [String],
    required: false,
  }
}, { timestamps: true });

module.exports = mongoose.model('Review', reviewSchema);