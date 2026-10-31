// pages/adminLogin/adminLogin.js

/* ==================== 常量 ==================== */
const API = {
  sendsms: 'https://maneu.online/apis/send_sms/',
  login_by_sms: 'https://maneu.online/apis/login_by_sms/',
  login_by_wechat: 'https://maneu.online/apis/login_by_wechat/'
};

const ROUTES = {
  admin: '/pages/admin/admin',
  index: '/pages/index/index',
  orderList: '/pages/orderList/orderList',
  reportList: '/pages/reportList/reportList',
  repairList: '/pages/repairList/repairList',
  detail: '/pages/detail/detail',
};

const PHONE_REG = /^1[3-9]\d{9}$/;
const CODE_REG = /^\d{6}$/;
const COUNTDOWN_SECONDS = 60;

function getAccessToken() {
  return (wx.getStorageSync('access_token') || '');
}

function getRefreshToken() {
  return wx.getStorageSync('refresh_token') || '';
}

function hasLogin() {
  return !!(getAccessToken() && getRefreshToken());
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

/** 把 wx.request 封装成 Promise，避免每个调用点手写 resolve/reject 漏掉 */
function wxPost(url, data) {
  return new Promise((resolve, reject) => {
    wx.request({
      url,
      method: 'POST',
      header: { 'content-type': 'application/json' },
      data: data || {},
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
    if (hasLogin()) {                                   // ⭐ 用 hasLogin
      wx.reLaunch({
        url: ROUTES.admin,
        fail: (err) => console.error('[adminLogin] 跳 admin 失败：', err)
      });
      return;
    }
    this.resumeCountdown();
  },

  onHide() { this.clearSmsTimer(); },
  onUnload() { this.clearSmsTimer(); },

  /* ==================== 协议 ==================== */
  toggleAgree() {
    this.setData({ agree: !this.data.agree });
  },
  onOpenAgreementService() {
    wx.navigateTo({ url: '/pages/agreement-service/agreement-service' });
  },
  onOpenAgreementUser() {
    wx.navigateTo({ url: '/pages/agreement-user/agreement-user' });
  },

  /* ==================== 输入 ==================== */
  onPhoneInput(e) { this.setData({ phone: e.detail.value }); },
  onCodeInput(e)  { this.setData({ code: e.detail.value }); },

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
          this.startCountdown();                       // ⭐ 成功后才倒计时
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
    wx.setStorageSync('access_token', content.access_token);
    wx.setStorageSync('refresh_token', content.refresh_token);

    const account = content.call || phone || content.phone || '';
    if (account) wx.setStorageSync('call', account);

    if (content.openid) wx.setStorageSync('openid', content.openid);

    wx.reLaunch({
      url: ROUTES.admin,
      fail: (err) => console.error('[adminLogin] 跳 admin 失败：', err)
    });
  },

  /* ==================== 短信登录 ==================== */
  handleLogin() {
    const { phone, code, agree, submitting } = this.data;
    if (submitting) return;

    if (!agree) {
      wx.showToast({ title: '请先勾选用户协议', icon: 'none' });
      return;
    }
    if (!CODE_REG.test(code)) {
      wx.showToast({ title: '请输入6位验证码', icon: 'none' });
      return;
    }

    this.setData({ submitting: true });

    wxLogin()
      .then((loginCode) => wxPost(API.login_by_sms, {
        call: phone,
        code: code,
        login_code: loginCode                 // ⭐ 临时 code，后端换 openid
      }))
      .then((data) => {
        if (data.status && data.content) {
          this.onLoginSuccess(data.content, phone);
        } else {
          wx.showToast({ title: data.message || '登录失败', icon: 'none' });
        }
      })
      .catch((err) => {
        console.error('[adminLogin] 短信登录失败：', err);
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
        code: phoneCode,                      // 手机号 code
        login_code: loginCode                 // ⭐ 临时 code，后端换 openid
      }))
      .then((data) => {
        if (data.status && data.content) {
          this.onLoginSuccess(data.content);
        } else {
          wx.showToast({ title: data.message || '登录失败，请重试', icon: 'none' });
        }
      })
      .catch((err) => {
        console.error('[adminLogin] 微信登录失败：', err);   // ⭐ 修正文案
        wx.showToast({ title: '网络异常，请稍后再试', icon: 'none' });
      })
      .finally(() => {
        this.setData({ submitting: false });
      });
  }
});