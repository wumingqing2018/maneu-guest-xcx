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
  agreementService: '/pages/agreement-service/agreement-service',
  agreementPrivacy: '/pages/agreement-privacy/agreement-privacy'
};

const STORAGE_KEYS = {
  access: 'access_token',
  refresh: 'refresh_token',
  expireAt: 'token_expires_at',
  phone: 'phone',
  call: 'call',
  openid: 'openid',
  legacyToken: 'token'
};

const PHONE_REG = /^1[3-9]\d{9}$/;
const CODE_REG = /^\d{6}$/;
const COUNTDOWN_SECONDS = 60;
const REQUEST_TIMEOUT = 15000;

// access_token 保守有效期（仅用于本地提前失效判断，真正过期以 401 为准）
const TOKEN_TTL_MS = 2 * 60 * 60 * 1000;   // 2 小时

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

function clearAuth() {
  wx.removeStorageSync(STORAGE_KEYS.access);
  wx.removeStorageSync(STORAGE_KEYS.refresh);
  wx.removeStorageSync(STORAGE_KEYS.expireAt);
  wx.removeStorageSync(STORAGE_KEYS.phone);
  wx.removeStorageSync(STORAGE_KEYS.call);
  wx.removeStorageSync(STORAGE_KEYS.legacyToken);
}

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
* ⚠️ 不是 openid！后端需用此 code 调 jscode2session 换 openid。
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

