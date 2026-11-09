// pages/userLogin/userLogin.js

/* ==================== 常量 ==================== */
const API = {
  sendsms: 'https://maneu.online/apis/send_sms/',
  login_by_sms: 'https://maneu.online/apis/login_by_sms/',
  login_by_wechat: 'https://maneu.online/apis/login_by_wechat/'
};

const ROUTES = {
  user: '/pages/user/user',
  index: '/pages/index/index',
  orderList: '/pages/orderList/orderList',
  reportList: '/pages/reportList/reportList',
  repairList: '/pages/repairList/repairList',
  detail: '/pages/detail/detail',
  agreementService: '/pages/agreement-service/agreement-service',
  agreementPrivacy: '/pages/agreement-privacy/agreement-privacy'
};

/* 与 user 页保持一致的存储键 */
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

const PHONE_REG = /^1[3-9]\d{9}$/;
const CODE_REG = /^\d{6}$/;
const COUNTDOWN_SECONDS = 60;
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
 * 是否已登录（与 user 页判定保持一致）
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

/**
 * 获取微信临时登录凭证 code。
 * ⚠️ 这不是 openid！后端需用此 code 调微信 jscode2session 接口换取 openid。
 *    code 5 分钟有效、仅能使用一次。
 */
function wxLogin() {
  return new Promise((resolve, reject) => {
    wx.login({
      success: (res) => {
        if (res.code) resolve(res.code);
        else reject(new Error('wx.login 未返回 code'));
      },
      fail: (err) => reject(err)
    });
  });
}

/** 把 wx.request 封装成 Promise，统一超时与错误出口 */
function wxPost(url, data) {
  return new Promise((resolve, reject) => {
    wx.request({
      url,
      method: 'POST',
      header: { 'content-type': 'application/json' },
      data: data || {},
      timeout: REQUEST_TIMEOUT,
      success: (res) => resolve(res.data || {}),
      fail: (err) => reject(err)
    });
  });
}

