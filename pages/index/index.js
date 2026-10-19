// 这是index的js代码
const API = {};

Page({
  data: {
    imageLink: [{
        data: "https://maneu.online/static/img/gif2.jpg",
        index: "https://maneu.online/static/img/3.gif",
      },
      {
        data: "https://maneu.online/static/img/2mcjs.jpg",
        index: "https://maneu.online/static/img/1mcjs.jpg",
      },
      {
        data: "https://maneu.online/static/img/2yqs.jpg",
        index: "https://maneu.online/static/img/1yqs.jpg",
      },
      {
        data: "https://maneu.online/static/img/2njj.jpg",
        index: "https://maneu.online/static/img/1njj.jpg",
      },
    ]
  },

  onLoad() {},

  getDetail(e) {
    const link = e.currentTarget.dataset.hi;
    if (!link) {
      wx.showToast({
        title: '参数错误',
        icon: 'none'
      });
      return;
    }
    wx.navigateTo({
      url: `../indexList/indexList?link=${link}`
    });
  }
});