function wxPost(url, data) {
  return new Promise((resolve, reject) => {
      wx.request({
          url,
          method: 'POST',
          header: {'content-type': 'application/json'},
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
      if (hasLogin()) {
          wx.reLaunch({
              url: ROUTES.user,
              fail: (err) => console.error('[userLogin] 跳转用户中心失败：', err)
          });
          return;
      }
      this.resumeCountdown();
  },

  onHide() { this.clearSmsTimer(); },
  onUnload() { this.clearSmsTimer(); },

  /* ==================== 协议 ==================== */
  toggleAgree() {
      this.setData({agree: !this.data.agree});
  },

  onOpenAgreementService() {
      wx.navigateTo({url: ROUTES.agreementService});
  },

  onOpenAgreementPrivacy() {
      wx.navigateTo({url: ROUTES.agreementPrivacy});
  },

  /* ==================== 输入 ==================== */
  onPhoneInput(e) { this.setData({phone: e.detail.value}); },
  onCodeInput(e)  { this.setData({code: e.detail.value}); },

  /* ==================== 发送验证码 ==================== */
  sendsmsCode() {
      const {phone, isCountdown} = this.data;
      if (isCountdown) return;

      if (!PHONE_REG.test(phone)) {
          wx.showToast({title: '手机号格式错误', icon: 'none'});
          return;
      }

      wxPost(API.sendsms, {call: phone})
          .then((data) => {
              if (data.status) {
                  this.startCountdown();
                  wx.showToast({title: '验证码已发送', icon: 'success'});
              } else {
                  wx.showToast({title: data.message || '获取验证码失败', icon: 'none'});
              }
          })
          .catch(() => {
              wx.showToast({title: '网络异常，请重试', icon: 'none'});
          });
  },

  /* ==================== 倒计时 ==================== */
  startCountdown() {
      this._smsDeadline = Date.now() + COUNTDOWN_SECONDS * 1000;
      this.setData({isCountdown: true, countdownText: `${COUNTDOWN_SECONDS}秒`});
      this.startSmsTimer();
  },

  startSmsTimer() {
      this.clearSmsTimer();
      this._smsTimer = setInterval(() => {
          const remain = Math.ceil((this._smsDeadline - Date.now()) / 1000);
          if (remain <= 0) {
              this.clearSmsTimer();
              this._smsDeadline = 0;
              this.setData({isCountdown: false, countdownText: '重新发送'});
              return;
          }
          this.setData({countdownText: `${remain}秒`});
      }, 1000);
  },

  resumeCountdown() {
      if (!this._smsDeadline) return;
      const remain = Math.ceil((this._smsDeadline - Date.now()) / 1000);
      if (remain <= 0) {
          this._smsDeadline = 0;
          this.setData({isCountdown: false, countdownText: '获取验证码'});
          return;
      }
      this.setData({isCountdown: true, countdownText: `${remain}秒`});
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
   * @param {Object} data  后端完整响应 {status, message, is_new, call, content}
   * @param {string} [phone]  短信登录时用户输入的手机号（微信登录不传）
   */
  onLoginSuccess(data, phone) {
      const content = data.content || {};

      wx.setStorageSync(STORAGE_KEYS.access, content.access_token);
      wx.setStorageSync(STORAGE_KEYS.refresh, content.refresh_token);
      wx.setStorageSync(STORAGE_KEYS.expireAt, Date.now() + TOKEN_TTL_MS);  // ⭐ 写过期时间

      // ⭐ call 在响应顶层；微信登录时回退到 content.phone / 参数 phone
      const account = data.call || content.phone || phone || '';
      if (account) {
          wx.setStorageSync(STORAGE_KEYS.phone, account);
          wx.setStorageSync(STORAGE_KEYS.call, account);
      }

      // ⭐ 后端字段是 open_id（下划线）
      if (content.open_id) {
          wx.setStorageSync(STORAGE_KEYS.openid, content.open_id);
      }

      // ⭐ 新用户提示
      if (data.is_new) {
          wx.showToast({title: '注册成功', icon: 'success', duration: 1200});
      }

      wx.reLaunch({
          url: ROUTES.user,
          fail: (err) => console.error('[userLogin] 跳转用户中心失败：', err)
      });
  },

  /* ==================== 短信登录 ==================== */
  handleLogin() {
      const {phone, code, agree, submitting} = this.data;
      if (submitting) return;

      if (!PHONE_REG.test(phone)) {
          wx.showToast({title: '手机号格式错误', icon: 'none'});
          return;
      }
      if (!CODE_REG.test(code)) {
          wx.showToast({title: '请输入6位验证码', icon: 'none'});
          return;
      }
      if (!agree) {
          wx.showToast({title: '请先勾选用户协议', icon: 'none'});
          return;
      }

      this.setData({submitting: true});

      wxLogin()
          .then((loginCode) => wxPost(API.login_by_sms, {
              call: phone,
              code: code,
              login_code: loginCode
          }))
          .then((data) => {
              if (data.status && data.content) {
                  this.onLoginSuccess(data, phone);    // ⭐ 传整个 data
              } else {
                  wx.showToast({title: data.message || '登录失败', icon: 'none'});
              }
          })
          .catch((err) => {
              console.error('[userLogin] 短信登录失败：', err);
              wx.showToast({title: '网络异常，请稍后再试', icon: 'none'});
          })
          .finally(() => {
              this.setData({submitting: false});
          });
  },

  /* ==================== 微信快捷登录 ==================== */
  onWechatLogin(e) {
      const {agree, submitting} = this.data;
      if (submitting) return;

      if (!agree) {
          wx.showToast({title: '请先勾选用户协议', icon: 'none'});
          return;
      }
      if (!e.detail.code) {
          wx.showToast({title: '已取消授权', icon: 'none'});
          return;
      }

      const phoneCode = e.detail.code;
      this.setData({submitting: true});

      wxLogin()
          .then((loginCode) => wxPost(API.login_by_wechat, {
              code: phoneCode,
              login_code: loginCode
          }))
          .then((data) => {
              if (data.status && data.content) {
                  this.onLoginSuccess(data);           // ⭐ 传整个 data
              } else {
                  wx.showToast({title: data.message || '登录失败，请重试', icon: 'none'});
              }
          })
          .catch((err) => {
              console.error('[userLogin] 微信登录失败：', err);
              wx.showToast({title: '网络异常，请稍后再试', icon: 'none'});
          })
          .finally(() => {
              this.setData({submitting: false});
          });
  }
});