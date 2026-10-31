// pages/index/index.js
const API = {};

Page({
  data: {
    bannerLink: {
      botton: "https://maneu.online/static/img/botton.jpeg",
      content: "https://maneu.online/static/img/gif2.jpg",
      banner: "https://maneu.online/static/img/3.gif",
    },
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

  onLoad() {},

  getDetail(e) {
    const index = e.currentTarget.dataset.index;

    if (!index) {
      wx.showToast({
        title: '参数错误',
        icon: 'none'
      });
      return;
    }
    wx.navigateTo({
      url: `../indexList/indexList?index=${index}`
    });
  }
});