//app.js
App({
  /**
   * 当小程序初始化完成时，会触发 onLaunch（全局只触发一次）
   * 备注：这里统一开启分享能力，允许分享到好友/群（shareAppMessage）和朋友圈（shareTimeline）
   */
  onLaunch: function () {
    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline']
    })
  },

  /**
   * 全局分享内容
   * 备注：App 级 onShareAppMessage 仅作为兜底；页面内若定义了自己的 onShareAppMessage，以页面为准
   */
  onShareAppMessage() {
    return {
      title: '徕可视光',
      path: '/pages/index/index',
    }
  },

  /**
   * 当小程序启动，或从后台进入前台显示，会触发 onShow
   * 备注：options 可拿到场景值 scene、query 参数、shareTicket 等，可用于来源追踪/分享回调
   */
  onShow: function (options) {

  },

  /**
   * 当小程序从前台进入后台，会触发 onHide
   * 备注：可在此暂停定时器、音视频、轮询等，避免后台无效消耗
   */
  onHide: function () {

  },

  /**
   * 当小程序发生脚本错误，或者 api 调用失败时，会触发 onError 并带上错误信息
   * 备注：msg 为错误字符串，可在此上报日志/监控；注意它捕获不到 Promise 未处理的 rejection
   */
  onError: function (msg) {

  },
})