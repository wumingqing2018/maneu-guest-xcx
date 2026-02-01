var app = getApp()

Page({
  /**
   * 页面的初始数据
   */
  data: {
    length: '',
    report_id: '',
    content: [],
    id: [],
    time: [],
    AL: [],
    VA: [],
    CYL: [],
    SPH: [],
    OD_AL: [],
    OS_AL: [],
    OD_VA: [],
    OS_VA: [],
    OD_CYL: [],
    OS_CYL: [],
    OD_SPH: [],
    OS_SPH: [],
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad() {
    this.get_storage();
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady() {},

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {},

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide() {},

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload() {},

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh: function (e) {
    this.get_storage();
  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom() {},

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {},

  get_storage() {
    let that = this
    let token = wx.getStorageSync('token')
    console.log(token)
    if (token) {
      wx.request({
        url: 'https://maneu.online/get_list/',
        method: 'GET',
        data: {
          'token': token,
          'text': "100002",
        },
        success: (res) => {
          console.log(res.data)
          if (res.data.status) {
            wx.setStorageSync('token', res.data.token)
            that.setData({
              'content': res.data.content,
              'code': res.data.content.length
            })
          } else {
            console.log(res.data)
            wx.removeStorageSync('token')
            app.fail_alter('请先登录')
          }
        },
        fail(res) {
          app.fail_remind("网络问题，请下拉刷新")
        }
      })
    } else {
      wx.removeStorageSync('token')
      app.fail_alter('请先登录')
    }
  },


  get_detail(e) {
    var code = e.currentTarget.dataset.bar_code
    wx.navigateTo({
      url: '../report/report?code=' + code
    })
  },
})