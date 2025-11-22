// server/routes/transactions.js
const express = require('express');
const router = express.Router();
const { db, admin } = require('../firebaseAdmin');

const now = admin.firestore.FieldValue.serverTimestamp();

// year, month에서 N개월 전/후 계산용
function shiftYearMonth(year, month, delta) {
  // month: 1~12, delta: +/- n개월
  const base = (month - 1) + delta;
  const y = year + Math.floor(base / 12);
  const m = ((base % 12) + 12) % 12; // 0~11
  return { year: y, month: m + 1 };
}

// YYYY-MM 포맷
function monthKey(y, m) {
  return `${y}-${String(m).padStart(2, '0')}`;
}

/**
 * 🔁 월별 LLM 소비 리포트 캐시 무효화
 *
 * 현재 reports.js는 다음 경로에 캐시를 저장하고 있습니다.
 *   users/{uid}/cachedReports/{YYYY-MM}
 */
async function invalidateConsumptionReportCache(uid, baseDate) {
  try {
    if (!uid || !baseDate) return;

    const y = baseDate.getFullYear();
    const m = baseDate.getMonth() + 1;
    const ym = monthKey(y, m);

    await db
      .collection('users')
      .doc(uid)
      .collection('cachedReports')
      .doc(ym)
      .delete();

    console.log(`[REPORT CACHE] invalidated users/${uid}/cachedReports/${ym}`);
  } catch (e) {
    // 캐시 삭제 실패 때문에 저장/삭제 자체가 실패하면 안 되므로 경고만
    console.warn('[REPORT CACHE] invalidate failed:', e.message || e);
  }
}

// 공통: 날짜 범위 계산 (UTC 기준)
function getMonthRange(y, m) {
  const start = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0, 0));
  const end   = new Date(Date.UTC(y, m,     1, 0, 0, 0, 0));
  return {
    start,
    end,
    startTs: admin.firestore.Timestamp.fromDate(start),
    endTs:   admin.firestore.Timestamp.fromDate(end),
  };
}

/**
 * POST /api/transactions
 * Body (앱에서 보내는 값 기준):
 *  - uid          (필수)
 *  - type         'income' | 'expense' (필수)
 *  - amount       숫자 (필수)
 *  - category     (선택)
 *  - memo         (선택)
 *  - date         'YYYY-MM-DD' 또는 ISO 문자열 (선택, 없으면 서버 현재 시간)
 *  - method       (지출 수단: 현금/신용카드/체크카드) or paymentMethod
 *  - background   (소비 배경) or spendingBackground
 *  - incomeDetail: { incomeSource, memo } (선택)
 *  - incomeSource (선택, 상위 필드로 직접 보낼 수도 있음)
 */
