// pages/user/user.js

/* ==================== 常量 ==================== */
const API = {
  removeUrl: 'https://maneu.online/apis/remove_token/'
};

const ROUTES = {
  index: '/pages/index/index',
  userPage: '/pages/userPage/userPage',
  userLogin: '/pages/userLogin/userLogin',
  orderList: '/pages/orderList/orderList',
  storeList: '/pages/storeList/storeList',
  reportList: '/pages/reportList/reportList',
  repairList: '/pages/repairList/repairList'
};

/* 与 userLogin 保持一致的存储键 */
const STORAGE_KEYS = {
  access: 'access_token',
  refresh: 'refresh_token',
  expireAt: 'token_expires_at',
  phone: 'phone',
  call: 'call',
  /* openid 不随登出清除，供未登录态下的其他业务使用 */
  openid: 'openid',
  legacyToken: 'token'
};

const NAV_LOCK_MS = 800;
const REQUEST_TIMEOUT = 15000;

/* ==================== 工具函数 ==================== */
function getAccessToken() {
  return wx.getStorageSync(STORAGE_KEYS.access) || '';
}

function getRefreshToken() {
  return wx.getStorageSync(STORAGE_KEYS.refresh) || '';
}

function getTokenExpireAt() {
  return Number(wx.getStorageSync(STORAGE_KEYS.expireAt) || 0);
}

/**
 * 清空登录态相关缓存
 * 注意：openid 不在此处清除，保留给未登录态的其他业务使用
 */
function clearAuth() {
  wx.removeStorageSync(STORAGE_KEYS.access);
  wx.removeStorageSync(STORAGE_KEYS.refresh);
  wx.removeStorageSync(STORAGE_KEYS.expireAt);
  wx.removeStorageSync(STORAGE_KEYS.phone);
  wx.removeStorageSync(STORAGE_KEYS.call);
  wx.removeStorageSync(STORAGE_KEYS.legacyToken);
}

/**
 * 是否已登录
 * - access / refresh 两个 token 都存在
 * - 若本地有 expires_at，则同时校验是否过期；过期即清缓存
 */
function hasLogin() {
  if (!getAccessToken() || !getRefreshToken()) return false;
  const expireAt = getTokenExpireAt();
  if (expireAt && Date.now() >= expireAt) {
    clearAuth();
    return false;
  }
  return true;
}

/* 账号展示：优先 phone，回退 call（兼容旧缓存） */
function getDisplayAccount() {
  return wx.getStorageSync(STORAGE_KEYS.phone) ||
    wx.getStorageSync(STORAGE_KEYS.call) ||
    '';
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
    this._clearNavTimer();
    this._navigating = false;
  },

  /* ==================== 登录态校验（只读缓存，不发请求） ==================== */
  checkLogin() {
    const islogin = hasLogin();
    this.setData({
      islogin,
      call: islogin ? getDisplayAccount() : ''
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

  _clearNavTimer() {
    if (this._navTimer) {
      clearTimeout(this._navTimer);
      this._navTimer = null;
    }
  },

  /* ==================== 功能入口 ==================== */
  // Page 里加一个方法
  getLogin(){
    this.safeNavigate(ROUTES.userLogin);
  },
  getUserPage() {
    this.safeNavigate(ROUTES.userPage);
  },
  getOrderList() {
    this.safeNavigate(ROUTES.orderList);
  },
  getStoreList() {
    this.safeNavigate(ROUTES.storeList);
  },
  getRepairList() {
    this.safeNavigate(ROUTES.repairList);
  },
  getReportList() {
    this.safeNavigate(ROUTES.reportList);
  }
});