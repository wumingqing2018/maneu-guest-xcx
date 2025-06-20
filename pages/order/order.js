// pages/reportDetail/reportDetail.js
//定义记录初始屏幕宽度比例，便于初始化
var windowW = 0;
// pages/reportList/reportList.js
var app = getApp()
Page({
  /**
   * 页面的初始数据
   */
  data: {
    admin: {},
    store: [],
    report: {},
    name: '',
    time: '',
    phone: '',
    remark: ''
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    let code = options.code
    let token = wx.getStorageSync('token')
    if (code !=null & token!=null) {
      this.get_order_content(code,token)
    }
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
  slideOn(e) {
    // 拿到当前索引并动态改变
    this.setData({
      tabsId: e.detail.current
    })
  },

  //点击tab时触发
  tabsOn(e) {
    this.setData({
      //拿到当前索引并动态改变
      tabsId: e.currentTarget.dataset.idx
    })
  },

  get_order_content(code,token){
    wx.request({
      url: 'https://maneu.online/get_detail/',
      method: 'GET',
      data: {
        'text': '100001',
        'token': token,
        'code': code,
      },
      success: (res) => { 
        console.log(res.data)
        this.setData({
          name: res.data.content.name,
          time: res.data.content.time,
          phone: res.data.content.phone,
          remark: res.data.content.remark,
          store: res.data.content.content,
        })
        wx.setStorageSync('token', res.data.token)
        this.get_admin_content(res.data.content.admin_id)
        this.get_report_content(res.data.content.report_id)
      }
    })
  },

  get_admin_content(code) {
    wx.request({
      url: 'https://maneu.online/get_detail/',
      method: 'GET',
      data: {
        'token': wx.getStorageSync('token'),
        'text': 100005,
        'code': code,
      },
      success: (res) => {
        console.log(res.data)
        this.setData({
          admin: res.data.content
        })
        wx.setStorageSync('token', res.data.token)
      }
    })
  },

  get_report_content(code) {
    wx.request({
      url: 'https://maneu.online/get_detail/',
      method: 'GET',
      data: {
        'token': wx.getStorageSync('token'),
        'text': '100003',
        'code': code,
      },
      success: (res) => {
        console.log(res.data)
        this.setData({
          report: res.data.content.content
        })
        wx.setStorageSync('token', res.data.token)
      }
    })
  },
})