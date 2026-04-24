import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { customerName, customerPhone, customerEmail, customerAddress, items, totalAmount, promoCode, discountAmount, comment } = req.body

  // 1. Сохраняем заказ
  const { data: order, error } = await supabase
    .from('orders')
    .insert([{
      customer_name: customerName,
      customer_phone: customerPhone,
      customer_email: customerEmail || '',
      customer_address: customerAddress,
      items,
      total_amount: totalAmount,
      promo_code: promoCode || null,
      discount_amount: discountAmount || 0,
      comment: comment || null,
      status: 'pending'
    }])
    .select()
    .single()

  if (error) {
    console.error('Supabase error:', error)
    return res.status(500).json({ error: 'Ошибка сохранения: ' + error.message })
  }

  // 2. Чистим телефон — оставляем только цифры
  let phone = (customerPhone || '').replace(/\D/g, '')
  // Если начинается с 8 — меняем на 7
  if (phone.startsWith('8')) phone = '7' + phone.slice(1)
  // Если начинается с 7 и цифр меньше 11 — добавляем 7 в начало (на всякий случай)
  if (!phone.startsWith('7')) phone = '7' + phone
  // Обрезаем до 11 цифр
  phone = phone.slice(0, 11)

  console.log('Phone formatted:', phone, 'length:', phone.length)

  // 3. Формируем позиции чека
  const receiptItems = items.map(item => ({
    description: (item.name + (item.size ? ` (${item.size})` : '')).slice(0, 128),
    quantity: String(item.qty),
    amount: {
      value: Number(item.price).toFixed(2),
      currency: 'RUB'
    },
    vat_code: 1,
    payment_subject: 'commodity',
    payment_mode: 'full_payment'
  }))

  // Доставка если есть
  const itemsSum = items.reduce((s, x) => s + x.price * x.qty, 0)
  const deliveryCost = totalAmount - itemsSum
  if (deliveryCost > 0) {
    receiptItems.push({
      description: 'Доставка',
      quantity: '1',
      amount: {
        value: Number(deliveryCost).toFixed(2),
        currency: 'RUB'
      },
      vat_code: 1,
      payment_subject: 'service',
      payment_mode: 'full_payment'
    })
  }

  // 4. Запрос к ЮКассе
  const credentials = Buffer.from(
    `${process.env.YOOKASSA_SHOP_ID}:${process.env.YOOKASSA_SECRET_KEY}`
  ).toString('base64')

  const paymentBody = {
    amount: {
      value: Number(totalAmount).toFixed(2),
      currency: 'RUB'
    },
    confirmation: {
      type: 'redirect',
      return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/success?order=${order.id}`
    },
    capture: true,
    description: `Заказ #${order.id.slice(0, 8)}`,
    metadata: { order_id: order.id },
    receipt: {
      customer: { phone },
      items: receiptItems
    }
  }

  console.log('Payment body:', JSON.stringify(paymentBody))

  let payment
  try {
    const ykRes = await fetch('https://api.yookassa.ru/v3/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json',
        'Idempotence-Key': order.id
      },
      body: JSON.stringify(paymentBody)
    })
    payment = await ykRes.json()
    console.log('YooKassa status:', ykRes.status)
    console.log('YooKassa response:', JSON.stringify(payment))
  } catch (e) {
    console.error('Fetch error:', e)
    return res.status(500).json({ error: 'Не удалось подключиться к ЮКассе' })
  }

  if (!payment.id || !payment.confirmation) {
    return res.status(500).json({
      error: payment.description || 'Ошибка ЮКассы',
      yookassa_error: payment
    })
  }

  // 5. Сохраняем payment_id
  await supabase.from('orders').update({
    payment_id: payment.id,
    payment_url: payment.confirmation.confirmation_url
  }).eq('id', order.id)

  res.status(200).json({
    paymentUrl: payment.confirmation.confirmation_url,
    orderId: order.id
  })
}
