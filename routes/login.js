const { supabase } = require('../config/supa');
const { validateUser } = require('../models/login');
const express = require('express');
const router = express.Router();

//Auth Login
router.post('/', async (req, resp) => {
  const { error } = validateUser(req.body);
  if (error)
    return resp.status(400).send({ errors: error?.details[0].message });

  const { email, password } = req.body;

  await supabase.auth
    .signInWithPassword({
      email,
      password,
    })
    .then((response) => {
      if (response?.data?.user === null) {
        resp.status(400).send(response?.error);
      } else {
        const { access_token, token_type, expires_in, refresh_token } =
          response?.data?.session;

        const email = response?.data?.user?.email;
        supabase
          .from('users')
          .select('*')
          .eq('email', email)
          .then((res) => {
            resp.send({
              token: {
                acceess_token: access_token,
                token_type: token_type,
                expires_in: expires_in,
                refresh_token: refresh_token,
              },
              status: res?.statusText,
              user: res?.data,
            });
          });
      }
    });
});

module.exports = router;
