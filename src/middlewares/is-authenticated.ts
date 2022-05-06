import {RequestHandler} from 'express';
import createError from 'http-errors';

export const IsAuthenticated: RequestHandler = (req, res, next) => {
    if (!!req.session?.user) {
        res.locals.isAuthenticated = true;
        return next();
    } else {
        return next(createError(404));
    }
}
