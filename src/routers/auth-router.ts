import express from 'express';

import AuthenticationController from '../controllers/authentication-controller';

export const authRouter = express.Router();
authRouter.get('/', function (req, res, next) {
    if(!!req.session.isAuthenticated) {
        res.redirect('/');
    } else {
        res.redirect(req.baseUrl + '/login');
    }
});

authRouter.get('/logout', function (req, res, next) {
    req.session.destroy((err) => {
        if(err) {
            return next(err)
        }
        res.redirect('/');
    });
});

authRouter.get('/login', function (req, res, next) {
    res.render('login', {title: 'Se connecter'});
});

authRouter.post('/login', async function (req, res, next) {
    const login = req.body.login;
    const password = req.body.password;

    let user = await AuthenticationController.authenticate(login, password);
    if (!!user) {
        req.session.user = user;
        if (!req.body['remember-me']) {
            const oneHour = 1000 * 60 * 60; // 1ms to 1s to 1m to 1h
            req.session.cookie.expires = new Date(Date.now() + oneHour)
            req.session.save();
        }
        res.redirect('/');
    } else {
        res.render('login', {flash: [{type: 'danger', title: 'Mauvais identifiants'}]});
    }
});
