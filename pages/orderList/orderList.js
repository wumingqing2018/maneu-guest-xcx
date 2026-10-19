// pages/reportList/reportList.js
const app = getApp();

/* ==================== 常量 ==================== */
const API = {
  getList:  'https://maneu.online/apis/auth/order_list/',
  refresh:  'https://maneu.online/apis/refresh_access_token/'
};

const ROUTES = {
  order:      '/pages/order/order',
  adminLogin: '/pages/adminLogin/adminLogin'
};

const ORDER_TYPE = '100001';

/* ==================== Token 工具 ==================== */

function getAccessToken() {
  return wx.getStorageSync('access_token') || '';
}

function getRefreshToken() {
  return wx.getStorageSync('refresh_token') || '';
}

function saveTokens(accessToken, refreshToken) {
  if (accessToken)  wx.setStorageSync('access_token',  accessToken);
  if (refreshToken) wx.setStorageSync('refresh_token', refreshToken);
}

/* 只清 access_token，保留 refresh_token（用于刷新） */
function clearAccessToken() {
  wx.removeStorageSync('access_token');
}

/* 完全登出时清空全部 */
function clearAllAuth() {
  wx.removeStorageSync('access_token');
  wx.removeStorageSync('refresh_token');
}

/* 用 refresh_token 换新 access_token */
function refreshAccessToken() {
  return new Promise((resolve, reject) => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) return reject(new Error('NO_REFRESH_TOKEN'));

    wx.request({
      url: API.refresh,
      method: 'POST',
      header: { 'content-type': 'application/json' },
      data: { refresh_token: refreshToken },
      success: (res) => {
        const d = res.data || {};
        if (d.status && d.content && d.content.access_token) {
          saveTokens(d.content.access_token);
          resolve(d.content.access_token);
        } else {
          reject(new Error('REFRESH_FAILED'));
        }
      },
      fail: () => reject(new Error('REFRESH_NETWORK_ERROR'))
    });
  });
}

/* 统一请求：401 自动刷新 + 重试一次 */
function requestWithAuth(options, _retried) {
  const token = getAccessToken();

  return new Promise((resolve, reject) => {
    wx.request({
      ...options,
      header: {
        'content-type': 'application/json',
        ...(options.header || {}),
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      success: (res) => {
        // 401 → 尝试刷新并重试
        if (res.statusCode === 401 && !_retried) {
          refreshAccessToken()
            .then(() => requestWithAuth(options, true).then(resolve).catch(reject))
            .catch(() => reject(new Error('AUTH_EXPIRED')));
          return;
        }
        resolve(res);
      },
      fail: (err) => reject(err)
    });
  });
}

/* ==================== 页面 ==================== */
Page({
  data: {
    name: '',
    code: 0,
    content: [],
    loading: true
  },

  _isRedirectingLogin: false,

  onLoad() {
    this.fetchList();
  },

  onShow() {
    // 从登录页返回时，复位跳转锁
    this._isRedirectingLogin = false;
  },

  onPullDownRefresh() {
    this.fetchList(() => wx.stopPullDownRefresh());
  },

  /* ==================== 拉取列表 ==================== */
  fetchList(done) {
    // 没有 access_token 也没有 refresh_token → 直接跳登录
    if (!getAccessToken() && !getRefreshToken()) {
      this.setData({ loading: false });
      this.redirectToLogin();
      done && done();
      return;
    }

    requestWithAuth({
      url: API.getList,
      method: 'POST',
      data: { text: ORDER_TYPE }
    })
      .then((res) => {
        const data = res.data || {};

        if (data.status === true) {
          const list = Array.isArray(data.content) ? data.content : [];
          this.setData({
            content: list,
            code: list.length
          });
          return;
        }

        // 非成功：检查 http 状态码，只有 401 才跳登录
        if (res.statusCode === 401) {
          clearAllAuth();
          this.setData({ content: [], code: 0 });
          this.redirectToLogin();
        } else {
          // 其他错误只提示，不清 token
          wx.showToast({
            title: data.message || '加载失败',
            icon: 'none'
          });
        }
      })
      .catch((err) => {
        if (err.message === 'AUTH_EXPIRED') {
          clearAllAuth();
          this.setData({ content: [], code: 0 });
          this.redirectToLogin();
        } else {
          wx.showToast({
            title: "网络问题，请下拉刷新",
            icon: 'none'
          });
        }
      })
      .finally(() => {
        this.setData({ loading: false });
        done && done();
      });
  },

  /* ==================== 跳转登录页 ==================== */
  redirectToLogin() {
    if (this._isRedirectingLogin) return;
    this._isRedirectingLogin = true;

    wx.showToast({
      title: '请先登录',
      icon: 'none'
    });

    // adminLogin 是 tabBar 页面用 switchTab，否则用 reLaunch
    wx.reLaunch({
      url: ROUTES.adminLogin,
      fail: (err) => console.error('[reportList] 跳转登录失败：', err)
    });
  },

  /* ==================== 跳转订单详情 ==================== */
  getDetail(e) {
    const code = e.currentTarget.dataset.bar_code;
    if (!code) {
      wx.showToast({ title: '参数错误', icon: 'none' });
      return;
    }
    wx.navigateTo({ url: `${ROUTES.order}?code=${code}` });
  }
});