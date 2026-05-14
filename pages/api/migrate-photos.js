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
  const paramsToSign = `folder=${folder}&timestamp=${timestamp}`
  const signature = crypto.createHash('sha1').update(paramsToSign + apiSecret).digest('hex')

  const formData = new FormData()
  formData.append('file', imageUrl) // Cloudinary умеет качать по URL
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
  throw new Error(data.error?.message || 'Cloudinary error')
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { limit = 10, offset = 0 } = req.body

  // Берём товары со старыми фото
  const { data: products, error } = await supabase
    .from('products')
    .select('id, images, video_url')
    .like('images::text', '%uficidakghgxdqtdmpbd%')
    .range(offset, offset + limit - 1)

  if (error) return res.status(500).json({ error: error.message })
  if (!products.length) return res.status(200).json({ done: true, migrated: 0 })

  let migrated = 0
  const errors = []

  for (const product of products) {
    try {
      const newImages = []
      for (const imgUrl of (product.images || [])) {
        if (imgUrl.includes('uficidakghgxdqtdmpbd')) {
          // Загружаем в Cloudinary
          const newUrl = await uploadToCloudinary(imgUrl)
          newImages.push(newUrl)
        } else {
          newImages.push(imgUrl) // Уже в Cloudinary
        }
      }

      // Обновляем в базе
      await supabase.from('products').update({ images: newImages }).eq('id', product.id)
      migrated++
      console.log(`Migrated ${migrated}: ${product.id}`)
    } catch (e) {
      errors.push({ id: product.id, error: e.message })
      console.error(`Error for ${product.id}:`, e.message)
    }
  }

  res.status(200).json({
    migrated,
    errors,
    done: products.length < limit
  })
}
