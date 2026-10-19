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
  detail: '/pages/detail/detail'
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

/* 判断是否已登录：两个 token 都存在才算登录 */
function hasLogin() {
  return !!(getAccessToken() && getRefreshToken());
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
    /* 已登录 → 自动切回「我的」 */
    if (getAccessToken()) {
      wx.reLaunch({
        url: ROUTES.admin,
        fail: (err) => console.error('[adminLogin] 跳 admin 失败：', err)
      });
      return;
    }

    /* 恢复倒计时（切后台再回来） */
    this.resumeCountdown();
  },

  onHide() {
    /* tabBar 页面切换只触发 onHide，不触发 onUnload */
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
  sendsmsCode() {
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
      header: { 
        'content-type': 'application/json',
      },
      data: { call: phone },
      success: (res) => {
        if (res.data && res.data.status) {
          /* ✅ 用户能看到 */
          wx.showToast({ 
            title: '验证码已发送', 
            icon: 'success' 
          });
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

  /* ==================== 倒计时（时间戳方案） ==================== */
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
  /**
   * @param {Object} content 服务端返回的 content
   * @param {string} [phone] 短信登录时手动补的账号
   */
  onLoginSuccess(content, phone) {
    /* 1. 存 token（双写兼容旧字段） */
    wx.setStorageSync('access_token', content.access_token);
    wx.setStorageSync('refresh_token', content.refresh_token);

    /* 2. 缓存登录账号：优先用后端返回的 call，没有就用手机号补 */
    const account = content.call || phone || '';
    if (account) wx.setStorageSync('call', account);

    /* 3. 跳到「我的」tab */
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

    wx.request({
      url: API.login_by_sms,
      method: 'POST',
      header: { 
        'content-type': 'application/json',
        // 'Authorization': 'Bearer ' + wx.getStorageSync('access_token')
      },
      data: { call: phone, code: code },
      success: (res) => {
        const data = res.data || {};
        if (data.status && data.content) {
          /* 把 phone 传进去，用于缓存 call */
          this.onLoginSuccess(data.content, phone);
        } else {
          /* ✅ 用户能看到失败原因 */
          wx.showToast({
            title: data.message || '登录失败，请重试',
            icon: 'none'
          });
        }
      },
      fail: () => {
        wx.showToast({ 
          title: '网络异常，请稍后再试', 
          icon: 'none' 
        });
      },
      complete: () => {
        this.setData({ submitting: false });
      }
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

    this.setData({ submitting: true });

    wx.request({
      url: API.login_by_wechat,
      method: 'POST',
      header: { 
        'content-type': 'application/json',
      },
      data: { code: e.detail.code },
      success: (res) => {
        const data = res.data || {};
        if (data.status && data.content) {
          this.onLoginSuccess(data.content);
        } else {
          wx.showToast({
            title: data.message || '登录失败，请重试',
            icon: 'none'
          });
        }
      },
      fail: () => {
        wx.showToast({ 
          title: '网络异常，请稍后再试', 
          icon: 'none' 
        });
      },
      complete: () => {
        this.setData({ submitting: false });
      }
    });
  }
});