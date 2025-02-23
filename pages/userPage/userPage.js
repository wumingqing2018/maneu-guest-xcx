const app = getApp()
Page({

  /**
   * 页面的初始数据
   */
  data: {
    islogin: false,
    name: '',
    call: '',
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (e) {

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
    const that = this
    wx.getStorage({
      key: 'ssk',
      success(res) {
        that.setData({
          islogin: true,
          name: res.data.name,
          call: res.data.call
        })
      },
    })
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

  getVerifyCode1(e) {
    var code = e.detail.value.input
    var parttern = /^1[3-9]\d{9}$/;
    if (parttern.test(code)) {
      wx.request({
        url: 'https://maneu.online/sendsms/',
        method: 'GET',
        data: {
          'code': code,
        },
        success: (res) => {
          if (res.data.status == true) {
            wx.navigateTo({
              url: '../userVerify/userVerify?call=' + code,
            })
          } else {
            app.fail_Remind('获取验证码失败，请在次尝试')
          }
        },
        fail: (res) => {
          app.fail_Remind('网络异常，请在次尝试')
        }
      })
    } else {
      app.fail_Remind('请输入正确的手机号')
    }
  },

  getVerifyCode(e) {
    var code = e.detail.value.input
    var parttern = /^1[3-9]\d{9}$/;
    if (parttern.test(code)) {
      wx.setStorage({
        key: "ssk",
        data: {
          'call': code,
          'name': '测试账户',
          'id': code
        },
        success() {
          wx.switchTab({
            url: '../index/index',
          })
        },
      })
    } else {
      app.fail_Remind('请输入正确的手机号')
    }
  },

  getOrederList() {
    wx.navigateTo({
      url: '../orderList/orderList',
    })
  },

  getMaintainList() {
    wx.navigateTo({
      url: '../maintainList/maintainList',
    })
  },

  getReportList() {
    wx.navigateTo({
      url: '../reportList/reportList',
    })
  },

  getUserUpdata() {
    wx.navigateTo({
      url: '../userUpdata/userUpdata',
    })
  },

  userLogout(e) {
    wx.removeStorage({
      key: 'ssk',
      success(res) {
        wx.reLaunch({
          url: '../userPage/userPage',
        })
      }
    })
  }
})