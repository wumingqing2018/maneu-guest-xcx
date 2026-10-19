// pages/register/register.js
const app = getApp();

/* ==================== 常量 ==================== */
const API = {
  /* ⚠️ 请替换成后端的注册接口 */
  sendsms: 'https://maneu.online/apis/send_sms/',
  signup_by_sms: 'https://maneu.online/apis/signup_by_sms/',   /* 假设接口名 */
  signup_by_wechat: 'https://maneu.online/apis/signup_by_wechat/'   /* 假设接口名 */
};

const ROUTES = {
  admin: '/pages/admin/admin',
  adminLogin: '/pages/adminLogin/adminLogin',
};

const PHONE_REG = /^1[3-9]\d{9}$/;
const CODE_REG = /^\d{6}$/;
const COUNTDOWN_SECONDS = 60;

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
  onOpenAgreement() {
    wx.showToast({ title: '查看用户协议', icon: 'none' });
  },

  /* ==================== 输入 ==================== */
  onPhoneInput(e) {
    this.setData({ phone: e.detail.value });
  },
  onCodeInput(e) {
    this.setData({ code: e.detail.value });
  },

  /* ==================== 发送验证码 ==================== */
  sendSmsCode() {
    const { phone, isCountdown } = this.data;
    if (isCountdown) return;

    if (!PHONE_REG.test(phone)) {
      wx.showToast({ title: '手机号格式错误', icon: 'none' });
      return;
    }

    this.startCountdown();

    wx.request({
      url: API.sendsms,
      method: 'POST',
      header: { 'content-type': 'application/json' },
      data: { call: phone },
      success: (res) => {
        if (res.data && res.data.status) {
          wx.showToast({ title: '验证码已发送', icon: 'success' });
        } else {
          wx.showToast({
            title: (res.data && res.data.message) || '获取验证码失败',
            icon: 'none'
          });
        }
      },
      fail: () => {
        wx.showToast({ title: '网络异常，请重试', icon: 'none' });
      }
    });
  },

  /* ==================== 倒计时 ==================== */
  startCountdown() {
    this._smsDeadline = Date.now() + COUNTDOWN_SECONDS * 1000;
    this.setData({
      isCountdown: true,
      countdownText: `${COUNTDOWN_SECONDS}秒`
    });
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
  clearSmsTimer() {
    if (this._smsTimer) {
      clearInterval(this._smsTimer);
      this._smsTimer = null;
    }
  },

  /* ==================== 注册 ==================== */
  handleRegister() {
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

    wx.request({
      url: API.signup_by_sms,
      method: 'POST',
      header: { 'content-type': 'application/json' },
      data: { call: phone, code: code },
      success: (res) => {
        const data = res.data || {};
        if (data.status && data.content) {
          /* 注册成功：存 token（后端返回结构应与登录接口一致） */
          wx.setStorageSync('access_token', data.content.access_token);
          wx.setStorageSync('refresh_token', data.content.refresh_token);
          wx.setStorageSync('token', data.content.access_token);
          wx.setStorageSync('call', data.content.call || phone);

          /* 跳「我的」 */
          wx.switchTab({
            url: ROUTES.admin,
            fail: () => wx.reLaunch({ url: ROUTES.admin })
          });
        } else {
          wx.showToast({
            title: data.message || '注册失败，请重试',
            icon: 'none'
          });
        }
      },
      fail: () => {
        wx.showToast({ title: '网络异常，请稍后再试', icon: 'none' });
      },
      complete: () => {
        this.setData({ submitting: false });
      }
    });
  },

  /* ==================== 返回登录 ==================== */
  goLogin() {
    /* 从 adminLogin 通过 navigateTo 进来，直接返回上一页即可 */
    const pages = getCurrentPages();
    if (pages.length > 1) {
      wx.navigateBack();
    } else {
      wx.redirectTo({ url: ROUTES.adminLogin });
    }
  }
});