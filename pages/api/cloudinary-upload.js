import crypto from 'crypto'

// Этот endpoint только генерирует подпись
// Браузер сам загружает файл напрямую в Cloudinary
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { folder } = req.body

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME
  const apiKey = process.env.CLOUDINARY_API_KEY
  const apiSecret = process.env.CLOUDINARY_API_SECRET

  if (!cloudName || !apiKey || !apiSecret) {
    return res.status(500).json({ error: 'Cloudinary не настроен' })
  }

  const timestamp = Math.round(Date.now() / 1000)
  const folderPath = `bellissimo/${folder || 'images'}`
  const paramsToSign = `folder=${folderPath}&timestamp=${timestamp}`
  
  const signature = crypto
    .createHash('sha1')
    .update(paramsToSign + apiSecret)
    .digest('hex')

  res.status(200).json({
    signature,
    timestamp,
    apiKey,
    cloudName,
    folder: folderPath
  })
}
