// pages/reportDetail/reportDetail.js

Page({
  /**
   * 页面的初始数据
   */
  data: {
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    wx.request({
      url: 'https://maneu.online/getReportDetail/',
      method: 'GET',
      data: { 'code': options.code },
      success: (res) => {
        this.setData({
          OD_LT: res.data.OD_LT,
          OD_AD: res.data.OD_AD,
          OD_ADD: res.data.OD_ADD,
          OD_AK: res.data.OD_AK,
          OD_AL: res.data.OD_AL,
          OD_AX: res.data.OD_AX,
          OD_BCVA: res.data.OD_BCVA,
          OD_CCT: res.data.OD_CCT,
          OD_CYL: res.data.OD_CYL,
          OD_LT: res.data.OD_LT,
          OD_SPH: res.data.OD_SPH,
          OD_VA: res.data.OD_VA,
          OD_VT: res.data.OD_VT,
          OS_AD: res.data.OS_AD,
          OS_ADD: res.data.OS_ADD,
          OS_AK: res.data.OS_AK,
          OS_AL: res.data.OS_AL,
          OS_AX: res.data.OS_AX,
          OS_BCVA: res.data.OS_BCVA,
          OS_CCT: res.data.OS_CCT,
          OS_CYL: res.data.OS_CYL,
          OS_LT: res.data.OS_LT,
          OS_SPH: res.data.OS_SPH,
          OS_VA: res.data.OS_VA,
          OS_VT: res.data.OS_VT,
          remark: res.data.remark
        })
      }
    })
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

  }
})