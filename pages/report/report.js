// pages/report/report.js

/* ==================== 常量 ==================== */
const API = {
  reportDetail: 'https://maneu.online/apis/auth/report_detail/',
  refresh: 'https://maneu.online/apis/refresh_access_token/'
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
  wx.removeStorageSync('token');
}

/* 模块级：并发刷新去重 */
let _refreshPromise = null;

function refreshAccessToken() {
  if (_refreshPromise) return _refreshPromise;

  _refreshPromise = new Promise((resolve, reject) => {
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

  return _refreshPromise.finally(() => {
    _refreshPromise = null;
  });
}

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
            .catch((err) => {
              if (err.message === 'REFRESH_NETWORK_ERROR') {
                reject(err);
              } else {
                reject(new Error('AUTH_EXPIRED'));
              }
            });
          return;
        }
        resolve(res);
      },
      fail: (err) => reject(err)
    });
  });
}

/* ==================== 工具 ==================== */

function formatTime(str) {
  if (!str) return '';
  return String(str).replace('T', ' ').slice(0, 16);
}

function displayVal(v) {
  return (v === null || v === undefined || v === '') ? '--' : v;
}

/**
 * 解析验光 content：
 *  1) 已是对象 → 直接返回
 *  2) 合法 JSON 字符串 → JSON.parse
 *  3) Python dict repr（单引号，历史脏数据）→ 兜底转换
 */
function parseContent(raw) {
  if (!raw) return {};
  if (typeof raw === 'object' && !Array.isArray(raw)) return raw;
  if (typeof raw !== 'string') return {};

  var s = raw.trim();
  if (!s) return {};

  for (var i = 0; i < 3; i++) {
    // 1) 标准 JSON
    try {
      var p = JSON.parse(s);
      if (typeof p === 'string') { s = p.trim(); continue; }
      if (p && typeof p === 'object' && !Array.isArray(p)) return p;
      return {};
    } catch (e) { /* fall through */ }

    // 2) 剥外层引号 + 单引号转双引号 + Python 常量转 JSON
    try {
      var inner = s;
      if ((inner[0] === '"' && inner.slice(-1) === '"') ||
          (inner[0] === "'" && inner.slice(-1) === "'")) {
        inner = inner.slice(1, -1).replace(/\\(['"])/g, '$1');
      }
      var normalized = inner
        .replace(/'/g, '"')
        .replace(/\bTrue\b/g,  'true')
        .replace(/\bFalse\b/g, 'false')
        .replace(/\bNone\b/g,  'null');

      var p2 = JSON.parse(normalized);
      if (typeof p2 === 'string') { s = p2.trim(); continue; }
      if (p2 && typeof p2 === 'object' && !Array.isArray(p2)) return p2;
      return {};
    } catch (e2) {
      console.warn('[report] content 解析失败：', raw);
      return {};
    }
  }
  return {};
}

/* ==================== 页面 ==================== */
Page({
  data: {
    loading: true,
    loadError: false,

    // 客户信息
    name: '',
    phone: '',
    time: '',
    remark: '',

    // 基础信息
    sex: '--',
    age: '--',
    pd: '--',
    ot: '--',
    em: '--',
    dfh: '--',
    plan: '--',

    // 机构
    admin: {
      nickname: '--',
      phone: '--',
      location: '--',
      remark: '--'
    },

    // 屈光处方
    od_sph: '--', os_sph: '--',
    od_cyl: '--', os_cyl: '--',
    od_ax:  '--', os_ax:  '--',
    od_pr:  '--', os_pr:  '--',
    od_fr:  '--', os_fr:  '--',
    od_add: '--', os_add: '--',

    // 视力检查
    od_va: '--', os_va: '--',
    od_bc: '--', os_bc: '--',

    // 眼生物测量
    od_al:  '--', os_al:  '--',
    od_ak:  '--', os_ak:  '--',
    od_ad:  '--', os_ad:  '--',
    od_cct: '--', os_cct: '--',
    od_lt:  '--', os_lt:  '--',
    od_vt:  '--', os_vt:  '--'
  },

  _code: '',
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

        if (res.statusCode === 401) throw new Error('AUTH_EXPIRED');
        if (data.status === false) throw new Error('EMPTY');

        // ⭐ 后端结构：data.content = { 客户字段 + content(验光JSON字符串) + admin_* }
        const c = data.content || {};

        // ⭐ 验光数据：c.content 是 JSON 字符串，需二次解析
        const opt = parseContent(c.content);
        const od = opt.od || {};
        const os = opt.os || {};

        // ⭐ 机构信息：c 上的扁平 admin_* 字段
        const admin = {
          nickname: displayVal(c.admin_name),
          phone:    displayVal(c.admin_phone),
          location: displayVal(c.admin_location),
          remark:   displayVal(c.admin_content)
        };

        this.setData({
          // 客户信息
          name:   c.name || '',
          phone:  c.phone || '',
          time:   formatTime(c.time),
          remark: c.remark || '',

          // 基础信息
          sex:  displayVal(opt.sex),
          age:  displayVal(opt.age),
          pd:   displayVal(opt.pd),
          ot:   displayVal(opt.ot),
          em:   displayVal(opt.em),
          dfh:  displayVal(opt.dfh),
          plan: displayVal(opt.plan),

          // 机构
          admin: admin,

          // 屈光处方
          od_sph: displayVal(od.sph), os_sph: displayVal(os.sph),
          od_cyl: displayVal(od.cyl), os_cyl: displayVal(os.cyl),
          od_ax:  displayVal(od.ax),  os_ax:  displayVal(os.ax),
          od_pr:  displayVal(od.pr),  os_pr:  displayVal(os.pr),
          od_fr:  displayVal(od.fr),  os_fr:  displayVal(os.fr),
          od_add: displayVal(od.add), os_add: displayVal(os.add),

          // 视力检查
          od_va: displayVal(od.va), os_va: displayVal(os.va),
          od_bc: displayVal(od.bc), os_bc: displayVal(os.bc),

          // 眼生物测量
          od_al:  displayVal(od.al),  os_al:  displayVal(os.al),
          od_ak:  displayVal(od.ak),  os_ak:  displayVal(os.ak),
          od_ad:  displayVal(od.ad),  os_ad:  displayVal(os.ad),
          od_cct: displayVal(od.cct), os_cct: displayVal(os.cct),
          od_lt:  displayVal(od.lt),  os_lt:  displayVal(os.lt),
          od_vt:  displayVal(od.vt),  os_vt:  displayVal(os.vt)
        });
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

  redirectToLogin() {
    if (this._isRedirectingLogin) return;
    this._isRedirectingLogin = true;

    wx.showToast({ title: '请先登录', icon: 'none' });

    wx.reLaunch({
      url: ROUTES.adminLogin,
      fail: (err) => console.error('[report] 跳转登录失败：', err)
    });
  },

  onRetry() {
    this.fetchReport();
  }
});