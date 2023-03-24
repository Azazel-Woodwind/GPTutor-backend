const {
  loginSuperAdmin,
} = require('../controllers/auth/superAdminAuthController');
const express = require('express');
const router = express.Router();

//Login Super Admin
router.post('/', loginSuperAdmin);
module.exports = router;
