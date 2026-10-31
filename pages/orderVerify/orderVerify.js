// pages/storeVerify/storeVerify.js
/**
 * 门店官方授权验证页
 *
 * 核心流程：
 *   1. 从二维码参数提取 index_id
 *   2. 确保拿到 access_token（本地 / 静默登录）
 *   3. 用 token 请求 order_verify
 *   4. 若 401：尝试 refresh_token 换新 access_token 后重试
 *   5. 若刷新失败（refresh_token 也过期）：清 token → 静默登录 → 重试验证
 *   6. 任一步失败，显示对应错误提示，用户可下拉刷新重试
 *
 * 防并发：
 *   - _verifying 锁：下拉刷新 / onRetry 期间不会重复发起完整流程
 *
 * 卸载保护：
 *   - _unloaded 标记：页面卸载后所有 setData 被 safeSetData 拦截，避免警告
 */

/* ==================== 常量 ==================== */
const API = {
  orderVerify: 'https://maneu.online/order_verify/',
  loginByWechat: 'https://maneu.online/apis/login_by_wechat/',
  refresh: 'https://maneu.online/apis/refresh_access_token/'
};

const REQUEST_TIMEOUT = 10000;

/* ==================== 工具函数 ==================== */
function isEmptyValue(val) {
  if (val === null || val === undefined) return true;
  return String(val).trim() === '';
}

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

/**
 * 用 refresh_token 换新 access_token
 * @returns {Promise<string>} 新 access_token
 */
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
    purchaseTime: '',
    productList: []
  },

  /* 静默登录 Promise 复用 */
  _silentLoginPromise: null,

  /* 防并发锁：完整流程进行中时为 true */
  _verifying: false,

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
    this.ensureLoginAndVerify(indexId);
  },

  onUnload() {
    /* 标记卸载，后续所有 setData 被 safeSetData 拦截 */
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
  /**
   * 页面卸载后调用 setData 会被微信拦截并报警告，
   * 所有异步回调统一走这个方法，避免报警。
   */
  safeSetData(obj, cb) {
    if (this._unloaded) return;
    this.setData(obj, cb);
  },

  /* ==================== 主流程：确保登录 + 验证 ==================== */
  /**
   * @param {string} indexId 订单编号
   * @param {Function} [done] 结束回调（用于停止下拉刷新）
   */
  ensureLoginAndVerify(indexId, done) {
    /* 防并发：已有流程在跑，直接返回 */
    if (this._verifying) {
      console.log('[storeVerify] 流程进行中，跳过本次请求');
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
        console.error('[storeVerify] 验证流程失败：', err);
        this.handleFlowError(err);
      })
      .then(() => {
        this._verifying = false;
        this.safeSetData({ loading: false });
        done && done();
      });
  },

  /* ==================== 验证 + 自动修复 ==================== */
  /**
   * 核心自愈链：
   *   确保 token → 请求验证
   *     → 401 → 尝试 refresh → 成功则重试
   *     → refresh 失败 → 清 token → 静默登录 → 重试
   *     → 任一步失败 → 抛错
   * @returns {Promise<Object>} 后端返回的 body（{time, data}）
   */
  verifyWithRetry(indexId) {
    return this.ensureToken()
      .then((token) => this.requestVerify(indexId, token))
      .then((res) => {
        console.log(res);
        if (res.statusCode >= 200 && res.statusCode < 300) {
          return res.data || {};
        }
        if (res.statusCode === 401) {
          return this.retryAfterRefreshOrReLogin(indexId);
        }
        throw new Error(`服务器异常（${res.statusCode}）`);
      });
  },

  /**
   * 401 后的自愈：
   *   1. 尝试 refresh_access_token
   *   2. refresh 成功 → 重试 verify
   *   3. refresh 失败 → 清 token → 静默登录 → 重试 verify
   *   4. 静默登录失败 / 重试仍 401 → 抛错
   */
  retryAfterRefreshOrReLogin(indexId) {
    console.log('[storeVerify] 401，尝试刷新 access_token');

    return refreshAccessToken()
      .then((newToken) => {
        console.log('[storeVerify] refresh 成功，重试验证');
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
          '[storeVerify] refresh 未成功，重新静默登录：',
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
      console.log('[storeVerify] 已登录，使用本地 token');
      return Promise.resolve(getAccessToken());
    }

    console.log('[storeVerify] 未登录，开始静默登录');
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
            console.warn('[storeVerify] wx.login 无 code');
            resolve(false);
            return;
          }

          console.log('[storeVerify] wx.login code：', loginRes.code);

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
                console.log('[storeVerify] 静默登录成功');
                resolve(true);
              } else {
                console.warn('[storeVerify] 静默登录失败：', data.message || '未知');
                resolve(false);
              }
            },

            fail: (err) => {
              console.warn('[storeVerify] 静默登录网络错误：', err);
              resolve(false);
            },

            complete: () => {
              this._silentLoginPromise = null;
            }
          });
        },

        fail: (err) => {
          console.warn('[storeVerify] wx.login 失败：', err);
          this._silentLoginPromise = null;
          resolve(false);
        }
      });
    });

    return this._silentLoginPromise;
  },

  /* ==================== 请求 order_verify ==================== */
  requestVerify(indexId, token) {
    return new Promise((resolve, reject) => {
      wx.request({
        url: API.orderVerify,
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
        console.log('[storeVerify] 解码后 URL：', url);
        const match = url.match(/[?&]index_id=([^&#]+)/);
        if (match && match[1]) {
          console.log('[storeVerify] 从 q 提取：', match[1]);
          return match[1];
        }
      } catch (e) {
        console.error('[storeVerify] 解析 q 失败：', e);
      }
    }

    if (options.index_id) {
      console.log('[storeVerify] 从 index_id 提取：', options.index_id);
      return options.index_id;
    }

    if (options.scene) {
      try {
        const scene = decodeURIComponent(options.scene);
        console.log('[storeVerify] 解码后 scene：', scene);
        const match = scene.match(/[?&]?index_id=([^&#]+)/);
        if (match && match[1]) {
          console.log('[storeVerify] 从 scene 提取：', match[1]);
          return match[1];
        }
      } catch (e) {
        console.error('[storeVerify] 解析 scene 失败：', e);
      }
    }

    console.warn('[storeVerify] 未找到 index_id');
    return '';
  },

  /* ==================== 渲染结果 ==================== */
  /**
   * 新响应格式：{ time: string, data: [ { item_type, side, brand, ... } ] }
   *   - data 为数组且非空 → 验证通过
   *   - data 为空数组 / 缺失 → 验证失败
   */
  renderResult(data) {
    const content = data || {};
    const timeStr = content.time || '';
    const rawList = Array.isArray(content.data) ? content.data : [];

    if (rawList.length === 0) {
      this.safeSetData({
        isSuccess: false,
        failMessage:
          (content && content.message) || '未查询到授权信息，请核对购买渠道。'
      });
      return;
    }

    const productList = rawList
      .map((item) => {
        if (!item || typeof item !== 'object') return null;

        const entries = Object.keys(item)
          .filter((k) => k && k.trim() !== '' && !isEmptyValue(item[k]))
          .map((k) => ({
            key: String(k).trim(),
            val: String(item[k]).trim()
          }));

        if (entries.length === 0) return null;

        return {
          titleKey: entries[0].key,
          titleVal: entries[0].val,
          props: entries.slice(1)
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
      purchaseTime: timeStr,
      productList
    });
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