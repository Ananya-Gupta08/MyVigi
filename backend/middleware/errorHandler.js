function notFound(req, res, next) {
  res.status(404)
  next(new Error(`Not found - ${req.originalUrl}`))
}

function errHandler(err, req, res, next) {
  const sc = res.statusCode === 200 ? 500 : res.statusCode
  res.status(sc)
  res.json({
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
  })
}

module.exports = { notFound, errHandler }