/* ==================== 页面 ==================== */
Page({
  data: {
    phone: '',
    code: '',
    agree: false,
    isCountdown: false,
    countdownText: '获取验证码',
    submitting: false
  },

  _smsTimer: null,
  _smsDeadline: 0,

  /* ==================== 生命周期 ==================== */
  onShow() {
    /* 已登录直接进用户中心 */
    if (hasLogin()) {
      wx.reLaunch({
        url: ROUTES.user,
        fail: (err) => console.error('[userLogin] 跳转用户中心失败：', err)
      });
      return;
    }
    this.resumeCountdown();
  },

  onHide() {
    this.clearSmsTimer();
  },

  onUnload() {
    this.clearSmsTimer();
  },

  /* ==================== 协议 ==================== */
  toggleAgree() {
    this.setData({ agree: !this.data.agree });
  },

  onOpenAgreementService() {
    wx.navigateTo({ url: ROUTES.agreementService });
  },

  onOpenAgreementPrivacy() {
    wx.navigateTo({ url: ROUTES.agreementPrivacy });
  },

  /* ==================== 输入 ==================== */
  onPhoneInput(e) {
    this.setData({ phone: e.detail.value });
  },

  onCodeInput(e) {
    this.setData({ code: e.detail.value });
  },

  /* ==================== 发送验证码（成功后才倒计时） ==================== */
  sendsmsCode() {
    const { phone, isCountdown } = this.data;
    if (isCountdown) return;

    if (!PHONE_REG.test(phone)) {
      wx.showToast({ title: '手机号格式错误', icon: 'none' });
      return;
    }

    wxPost(API.sendsms, { call: phone })
      .then((data) => {
        if (data.status) {
          this.startCountdown();
          wx.showToast({ title: '验证码已发送', icon: 'success' });
        } else {
          wx.showToast({ title: data.message || '获取验证码失败', icon: 'none' });
        }
      })
      .catch(() => {
        wx.showToast({ title: '网络异常，请重试', icon: 'none' });
      });
  },

  /* ==================== 倒计时 ==================== */
  startCountdown() {
    this._smsDeadline = Date.now() + COUNTDOWN_SECONDS * 1000;
    this.setData({ isCountdown: true, countdownText: `${COUNTDOWN_SECONDS}秒` });
    this.startSmsTimer();
  },

  startSmsTimer() {
    this.clearSmsTimer();
    this._smsTimer = setInterval(() => {
      const remain = Math.ceil((this._smsDeadline - Date.now()) / 1000);
      if (remain <= 0) {
        this.clearSmsTimer();
        this._smsDeadline = 0;
        this.setData({ isCountdown: false, countdownText: '重新发送' });
        return;
      }
      this.setData({ countdownText: `${remain}秒` });
    }, 1000);
  },

  resumeCountdown() {
    if (!this._smsDeadline) return;
    const remain = Math.ceil((this._smsDeadline - Date.now()) / 1000);
    if (remain <= 0) {
      this._smsDeadline = 0;
      this.setData({ isCountdown: false, countdownText: '获取验证码' });
      return;
    }
    this.setData({ isCountdown: true, countdownText: `${remain}秒` });
    this.startSmsTimer();
  },

  clearSmsTimer() {
    if (this._smsTimer) {
      clearInterval(this._smsTimer);
      this._smsTimer = null;
    }
  },

  /* ==================== 登录成功统一处理 ==================== */
  onLoginSuccess(content, phone) {
    wx.setStorageSync(STORAGE_KEYS.access, content.access_token);
    wx.setStorageSync(STORAGE_KEYS.refresh, content.refresh_token);

    /* 账号展示：同时写入 phone 与 call，兼容 user 页优先读 phone 的逻辑 */
    const account = content.phone || phone || content.call || '';
    if (account) {
      wx.setStorageSync(STORAGE_KEYS.phone, account);
      wx.setStorageSync(STORAGE_KEYS.call, account);
    }

    if (content.openid) {
      wx.setStorageSync(STORAGE_KEYS.openid, content.openid);
    }

    wx.reLaunch({
      url: ROUTES.user,
      fail: (err) => console.error('[userLogin] 跳转用户中心失败：', err)
    });
  },

  /* ==================== 短信登录 ==================== */
  handleLogin() {
    const { phone, code, agree, submitting } = this.data;
    if (submitting) return;

    if (!PHONE_REG.test(phone)) {
      wx.showToast({ title: '手机号格式错误', icon: 'none' });
      return;
    }
    if (!CODE_REG.test(code)) {
      wx.showToast({ title: '请输入6位验证码', icon: 'none' });
      return;
    }
    if (!agree) {
      wx.showToast({ title: '请先勾选用户协议', icon: 'none' });
      return;
    }

    this.setData({ submitting: true });

    wxLogin()
      .then((loginCode) => wxPost(API.login_by_sms, {
        call: phone,
        code: code,
        login_code: loginCode // 临时 code，后端换 openid
      }))
      .then((data) => {
        if (data.status && data.content) {
          this.onLoginSuccess(data.content, phone);
        } else {
          wx.showToast({ title: data.message || '登录失败', icon: 'none' });
        }
      })
      .catch((err) => {
        console.error('[userLogin] 短信登录失败：', err);
        wx.showToast({ title: '网络异常，请稍后再试', icon: 'none' });
      })
      .finally(() => {
        this.setData({ submitting: false });
      });
  },

  /* ==================== 微信快捷登录 ==================== */
  onWechatLogin(e) {
    const { agree, submitting } = this.data;
    if (submitting) return;

    if (!agree) {
      wx.showToast({ title: '请先勾选用户协议', icon: 'none' });
      return;
    }
    if (!e.detail.code) {
      wx.showToast({ title: '已取消授权', icon: 'none' });
      return;
    }

    const phoneCode = e.detail.code;
    this.setData({ submitting: true });

    wxLogin()
      .then((loginCode) => wxPost(API.login_by_wechat, {
        code: phoneCode,      // 手机号 code
        login_code: loginCode // 临时 code，后端换 openid
      }))
      .then((data) => {
        if (data.status && data.content) {
          this.onLoginSuccess(data.content);
        } else {
          wx.showToast({ title: data.message || '登录失败，请重试', icon: 'none' });
        }
      })
      .catch((err) => {
        console.error('[userLogin] 微信登录失败：', err);
        wx.showToast({ title: '网络异常，请稍后再试', icon: 'none' });
      })
      .finally(() => {
        this.setData({ submitting: false });
      });
  }
});