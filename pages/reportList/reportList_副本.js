//首先引入wxcharts.js插件
var wxCharts = require("./wxchart");
//定义记录初始屏幕宽度比例，便于初始化
var windowW = 0;
// pages/reportList/reportList.js
var app = getApp()

Page({
  /**
   * 页面的初始数据
   */
  data: {
    tabsId: 0, //默认选型为装备
    tabList: [{
      title: "裸眼视力趋势",
      index: "0",
    }, {
      title: "眼轴趋势",
      index: "1",
    }, {
      title: "球镜趋势",
      index: "2",
    }, {
      title: "柱镜趋势",
      index: "3",
    }],

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
    // 屏幕宽度
    this.setData({
      imageWidth: wx.getSystemInfoSync().windowWidth
    });
    console.log(this.data.imageWidth);

    //计算屏幕宽度比列
    windowW = this.data.imageWidth / 375;
    console.log(windowW);

    this.get_list()
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
    // 屏幕宽度
    this.setData({
      imageWidth: wx.getSystemInfoSync().windowWidth
    });
    console.log(this.data.imageWidth);

    //计算屏幕宽度比列
    windowW = this.data.imageWidth / 375;
    console.log(windowW);

    this.get_list()
  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom() {},

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {},

  get_list() {
    let that = this
    let token = wx.getStorageSync('token')
    if (token) {
      wx.request({
        url: 'https://maneu.online/get_list/',
        method: 'GET',
        data: {
          'token': token,
          'text': "100002",
        },
        success: (res) => {
          if (res.data.status) {
            var content = res.data.content
            var card = that.data
            if (content.length != 0) {
              for (var i in content) {
                card.id.push(content[i].id)
                card.time.push(content[i].time)
                var report = JSON.parse(content[i].content)
                card.AL.push(24.00)
                card.OD_AL.push(report.OD.AL)
                card.OS_AL.push(report.OS.AL)
                card.VA.push(1.00)
                card.OD_VA.push(report.OD.VA)
                card.OS_VA.push(report.OS.VA)
                card.SPH.push(0.00)
                card.OD_SPH.push(report.OD.SPH)
                card.OS_SPH.push(report.OS.SPH)
                card.CYL.push(0.00)
                card.OD_CYL.push(report.OD.CYL)
                card.OS_CYL.push(report.OS.CYL)
              }

              that.setData({
                length: i,
                id: card.id,
                time: card.time,
                AL: card.AL,
                OD_AL: card.OD_AL,
                OS_AL: card.OS_AL,
                VA: card.VA,
                OD_VA: card.OD_VA,
                OS_VA: card.OS_VA,
                SPH: card.SPH,
                OD_SPH: card.OD_SPH,
                OS_SPH: card.OS_SPH,
                CYL: card.CYL,
                OD_CYL: card.OD_CYL,
                OS_CYL: card.OS_CYL,
              });

              that.visual_AX();
              that.visual_VA();
              that.visual_SPH();
              that.visual_CYL();
            }
            wx.setStorageSync('token', res.data.token)
          } else {
            wx.removeStorageSync('token')
            app.fail_alter('请先登录')
          }
        },
        fail(res) {
          app.fail_Remind("请求发送短信失败，请确认发送短信次数是否过多")
        }
      })
    } else {
      app.fail_alter("请先登录")
    }
  },

  visual_AX() {
    new wxCharts({
      animation: true,
      background: '#f5f5f5',
      canvasId: 'canvas_AX',
      type: 'line',
      categories: this.data.time,

      series: [{
        name: '右眼OD',
        data: this.data.OD_AL,
      }, {
        name: '左眼OS',
        data: this.data.OS_AL,
      }, {
        name: '标准值',
        data: this.data.AL,
      }],
      xAxis: {
        disableGrid: true
      },
      yAxis: {
        format: function (val) {
          return val.toFixed(2);
        },
        min: 0
      },
      width: (375 * windowW),
      height: (200 * windowW),
      dataLabel: false,
      dataPointShape: true,
      extra: {
        lineStyle: 'curve'
      }
    });
  },

  visual_VA() {
    new wxCharts({
      animation: true,
      background: '#f5f5f5',
      canvasId: 'canvas_VA',
      type: 'line',
      categories: this.data.time,
      series: [{
        name: '右眼OD',
        data: this.data.OD_VA,
      }, {
        name: '左眼OS',
        data: this.data.OS_VA,
      }, {
        name: '标准值',
        data: this.data.VA,
      }],
      xAxis: {
        disableGrid: true
      },
      yAxis: {},
      width: (375 * windowW),
      height: (200 * windowW),
      dataLabel: false,
      dataPointShape: true,
      extra: {
        lineStyle: 'curve'
      }
    });
  },

  visual_SPH() {
    new wxCharts({
      animation: true,
      background: '#f5f5f5',
      canvasId: 'canvas_SPH',
      type: 'line',
      categories: this.data.time,

      series: [{
        name: '右眼OD',
        data: this.data.OD_SPH,
      }, {
        name: '左眼OS',
        data: this.data.OS_SPH,
      }, {
        name: '标准值',
        data: this.data.SPH,
      }],
      xAxis: {
        disableGrid: true
      },
      yAxis: {},
      width: (375 * windowW),
      height: (200 * windowW),
      dataLabel: true,
      dataPointShape: true,
      extra: {
        lineStyle: 'curve'
      }
    });
  },

  visual_CYL() {
    new wxCharts({
      animation: true,
      background: '#f5f5f5',
      canvasId: 'canvas_CYL',
      type: 'line',
      categories: this.data.time,

      series: [{
        name: '右眼OD',
        data: this.data.OD_CYL,
      }, {
        name: '左眼OS',
        data: this.data.OS_CYL,
      }, {
        name: '标准值',
        data: this.data.CYL,
      }],
      xAxis: {
        disableGrid: true
      },
      yAxis: {
        format: function (val) {
          return val.toFixed(2);
        },
        min: 0
      },
      width: (375 * windowW),
      height: (200 * windowW),
      dataLabel: false,
      dataPointShape: true,
      extra: {
        lineStyle: 'curve'
      }
    });
  },

  get_detail(e) {
    var code = e.currentTarget.dataset.bar_code
    wx.navigateTo({
      url: '../report/report?code=' + code
    })
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
})