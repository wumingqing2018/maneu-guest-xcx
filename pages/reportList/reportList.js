// pages/reportList/reportList.js
Page({

  /**
   * 页面的初始数据
   */
  data: {
    contentList: []
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady() {
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide() {
  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload() {
  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh() {
  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom() {
  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {
  },

  getPhoneNumber(e) {
    wx.request({
      url: 'https://maneu.online/getReportList/',
      method: 'GET',
      data: { 'code': e.detail.code },
      success: (res) => {
        console.log(res)
        this.setData({
          contentList: res.data
        })
      }
    })
  },

  getReport(e) {
    let code = e.target.dataset.bar_code
    wx.navigateTo({
      url: '../reportDetail/reportDetail?code=' + code
    })
  },
})