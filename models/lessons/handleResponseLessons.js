class handleResponse {
  insertLesson = (body) => {
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
      lo1_media,
      lo2_media,
      lo3_media,
      lo1_description,
      lo2_description,
      lo3_description,
    } = body;

    return {
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
      lo1_media: lo1_media,
      lo2_media: lo2_media,
      lo3_media: lo3_media,
      lo1_description: lo1_description,
      lo2_description: lo2_description,
      lo3_description: lo3_description,
    };
  };
}
const HandleResponse = new handleResponse();
module.exports = HandleResponse;
