require('dotenv').config();
const express = require('express');
const superAdminAuth = require('./routes/superAdminAuth');
const superAdminLogin = require('./routes/superAdminLogin');
const auth = require('./routes/auth');
const login = require('./routes/login');
const resetPassword = require('./routes/resetPassword');

const app = express();

//routes
app.use(express.json());
app.use('/api/admin-sign-up', superAdminAuth);
app.use('/api/admin-login', superAdminLogin);
app.use('/api/register', auth);
app.use('/api/login', login);
app.use('/api/reset-password', resetPassword);

//Port
const port = process.env.PORT;
app.listen(port, () => console.log(`Server listening on ${port}....`));
