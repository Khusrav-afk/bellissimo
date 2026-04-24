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

  const isVideo = file.startsWith('data:video/')
  const resourceType = isVideo ? 'video' : 'image'
  const timestamp = Math.round(Date.now() / 1000)
  const folderPath = `bellissimo/${folder || 'images'}`

  // Подпись
  const paramsToSign = `folder=${folderPath}&timestamp=${timestamp}`
  const signature = crypto
    .createHash('sha1')
    .update(paramsToSign + apiSecret)
    .digest('hex')

  // Собираем multipart вручную
  const boundary = '----FormBoundary' + Math.random().toString(36).slice(2)

  const parts = [
    `--${boundary}\r\nContent-Disposition: form-data; name="file"\r\n\r\n${file}\r\n`,
    `--${boundary}\r\nContent-Disposition: form-data; name="api_key"\r\n\r\n${apiKey}\r\n`,
    `--${boundary}\r\nContent-Disposition: form-data; name="timestamp"\r\n\r\n${timestamp}\r\n`,
    `--${boundary}\r\nContent-Disposition: form-data; name="signature"\r\n\r\n${signature}\r\n`,
    `--${boundary}\r\nContent-Disposition: form-data; name="folder"\r\n\r\n${folderPath}\r\n`,
    `--${boundary}--\r\n`
  ]

  const body = parts.join('')

  try {
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`,
      {
        method: 'POST',
        headers: {
          'Content-Type': `multipart/form-data; boundary=${boundary}`
        },
        body
      }
    )

    const text = await response.text()
    console.log('Cloudinary status:', response.status)
    console.log('Cloudinary response:', text.slice(0, 300))

    let data
    try {
      data = JSON.parse(text)
    } catch (e) {
      console.error('Not JSON:', text.slice(0, 200))
      return res.status(500).json({ error: 'Неверный ответ от Cloudinary: ' + text.slice(0, 100) })
    }

    if (data.secure_url) {
      return res.status(200).json({ url: data.secure_url })
    }

    console.error('Cloudinary error:', data)
    return res.status(500).json({ error: data.error?.message || 'Ошибка загрузки' })

  } catch (e) {
    console.error('Fetch error:', e.message)
    return res.status(500).json({ error: 'Ошибка соединения: ' + e.message })
  }
}
