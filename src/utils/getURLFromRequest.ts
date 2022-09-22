export default function getURLFromRequest(req) {
  return 'development' === process.env.NODE_ENV
    ? `${req.protocol}://${req.hostname}:${process.env.PORT}`
    : `${req.protocol}://${req.hostname}`
}