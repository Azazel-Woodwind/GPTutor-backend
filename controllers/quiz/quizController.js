const { supabase } = require('../../config/supa');
const HandleResponse = require('../../models/quiz/handleResponseQuiz');
const { validateQuiz } = require('../../validations/quizValidate');

/***************************** Get All Quiz ******************************/

const getAllQuiz = async (req, resp) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(' ')[1];
  if (token === undefined) {
    resp.status(401).send({ message: 'Unauthorized' });
  } else {
    await supabase.auth.getUser(token).then(async (response) => {
      if (response?.data?.user === null) {
        resp.status(401).send({ message: 'Unauthorized' });
      } else {
        await supabase
          .from('quiz')
          .select('*')
          .then(async (response) => {
            const { data, statusText, error } = response;
            if (data && statusText === 'OK') {
              resp.send(data);
            } else {
              resp.status(401).send(error?.message);
            }
          });
      }
    });
  }
};

/***************************** Add New Quiz ******************************/

const addNewQuiz = async (req, resp) => {
  const { error } = validateQuiz(req.body);
  if (error)
    return resp.status(400).send({ error: error?.details[0]?.message });

  const authHeader = req.headers.authorization;
  const token = authHeader?.split(' ')[1];
  if (token === undefined) {
    resp.status(401).send({ message: 'Unauthorized' });
  } else {
    await supabase.auth.getUser(token).then(async (response) => {
      if (response?.data?.user === null) {
        resp.status(401).send({ message: 'Unauthorized' });
      } else {
        await supabase
          .from('quiz')
          .insert(HandleResponse.createQuiz(req.body))
          .then((res) => {
            const { data, statusText } = res;
            if (data === null && statusText === null) {
              resp.status(400).send({ message: error?.message });
            } else {
              resp.send({ message: 'Quiz successfully created' });
            }
          });
      }
    });
  }
};

const updateQuiz = async (req, resp) => {
  const { error } = validateQuiz(req.body);
  if (error)
    return resp.status(400).send({ error: error?.details[0]?.message });

  const authHeader = req.headers.authorization;
  const token = authHeader?.split(' ')[1];
  if (token === undefined) {
    resp.status(401).send({ message: 'Unauthorized' });
  } else {
    await supabase.auth.getUser(token).then(async (response) => {
      if (response?.data?.user === null) {
        resp.status(401).send({ message: 'Unauthorized' });
      } else {
        await supabase
          .from('quiz')
          .update(HandleResponse.createQuiz(req.body))
          .eq('quiz_uuid', req.params.id)
          .then((res) => {
            if (res?.error) {
              resp.status(401).send({ message: res?.error?.message });
            } else {
              resp.send({ message: 'Lesson successfully updated.' });
            }
          });
      }
    });
  }
};

const deleteQuiz = async (req, resp) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(' ')[1];
  if (token === undefined) {
    resp.status(401).send({ message: 'Unauthorized' });
  } else {
    await supabase.auth.getUser(token).then(async (response) => {
      if (response?.data?.user === null) {
        resp.status(401).send({ message: 'Unauthorized' });
      } else {
        const { email, role } = response?.data?.user;
        await supabase
          .from('superAdmin')
          .select('*')
          .eq('email', email)
          .then(async (res) => {
            const { data, error, statusText } = res;
            if (data && statusText === 'OK') {
              await supabase
                .from('quiz')
                .delete()
                .eq('quiz_uuid', req.params.id)
                .then((response) => {
                  if (response?.error) {
                    resp
                      .status(400)
                      .send({ message: response?.error?.message });
                  } else {
                    resp.send({ message: 'Quiz successfully deleted.' });
                  }
                });
            }
          });
      }
    });
  }
};

module.exports = { getAllQuiz, addNewQuiz, updateQuiz, deleteQuiz };
