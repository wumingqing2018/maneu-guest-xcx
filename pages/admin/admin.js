// pages/admin/admin.js

/* ==================== 常量 ==================== */
const API = {
  removeUrl: 'https://maneu.online/apis/remove_token/'
};

const ROUTES = {
  index: '/pages/index/index',
  adminSignup: '/pages/adminSignup/adminSignup',
  adminLogin: '/pages/adminLogin/adminLogin',
  orderList: '/pages/orderList/orderList',
  reportList: '/pages/reportList/reportList',
  repairList: '/pages/repairList/repairList',
  detail: '/pages/detail/detail'
};

const NAV_LOCK_MS = 800;

/* 统一读 token */
function getAccessToken() {
  return (wx.getStorageSync('access_token') || '');
}

function getRefreshToken() {
  return wx.getStorageSync('refresh_token') || '';
}

/* 判断是否已登录：两个 token 都存在才算登录 */
function hasLogin() {
  return !!(getAccessToken() && getRefreshToken());
}

/* ==================== 页面 ==================== */
Page({
  data: {
    islogin: false,
    call: ''
  },

  _navigating: false,
  _navTimer: null,

  /* ==================== 生命周期 ==================== */
  onShow() {
    this.checkLogin();
  },

  onUnload() {
    if (this._navTimer) {
      clearTimeout(this._navTimer);
      this._navTimer = null;
    }
  },

  /* ==================== 登录态校验（只看缓存，不发请求） ==================== */
  checkLogin() {
    const islogin = hasLogin();
    const call = wx.getStorageSync('call') || '';

    this.setData({
      islogin,
      call: islogin ? call : ''
    });
  },

  /* ==================== 未登录：跳登录页 ==================== */
  goLogin() {
    wx.navigateTo({
      url: ROUTES.adminLogin,
      fail: (err) => {
        console.error('[admin] 跳登录页失败：', err);
        wx.reLaunch({ url: ROUTES.adminLogin });
      }
    });
  },

  /* ==================== 退出登录 ==================== */
  handleLogout() {
    wx.showModal({
      title: '确认退出',
      content: '退出后需要重新登录，确定要退出吗？',
      confirmText: '退出',
      confirmColor: '#FF3B30',
      cancelText: '取消',
      success: (res) => {
        if (!res.confirm) return;

        /* 1. 通知后端注销（失败不阻塞本地清理） */
        const accessToken = getAccessToken();
        if (accessToken) {
          wx.request({
            url: API.removeUrl,
            method: 'POST',
            data: { access_token: accessToken },
            fail: () => {}
          });
        }

        /* 2. 本地清理 */
        wx.removeStorageSync('access_token');
        wx.removeStorageSync('refresh_token');
        wx.removeStorageSync('token');
        wx.removeStorageSync('call');

        /* 3. 重置为未登录状态 */
        this.setData({
          islogin: false,
          call: ''
        });

        /* 4. 回首页 */
        wx.switchTab({ url: ROUTES.index });
      }
    });
  },

  /* ==================== 扫码 ==================== */
  scanCode() {
    wx.scanCode({
      onlyFromCamera: true,
      scanType: ['qrCode', 'barCode'],
      success: (res) => {
        this.safeNavigate(
          `${ROUTES.detail}?data=${encodeURIComponent(res.result)}`
        );
      },
      fail: (err) => {
        if (err.errMsg && err.errMsg.includes('cancel')) return;
        wx.showToast({ title: '扫码失败，请重试', icon: 'none' });
      }
    });
  },

  /* ==================== 安全跳转（防连点） ==================== */
  safeNavigate(url) {
    if (this._navigating) return;
    this._navigating = true;

    wx.navigateTo({
      url,
      complete: () => {
        this._navTimer = setTimeout(() => {
          this._navigating = false;
          this._navTimer = null;
        }, NAV_LOCK_MS);
      }
    });
  },

  getAdminSignup()  { this.safeNavigate(ROUTES.adminSignup); },
  getOrderList()  { this.safeNavigate(ROUTES.orderList); },
  getReportList() { this.safeNavigate(ROUTES.reportList); },
  getRepairList() { this.safeNavigate(ROUTES.repairList); },
});