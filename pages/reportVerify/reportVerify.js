// pages/reportVerify/reportVerify.js
/**
 * 验光报告官方验证页
 *
 * 该接口不需要 JWT，直接 POST index_id 即可。
 *
 * 入口：
 *   - 扫描普通二维码：微信通过 options.q 传入完整 URL（可能多重编码）
 *   - 分享卡片：微信通过 options.index_id 直传
 *
 * 禁止下拉刷新（page.json 未开启 enablePullDownRefresh）
 * 卸载保护：_unloaded 标记，页面卸载后所有 setData 被拦截
 */

/* ==================== 常量 ==================== */
const API = {
  verifyReport: 'https://maneu.online/report_verify/'
};

const REQUEST_TIMEOUT = 10000;

/* ==================== 工具函数 ==================== */
/** 循环解码：应对 q 被多重 URL 编码 */
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

/** 格式化 ISO 时间为 "YYYY-MM-DD HH:mm" */
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
    reportTime: '',
    plan: '',
    baseInfo: [], // 基础信息（性别、年龄等）
    compareList: [] // 左右眼对比列表
  },

  _unloaded: false,

  /* ==================== 生命周期 ==================== */
  onLoad(options) {
    console.log('[reportVerify] 原始 options：', JSON.stringify(options));

    const indexId = this.extractIndexId(options);
    console.log('[reportVerify] 最终 indexId：', indexId);

    if (!indexId) {
      this.safeSetData({
        loading: false
      });
      return;
    }

    this.safeSetData({
      indexId
    });
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
        console.error('[reportVerify] 验证流程失败：', err);
        this.handleFlowError(err);
      })
      .then(() => {
        this.safeSetData({
          loading: false
        });
      });
  },

  /* ==================== 请求 report_verify（无需 JWT） ==================== */
  requestVerify(indexId) {
    return new Promise((resolve, reject) => {
      wx.request({
        url: API.verifyReport,
        method: 'POST',
        header: {
          'content-type': 'application/json'
        },
        data: {
          index_id: indexId
        },
        timeout: REQUEST_TIMEOUT,

        success: (res) => {
          console.log(res.data)
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
  extractIndexId(options) {
    if (!options) return '';

    // 1. 分享卡片直传
    if (options.index_id && String(options.index_id).trim() !== '') {
      const val = safeDecode(options.index_id).trim();
      console.log('[reportVerify] 命中分享卡片 index_id =', val);
      return val;
    }

    // 2. 扫普通二维码：q 是完整 URL
    if (options.q) {
      const url = safeDecode(options.q);
      console.log('[reportVerify] q 完全解码后 URL：', url);

      const m = url.match(/[?&]index_id=([^&#]*)/);
      if (m && m[1]) {
        const val = safeDecode(m[1]).trim();
        console.log('[reportVerify] 从 q 提取 index_id：', val);
        return val;
      }
      console.warn('[reportVerify] URL 中未找到 index_id：', url);
      return '';
    }

    console.warn('[reportVerify] 未找到 index_id，options =', JSON.stringify(options));
    return '';
  },

  /* ==================== 渲染结果 ==================== */
  renderResult(content) {
    const body = content || {};
    const timeStr = body.time || '';
    const rawData = body.data;

    if (!rawData || typeof rawData !== 'object' || Array.isArray(rawData)) {
      this.safeSetData({
        isSuccess: false,
        failMessage: body.message || '未查询到验光报告信息。'
      });
      return;
    }

    /* ---------- 字段中英文映射字典 ---------- */
    const GLOBAL_MAP = {
      sex: '性别',
      age: '年龄',
      pd: '瞳距',
      ot: '其他',
      em: '主觉验光',
      dfh: '瞳高'
    };
    const EYE_FIELD_MAP = {
      sph: '球镜 (SPH)',
      cyl: '柱镜 (CYL)',
      ax: '轴位 (AX)',
      pr: '棱镜 (PR)',
      fr: '基底 (FR)',
      add: '下加光 (ADD)',
      va: '视力 (VA)',
      bc: '基弧 (BC)',
      al: '眼轴 (AL)',
      ak: '角膜曲率 (AK)',
      ad: '前房深度 (AD)',
      cct: '角膜厚度 (CCT)',
      lt: '晶状体厚度 (LT)',
      vt: '玻璃体腔长度 (VT)'
    };

    /* 1. 提取基础信息 */
    const baseInfo = [];
    Object.keys(rawData).forEach((k) => {
      if (k === 'od' || k === 'os') return;
      const val = rawData[k];
      if (val === null || val === undefined) return;

      let displayVal = String(val).trim();
      if (displayVal === '' || displayVal === '无') return;

      // 性别特殊处理 (1男 2女)
      if (k === 'sex') {
        if (displayVal === '1') displayVal = '男';
        else if (displayVal === '2') displayVal = '女';
      }

      baseInfo.push({
        key: GLOBAL_MAP[k] || k,
        val: displayVal
      });
    });

    /* 2. 收集左右眼所有字段，按顺序合并成对比列表 */
    const odObj = rawData.od || {};
    const osObj = rawData.os || {};
    const allKeys = new Set(); // 使用 Set 去重并保持顺序

    Object.keys(odObj).forEach((k) => allKeys.add(k));
    Object.keys(osObj).forEach((k) => allKeys.add(k));

    const compareList = [];
    allKeys.forEach((k) => {
      const odVal = String(odObj[k] || '').trim();
      const osVal = String(osObj[k] || '').trim();

      // 如果左右眼都是空或"无"，则该行跳过不展示
      if ((!odVal || odVal === '无') && (!osVal || osVal === '无')) return;

      compareList.push({
        key: EYE_FIELD_MAP[k] || k,
        od: (odVal && odVal !== '无') ? odVal : '',
        os: (osVal && osVal !== '无') ? osVal : ''
      });
    });

    if (baseInfo.length === 0 && compareList.length === 0) {
      this.safeSetData({
        isSuccess: false,
        failMessage: '未查询到有效的验光数据。'
      });
      return;
    }

    this.safeSetData({
      isSuccess: true,
      reportTime: formatTime(timeStr),
      plan: body.plan || '',
      baseInfo,
      compareList
    });
  },

  /* ==================== 错误处理 ==================== */
  handleFlowError(err) {
    // 业务失败（status=false）→ 走「验证失败」
    if (err && err.code === 'VERIFY_FAILED') {
      this.safeSetData({
        errorMsg: '',
        failMessage: err.message || '未查询到验光报告信息。'
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

    this.safeSetData({
      errorMsg: userMsg
    });
  },

  /* ==================== 重置状态 ==================== */
  resetState() {
    this.safeSetData({
      loading: true,
      isSuccess: false,
      errorMsg: '',
      failMessage: '',
      reportTime: '',
      plan: '',
      eyeList: []
    });
  },

  onImageError(e) {
    console.error('[reportVerify] logo 加载失败：', e.detail);
  },

  /* ==================== 分享 ==================== */
  onShareAppMessage() {
    const {
      indexId
    } = this.data;
    return {
      title: '徕可验光报告验证',
      path: indexId ?
        `/pages/reportVerify/reportVerify?index_id=${encodeURIComponent(indexId)}` :
        '/pages/reportVerify/reportVerify'
    };
  }
});