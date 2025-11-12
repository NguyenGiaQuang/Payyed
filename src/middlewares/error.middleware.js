export function errorHandler(err, req, res, next) { // eslint-disable-line
    const status = err.status || 500;
    res.status(status).json({ message: err.message || 'Internal Server Error' });
}