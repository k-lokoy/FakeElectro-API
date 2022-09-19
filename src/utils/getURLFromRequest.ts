export default function getURLFromRequest(req) {
  return `${req.protocol}://${req.hostname}`
}