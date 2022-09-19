export default function getURLFromRequest(req) {
  const protocol = req.headers['x-forwarded-proto']
  const port = !process.env.PORT || ['8080', '80'].includes(process.env.PORT) ? '' : `:${process.env.PORT}`
  
  return `${protocol}://${req.hostname}${port}`
}