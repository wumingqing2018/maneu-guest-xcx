// pages/reportDetail/reportDetail.js

/* ==================== 常量 ==================== */
const API = {
  orderDetail:  'https://maneu.online/apis/auth/order_detail/',
  reportDetail: 'https://maneu.online/apis/auth/report_detail/',
  storeDetail:  'https://maneu.online/apis/auth/store_detail/',
  refresh:      'https://maneu.online/apis/refresh_access_token/'
};

const ROUTES = {
  adminLogin: '/pages/adminLogin/adminLogin'
};

/* ==================== 统一请求 ==================== */

/**
 * 发起带鉴权的 POST 请求，401 时自动刷新 token 并重试一次
 * @param {string} url 接口地址
 * @param {Object} data 请求体
 * @param {boolean} _retried 是否已重试过
 * @returns {Promise<Object>} 成功返回 wx.request 的 res
 */
function requestWithAuth(url, data, _retried) {
  return new Promise(function (resolve, reject) {
    wx.request({
      url: url,
      method: 'POST',
      header: {
        'content-type': 'application/json',
        'Authorization': 'Bearer ' + wx.getStorageSync('access_token')
      },
      data: data || {},
      success: function (res) {
        // 401 → 尝试刷新 token 并重试一次
        if (res.statusCode === 401 && !_retried) {
          refreshAccessToken()
            .then(function () {
              requestWithAuth(url, data, true).then(resolve).catch(reject);
            })
            .catch(function () {
              reject(new Error('AUTH_EXPIRED'));
            });
          return;
        }
        resolve(res);
      },
      fail: function (err) {
        reject(err);
      }
    });
  });
}

/**
 * 用 refresh_token 换新 access_token
 * @returns {Promise<string>} 新 access_token
 */
function refreshAccessToken() {
  return new Promise(function (resolve, reject) {
    var refreshToken = wx.getStorageSync('refresh_token');
    if (!refreshToken) {
      reject(new Error('NO_REFRESH_TOKEN'));
      return;
    }

    wx.request({
      url: API.refresh,
      method: 'POST',
      header: {
        'content-type': 'application/json'
      },
      data: {
        refresh_token: refreshToken
      },
      success: function (res) {
        var d = res.data || {};
        if (d.status && d.content && d.content.access_token) {
          wx.setStorageSync('access_token', d.content.access_token);
          resolve(d.content.access_token);
        } else {
          reject(new Error('REFRESH_FAILED'));
        }
      },
      fail: function () {
        reject(new Error('REFRESH_NETWORK_ERROR'));
      }
    });
  });
}

/* ==================== 页面 ==================== */
Page({
  data: {
    loading: true,

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
    od_bc: '',  os_bc: '',

    /* 配镜方案 */
    store: []
  },

  _code: '',        // 订单/报告共用 id
  _adminId: '',     // 验光机构 id
  _isRedirectingLogin: false,

  onLoad(options) {
    this._code = options.code || wx.getStorageSync('code');

    if (!this._code) {
      this.setData({ loading: false });
      wx.showToast({ title: '缺少订单编号', icon: 'none' });
      return;
    }

    this.fetchDetail();
  },

  onShow() {
    this._isRedirectingLogin = false;
  },

  onPullDownRefresh() {
    this.fetchDetail(() => wx.stopPullDownRefresh());
  },

  /* ==================== 主流程：前两个并行，机构串行 ==================== */
  fetchDetail(done) {
    var that = this;

    Promise.all([
      that.fetchOrder(),
      that.fetchReport()
    ])
      .then(function () {
        return that.fetchAdmin();
      })
      .catch(function (err) {
        console.error('[reportDetail]', err);

        if (err.message === 'AUTH_EXPIRED' || err.message === 'NO_TOKEN') {
          wx.removeStorageSync('access_token');
          wx.removeStorageSync('refresh_token');
          that.redirectToLogin();
        } else {
          wx.showToast({ title: '网络异常，请稍后重试', icon: 'none' });
        }
      })
      .then(function () {
        that.setData({ loading: false });
        done && done();
      });
  },

  /* ==================== 订单信息 ==================== */
  fetchOrder() {
    var that = this;

    return requestWithAuth(API.orderDetail, { code: that._code })
      .then(function (res) {
        var data = res.data || {};
        if (data.status === false) return;

        var content = data.content || {};

        /* 安全解析配镜方案（服务端返回 JSON 字符串） */
        var store = [];
        try {
          store = content.content ? JSON.parse(content.content) : [];
        } catch (e) {
          console.warn('[reportDetail] 配镜方案解析失败', e);
        }

        that.setData({
          name: content.name || '',
          time: content.time || '',
          phone: content.phone || '',
          remark: content.remark || '',
          store: store
        });
      });
  },

  /* ==================== 验光处方 ==================== */
  fetchReport() {
    var that = this;

    return requestWithAuth(API.reportDetail, { code: that._code })
      .then(function (res) {
        var data = res.data || {};
        if (data.status === false) return;

        var c = data.content || {};

        /* 用 admin_id 准备后续查机构 */
        if (c.admin_id) that._adminId = c.admin_id;

        that.setData({
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
      });
  },

  /* ==================== 验光机构 ==================== */
  fetchAdmin() {
    var that = this;

    if (!that._adminId) return Promise.resolve();

    return requestWithAuth(API.storeDetail, { code: that._adminId })
      .then(function (res) {
        var data = res.data || {};
        if (data.status === false) return;

        that.setData({ admin: data.content || {} });
      });
  },

  /* ==================== 跳转登录页 ==================== */
  redirectToLogin() {
    if (this._isRedirectingLogin) return;
    this._isRedirectingLogin = true;

    wx.showToast({ title: '请先登录', icon: 'none' });

    wx.reLaunch({
      url: ROUTES.adminLogin,
      fail: function (err) {
        console.error('[reportDetail] 跳转登录失败：', err);
      }
    });
  }
});