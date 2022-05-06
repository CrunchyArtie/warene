import express from 'express';

export const indexRouter = express.Router();
/* GET home page. */
indexRouter.get('/', async function (req, res, next) {
    if (!req.session.user) {
        res.redirect('/auth');
    } else {
        res.redirect('books');
    }
});

