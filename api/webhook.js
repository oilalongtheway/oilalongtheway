import Stripe from 'stripe';
import nodemailer from 'nodemailer';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const PDF_LINK = process.env.PDF_LINK;

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

export const config = { api: { bodyParser: false } };

async function buffer(readable) {
  const chunks = [];
  for await (const chunk of readable) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const buf = await buffer(req);
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(buf, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send('Webhook Error: ' + err.message);
  }
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const customerEmail = session.customer_details && session.customer_details.email;
    if (customerEmail) {
      await transporter.sendMail({
        from: 'oilalongtheway <' + process.env.GMAIL_USER + '>',
        to: customerEmail,
        subject: 'ขอบคุณที่ซื้อ เรียนจีนผ่านเรื่องสั้น Vol.2',
        html: '<div style="font-family:sans-serif;padding:32px"><h2>ขอบคุณที่ซื้อนะ! 🎉</h2><p>กดปุ่มด้านล่างเพื่อดาวน์โหลด Ebook ได้เลยครับ</p><a href="' + PDF_LINK + '" style="display:inline-block;padding:14px 32px;background:#c8602a;color:white;border-radius:12px;text-decoration:none">ดาวน์โหลด Ebook</a></div>',
      });
    }
  }
  res.status(200).json({ received: true });
}
