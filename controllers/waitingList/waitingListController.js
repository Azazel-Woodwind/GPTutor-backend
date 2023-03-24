const { waitListValidate } = require('../../validations/waitListValidate');
const { supabase } = require('../../config/supa');
const HandleResponse = require('../../models/waitList/handleResponseWaitList');

//Create Wait List
const createWaitList = async (req, resp) => {
  const { error } = waitListValidate(req.body);
  if (error) return resp.status(400).send({ error: error?.details[0].message });
  await supabase
    .from('waitlist')
    .insert(HandleResponse.createWaitList(req.body))
    .then((response) => {
      if (response.data === null) {
        resp.send({ message: 'Successfully added to wait list.' });
      } else {
        resp.status(400).send(response.error);
      }
    });
};

module.exports = { createWaitList };
