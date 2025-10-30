// routes/transactions.js
const express = require('express');
const { z } = require('zod');
const { admin, db } = require('../firebaseAdmin'); // admin도 함께 import

const router = express.Router();

const transactionSchema = z.object({
  uid: z.string().min(1),
  amount: z.coerce.number().refine(Number.isFinite, { message: 'amount must be finite' }),
  type: z.enum(['income', 'expense']),
  category: z.string().min(1),
  memo: z.string().optional().default(''),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

router.post('/', async (req, res) => {
  try {
    const parsed = transactionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid body', detail: parsed.error.format() });
    }
    const { uid, ...data } = parsed.data;

    const ref = await db.collection('users').doc(uid)
      .collection('transactions')
      .add({
        ...data,
        createdAt: admin.firestore.FieldValue.serverTimestamp(), // 서버 타임스탬프
      });

    res.status(201).json({ id: ref.id });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: String(e?.message || e) });
  }
});

module.exports = router;
