require('dotenv').config();
const cors = require("cors");
const express = require('express');
const superAdminSignUp = require('./routes/superAdminSignUp');
const superAdminLogin = require('./routes/superAdminLogin');
const adminSignUp = require('./routes/adminSignUp');
const adminLogin = require('./routes/adminLogin');
const resetPassword = require('./routes/resetPassword');
const lessons = require('./routes/lessons');
const waitList = require('./routes/waitList');

const app = express();
app.use(cors());
app.use(express.json());

//routes
app.use('/api/super-admin-sign-up', superAdminSignUp);
app.use('/api/super-admin-login', superAdminLogin);
app.use('/api/admin-sign-up', adminSignUp);
app.use('/api/admin-login', adminLogin);
app.use('/api/reset-password', resetPassword);
app.use('/api/lessons', lessons);
app.use('/api/wait-list', waitList);

//Port
const port = process.env.PORT;
app.listen(port, () => console.log(`Server listening on ${port}....`));
