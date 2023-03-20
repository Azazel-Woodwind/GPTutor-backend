const { supabase } = require('../config/supa');
const { validateUser } = require('../models/superAdmin');
const express = require('express');
const router = express.Router();

//Sign Up Super Admin

router.post('/', async (req, resp) => {
  const { error } = validateUser(req.body);
  if (error) resp.status(400).send({ error: error.details[0].message });

  const { first_name, last_name, email, password, role } = req.body;

  await supabase
    .from('superAdmin')
    .select('email')
    .eq('email', email)
    .then(async (res) => {
      if (res?.status === 200 && res?.data?.[0]?.email === email) {
        resp.status(400).send({ message: 'The email is taken. Try another.' });
      } else {
        try {
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
          });

          if (data) {
            const { error } = await supabase.from('superAdmin').insert({
              first_name: first_name,
              last_name: last_name,
              role: role,
              email: email,
              password: password,
            });

            if (error) {
              resp.status(400).send(error?.message);
            }
            resp.send({
              message: 'Kindly check your email to activate your account.',
            });
          }
        } catch (error) {
          resp.status(400).send(error);
        }
      }
    });
});

module.exports = router;
