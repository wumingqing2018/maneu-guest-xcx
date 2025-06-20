const app = getApp()
// pages/login/login.js
Page({
  data: {
    islogin: false,
    phone: "", // 手机号
    code: "", // 验证码
    agree: true, // 协议勾选
    isCountdown: false, // 倒计时状态
    countdownText: "获取验证码",
    countdown: 60 // 倒计时秒数
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onShow: function () {
    let that = this
    let token = wx.getStorageSync('token')
    console.log(token)
    if (token) {
      that.setData({
        islogin: true
      });
    }else{
      that.setData({
        islogin: false
      });
    }
  },

  // 协议勾选
  toggleAgree() {
    this.setData({
      agree: !this.data.agree
    });
  },

  // 手机号输入
  onPhoneInput(e) {
    this.setData({
      phone: e.detail.value
    });
  },

  // 验证码输入
  onCodeInput(e) {
    this.setData({
      code: e.detail.value
    });
  },

  // 发送验证码
  sendSmsCode() {
    const {
      phone,
      isCountdown
    } = this.data;

    // 1. 手机号验证
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      wx.showToast({
        title: "手机号格式错误",
        icon: "none"
      });
      return;
    }

    // 2. 防止重复发送
    if (isCountdown) return;

    // 3. 启动倒计时
    this.setData({
      isCountdown: true
    });
    let timer = setInterval(() => {
      if (this.data.countdown <= 0) {
        clearInterval(timer);
        this.setData({
          isCountdown: false,
          countdownText: "重新发送",
          countdown: 60
        });
        return;
      }
      this.setData({
        countdownText: `${this.data.countdown}秒`,
        countdown: this.data.countdown - 1
      });
    }, 1000);

    // 4. 调用云函数发送短信
    wx.request({
      url: 'https://maneu.online/sendsms/',
      method: 'GET',
      data: {
        'code': this.data.phone,
      },
      success: (res) => {
        if (res.data.status == true) {
          app.fail_Remind('发送成功')
        } else {
          app.fail_Remind('获取验证码失败，请在次尝试')
        }
      },
      fail: (res) => {
        app.fail_Remind('网络异常，请在次尝试')
      }
    })
  },

  // 登录处理
  handleLogin() {
    const {
      phone,
      code,
      agree
    } = this.data;

    // 1. 协议校验
    if (!agree) {
      wx.showToast({
        title: "请阅读并同意协议",
        icon: "none"
      });
      return;
    }

    // 2. 验证码校验
    if (!/^\d{6}$/.test(code)) {
      wx.showToast({
        title: "请输入6位验证码",
        icon: "none"
      });
      return;
    }

    // 3. 登录请求
    wx.request({
      url: 'https://maneu.online/login/',
      method: "GET",
      data: {
        "call": this.data.phone,
        "code": this.data.code,
      },
      success(res) {
        if (res.data.status == true) {
          console.log(res.data)
          wx.setStorageSync('token',res.data.token)
          wx.switchTab({
            url: '../index/index',
          });
        } else {
          app.fail_Remind('登录失败，请在次尝试')
        }
      },
      fail: (res) => {
        app.fail_Remind('网络异常，请稍后再尝试')
      }
    });
  },

  // 微信快捷登录
  onWechatLogin(e) {
    if (e.detail.code) {
      // 通过code换取手机号（需后端解密）
      wx.cloud.callFunction({
        name: "wechatLogin",
        data: {
          code: e.detail.code
        }
      });
    }
  },

  // 登出处理
  handleLogout() {
    wx.removeStorage({
      key: 'token',
      success(res){
        console.log(res)
      }
    });
    wx.switchTab({
      url: '../index/index',
    });
  },
});