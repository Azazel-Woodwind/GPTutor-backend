const { regsiterAdmin } = require('../controllers/auth/adminAuthController');
const express = require('express');
const router = express.Router();

//Auth Sign Up
router.post('/', regsiterAdmin);

module.exports = router;
