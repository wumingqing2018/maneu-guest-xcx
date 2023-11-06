// pages/orderDetail/orderDetail.js
Page({
  /**
   * 页面的初始数据
   */
  data: {
    "OD_ADD": "",
    "OD_AX": "",
    "OD_BCVA": "",
    "OD_CYL": "",
    "OD_FR": "",
    "OD_PR": "",
    "OD_SPH": "",
    "OD_VA": "",
    "OS_ADD": "",
    "OS_AX": "",
    "OS_BCVA": "",
    "OS_CYL": "",
    "OS_FR": "",
    "OS_PR": "",
    "OS_SPH": "",
    "OS_VA": "",
    "PD": "",
    "function": "",
    "remark": "",
    "store_remark": "",
    "store_content": [],
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    wx.request({
      url: 'https://maneu.online/getOrderDetail/',
      method: 'GET',
      data: {
        'code': options.code
      },
      success: (res) => {
        this.setData({
          OD_ADD: res.data[2].OD_ADD,
          OD_SPH: res.data[2].OD_SPH,
          OD_AX: res.data[2].OD_AX,
          OD_BCVA: res.data[2].OD_BCVA,
          OD_CYL: res.data[2].OD_CYL,
          OD_FR: res.data[2].OD_FR,
          OD_PR: res.data[2].OD_PR,
          OD_SPH: res.data[2].OD_SPH,
          OD_VA: res.data[2].OD_VA,
          OS_ADD: res.data[2].OS_ADD,
          OS_SPH: res.data[2].OS_SPH,
          OS_AX: res.data[2].OS_AX,
          OS_BCVA: res.data[2].OS_BCVA,
          OS_CYL: res.data[2].OS_CYL,
          OS_FR: res.data[2].OS_FR,
          OS_PR: res.data[2].OS_PR,
          OS_SPH: res.data[2].OS_SPH,
          OS_VA: res.data[2].OS_VA,
          PD: res.data[2].PD,
          function: res.data[2].function,
          remark: res.data[2].remark,
          store_remark: res.data[0],
          store_content: res.data[1],
        })
      },
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