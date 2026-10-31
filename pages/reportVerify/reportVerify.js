// pages/reportVerify/reportVerify.js
/**
 * 验光报告官方验证页
 *
 * 核心流程（与 storeVerify 一致）：
 *   1. 从二维码参数提取 index_id
 *   2. 确保拿到 access_token（本地 / 静默登录）
 *   3. 用 token 请求 report_verify
 *   4. 若 401：尝试 refresh_token 换新 access_token 后重试
 *   5. 若刷新失败（refresh_token 也过期）：清 token → 静默登录 → 重试验证
 *   6. 任一步失败，显示对应错误提示，用户可下拉刷新重试
 *
 * 数据结构（固定字段）：
 *   content = {
 *     time, plan,
 *     od_sph, od_cyl, od_ax, od_va,   // 右眼
 *     os_sph, os_cyl, os_ax, os_va    // 左眼
 *   }
 */

/* ==================== 常量 ==================== */
const API = {
  verifyReport: 'https://maneu.online/report_verify/',
  loginByWechat: 'https://maneu.online/apis/login_by_wechat/',
  refresh: 'https://maneu.online/apis/refresh_access_token/'
};

const REQUEST_TIMEOUT = 10000;

/* 眼睛字段配置：null 值自动跳过，按顺序渲染 */
const EYE_FIELDS = [
  { key: '球镜 (SPH)', field: 'sph' },
  { key: '柱镜 (CYL)', field: 'cyl' },
  { key: '轴位 (AX)', field: 'ax' },
  { key: '视力 (VA)', field: 'va' }
];

/* ==================== 工具函数 ==================== */
function getAccessToken() {
  return wx.getStorageSync('access_token') || '';
}

function getRefreshToken() {
  return wx.getStorageSync('refresh_token') || '';
}

function hasLogin() {
  return !!(getAccessToken() && getRefreshToken());
}

function clearAuth() {
  wx.removeStorageSync('access_token');
  wx.removeStorageSync('refresh_token');
  wx.removeStorageSync('token');
}

/** 判断字段值是否有效（非空、非"无"） */
function hasValue(v) {
  if (v === null || v === undefined) return false;
  const s = String(v).trim();
  return s !== '' && s !== '无';
}

