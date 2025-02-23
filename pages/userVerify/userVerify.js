// pages/userVerify/userVerify.js
const app = getApp()
Page({
  /**
   * 页面的初始数据
   */
  data: {
    call: '',
    waitsms: true,
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (e) {
    this.setData({
      call: e.call
    })
    this.test()
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady: function () {

  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function () {

  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide: function () {

  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload: function () {

  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh: function () {

  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom: function () {

  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage: function () {

  },

  setCall(e) {
    var code = e.detail.value.input;
    var parttern = /^\d{6}$/;
    if (parttern.test(code)) {
      wx.request({
        url: 'https://maneu.online/login/',
        method: "GET",
        data: {
          "call": this.data.call,
          "code": e.detail.value.input,
        },
        success(res) {
          if (res.data.status == true) {
            wx.setStorage({
              key: "ssk",
              data: res.data.content,
              success() {
                wx.switchTab({
                  url: '../userPage/userPage',
                })
              },
            })
          } else {
            app.fail_Remind('登录失败，请在次尝试')
          }
        },
        fail: (res) => {
          app.fail_Remind('网络异常，请在次尝试')
        }
      })
    } else {
      app.fail_Remind('请输入正确的验证码')
    }
  },

  test() {
    this.setData({
      waitsms: false
    })
    setTimeout(() => {
      this.setData({
        waitsms: true
      })
    }, 60000)
  },

  getVerifyCode(e) {
    wx.request({
      url: 'https://maneu.online/sendsms/',
      method: 'GET',
      data: {
        'code': this.data.call,
      },
      success: (res) => {
        console.log(res)
        if (res.data.status == true) {
          this.test()
        } else {
          app.fail_Remind('获取验证码失败，请在次尝试')
        }
      },
      fail: (res) => {
        app.fail_Remind('网络异常，请在次尝试')
      }
    })
  },
  formReset(e) {
    wx.switchTab({
      url: '../userPage/userPage',
    })
  }
})