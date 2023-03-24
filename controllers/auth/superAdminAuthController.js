const { supabase } = require('../../config/supa');
const {
  validateSASignUp,
  validateSALogin,
} = require('../../validations/superAdmin');
const express = require('express');
const HandleResponse = require('../../models/auth/handleResponseSuperAdmin');

/***************************** Register Super Admin ******************************/

const registerSuperAdmin = async (req, resp) => {
  //check validation here
  const { error } = validateSASignUp(req.body);
  if (error) return resp.status(400).send({ error: error?.details[0].message });

  const { email } = req.body;

  await supabase
    .from('superAdmin')
    .select('email')
    .eq('email', email)
    .then(async (res) => {
      if (res?.status === 200 && res?.data?.[0]?.email === email) {
        resp.status(400).send({ message: 'The email is taken. Try another.' });
      } else {
        try {
          const { data, error } = await supabase.auth.signUp(
            HandleResponse.handleRegisterSuperAdmin(req.body)
          );

          if (data) {
            const { error } = await supabase
              .from('superAdmin')
              .insert(HandleResponse.createSuperAdmin(req.body));
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
};

/***************************** Login Super Admin ******************************/

const loginSuperAdmin = async (req, resp) => {
  const { error } = validateSALogin(req.body);
  if (error) return resp.status(400).send({ error: error?.details[0].message });

  await supabase.auth
    .signInWithPassword(HandleResponse.login(req.body))
    .then(async (response) => {
      if (response?.data?.user === null) {
        resp.status(400).send({ message: response?.error?.message });
      } else {
        const email = response?.data?.user?.email;
        supabase
          .from('superAdmin')
          .select('*')
          .eq('email', email)
          .then((res) => {
            resp.send(HandleResponse.loginResponse(response, res));
          });
      }
    });
};

module.exports = { registerSuperAdmin, loginSuperAdmin };
