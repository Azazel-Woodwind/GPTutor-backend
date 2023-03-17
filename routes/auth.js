const { supabase } = require('../config/supa');
const { validateUser } = require('../models/auth');
const express = require('express');
const router = express.Router();

//Auth Sign Up
router.post('/', async (req, resp) => {
  const { error } = validateUser(req.body);
  if (error) return resp.status(400).send({ error: error.details[0].message });

  const {
    name,
    email,
    password,
    phone_number,
    educational_level,
    main_subjects,
  } = req.body;

  await supabase
    .from('users')
    .select('email')
    .eq('email', email)
    .then(async (res) => {
      if (res?.status === 200 && res?.data?.[0]?.email === email) {
        resp.status(409).send({ message: 'The email is taken. Try another.' });
      } else {
        try {
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
          });

          if (data) {
            const { error } = await supabase.from('users').insert({
              name: name,
              email: email,
              password: password,
              phone_number: phone_number,
              educational_level: educational_level,
              main_subjects: main_subjects,
              uuid: data?.user?.id,
            });
          }

          if (error) {
            resp.status(400).send(error?.message);
          }
          resp.send({
            message: 'Kindly check your email to activate your account.',
          });
        } catch (error) {
          resp.status(400).send(error);
        }
      }
    });
});

module.exports = router;
