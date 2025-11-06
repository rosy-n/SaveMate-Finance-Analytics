// server/routes/transactions.js
const express = require('express');
const router = express.Router();
const { db, admin } = require('../firebaseAdmin');

/** ──────────────────────────────────────────────────────────────
 * 유틸
 *  - 월 구간: [start, end)  (다음달 1일 00:00 미만까지)
 *  - iso10: Date/Timestamp → 'YYYY-MM-DD'
 * ────────────────────────────────────────────────────────────── */
const getMonthRange = (year, month) => {
  const y = Number(year);
  const m = Number(month); // 1~12
  const startDate = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0, 0));
  const endDate   = new Date(Date.UTC(y, m,     1, 0, 0, 0, 0)); // 다음달 1일
  return {
    start: admin.firestore.Timestamp.fromDate(startDate),
    end:   admin.firestore.Timestamp.fromDate(endDate),
  };
};
const iso10 = (d) => new Date(d).toISOString().slice(0, 10);

/** ──────────────────────────────────────────────────────────────
 * POST /api/transactions
 * Body:
 * {
 *   uid: "2314513",
 *   type: "income" | "expense",
 *   amount: 30000,
 *   category?: "식비|용돈|...",
 *   memo?: "메모",
 *   date: "YYYY-MM-DD" | ISO string,
 *   incomeDetail?: { incomeSource?: "월급|용돈|기타", memo?: "..." },
 *   expenseDetail?: { paymentMethod?: "현금|신용카드|체크카드", spendingCategory?: "...", spendingItem?: "...", spendingBackground?: "..." }
 * }
 *
 * 저장 위치:
 *   users/{uid}/transactions/{tid}
 *     ├─ incomeDetails/{detailId}   (type === 'income')
 *     └─ expenseDetails/{detailId}  (type === 'expense')
 * ────────────────────────────────────────────────────────────── */
router.post('/', async (req, res) => {
  try {
    const {
      uid, type, amount, category, memo, date,
      incomeDetail, expenseDetail,
    } = req.body;

    // ---- 검증 ----
    if (!uid || amount == null || !type || !date) {
      return res.status(400).json({ ok: false, error: 'missing fields (uid, amount, type, date)' });
    }
    if (!['income', 'expense'].includes(String(type))) {
      return res.status(400).json({ ok: false, error: 'type must be income|expense' });
    }
    const _amount = Number(amount);
    if (!Number.isFinite(_amount)) {
      return res.status(400).json({ ok: false, error: 'amount must be a number' });
    }

    // ---- 날짜 ----
    const parsed = new Date(date);
    if (isNaN(parsed.getTime())) {
      return res.status(400).json({ ok: false, error: 'invalid date format' });
    }
    const ts = admin.firestore.Timestamp.fromDate(parsed);
    const nowServer = admin.firestore.FieldValue.serverTimestamp();

    // ---- 1) 기본 거래 저장 ----
    const baseDoc = {
      amount: _amount,
      type,                           // 'income' | 'expense'
      category: category ?? null,
      memo: memo ?? null,
      date: ts,                       // 정렬을 위한 Timestamp
      createdAt: nowServer,
      updatedAt: nowServer,
    };

    const txnRef = await db
      .collection('users')
      .doc(uid)
      .collection('transactions')
      .add(baseDoc);

    // ---- 2) 상세 하위 컬렉션 ----
    if (type === 'income' && incomeDetail) {
      const { incomeSource, memo: incomeMemo } = incomeDetail;
      await txnRef.collection('incomeDetails').add({
        incomeSource: incomeSource ?? category ?? '기타',
        memo: incomeMemo ?? null,
        createdAt: nowServer,
      });
    }

    if (type === 'expense' && expenseDetail) {
      const {
        paymentMethod, spendingCategory, spendingItem, spendingBackground,
      } = expenseDetail;
      await txnRef.collection('expenseDetails').add({
        paymentMethod: paymentMethod ?? null,                 // 현금/신용/체크
        spendingCategory: spendingCategory ?? category ?? null,
        spendingItem: spendingItem ?? memo ?? null,
        spendingBackground: spendingBackground ?? null,
        createdAt: nowServer,
      });
    }

    return res.status(201).json({ ok: true, id: txnRef.id });
  } catch (e) {
    console.error('[Firestore POST Error]', e);
    return res.status(500).json({ ok: false, error: e.message });
  }
});

/** ──────────────────────────────────────────────────────────────
 * GET /api/transactions
 * 쿼리:
 *   uid=필수
 *   year=선택(월 조회 시 필수)
 *   month=선택(1~12, 월 조회 시 필수)
 *   limit=선택(기본 20) — year/month 없을 때만 사용
 *   expand=true|false (기본 false) — 각 거래의 상세 1건 포함
 *
 * 예:
 *   /api/transactions?uid=2314513&year=2025&month=11&expand=true
 *   /api/transactions?uid=2314513&limit=50
 * ────────────────────────────────────────────────────────────── */
router.get('/', async (req, res) => {
  try {
    const { uid, year, month, limit = 20, expand } = req.query;
    if (!uid) return res.status(400).json({ ok: false, error: 'uid is required' });

    let ref = db.collection('users').doc(uid).collection('transactions');
    let order = 'desc';
    let mode = 'latest';

    if (year && month) {
      // 월 범위 조회: date ∈ [start, end)
      const y = Number(year), m = Number(month);
      if (!Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12) {
        return res.status(400).json({ ok: false, error: 'invalid year/month' });
      }
      const { start, end } = getMonthRange(y, m);

      // ⚠️ 복합 인덱스가 필요할 수 있음 (콘솔 링크로 생성)
      ref = ref
        .where('date', '>=', start)
        .where('date', '<', end)
        .orderBy('date', 'asc');

      order = 'asc';
      mode = 'monthly';
    } else {
      // 최근 N건
      ref = ref.orderBy('date', 'desc').limit(Number(limit));
    }

    const snap = await ref.get();

    const items = await Promise.all(
      snap.docs.map(async (d) => {
        const data = d.data();
        const base = {
          id: d.id,
          ...data,
          date: data.date?.toDate ? iso10(data.date.toDate()) : data.date, // 'YYYY-MM-DD'
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : null,
          updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : null,
        };

        if (String(expand) === 'true') {
          const incomeSnap = await d.ref
            .collection('incomeDetails')
            .orderBy('createdAt', 'desc')
            .limit(1)
            .get();
          const expenseSnap = await d.ref
            .collection('expenseDetails')
            .orderBy('createdAt', 'desc')
            .limit(1)
            .get();

          return {
            ...base,
            incomeDetail: incomeSnap.empty ? null : { id: incomeSnap.docs[0].id, ...incomeSnap.docs[0].data() },
            expenseDetail: expenseSnap.empty ? null : { id: expenseSnap.docs[0].id, ...expenseSnap.docs[0].data() },
          };
        }

        return base;
      })
    );

    res.json({ ok: true, mode, order, count: items.length, items });
  } catch (e) {
    console.error('[Firestore GET Error]', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

module.exports = router;
