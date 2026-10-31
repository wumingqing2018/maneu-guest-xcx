// pages/order/order.js
/**
 * 配镜订单详情页
 *
 * 三个接口：
 *   - order_detail:  客户信息 + 配镜方案（content 是 JSON 字符串）
 *   - report_detail: 验光处方
 *   - store_detail:  验光机构
 *
 * 配镜方案新数据结构（order_detail 的 content 字段）：
 *   [
 *     {
 *       item_type: 'lens' | 'frame',
 *       side: 'OU' | 'OD' | 'OS' | '',
 *       brand: '依视路Essilor',
 *       model: '万里路渐进',
 *       color: '',            // 空值不显示
 *       material: '',         // 空值不显示
 *       spec: '1.67舒适型...',
 *       quantity: 1,
 *       unit_price: 2000.0,
 *       remark: ''            // 空值不显示
 *     }
 *   ]
 */

/* ==================== 常量 ==================== */
const API = {
  orderDetail: 'https://maneu.online/apis/auth/order_detail/',
  refresh: 'https://maneu.online/apis/refresh_access_token/'
};

const ROUTES = {
  adminLogin: '/pages/adminLogin/adminLogin'
};

/* 商品类型映射 */
const TYPE_MAP = {
  lens: '镜片',
  frame: '镜框',
  accessory: '配件'
};

/* 侧别映射 */
const SIDE_MAP = {
  OU: '双眼',
  OD: '右眼',
  OS: '左眼'
};

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
        /* 401 → 刷新 token 后重试一次 */
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

/* ==================== 工具函数 ==================== */

/** 字符串是否有值 */
function hasStr(v) {
  return v !== null && v !== undefined && String(v).trim() !== '';
}

/** 时间格式化：2026-02-03T20:51:33 → 2026-02-03 20:51 */
function formatTime(str) {
  if (!str) return '';
  return String(str).replace('T', ' ').slice(0, 16);
}

/** 金额格式化：2000.0 → 2,000.00 */
function formatPrice(v) {
  var num = Number(v);
  if (isNaN(num)) return '';
  return num.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

/**
 * 把原始商品对象转成 WXML 可渲染的结构
 * @param {Object} item 原始商品
 * @returns {Object|null} 无效时返回 null
 */
function formatPlanItem(item) {
  if (!item || typeof item !== 'object') return null;

  /* 徽章 */
  var typeLabel = TYPE_MAP[item.item_type] || '';
  var sideLabel = SIDE_MAP[item.side] || '';

  /* 品牌 / 型号 */
  var brand = hasStr(item.brand) ? String(item.brand).trim() : '';
  var model = hasStr(item.model) ? String(item.model).trim() : '';

  /* 详情行：有值才显示 */
  var details = [];

  if (hasStr(item.spec)) {
    details.push({
      key: '规格',
      val: String(item.spec).trim(),
      isPrice: false
    });
  }
  if (hasStr(item.material)) {
    details.push({
      key: '材质',
      val: String(item.material).trim(),
      isPrice: false
    });
  }
  if (hasStr(item.color)) {
    details.push({
      key: '颜色',
      val: String(item.color).trim(),
      isPrice: false
    });
  }
  if (item.quantity && Number(item.quantity) > 0) {
    details.push({
      key: '数量',
      val: '× ' + item.quantity,
      isPrice: false
    });
  }
  if (
    item.unit_price !== null &&
    item.unit_price !== undefined &&
    Number(item.unit_price) > 0
  ) {
    details.push({
      key: '单价',
      val: '¥ ' + formatPrice(item.unit_price),
      isPrice: true
    });
  }
  if (hasStr(item.remark)) {
    details.push({
      key: '备注',
      val: String(item.remark).trim(),
      isPrice: false
    });
  }

  /* 全空则跳过 */
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
  _adminId: '',
  _isRedirectingLogin: false,

  onLoad(options) {
    this._code = options.code || wx.getStorageSync('code');

    if (!this._code) {
      this.setData({
        loading: false
      });
      wx.showToast({
        title: '缺少订单编号',
        icon: 'none'
      });
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

    Promise.all([that.fetchOrder()])

      .catch(function (err) {
        console.error('[order]', err);

        if (err.message === 'AUTH_EXPIRED' || err.message === 'NO_TOKEN') {
          wx.removeStorageSync('access_token');
          wx.removeStorageSync('refresh_token');
          that.redirectToLogin();
        } else {
          wx.showToast({
            title: '网络异常，请稍后重试',
            icon: 'none'
          });
        }
      })
      .then(function () {
        that.setData({
          loading: false
        });
        done && done();
      });
  },

  /* ==================== 订单信息 ==================== */
  fetchOrder() {
    var that = this;

    return requestWithAuth(API.orderDetail, {
      code: that._code
    }).then(function (res) {
      var data = res.data || {};
      if (data.status === false) return;

      var content = data.content || {};


      /* 解析配镜方案 JSON 字符串 */
      var rawStore = [];
      try {
        rawStore = content.content ? JSON.parse(content.content) : [];
        if (!Array.isArray(rawStore)) rawStore = [];
      } catch (e) {
        console.warn('[order] 配镜方案解析失败', e);
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

    wx.showToast({
      title: '请先登录',
      icon: 'none'
    });

    wx.reLaunch({
      url: ROUTES.adminLogin,
      fail: function (err) {
        console.error('[order] 跳转登录失败：', err);
      }
    });
  }
});