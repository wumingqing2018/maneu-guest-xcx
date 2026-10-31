// pages/indexDetail/indexDetail.js
Page({

  /**
   * 页面的初始数据
   */
  data: {
    imgscr: '',
    imageLink: [{
      content: "https://maneu.online/static/img/2mcjs.jpg",
      banner: "https://maneu.online/static/img/1mcjs.jpg",
      index: "0"
    },
    {
      content: "https://maneu.online/static/img/2xzy.jpg",
      banner: "https://maneu.online/static/img/1xzy.jpg",
      index: "1"
    },
    {
      content: "https://maneu.online/static/img/2njj.jpg",
      banner: "https://maneu.online/static/img/1njj.jpg",
      index: "2"
    },
    {
      content: "https://maneu.online/static/img/2yqs.jpg",
      banner: "https://maneu.online/static/img/1yqs.jpg",
      index: "3"
    },
  ]
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (e) {
    console.log(e)
    this.setData({
      imgscr: e.index
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