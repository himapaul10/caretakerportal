const express = require('express');
const path = require('path');
const session = require('express-session');
const handlebars = require('express-handlebars');

const publicDirectory = path.join(__dirname, './public');

const methods = require('./methods');
const auth = require('./auth');

const app = express();

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE', 'UPDATE');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    next();
});

app.use(express.static(publicDirectory));
app.use(express.urlencoded({extended: false}));
app.use(express.json());

app.use(session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
        maxAge: 60 * 60 * 1000,
    }
}));

app.engine('handlebars', handlebars.engine({
    helpers: {
        formatDate: (date, formatOptions = { year: 'numeric', month: 'long', day: 'numeric' }) => {
            if (!date) return "";
            const formatter = new Intl.DateTimeFormat('en-US', formatOptions);
            return formatter.format(new Date(date));
        }
    }
}));

app.set('view engine', 'handlebars');
app.set('views', './views');

app.get('/test', async (req, res) => {
    res.json({message: 'pass!'});
});

app.get('/api/test/:id', async (req, res) => {
    // const ing = await methods.getIngestionTime(req.params.id);
    // const med = await methods.getPatientMedications(req.params.id);
    // const sch = await methods.getPatientMedicationSchedule(req.params.id);
    // console.log(med);
    // console.log(sch[0].schedules[0]);
});

// Portal

app.get('/', (req, res) => {
    return res.render('index');
});

app.get('/register', (req, res) => {
    return res.render('register');
});

app.get('/login', (req, res) => {
    return res.render('login');
});

app.post('/login', (req, res) => {
    return auth.login_caretaker(req, res);
});

app.post('/register', (req, res) => {
    return auth.register_caretaker(req, res);
});

app.get('/logout', (req, res) => {
    return auth.logout_caretaker(req, res);
});

app.get('/profile', async (req, res) => {
    return methods.profile(req, res);
});

app.get('/patient', async (req, res) => {
    return methods.patient(req, res);
});

// API

app.get('/api/search_medications/:searchQuery', (req, res) => {
    return methods.search_medications(req, res);
});

app.get('/api/get_medication/:id', (req, res) => {
    return methods.get_medication(req, res);
});

app.post('/api/medication', (req, res) => {
    return methods.post_medication(req, res);
});

app.post('/api/schedule', (req, res) => {
    return methods.post_schedule(req, res);
});

app.post('/api/session', (req, res) => {
    return methods.post_session(req, res);
});

module.exports = app;


