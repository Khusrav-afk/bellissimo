import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

async function uploadToCloudinary(imageUrl) {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME
  const apiKey = process.env.CLOUDINARY_API_KEY
  const apiSecret = process.env.CLOUDINARY_API_SECRET

  const timestamp = Math.round(Date.now() / 1000)
  const folder = 'bellissimo/images'
  // Только folder и timestamp в подписи — никаких доп параметров
  const paramsToSign = `folder=${folder}&timestamp=${timestamp}`
  const signature = crypto.createHash('sha1').update(paramsToSign + apiSecret).digest('hex')

  const formData = new FormData()
  // Всегда передаём URL напрямую — Cloudinary сам скачает
  formData.append('file', imageUrl)
  formData.append('api_key', apiKey)
  formData.append('timestamp', String(timestamp))
  formData.append('signature', signature)
  formData.append('folder', folder)

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: 'POST',
    body: formData
  })
  const data = await res.json()
  if (data.secure_url) return data.secure_url
  throw new Error(data.error?.message || 'Ошибка Cloudinary')
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { limit = 5, offset = 0 } = req.body

  const { data: products, error } = await supabase
    .from('products')
    .select('id, images')
    .range(offset, offset + limit - 1)

  if (error) return res.status(500).json({ error: error.message })
  if (!products || products.length === 0) {
    return res.status(200).json({ done: true, migrated: 0 })
  }

  const oldProducts = products.filter(p =>
    p.images && p.images.some(img => img && img.includes('uficidakghgxdqtdmpbd'))
  )

  let migrated = 0
  const errors = []

  for (const product of oldProducts) {
    try {
      const newImages = []
      for (const imgUrl of (product.images || [])) {
        if (imgUrl && imgUrl.includes('uficidakghgxdqtdmpbd')) {
          try {
            const newUrl = await uploadToCloudinary(imgUrl)
            newImages.push(newUrl)
          } catch (e) {
            console.error(`Не удалось: ${e.message}`)
            newImages.push(imgUrl)
            errors.push({ id: product.id, error: e.message })
          }
        } else {
          newImages.push(imgUrl)
        }
      }
      await supabase.from('products').update({ images: newImages }).eq('id', product.id)
      migrated++
    } catch (e) {
      errors.push({ id: product.id, error: e.message })
    }
  }

  res.status(200).json({
    migrated,
    errors,
    done: products.length < limit,
    total: products.length
  })
}
