const { loginAdmin } = require('../controllers/auth/adminAuthController');
const express = require('express');
const router = express.Router();

//Auth Login
router.post('/', loginAdmin);

module.exports = router;
