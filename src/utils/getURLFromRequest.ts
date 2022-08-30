export default function getURLFromRequest(req) {
  const port = !process.env.PORT || ['8080', '80'].includes(process.env.PORT) ? '' : `:${process.env.PORT}`
  return `${req.protocol}://${req.hostname}${port}`
}