/** 用 refresh_token 换新 access_token */
function refreshAccessToken() {
  return new Promise((resolve, reject) => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      reject(new Error('NO_REFRESH_TOKEN'));
      return;
    }

    wx.request({
      url: API.refresh,
      method: 'POST',
      header: { 'content-type': 'application/json' },
      data: { refresh_token: refreshToken },
      timeout: REQUEST_TIMEOUT,

      success: (res) => {
        const d = res.data || {};
        if (
          res.statusCode >= 200 &&
          res.statusCode < 300 &&
          d.status &&
          d.content &&
          d.content.access_token
        ) {
          wx.setStorageSync('access_token', d.content.access_token);
          wx.setStorageSync('token', d.content.access_token);
          if (d.content.refresh_token) {
            wx.setStorageSync('refresh_token', d.content.refresh_token);
          }
          resolve(d.content.access_token);
        } else {
          reject(new Error('REFRESH_FAILED'));
        }
      },

      fail: () => reject(new Error('REFRESH_NETWORK_ERROR'))
    });
  });
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
    /* 右眼 / 左眼 数组结构 */
    eyeList: []
  },

  _silentLoginPromise: null,
  _verifying: false,
  _unloaded: false,

  /* ==================== 生命周期 ==================== */
  onLoad(options) {
    console.log('[reportVerify] 原始 options：', JSON.stringify(options));

    const indexId = this.extractIndexId(options);
    console.log('[reportVerify] 最终 indexId：', indexId);

    if (!indexId) {
      this.safeSetData({ loading: false });
      return;
    }

    this.safeSetData({ indexId });
    this.ensureLoginAndVerify(indexId);
  },

  onUnload() {
    this._unloaded = true;
  },

  onPullDownRefresh() {
    if (!this.data.indexId) {
      wx.stopPullDownRefresh();
      return;
    }
    this.ensureLoginAndVerify(this.data.indexId, () => wx.stopPullDownRefresh());
  },

  /* ==================== 安全 setData ==================== */
  safeSetData(obj, cb) {
    if (this._unloaded) return;
    this.setData(obj, cb);
  },

  /* ==================== 主流程 ==================== */
  ensureLoginAndVerify(indexId, done) {
    if (this._verifying) {
      console.log('[reportVerify] 流程进行中，跳过本次请求');
      done && done();
      return;
    }

    this._verifying = true;
    this.resetState();

    this.verifyWithRetry(indexId)
      .then((data) => {
        this.renderResult(data);
      })
      .catch((err) => {
        console.error('[reportVerify] 验证流程失败：', err);
        this.handleFlowError(err);
      })
      .then(() => {
        this._verifying = false;
        this.safeSetData({ loading: false });
        done && done();
      });
  },

  /* ==================== 验证 + 自愈 ==================== */
  verifyWithRetry(indexId) {
    return this.ensureToken()
      .then((token) => this.requestVerify(indexId, token))
      .then((res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          return res.data || {};
        }
        if (res.statusCode === 401) {
          return this.retryAfterRefreshOrReLogin(indexId);
        }
        throw new Error(`服务器异常（${res.statusCode}）`);
      });
  },

  retryAfterRefreshOrReLogin(indexId) {
    console.log('[reportVerify] 401，尝试刷新 access_token');

    return refreshAccessToken()
      .then((newToken) => {
        console.log('[reportVerify] refresh 成功，重试验证');
        return this.requestVerify(indexId, newToken);
      })
      .then((res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          return res.data || {};
        }
        if (res.statusCode === 401) {
          throw new Error('401_AFTER_REFRESH');
        }
        throw new Error(`服务器异常（${res.statusCode}）`);
      })
      .catch((refreshErr) => {
        console.warn(
          '[reportVerify] refresh 未成功，重新静默登录：',
          refreshErr.message
        );

        clearAuth();

        return this.silentLogin()
          .then((ok) => {
            if (!ok) throw new Error('LOGIN_FAILED');
            return this.requestVerify(indexId, getAccessToken());
          })
          .then((res) => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
              return res.data || {};
            }
            if (res.statusCode === 401) {
              throw new Error('LOGIN_EXPIRED');
            }
            throw new Error(`服务器异常（${res.statusCode}）`);
          });
      });
  },

  /* ==================== 确保有 token ==================== */
  ensureToken() {
    if (hasLogin()) {
      console.log('[reportVerify] 已登录，使用本地 token');
      return Promise.resolve(getAccessToken());
    }

    console.log('[reportVerify] 未登录，开始静默登录');
    return this.silentLogin().then((ok) => {
      if (!ok) throw new Error('LOGIN_FAILED');
      return getAccessToken();
    });
  },

  /* ==================== 静默登录 ==================== */
  silentLogin() {
    if (this._silentLoginPromise) {
      return this._silentLoginPromise;
    }

    this._silentLoginPromise = new Promise((resolve) => {
      wx.login({
        success: (loginRes) => {
          if (!loginRes.code) {
            console.warn('[reportVerify] wx.login 无 code');
            resolve(false);
            return;
          }

          console.log('[reportVerify] wx.login code：', loginRes.code);

          wx.request({
            url: API.loginByWechat,
            method: 'POST',
            header: { 'content-type': 'application/json' },
            data: { code: loginRes.code },
            timeout: REQUEST_TIMEOUT,

            success: (res) => {
              const data = res.data || {};
              if (
                res.statusCode >= 200 &&
                res.statusCode < 300 &&
                data.status &&
                data.content &&
                data.content.access_token
              ) {
                wx.setStorageSync('access_token', data.content.access_token);
                wx.setStorageSync('refresh_token', data.content.refresh_token || '');
                wx.setStorageSync('token', data.content.access_token);
                if (data.content.call) {
                  wx.setStorageSync('call', data.content.call);
                }
                console.log('[reportVerify] 静默登录成功');
                resolve(true);
              } else {
                console.warn('[reportVerify] 静默登录失败：', data.message || '未知');
                resolve(false);
              }
            },

            fail: (err) => {
              console.warn('[reportVerify] 静默登录网络错误：', err);
              resolve(false);
            },

            complete: () => {
              this._silentLoginPromise = null;
            }
          });
        },

        fail: (err) => {
          console.warn('[reportVerify] wx.login 失败：', err);
          this._silentLoginPromise = null;
          resolve(false);
        }
      });
    });

    return this._silentLoginPromise;
  },

  /* ==================== 请求 report_verify ==================== */
  requestVerify(indexId, token) {
    return new Promise((resolve, reject) => {
      wx.request({
        url: API.verifyReport,
        method: 'POST',
        header: {
          'content-type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        data: { index_id: indexId },
        timeout: REQUEST_TIMEOUT,
        success: (res) => resolve(res),
        fail: () => reject(new Error('NETWORK_ERROR'))
      });
    });
  },

  /* ==================== 提取 index_id ==================== */
  extractIndexId(options) {
    if (!options) return '';

    if (options.q) {
      try {
        const url = decodeURIComponent(options.q);
        console.log('[reportVerify] 解码后 URL：', url);
        const match = url.match(/[?&]index_id=([^&#]+)/);
        if (match && match[1]) {
          console.log('[reportVerify] 从 q 提取：', match[1]);
          return match[1];
        }
      } catch (e) {
        console.error('[reportVerify] 解析 q 失败：', e);
      }
    }

    if (options.index_id) {
      console.log('[reportVerify] 从 index_id 提取：', options.index_id);
      return options.index_id;
    }

    if (options.scene) {
      try {
        const scene = decodeURIComponent(options.scene);
        console.log('[reportVerify] 解码后 scene：', scene);
        const match = scene.match(/[?&]?index_id=([^&#]+)/);
        if (match && match[1]) {
          console.log('[reportVerify] 从 scene 提取：', match[1]);
          return match[1];
        }
      } catch (e) {
        console.error('[reportVerify] 解析 scene 失败：', e);
      }
    }

    console.warn('[reportVerify] 未找到 index_id');
    return '';
  },

  /* ==================== 渲染结果 ==================== */
  renderResult(data) {
    const isSuccess = data.status === true || data.status === 'true';
    const content = data.content || {};

    if (!isSuccess || !content) {
      this.safeSetData({
        isSuccess: false,
        failMessage:
          (data && data.message) || '未查询到验光报告信息。'
      });
      return;
    }

    /* 构建右眼 / 左眼数组 */
    const eyeList = this.buildEyeList(content);

    if (eyeList.length === 0) {
      this.safeSetData({
        isSuccess: false,
        failMessage: '未查询到有效的验光数据。'
      });
      return;
    }

    this.safeSetData({
      isSuccess: true,
      reportTime: content.time || '',
      plan: content.plan || '',
      eyeList
    });
  },

  /**
   * 构建右眼 / 左眼数据
   * 只保留有值的字段，整块都没值时跳过该眼睛
   */
  buildEyeList(content) {
    const result = [];

    /* 右眼 OD */
    const odProps = EYE_FIELDS.map((f) => {
      const val = content['od_' + f.field];
      return hasValue(val) ? { key: f.key, val: String(val).trim() } : null;
    }).filter(Boolean);

    if (odProps.length > 0) {
      result.push({ eye: '右眼 (OD)', props: odProps });
    }

    /* 左眼 OS */
    const osProps = EYE_FIELDS.map((f) => {
      const val = content['os_' + f.field];
      return hasValue(val) ? { key: f.key, val: String(val).trim() } : null;
    }).filter(Boolean);

    if (osProps.length > 0) {
      result.push({ eye: '左眼 (OS)', props: osProps });
    }

    return result;
  },

  /* ==================== 错误处理 ==================== */
  handleFlowError(err) {
    const msg = (err && err.message) || '';

    let userMsg = '验证失败，请稍后重试。';
    if (msg === 'LOGIN_FAILED') {
      userMsg = '登录失败，请检查网络后下拉刷新重试。';
    } else if (msg === 'LOGIN_EXPIRED') {
      userMsg = '登录已失效，请下拉刷新重试。';
    } else if (msg === 'NETWORK_ERROR') {
      userMsg = '网络错误或服务器无响应，请刷新页面后重试。';
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
    const { indexId } = this.data;
    return {
      title: '徕可验光报告验证',
      path: indexId
        ? `/pages/reportVerify/reportVerify?index_id=${encodeURIComponent(indexId)}`
        : '/pages/reportVerify/reportVerify'
    };
  }
});