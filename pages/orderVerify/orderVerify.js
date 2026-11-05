// pages/storeVerify/storeVerify.js
/**
 * 门店官方授权验证页
 *
 * 该接口不需要 JWT，直接 POST index_id 即可。
 *
 * 入口：
 *   - 扫描普通二维码：微信通过 options.q 传入完整 URL（可能多重编码）
 *   - 分享卡片：微信通过 options.index_id 直传（onShareAppMessage 的 path）
 *
 * 流程：
 *   1. 从 options 提取 index_id
 *   2. 直接请求 order_verify（无认证）
 *   3. 渲染结果
 *
 * 不提供下拉刷新（page.json 未开启 enablePullDownRefresh）
 * 卸载保护：_unloaded 标记，页面卸载后所有 setData 被拦截
 */

/* ==================== 常量 ==================== */
const API = {
  orderVerify: 'https://maneu.online/order_verify/'
};

const REQUEST_TIMEOUT = 10000;

/* ==================== 枚举映射（按后端实际值扩展） ==================== */
const ITEM_TYPE_LABEL = {
  frame: '镜架',
  lens: '镜片',
  accessory: '配件'
};

const SIDE_LABEL = {
  OD: '右眼',
  OS: '左眼',
  OU: '双眼'
};

/* ==================== 工具函数 ==================== */
/**
 * 循环解码：应对 q 被多重 URL 编码
 * 遇到非法序列立即停止，不会抛异常
 */
function safeDecode(raw) {
  let v = String(raw);
  for (let i = 0; i < 4; i++) {
    try {
      const d = decodeURIComponent(v);
      if (d === v) break;
      v = d;
    } catch (e) {
      break;
    }
  }
  return v;
}

/** "2026-10-30T23:41:00" → "2026-10-30 23:41" */
function formatTime(iso) {
  if (!iso) return '';
  const m = String(iso).match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})/);
  return m ? `${m[1]} ${m[2]}` : String(iso);
}

