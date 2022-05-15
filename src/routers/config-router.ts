import express from 'express';

import AuthenticationController from '../controllers/authentication-controller';
import {Config} from '../models';

export const configRouter = express.Router();
configRouter.get('/', async function (req, res, next) {
    const config = await Config.findAll();
    return res.render('config', {config});
});
