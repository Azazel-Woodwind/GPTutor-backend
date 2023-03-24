const { supabase } = require('../config/supa');
const express = require('express');
const router = express.Router();

//Reset Password For Admin And Super Admin

router.post('/', async (req, resp) => {
  const { email } = req.body;

  await supabase.auth.resetPasswordForEmail(email).then((response) => {
    resp.send({ message: 'Kindly check your email for reset password.' });
  });
});

module.exports = router;
