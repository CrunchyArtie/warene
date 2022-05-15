import express from 'express';
import {BrowserController} from '../controllers';

export const indexRouter = express.Router();
/* GET home page. */
indexRouter.get('/', async function (req, res, next) {
    if (!req.session.user) {
        res.redirect('/auth');
    } else {
        res.redirect('books');
    }
});

indexRouter.get('/goto/*', async function (req, res, next) {
    return res.redirect(BrowserController.getUrl(req.url.slice(5)));
});

