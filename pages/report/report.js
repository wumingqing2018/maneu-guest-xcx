var app = getApp()
Page({
  /**
   * 页面的初始数据
   */
  data: {
    admin: {},
    guest: {},

    pd: "",
    phone: "",
    plan: "",
    remark: "",
    time: '',

    od_ad: "",
    od_add: "",
    od_ak: "",
    od_al: "",
    od_ax: "",
    od_bc: "",
    od_cct: "",
    od_cyl: "",
    od_fr: "",
    od_lt: "",
    od_pr: "",
    od_sph: "",
    od_va: "",
    od_vt: "",

    os_ad: "",
    os_add: "",
    os_ak: "",
    os_al: "",
    os_ax: "",
    os_bc: "",
    os_cct: "",
    os_cyl: "",
    os_fr: "",
    os_lt: "",
    os_pr: "",
    os_sph: "",
    os_va: "",
    os_vt: "",
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    if (options.code) {
      this.get_report_content(options.code)
    }
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
  onPullDownRefresh() {},

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom() {},

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {},

  get_report_content(code) {
    let token = wx.getStorageSync('token')
    console.log(token)
    wx.request({
      url: 'https://maneu.online/get_detail/',
      method: 'GET',
      data: {
        'token': token,
        'text': '100003',
        'code': code,
      },
      success: (res) => {
        console.log(res.data)
        if (res.data.status) {
          this.setData({
            pd: res.data.content.pd,
            phone: res.data.content.phone,
            plan: res.data.content.plan,
            remark: res.data.content.remark,
            time: res.data.content.time,

            od_ad: res.data.content.od_ad,
            od_add: res.data.content.od_add,
            od_ak: res.data.content.od_ak,
            od_al: res.data.content.od_al,
            od_ax: res.data.content.od_ax,
            od_bc: res.data.content.od_bc,
            od_cct: res.data.content.od_cct,
            od_cyl: res.data.content.od_cyl,
            od_fr: res.data.content.od_fr,
            od_lt: res.data.content.od_lt,
            od_pr: res.data.content.od_pr,
            od_sph: res.data.content.od_sph,
            od_va: res.data.content.od_va,
            od_vt: res.data.content.od_vt,

            os_ad: res.data.content.os_ad,
            os_add: res.data.content.os_add,
            os_ak: res.data.content.os_ak,
            os_al: res.data.content.os_al,
            os_ax: res.data.content.os_ax,
            os_bc: res.data.content.os_bc,
            os_cct: res.data.content.os_cct,
            os_cyl: res.data.content.os_cyl,
            os_fr: res.data.content.os_fr,
            os_lt: res.data.content.os_lt,
            os_pr: res.data.content.os_pr,
            os_sph: res.data.content.os_sph,
            os_va: res.data.content.os_va,
            os_vt: res.data.content.os_vt,
          })
          wx.setStorageSync('token', res.data.token)
          if (res.data.content.admin_id) {
            this.get_admin_content(res.data.content.admin_id)
          }
        } else {
          wx.removeStorageSync('token')
          app.fail_alter('请重新登录')
        }
      }
    })
  },

  get_admin_content(code) {
    let token = wx.getStorageSync('token')
    wx.request({
      url: 'https://maneu.online/get_detail/',
      method: 'GET',
      data: {
        'token': token,
        'text': '100005',
        'code': code,
      },
      success: (res) => {
        this.setData({
          admin: res.data.content
        })
        wx.setStorageSync('token', res.data.token)
        console.log(wx.getStorageSync('token'))
      }
    })
  },
})