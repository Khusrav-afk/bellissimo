import crypto from 'crypto'

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '60mb'
    }
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { file, folder } = req.body

  if (!file) return res.status(400).json({ error: 'Файл не передан' })

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME
  const apiKey = process.env.CLOUDINARY_API_KEY
  const apiSecret = process.env.CLOUDINARY_API_SECRET

  if (!cloudName || !apiKey || !apiSecret) {
    return res.status(500).json({ error: 'Cloudinary не настроен. Добавьте переменные окружения.' })
  }

  // Определяем тип файла по base64 заголовку
  const isVideo = file.startsWith('data:video/')
  const resourceType = isVideo ? 'video' : 'image'

  const timestamp = Math.round(Date.now() / 1000)
  const folderPath = `bellissimo/${folder || 'images'}`

  // Подпись для безопасной загрузки
  const paramsToSign = `folder=${folderPath}&timestamp=${timestamp}`
  const signature = crypto
    .createHash('sha1')
    .update(paramsToSign + apiSecret)
    .digest('hex')

  // Отправляем в Cloudinary
  const formData = new FormData()
  formData.append('file', file)
  formData.append('api_key', apiKey)
  formData.append('timestamp', String(timestamp))
  formData.append('signature', signature)
  formData.append('folder', folderPath)

  try {
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`,
      { method: 'POST', body: formData }
    )
    const data = await response.json()

    if (data.secure_url) {
      return res.status(200).json({ url: data.secure_url })
    } else {
      console.error('Cloudinary error:', data)
      return res.status(500).json({ error: data.error?.message || 'Ошибка загрузки в Cloudinary' })
    }
  } catch (e) {
    console.error('Fetch error:', e)
    return res.status(500).json({ error: 'Не удалось подключиться к Cloudinary' })
  }
}
