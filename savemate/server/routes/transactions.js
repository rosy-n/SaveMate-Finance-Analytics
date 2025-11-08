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
    const { uid, year, month, expand } = req.query;
    if (!uid) {
      return res.status(400).json({ ok: false, error: 'uid is required' });
    }

    const wantExpand = String(expand).toLowerCase() === 'true';
    const txColRef = db.collection('users').doc(uid).collection('transactions');

    // 1) 쿼리 구성: 월 범위가 있으면 범위쿼리, 없으면 최신순 + limit
    let q = txColRef.orderBy('date', 'desc');
    if (year && month) {
      const { start, end } = getMonthRange(year, month); // UTC Timestamp
      // 범위 쿼리에서는 orderBy('date')가 이미 있으므로 그대로 사용
      q = txColRef
        .where('date', '>=', start)
        .where('date', '<', end)
        .orderBy('date', 'desc');
    } else {
      // 월 범위가 없을 때는 과다 조회 방지를 위해 안전한 기본 상한
      const limitN = Math.max(1, Math.min(Number(req.query.limit) || 20, 200));
      q = q.limit(limitN);
    }

    // 2) 쿼리 실행: ❗️여기서 읽힌 문서만이 read에 카운트됩니다
    const snap = await q.get();

    // 결과 골격
    const result = {
      summary: { income: 0, expense: 0, count: 0 },
      items: [],
    };

    if (snap.empty) {
      return res.json(result);
    }

    // 3) 쿼리로 이미 'date' 범위가 잘려 있으므로 추가 필터 불필요
    let incomeSum = 0;
    let expenseSum = 0;
    const items = [];

    // 필요 시에만 상세를 읽도록 옵션 처리 (하위 컬렉션은 기본 미조회)
    // ⚠️ 하위 컬렉션까지 매 항목마다 읽으면 read 폭증 → 정말 필요할 때만 on-demand 권장
    for (const doc of snap.docs) {
      const base = doc.data() || {};
      const type = String(base.type || '').toLowerCase();
      const amount = Number(base.amount ?? 0);
      if (type === 'income') incomeSum += amount;
      else if (type === 'expense') expenseSum += amount;

      result.summary.count += 1;

      if (wantExpand) {
        const d = base.date?.toDate ? base.date.toDate() : new Date(base.date);
        items.push({
          id: doc.id,
          type,
          amount,
          category: base.category ?? (type === 'income' ? '수입' : '지출'),
          memo: base.memo ?? '',
          date: d,
          day: d.getDate?.() ?? null,
          createdAt: base.createdAt ?? null,
          // ❗️하위 컬렉션은 여기서 즉시 읽지 않습니다 (read 비용 급증)
          //   필요하면 /api/transactions/:id/details 같은 별도 엔드포인트로 분리 추천
        });
      }
    }

    result.summary.income = incomeSum;
    result.summary.expense = expenseSum;
    result.items = items;

    return res.json(result);
  } catch (e) {
    console.error('[Firestore GET Error]', e);
    return res.status(500).json({ ok: false, error: e.message });
  }
});


module.exports = router;
