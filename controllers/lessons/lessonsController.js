const { supabase } = require('../../config/supa');
const HandleResponse = require('../../models/lessons/handleResponseLessons');
const { validateLesson } = require('../../validations/lessonValidate');
const express = require('express');
const router = express.Router();
const fs = require('fs');

/***************************** Setting SupaBase Bucket ******************************/
const bucket = supabase.storage.from('lessons');

/***************************** Get All Lessons ******************************/
const getAllLessons = async (req, resp) => {
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
          .from('lessons')
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

/***************************** Create Lesson ******************************/

const createLesson = async (req, resp) => {
  const body = { ...req.fields, ...req.files };
  const { error } = validateLesson(body);
  if (error) return resp.status(400).send({ error: error?.details[0].message });

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
              const {
                title,
                educational_level,
                subject,
                topic,
                quiz_type,
                publish,
                description,
                lo1,
                lo2,
                lo3,
                lo1_description,
                lo2_description,
                lo3_description,
              } = req.fields;
              // Setting images and creating their names
              const lo1_media = req?.files?.lo1_media;
              const lo1_mediaFile = fs.readFileSync(lo1_media.path);
              const lo1_media_name = `${title}_lo1_media.${lo1_media?.type
                .split('/')
                .pop()}`;

              const lo2_media = req?.files?.lo2_media;
              const lo2_mediaFile = fs.readFileSync(lo2_media.path);
              const lo2_media_name = `${title}_lo2_media.${lo2_media?.type
                .split('/')
                .pop()}`;

              const lo3_media = req?.files?.lo3_media;
              const lo3_mediaFile = fs.readFileSync(lo3_media.path);
              const lo3_media_name = `${title}_lo3_media.${lo3_media?.type
                .split('/')
                .pop()}`;

              // Check image size
              if (
                lo1_media?.size >= 2e6 ||
                lo2_media?.size >= 2e6 ||
                lo3_media?.size >= 2e6
              ) {
                resp
                  .status(413)
                  .send({ error: 'Image size must not be greater than 2mb.' });
              } else {
                // Upoading Images
                await bucket.upload(lo1_media_name, lo1_mediaFile, {
                  cacheControl: '3600',
                  upsert: false,
                  contentType: lo1_media?.type,
                });
                await bucket.upload(lo2_media_name, lo2_mediaFile, {
                  cacheControl: '3600',
                  upsert: false,
                  contentType: lo2_media?.type,
                });
                await bucket.upload(lo3_media_name, lo3_mediaFile, {
                  cacheControl: '3600',
                  upsert: false,
                  contentType: lo3_media?.type,
                });
              }
              // Get Public URL
              const lo1_media_URL = bucket.getPublicUrl(lo1_media_name);
              const lo2_media_URL = bucket.getPublicUrl(lo2_media_name);
              const lo3_media_URL = bucket.getPublicUrl(lo3_media_name);

              const formData = {
                title: title,
                educational_level: educational_level,
                subject: subject,
                topic: topic,
                quiz_type: quiz_type,
                publish: publish,
                description: description,
                lo1: lo1,
                lo2: lo2,
                lo3: lo3,
                lo1_media: lo1_media_URL?.data?.publicUrl,
                lo2_media: lo2_media_URL?.data?.publicUrl,
                lo3_media: lo3_media_URL?.data?.publicUrl,
                lo1_description: lo1_description,
                lo2_description: lo2_description,
                lo3_description: lo3_description,
              };

              await supabase
                .from('lessons')
                .insert(formData)
                .then(async (response) => {
                  const { data, error, statusText } = response;
                  if (data === null && statusText === null) {
                    resp.status(400).send({ message: error?.message });
                  } else {
                    resp.send({ message: 'Lesson successfully created' });
                  }
                });
            }
          });
      }
    });
  }
};

/***************************** Update Lesson ******************************/

const updateLesson = async (req, resp) => {
  const body = { ...req.fields, ...req.files };
  const { error } = validateLesson(body);
  if (error) return resp.status(400).send({ error: error?.details[0].message });

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
              const {
                title,
                educational_level,
                subject,
                topic,
                quiz_type,
                publish,
                description,
                lo1,
                lo2,
                lo3,
                lo1_description,
                lo2_description,
                lo3_description,
              } = req.fields;
              // Setting images and creating their names
              const lo1_media = req?.files?.lo1_media;
              const lo1_mediaFile = fs.readFileSync(lo1_media.path);
              const lo1_media_name = `${title}_lo1_media.${lo1_media?.type
                .split('/')
                .pop()}`;

              const lo2_media = req?.files?.lo2_media;
              const lo2_mediaFile = fs.readFileSync(lo2_media.path);
              const lo2_media_name = `${title}_lo2_media.${lo2_media?.type
                .split('/')
                .pop()}`;

              const lo3_media = req?.files?.lo3_media;
              const lo3_mediaFile = fs.readFileSync(lo3_media.path);
              const lo3_media_name = `${title}_lo3_media.${lo3_media?.type
                .split('/')
                .pop()}`;

              // Check image size
              if (
                lo1_media?.size >= 2e6 ||
                lo2_media?.size >= 2e6 ||
                lo3_media?.size >= 2e6
              ) {
                resp
                  .status(413)
                  .send({ error: 'Image size must not be greater than 2mb.' });
              } else {
                // Upoading Images
                await bucket.upload(lo1_media_name, lo1_mediaFile, {
                  cacheControl: '3600',
                  upsert: false,
                  contentType: lo1_media?.type,
                });
                await bucket.upload(lo2_media_name, lo2_mediaFile, {
                  cacheControl: '3600',
                  upsert: false,
                  contentType: lo2_media?.type,
                });
                await bucket.upload(lo3_media_name, lo3_mediaFile, {
                  cacheControl: '3600',
                  upsert: false,
                  contentType: lo3_media?.type,
                });
              }
              // Get Public URL
              const lo1_media_URL = bucket.getPublicUrl(lo1_media_name);
              const lo2_media_URL = bucket.getPublicUrl(lo2_media_name);
              const lo3_media_URL = bucket.getPublicUrl(lo3_media_name);

              const formData = {
                title: title,
                educational_level: educational_level,
                subject: subject,
                topic: topic,
                quiz_type: quiz_type,
                publish: publish,
                description: description,
                lo1: lo1,
                lo2: lo2,
                lo3: lo3,
                lo1_media: lo1_media_URL?.data?.publicUrl,
                lo2_media: lo2_media_URL?.data?.publicUrl,
                lo3_media: lo3_media_URL?.data?.publicUrl,
                lo1_description: lo1_description,
                lo2_description: lo2_description,
                lo3_description: lo3_description,
              };

              await supabase
                .from('lessons')
                .update(formData)
                .eq('lessons_id', req.params.id)
                .then((response) => {
                  if (response?.error) {
                    resp
                      .status(401)
                      .send({ message: response?.error?.message });
                  } else {
                    resp.send({ message: 'Lesson successfully updated.' });
                  }
                });
            }
          });
      }
    });
  }
};

/***************************** Update Lesson ******************************/

const deleteLesson = async (req, resp) => {
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
                .from('lessons')
                .delete()
                .eq('lessons_id', req.params.id)
                .then((response) => {
                  if (response?.error) {
                    resp
                      .status(400)
                      .send({ message: response?.error?.message });
                  } else {
                    resp.send({ message: 'Lesson successfully deleted.' });
                  }
                });
            }
          });
      }
    });
  }
};

module.exports = { getAllLessons, createLesson, updateLesson, deleteLesson };