router.post('/', async (req, res) => {
  try {
    const {
      uid,
      amount,
      type,
      category,
      memo,
      date,
      occurredAt,
      method,
      paymentMethod,
      background,
      spendingBackground,
      incomeDetail,
      incomeSource,
    } = req.body;

    if (!uid || !amount || !type) {
      return res.status(400).json({ ok: false, error: 'missing fields (uid, amount, type)' });
    }

    // 날짜 파싱: occurredAt > date > now 순으로 사용
    let baseDate =
      occurredAt ? new Date(occurredAt)
      : date      ? new Date(date)
                  : new Date();

    if (!baseDate || !Number.isFinite(baseDate.getTime())) {
      return res.status(400).json({ ok: false, error: 'invalid date/occurredAt' });
    }

    const dateTs = admin.firestore.Timestamp.fromDate(baseDate);

    const doc = {
      amount: Number(amount),
      type,                                    // 'income' | 'expense'
      category: category ?? null,
      memo: memo ?? '',
      date: dateTs,                            // 리포트/훅에서 사용하는 필드
      occurredAt: dateTs,                      // 호환용 (원래 필드명)
      createdAt: now,
      updatedAt: now,
      isRated: false,

      // 수입/지출 상세 정보 매핑
      incomeSource: incomeSource ?? incomeDetail?.incomeSource ?? null,
      paymentMethod: paymentMethod ?? method ?? null,
      spendingBackground: spendingBackground ?? background ?? null,
    };

    // 최종 경로: users/{uid}/transactions/{tid}
    const trxRef = await db
      .collection('users')
      .doc(uid)
      .collection('transactions')
      .add(doc);

    // 🔁 이 거래가 속한 월의 LLM 소비 리포트 캐시 무효화
    invalidateConsumptionReportCache(uid, baseDate).catch(() => {});

    res.status(201).json({ ok: true, id: trxRef.id });
  } catch (e) {
    console.error('[POST /api/transactions Error]', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// 만족도평가를 위해 미평가 지출을 불러오기
router.get('/unrated', async (req, res) => {
  // 만족도 박스 안 보이는 문제 해결하려고 넣은 콘솔 코드 -> 문제 해결하면 지울거임
  console.log("🐰 [SERVER] unrated 호출됨:", req.query);
  try {
    const { uid, limit = 50 } = req.query;
    if (!uid) return res.status(400).json({ ok: false, error: 'uid required' });

    const snap = await db
      .collection('users')
      .doc(uid)
      .collection('transactions')
      .where('type', '==', 'expense')
      .where('isRated', '==', false)
      .orderBy('date', 'desc')
      .limit(Number(limit))
      .get();

    const items = snap.docs.map(d => {
      const data = d.data() || {};
      return {
        id: d.id,
        ...data,
        date: data.date?.toDate ? data.date.toDate().toISOString() : data.date
      };
    });

    res.json({ ok: true, items });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

/**
 * GET /api/transactions
 * 쿼리스트링:
 *  - uid   (필수)
 *  - year  (필수, 숫자)
 *  - month (필수, 1~12)
 *  - expand (선택, 현재는 의미 없이 무시)
 *
 * useMonthlyTransactionsFromApi, ReportHome 에서 사용
 */


router.get('/', async (req, res) => {
  try {
    const { uid, year, month } = req.query;

    const y = Number(year);
    const m = Number(month);

    if (!uid || !y || !m) {
      return res.status(400).json({
        ok: false,
        error: 'uid, year, month are required',
      });
    }

    const { startTs, endTs } = getMonthRange(y, m);

    const snap = await db
      .collection('users')
      .doc(uid)
      .collection('transactions')
      .where('date', '>=', startTs)
      .where('date', '<', endTs)
      .orderBy('date', 'desc')
      .get();

    const items = snap.docs.map((doc) => {
      const data = doc.data() || {};

      let dateVal = null;
      if (data.date?.toDate) {
        dateVal = data.date.toDate().toISOString();
      } else if (data.occurredAt?.toDate) {
        dateVal = data.occurredAt.toDate().toISOString();
      } else if (data.date) {
        dateVal = data.date;
      }

      return {
        id: doc.id,
        ...data,
        date: dateVal,
      };
    });

    res.json({ ok: true, items });
  } catch (e) {
    console.error('[GET /api/transactions Error]', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

/**
 * GET /api/transactions/monthly-sum
 * 쿼리스트링:
 *  - uid      (필수)
 *  - months   (선택, 기본 4) : 최근 N개월
 *  - endYear  (필수)
 *  - endMonth (필수)
 *
 * ReportHome 의 "월별 지출 추이" 꺾은선 그래프에서 사용
 */
router.get('/monthly-sum', async (req, res) => {
  try {
    const { uid, months = '4', endYear, endMonth } = req.query;
    const mCount = Number(months) || 4;
    const y0 = Number(endYear);
    const m0 = Number(endMonth);

    if (!uid || !y0 || !m0) {
      return res.status(400).json({ ok: false, error: 'uid, endYear, endMonth are required' });
    }

    const tasks = [];
    for (let i = mCount - 1; i >= 0; i--) {
      const { year, month } = shiftYearMonth(y0, m0, -i);
      const { startTs, endTs } = getMonthRange(year, month);

      tasks.push(
        (async () => {
          const snap = await db
            .collection('users')
            .doc(uid)
            .collection('transactions')
            .where('date', '>=', startTs)
            .where('date', '<', endTs)
            .get();

          let totalExpense = 0;
          snap.forEach((d) => {
            const data = d.data() || {};
            if (String(data.type || '').toLowerCase() === 'expense') {
              totalExpense += Number(data.amount || 0);
            }
          });

          return { year, month, totalExpense };
        })()
      );
    }

    const results = await Promise.all(tasks);
    res.json({ ok: true, items: results });
  } catch (e) {
    console.error('[GET /api/transactions/monthly-sum Error]', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

/**
 * (기존) 특정 사용자 거래 전체 조회
 * GET /api/transactions/:uid
 */
router.get('/:uid', async (req, res) => {
  try {
    const { uid } = req.params;

    const snapshot = await db
      .collection('users')
      .doc(uid)
      .collection('transactions')
      .orderBy('date', 'desc')
      .get();

    const items = snapshot.docs.map((doc) => {
      const data = doc.data() || {};
      let dateVal = null;
      if (data.date?.toDate) dateVal = data.date.toDate().toISOString();
      else if (data.occurredAt?.toDate) dateVal = data.occurredAt.toDate().toISOString();
      else if (data.date) dateVal = data.date;

      return { id: doc.id, ...data, date: dateVal };
    });

    res.json({ ok: true, items });
  } catch (e) {
    console.error('[GET /api/transactions/:uid Error]', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

/**
 * DELETE /api/transactions/:uid/:tid
 * 단일 거래 삭제 + 해당 월 LLM 리포트 캐시 무효화
 */
router.delete('/:uid/:tid', async (req, res) => {
  try {
    const { uid, tid } = req.params;

    const trxRef = db
      .collection('users')
      .doc(uid)
      .collection('transactions')
      .doc(tid);

    // 삭제 전 거래 날짜 읽기 → 어느 달인지 계산
    const snap = await trxRef.get();

    let baseDate = null;
    if (snap.exists) {
      const data = snap.data() || {};
      if (data.date?.toDate) {
        baseDate = data.date.toDate();
      } else if (data.occurredAt?.toDate) {
        baseDate = data.occurredAt.toDate();
      } else if (data.date) {
        const tmp = new Date(data.date);
        if (Number.isFinite(tmp.getTime())) baseDate = tmp;
      }
    }

    await trxRef.delete();

    // 🔁 해당 달 리포트 캐시 삭제
    if (baseDate) {
      invalidateConsumptionReportCache(uid, baseDate).catch(() => {});
    }

    res.json({ ok: true });
  } catch (e) {
    console.error('[DELETE /api/transactions Error]', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

module.exports = router;
