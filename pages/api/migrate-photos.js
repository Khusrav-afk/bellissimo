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
 
  // Скачиваем фото
  const imgRes = await fetch(imageUrl)
  if (!imgRes.ok) throw new Error(`Failed to fetch image: ${imgRes.status}`)
  
  const arrayBuffer = await imgRes.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  const sizeMB = buffer.length / 1024 / 1024
  
  console.log(`Image size: ${sizeMB.toFixed(1)} MB`)
 
  // Конвертируем в base64
  const base64 = `data:image/jpeg;base64,${buffer.toString('base64')}`
 
  // Загружаем с трансформацией — Cloudinary сам сожмёт при загрузке
  const formData = new FormData()
  formData.append('file', base64)
  formData.append('api_key', apiKey)
  formData.append('timestamp', String(timestamp))
  formData.append('signature', signature)
  formData.append('folder', folder)
  // Просим Cloudinary сжать при загрузке
  formData.append('transformation', 'q_auto:good,f_auto')
 
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
 
  const { limit = 5, offset = 0 } = req.body
 
  const { data: products, error } = await supabase
    .from('products')
    .select('id, images')
    .range(offset, offset + limit - 1)
 
  if (error) return res.status(500).json({ error: error.message })
 
  const oldProducts = (products || []).filter(p =>
    p.images && p.images.some(img => img && img.includes('uficidakghgxdqtdmpbd'))
  )
 
  if (!products || products.length === 0) {
    return res.status(200).json({ done: true, migrated: 0 })
  }
 
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
            console.error(`Failed image ${imgUrl}:`, e.message)
            newImages.push(imgUrl) // оставляем старую если не удалось
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
 
  const done = products.length < limit
 
  res.status(200).json({ migrated, errors, done, total: products.length })
}
 
