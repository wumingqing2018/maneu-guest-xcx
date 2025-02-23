// index.js
Page({
  data: {
    imageLink: []
  },

  // 事件处理函数
  onLoad() {
    this.getIndexList();
  },

  getIndexList() {
    var that = this
    wx.request({
      url: 'https://maneu.online/get_index/',
      method: 'GET',
      success(e) {
        that.setData({
          imageLink: e.data.content,
        })
      },
    })
  },

  getReportList() {
    wx.navigateTo({
      url: '../reportList/reportList'
    });
  },

  getOrderList() {
    wx.navigateTo({
      url: '../orderList/orderList'
    });
  },

  getDetail(e) {
    var link = e.currentTarget.dataset.hi
    wx.navigateTo({
      url: '../indexList/indexList?link=' + link
    })
  }
})