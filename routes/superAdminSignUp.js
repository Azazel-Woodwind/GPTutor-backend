const {
  registerSuperAdmin,
} = require('../controllers/auth/superAdminAuthController');
const express = require('express');
const router = express.Router();

//Sign Up Super Admin
router.post('/', registerSuperAdmin);

module.exports = router;
