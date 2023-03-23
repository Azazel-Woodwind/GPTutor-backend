class handleResponse {
  handleRegisterSuperAdmin = (body) => {
    const { email, password } = body;
    let createBody = {
      email: email,
      password: password,
    };
    return createBody;
  };

  createSuperAdmin = (body) => {
    const { first_name, last_name, email, password, role } = body;
    let newUser = {
      first_name: first_name,
      last_name: last_name,
      role: role,
      email: email,
      password: password,
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
    const user = resp2?.data;
    let response = {
      token: {
        acceess_token: access_token,
        token_type: token_type,
        expires_in: expires_in,
        refresh_token: refresh_token,
      },
      status: resp2?.statusText,
      user: user,
    };
    return response;
  };
}

const HandleResponse = new handleResponse();
module.exports = HandleResponse;
