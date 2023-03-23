const { supabase } = require('../config/supa');
const express = require('express');
const {
  createWaitList,
} = require('../controllers/waitingList/waitingListController');
const router = express.Router();

//Create Wait List

router.post('/', createWaitList);

module.exports = router;
