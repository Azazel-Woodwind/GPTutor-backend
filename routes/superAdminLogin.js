const { supabase } = require('../config/supa');
const { validateSuperAdmin } = require('../models/superAdmin');
const express = require('express');
const router = express.Router();

//Login Super Admin

router.post('/', async (req, resp) => {
  const { error } = validateSuperAdmin(req.body);
  if (error)
    return resp.status(400).send({ error: error?.details[0]?.message });

  const { email, password } = req.body;

  await supabase.auth
    .signInWithPassword({
      email: email,
      password: password,
    })
    .then(async (response) => {
      if (response?.data?.user === null) {
        resp.status(400).send(response?.error);
      } else {
        const { access_token, token_type, expires_in, refresh_token } =
          response?.data?.session;
        const email = response?.data?.user?.email;
        supabase
          .from('superAdmin')
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
