// pages/store/store.js
/**
 * 配镜订单详情页
 *
 * store_detail 返回：
 * {
 *   status: true,
 *   content: {
 *     name, phone, time, remark, status,
 *     content: "[
 *   {
 *     "产品系列": "近视管理",
 *     "产品名称": "星状元",
 *     "折射率": "1.60",
 *     "膜层": "蓝晶膜",
 *     "球镜": "-4.50",
 *     "柱镜": "-1.50",
 *     "委托生产商": "韦星光学"
 *   }
 * ]"
 *   },
 *   admin: { nickname, phone, username, location, ... }   // 注意：不展示 password / content
 * }
 *
 * 产品 content 解析后：
 * [
 *   {
 *     "产品系列": "近视管理",
 *     "产品名称": "星状元",
 *     "折射率": "1.60",
 *     "膜层": "蓝晶膜",
 *     "球镜": "-4.50",
 *     "柱镜": "-1.50",
 *     "委托生产商": "韦星光学"
 *   }
 * ]
 */

/* ==================== 常量 ==================== */
const API = {
  store_detail: 'https://maneu.online/apis/auth/store_detail/',
  refresh: 'https://maneu.online/apis/refresh_access_token/'
};

const ROUTES = {
  adminLogin: '/pages/adminLogin/adminLogin'
};

/* 产品详情行顺序（中文字段 -> 展示名），有值才显示 */
const DETAIL_FIELDS = [
  ['折射率', '折射率'],
  ['膜层', '膜层'],
  ['球镜', '球镜'],
  ['柱镜', '柱镜'],
  ['委托生产商', '委托生产商']
];

/* ==================== 统一请求 ==================== */
function requestWithAuth(url, data, _retried) {
  return new Promise(function (resolve, reject) {
    wx.request({
      url: url,
      method: 'POST',
      header: {
        'content-type': 'application/json',
        Authorization: 'Bearer ' + wx.getStorageSync('access_token')
      },
      data: data || {},
      success: function (res) {
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
      header: { 'content-type': 'application/json' },
      data: { refresh_token: refreshToken },
      success: function (res) {
        var d = res.data || {};
        if (d.status && d.content && d.content.access_token) {
          wx.setStorageSync('access_token', d.content.access_token);
          if (d.content.refresh_token) {
            wx.setStorageSync('refresh_token', d.content.refresh_token);
          }
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

/* ==================== 工具函数 ==================== */

/** 字符串是否有值 */
function hasStr(v) {
  return v !== null && v !== undefined && String(v).trim() !== '';
}

/** 时间格式化：2026-07-08T12:17:47 → 2026-07-08 12:17 */
function formatTime(str) {
  if (!str) return '';
  return String(str).replace('T', ' ').slice(0, 16);
}

/**
 * 把中文字段产品对象转成 WXML 可渲染结构
 * 视觉映射：
 *   产品系列  → 徽章（typeLabel，蓝色）
 *   产品名称  → 标题（brand）
 *   其余字段  → 详情列表（details）
 * @param {Object} item
 * @returns {Object|null} 全空返回 null
 */
function formatPlanItem(item) {
  if (!item || typeof item !== 'object') return null;

  var typeLabel = hasStr(item['产品系列']) ? String(item['产品系列']).trim() : '';
  var sideLabel = ''; // 新接口无侧别
  var brand = hasStr(item['产品名称']) ? String(item['产品名称']).trim() : '';
  var model = '';     // 新接口无型号

  var details = [];
  DETAIL_FIELDS.forEach(function (pair) {
    var rawKey = pair[0];
    var label = pair[1];
    if (hasStr(item[rawKey])) {
      details.push({ key: label, val: String(item[rawKey]).trim(), isPrice: false });
    }
  });

  if (!typeLabel && !sideLabel && !brand && !model && details.length === 0) {
    return null;
  }

  return {
    typeLabel: typeLabel,
    sideLabel: sideLabel,
    brand: brand,
    model: model,
    details: details
  };
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
    admin_name: '',
    admin_phone: '',
    admin_location: '',
    admin_content: '',
    /* 配镜方案（结构化） */
    store: []
  },


  _code: '',
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
    this.fetchDetail(function () {
      wx.stopPullDownRefresh();
    });
  },

  /* ==================== 主流程 ==================== */
  fetchDetail(done) {
    var that = this;

    that.fetchStore()
      .catch(function (err) {
        console.error('[store]', err);

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
  fetchStore() {
    var that = this;

    return requestWithAuth(API.store_detail, { code: that._code }).then(function (res) {
      var data = res.data || {};
      if (data.status === false) return;

      var content = data.content || {};
      var admin = data.admin || {};

      /* 解析配镜方案 JSON 字符串 */
      var rawStore = [];
      try {
        rawStore = content.content ? JSON.parse(content.content) : [];
        if (!Array.isArray(rawStore)) rawStore = [];
      } catch (e) {
        console.warn('[store] 配镜方案解析失败', e);
        rawStore = [];
      }

      var store = rawStore.map(formatPlanItem).filter(Boolean);

      that.setData({
        name: content.name || '',
        time: formatTime(content.time),
        phone: content.phone || '',
        remark: content.remark || '',
        store: store,
        admin_name: content.admin_name || '',
        admin_phone: content.admin_phone || '',
        admin_location: content.admin_location || '',
        admin_content: content.admin_content || ''
      });
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
        console.error('[store] 跳转登录失败：', err);
      }
    });
  }
});