/* ==================== 页面 ==================== */
Page({
  data: {
    indexId: '',
    loading: true,
    isSuccess: false,
    errorMsg: '',
    failMessage: '',
    purchaseTime: '',
    productList: []
  },

  /* 页面卸载标记：true 后所有 setData 被拦截 */
  _unloaded: false,

  /* ==================== 生命周期 ==================== */
  onLoad(options) {
    console.log('[storeVerify] 原始 options：', JSON.stringify(options));

    const indexId = this.extractIndexId(options);
    console.log('[storeVerify] 最终 indexId：', indexId);

    if (!indexId) {
      this.safeSetData({ loading: false });
      return;
    }

    this.safeSetData({ indexId });
    this.runVerify(indexId);
  },

  onUnload() {
    this._unloaded = true;
  },

  /* ==================== 安全 setData ==================== */
  safeSetData(obj, cb) {
    if (this._unloaded) return;
    this.setData(obj, cb);
  },

  /* ==================== 主流程 ==================== */
  runVerify(indexId) {
    this.resetState();

    this.requestVerify(indexId)
      .then((content) => {
        this.renderResult(content);
      })
      .catch((err) => {
        console.error('[storeVerify] 验证流程失败：', err);
        this.handleFlowError(err);
      })
      .then(() => {
        this.safeSetData({ loading: false });
      });
  },

  /* ==================== 请求 order_verify（无需 JWT） ==================== */
  requestVerify(indexId) {
    return new Promise((resolve, reject) => {
      wx.request({
        url: API.orderVerify,
        method: 'POST',
        header: { 'content-type': 'application/json' },
        data: { index_id: indexId },
        timeout: REQUEST_TIMEOUT,

        success: (res) => {
          try {
            resolve(this.parseVerifyResponse(res));
          } catch (err) {
            reject(err);
          }
        },

        fail: () => reject(new Error('NETWORK_ERROR'))
      });
    });
  },

  /* ==================== 解析响应 ==================== */
  /**
   * 兼容：
   *   A) { status, message, content: { time, data } }   ← 当前后端
   *   B) { time, data }                                 ← 旧约定
   * status=false 时抛业务错误，err.code='VERIFY_FAILED'
   */
  parseVerifyResponse(res) {
    if (!(res.statusCode >= 200 && res.statusCode < 300)) {
      throw new Error(`服务器异常（${res.statusCode}）`);
    }

    const body = res.data || {};

    if (Object.prototype.hasOwnProperty.call(body, 'status') || body.content) {
      const ok = body.status === true || body.status === 'true';
      if (!ok) {
        const err = new Error(body.message || '验证未通过');
        err.code = 'VERIFY_FAILED';
        throw err;
      }
      return body.content || {};
    }

    return body;
  },

  /* ==================== 提取 index_id ==================== */
  /**
   * 入口：
   *   1. 分享卡片：options.index_id 直传
   *   2. 扫普通二维码：options.q 传入完整 URL（可能多重编码）
   */
  extractIndexId(options) {
    if (!options) {
      console.warn('[storeVerify] options 为空');
      return '';
    }

    // ---------- 1. 分享卡片直传 ----------
    if (options.index_id && String(options.index_id).trim() !== '') {
      const val = safeDecode(options.index_id).trim();
      console.log('[storeVerify] 命中分享卡片 index_id =', val);
      return val;
    }

    // ---------- 2. 扫普通二维码：q 是完整 URL ----------
    if (options.q) {
      const url = safeDecode(options.q);
      console.log('[storeVerify] q 完全解码后 URL：', url);

      const m = url.match(/[?&]index_id=([^&#]*)/);
      if (m && m[1]) {
        const val = safeDecode(m[1]).trim();
        console.log('[storeVerify] 从 q 提取 index_id：', val);
        return val;
      }

      console.warn('[storeVerify] URL 中未找到 index_id：', url);
      return '';
    }

    console.warn('[storeVerify] 未找到 index_id，options =', JSON.stringify(options));
    return '';
  },

  /* ==================== 渲染结果 ==================== */
  renderResult(content) {
    const body = content || {};
    const timeStr = body.time || '';
    const rawList = Array.isArray(body.data) ? body.data : [];

    if (rawList.length === 0) {
      this.safeSetData({
        isSuccess: false,
        failMessage: body.message || '未查询到授权信息，请核对购买渠道。'
      });
      return;
    }

    const productList = rawList
      .map((item) => {
        if (!item || typeof item !== 'object') return null;

        const pick = (...keys) => {
          for (const k of keys) {
            if (item[k] !== undefined && item[k] !== null) return item[k];
          }
          return '';
        };

        const brand = String(pick('brand') || '').trim();
        const model = String(pick('model') || '').trim();
        const itemType = String(pick('item_type', 'itemType') || '').trim();
        const side = String(pick('side') || '').trim();
        const quantity = pick('quantity');
        const rawPrice = pick('unit_price', 'unitPrice');
        const spec = String(pick('spec') || '').trim();
        const color = String(pick('color') || '').trim();
        const material = String(pick('material') || '').trim();
        const remark = String(pick('remark') || '').trim();

        const hasAny =
          brand || model || itemType || side || spec || color || material || remark ||
          (rawPrice !== '' && rawPrice !== undefined && rawPrice !== null);
        if (!hasAny) return null;

        let unitPrice = '';
        if (rawPrice !== '' && rawPrice !== undefined && rawPrice !== null) {
          const n = Number(rawPrice);
          unitPrice = Number.isFinite(n) ? n : String(rawPrice);
        }

        return {
          brand,
          model,
          quantity: quantity || 1,
          itemTypeLabel: ITEM_TYPE_LABEL[itemType] || itemType,
          sideLabel: SIDE_LABEL[side] || side,
          unitPrice,
          spec,
          color,
          material,
          remark
        };
      })
      .filter(Boolean);

    if (productList.length === 0) {
      this.safeSetData({
        isSuccess: false,
        failMessage: '未查询到有效的授权信息。'
      });
      return;
    }

    this.safeSetData({
      isSuccess: true,
      purchaseTime: formatTime(timeStr),
      productList
    });
  },

  /* ==================== 错误处理 ==================== */
  handleFlowError(err) {
    // 业务失败（status=false）→ “验证失败”
    if (err && err.code === 'VERIFY_FAILED') {
      this.safeSetData({
        errorMsg: '',
        failMessage: err.message || '未查询到授权信息，请核对购买渠道。'
      });
      return;
    }

    const msg = (err && err.message) || '';

    let userMsg = '验证失败，请稍后重试。';
    if (msg === 'NETWORK_ERROR') {
      userMsg = '网络错误或服务器无响应，请稍后重试。';
    } else if (msg.indexOf('服务器异常') === 0) {
      userMsg = msg;
    }

    this.safeSetData({ errorMsg: userMsg });
  },

  /* ==================== 重置状态 ==================== */
  resetState() {
    this.safeSetData({
      loading: true,
      isSuccess: false,
      errorMsg: '',
      failMessage: '',
      purchaseTime: '',
      productList: []
    });
  },

  /* ==================== 图片加载失败日志 ==================== */
  onImageError(e) {
    console.error('[storeVerify] logo 加载失败：', e.detail);
  },

  /* ==================== 分享 ==================== */
  onShareAppMessage() {
    const { indexId } = this.data;
    return {
      title: '徕可官方授权验证',
      path: indexId
        ? `/pages/storeVerify/storeVerify?index_id=${encodeURIComponent(indexId)}`
        : '/pages/storeVerify/storeVerify'
    };
  }
});