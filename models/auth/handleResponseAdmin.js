class handleResponse {
  registerAdmin = (body) => {
    const { email, password } = body;
    let createBody = {
      email: email,
      password: password,
    };
    console.log('🚀 ~ Class createBody:', createBody);
    return createBody;
  };
  createAdmin = (body, data) => {
    const {
      name,
      email,
      password,
      phone_number,
      educational_level,
      main_subjects,
    } = body;

    let newUser = {
      name: name,
      email: email,
      password: password,
      phone_number: phone_number,
      educational_level: educational_level,
      main_subjects: main_subjects,
      uuid: data?.user?.id,
    };
    return newUser;
  };

  login = (body) => {
    const { email, password } = body;
    let loginObject = {
      email: email,
      password: password,
    };
    return loginObject;
  };

  loginResponse = (resp1, resp2) => {
    const { access_token, token_type, expires_in, refresh_token } =
      resp1?.data?.session;
    return {
      token: {
        acceess_token: access_token,
        token_type: token_type,
        expires_in: expires_in,
        refresh_token: refresh_token,
      },
      status: resp2?.statusText,
      user: resp2?.data,
    };
  };
}
const HandleResponse = new handleResponse();
module.exports = HandleResponse;
