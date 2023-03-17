require('dotenv').config();
const express = require('express');
const auth = require('./routes/auth');
const login = require('./routes/login');

const app = express();

//routes
app.use(express.json());
app.use('/api/register', auth);
app.use('/api/login', login);

//Port
const port = process.env.PORT;
app.listen(port, () => console.log(`Supabase listening on ${port}....`));
