const Notices = require('../models/Notice');

const handleError = (res, err, statusCode = 500, message = 'Internal Server Error') => {
    return res.status(statusCode).json({ message: err.message || message });
};

exports.getNoticeById = async (req, res) => {
    try {
        const notice = await Notices.findById(req.params.id);
        if (!notice) return res.status(404).json({ message: 'Notice not found' });
        res.json(notice);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.getAllNotices = async (req, res) => {
    try {
        const { searchType, keyword, page = 1 } = req.query; // Extract searchType, keyword, and page from query
        const limit = 10; // Number of items per page
        const skip = (parseInt(page) - 1) * limit; // Calculate number of items to skip for pagination
        
        // Construct the search filter
        let filter = {};

        if (keyword) {
            if (searchType === 'title') {
                filter.title = { $regex: keyword, $options: 'i' }; // Search by title
            } else if (searchType === 'content') {
                filter.content = { $regex: keyword, $options: 'i' }; // Search by content
            } else if (searchType === 'title+content') {
                filter.$or = [
                    { title: { $regex: keyword, $options: 'i' } }, // Search by title OR content
                    { content: { $regex: keyword, $options: 'i' } }
                ];
            }
        }

        // Fetch notices based on the filter, with pagination
        const [notices, total] = await Promise.all([
            Notices.find(filter).skip(skip).limit(limit), // Apply filter, skip and limit for pagination
            Notices.countDocuments(filter) // Get total count based on the filter
        ]);

        const totalPages = Math.ceil(total / limit); // Calculate total number of pages

        // Return the notices, total page number, and current page
        return res.json({
            notices,
            totalPageNum: totalPages,
            currentPage: parseInt(page)
        });
    } catch (err) {
        return handleError(res, err);
    }
};




exports.createNotice = async (req, res) => {
    const { title, content } = req.body;

    if (!title || !content) {
        return res.status(400).json({ message: 'Title and content are required' });
    }

    const notice = new Notices({ title, content });

    try {
        const newNotice = await notice.save();
        return res.status(201).json(newNotice);
    } catch (err) {
        return handleError(res, err, 400, 'Failed to create notice');
    }
};

exports.updateNotice = async (req, res) => {
    const { title, content } = req.body;

    try {
        const notice = await Notices.findById(req.params.id);
        if (!notice) {
            return res.status(404).json({ message: 'Notice not found' });
        }

        if (title) notice.title = title;
        if (content) notice.content = content;

        const updatedNotice = await notice.save();
        return res.json(updatedNotice);
    } catch (err) {
        return handleError(res, err, 400, 'Failed to update notice');
    }
};

exports.deleteNotice = async (req, res) => {
    try {
        const notice = await Notices.findByIdAndDelete(req.params.id);
        if (!notice) {
            return res.status(404).json({ message: 'Notice not found' });
        }

        return res.json({ message: 'Notice deleted successfully' });
    } catch (err) {
        return handleError(res, err);
    }
};
