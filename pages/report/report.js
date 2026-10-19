// pages/report/report.js
const app = getApp();

/* ==================== 常量 ==================== */
const API = {
  reportDetail: 'https://maneu.online/apis/auth/report_detail/',
  storeDetail:  'https://maneu.online/apis/auth/store_detail/',
  refresh:      'https://maneu.online/apis/refresh_access_token/'
};

const ROUTES = {
  adminLogin: '/pages/adminLogin/adminLogin'
};

/* ==================== Token 工具 ==================== */

function getAccessToken() {
  return wx.getStorageSync('access_token') || '';
}

function getRefreshToken() {
  return wx.getStorageSync('refresh_token') || '';
}

function saveTokens(accessToken) {
  if (accessToken) wx.setStorageSync('access_token', accessToken);
}

function clearAllAuth() {
  wx.removeStorageSync('access_token');
  wx.removeStorageSync('refresh_token');
}

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
function requestWithAuth(url, data, _retried) {
  const token = getAccessToken();

  return new Promise((resolve, reject) => {
    wx.request({
      url,
      method: 'POST',
      header: {
        'content-type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      data: data || {},
      success: (res) => {
        if (res.statusCode === 401 && !_retried) {
          refreshAccessToken()
            .then(() => requestWithAuth(url, data, true).then(resolve).catch(reject))
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
    loading: true,
    loadError: false,

    /* 客户 / 订单 */
    name: '',
    phone: '',
    time: '',
    remark: '',

    /* 机构 */
    admin: {},

    /* 处方 */
    plan: '',
    pd: '',
    od_va: '',  os_va: '',
    od_sph: '', os_sph: '',
    od_cyl: '', os_cyl: '',
    od_ax: '',  os_ax: '',
    od_pr: '',  os_pr: '',
    od_add: '', os_add: '',
    od_bc: '',  os_bc: ''
  },

  _code: '',
  _adminId: '',
  _isRedirectingLogin: false,

  onLoad(options) {
    this._code = options.code || '';

    if (!this._code) {
      this.setData({ loading: false, loadError: true });
      wx.showToast({ title: '缺少订单编号', icon: 'none' });
      return;
    }

    this.fetchReport();
  },

  onShow() {
    this._isRedirectingLogin = false;
  },

  onPullDownRefresh() {
    this.fetchReport(() => wx.stopPullDownRefresh());
  },

  /* ==================== 主流程 ==================== */
  fetchReport(done) {
    this.setData({ loading: true, loadError: false });

    requestWithAuth(API.reportDetail, { code: this._code })
      .then((res) => {
        const data = res.data || {};

        /* 401 已由 requestWithAuth 处理，这里再兜一层 */
        if (res.statusCode === 401) throw new Error('AUTH_EXPIRED');

        if (data.status === false) throw new Error('EMPTY');

        const c = data.content || {};

        /* 记录 admin_id 供后续查机构 */
        this._adminId = c.admin_id || '';

        this.setData({
          name: c.name || '',
          phone: c.phone || '',
          time: c.time || '',
          remark: c.remark || '',
          plan: c.plan || '',
          pd: c.pd || '',

          od_va: c.od_va || '',   os_va: c.os_va || '',
          od_sph: c.od_sph || '', os_sph: c.os_sph || '',
          od_cyl: c.od_cyl || '', os_cyl: c.os_cyl || '',
          od_ax: c.od_ax || '',   os_ax: c.os_ax || '',
          od_pr: c.od_pr || '',   os_pr: c.os_pr || '',
          od_add: c.od_add || '', os_add: c.os_add || '',
          od_bc: c.od_bc || '',   os_bc: c.os_bc || ''
        });

        /* 有 admin_id 才继续拉机构信息 */
        if (this._adminId) return this.fetchAdmin();
      })
      .catch((err) => {
        console.error('[report]', err);

        if (err.message === 'AUTH_EXPIRED') {
          clearAllAuth();
          this.redirectToLogin();
          return;
        }

        this.setData({ loadError: true });
        wx.showToast({ title: '网络异常，请稍后重试', icon: 'none' });
      })
      .finally(() => {
        this.setData({ loading: false });
        done && done();
      });
  },

  /* ==================== 拉取机构信息 ==================== */
  fetchAdmin() {
    if (!this._adminId) return Promise.resolve();

    return requestWithAuth(API.storeDetail, { code: this._adminId })
      .then((res) => {
        const data = res.data || {};
        if (data.status && data.content) {
          this.setData({ admin: data.content });
        }
      })
      .catch((err) => {
        /* 机构是次要信息：静默失败，不阻塞主流程 */
        console.warn('[report] 拉取机构失败：', err);
      });
  },

  /* ==================== 跳转登录页 ==================== */
  redirectToLogin() {
    if (this._isRedirectingLogin) return;
    this._isRedirectingLogin = true;

    wx.showToast({ title: '请先登录', icon: 'none' });

    wx.reLaunch({
      url: ROUTES.adminLogin,
      fail: (err) => console.error('[report] 跳转登录失败：', err)
    });
  },

  /* ==================== 错误页「重新加载」 ==================== */
  onRetry() {
    this.fetchReport();
  }
});