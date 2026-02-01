//首先引入wxcharts.js插件
var wxCharts = require("./wxchart");
//定义记录初始屏幕宽度比例，便于初始化
var windowW = 0;
// pages/reportList/reportList.js
var app = getApp()

Page({
  data: {
    /**
     * 页面的初始数据
     */
    id: '',
    name: '',
    content: [],
    glassList: {},
    frameList: {},

    //默认选型为装备
    tabsId: 0,
    tabList: [{
      title: "镜架统计",
      index: "0",
    }, {
      title: "镜片统计",
      index: "1",
    }],
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
    // 屏幕宽度
    this.setData({
      imageWidth: wx.getSystemInfoSync().windowWidth
    });
    console.log(this.data.imageWidth);

    //计算屏幕宽度比列
    windowW = this.data.imageWidth / 375;
    console.log(windowW);

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
    if (token) {
      wx.request({
        url: 'https://maneu.online/get_list/',
        method: 'GET',
        data: {
          'token': token,
          'text': "100001",
        },
        success: (res) => {
          if (res.data.status) {
            var content = {}
            content = that.count_funtion(res.data.content)
            that.setData({
              content: res.data.content,
              glassList: content.glassList,
              frameList: content.frameList,
            });
            if (content.frameList.length != 0) {
              that.visual_glass();
            }
            if (content.glassList.length != 0) {
              that.visual_frame();
            }
            wx.setStorageSync('token', res.data.token)
          } else {
            console.log(res.data)
          }
        },
        fail(res) {
          app.fail_remind("网络问题，请下拉刷新")
        }
      })
    } else {
      app.fail_alter("请先登录")
    }
  },

  count_funtion(data) {
    // 创建一个对象用于统计
    var content = []
    var result = {
      glassList: {},
      frameList: {}
    };

    // 遍历数据
    for (var b in data) {
      content = content.concat(JSON.parse(data[b].content))
    }
    content.forEach(item => {
      // 检查是否满足条件：arg10 === "镜片"
      if (item.arg10 === "镜片") {
        // 获取 arg11 的值
        const key = item.arg11;
        // 如果 key 已经存在于 glassList 中，计数加 1，否则初始化为 1
        if (result.glassList[key]) {
          result.glassList[key]++;
        } else {
          result.glassList[key] = 1;
        }
      }
      if (item.arg10 === "镜架") {
        // 获取 arg11 的值
        const key = item.arg11;
        // 如果 key 已经存在于 glassList 中，计数加 1，否则初始化为 1
        if (result.frameList[key]) {
          result.frameList[key]++;
        } else {
          result.frameList[key] = 1;
        }
      }
    });

    // 将统计结果转换为 [{"name": name, "data": count}] 格式
    result.glassList = Object.keys(result.glassList).map((name) => ({
      name: name,
      data: result.glassList[name]
    }));
    result.frameList = Object.keys(result.frameList).map((name) => ({
      name: name,
      data: result.frameList[name]
    }));

    // 输出结果
    return result;
  },

  visual_frame() {
    new wxCharts({
      animation: true,
      background: '#f5f5f5',
      canvasId: 'canvas_frame',
      type: 'pie',
      series: this.data.frameList,
      width: (375 * windowW),
      height: (200 * windowW),
      dataLabel: false,
      dataPointShape: true,
      extra: {
        lineStyle: 'curve'
      }
    });
  },

  visual_glass(data) {
    new wxCharts({
      animation: true,
      background: '#f5f5f5',
      canvasId: 'canvas_glass',
      type: 'pie',
      series: this.data.glassList,
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
      url: '../order/order?code=' + code
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