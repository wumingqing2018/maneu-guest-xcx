// pages/userPage/userPage.js
// pages/userPage/userPage.js

/* ==================== 常量 ==================== */
const API = {
  guestDetail: 'https://maneu.online/apis/auth/guest_detail/'
};

const ROUTES = {
  user: '/pages/user/user',
  userLogin: '/pages/userLogin/userLogin'
};

const STORAGE_KEYS = {
  access: 'access_token',
  refresh: 'refresh_token'
};

const REQUEST_TIMEOUT = 15000;

/* ==================== 工具函数 ==================== */
function getAccessToken() {
  return wx.getStorageSync(STORAGE_KEYS.access) || '';
}

function clearAuth() {
  wx.removeStorageSync(STORAGE_KEYS.access);
  wx.removeStorageSync(STORAGE_KEYS.refresh);
}

/** 2026-01-01T12:30:00 → 2026-01-01 12:30 */
function formatTime(str) {
  if (!str) return '--';
  return String(str).replace('T', ' ').slice(0, 16);
}

/** 13800138000 → 138****8000 */
function maskPhone(phone) {
  if (!phone) return '--';
  const s = String(phone);
  if (s.length !== 11) return s;
  return `${s.slice(0, 3)}****${s.slice(7)}`;
}

/** 长字符串截断：abc123def456 → abc123def456…（超过 n 位才截） */
function truncate(str, n) {
  if (!str) return '--';
  const s = String(str);
  return s.length > n ? s.slice(0, n) + '…' : s;
}

/** status 字段映射；未知值返回 '--' */
function displayStatus(status) {
  const map = {
      '1': '正常',
      '0': '已禁用',
      '2': '待激活'
  };
  return map[String(status)] || '--';
}

/* ==================== 页面 ==================== */
Page({
  data: {
      loading: true,
      loadError: false,
      user: null
  },

  onLoad() {
      this.fetchDetail();
  },

  onPullDownRefresh() {
      this.fetchDetail(() => wx.stopPullDownRefresh());
  },

  /* ==================== 拉取详情 ==================== */
  fetchDetail(done) {
      const token = getAccessToken();
      if (!token) {
          wx.redirectTo({url: ROUTES.userLogin});
          return;
      }

      this.setData({loading: true, loadError: false});

      wx.request({
          url: API.guestDetail,
          method: 'POST',
          header: {
              'content-type': 'application/json',
              'Authorization': `Bearer ${token}`
          },
          data: {},
          timeout: REQUEST_TIMEOUT,
          success: (res) => {
              /* 401：token 失效 → 清缓存 + 跳登录 */
              if (res.statusCode === 401) {
                  clearAuth();
                  wx.redirectTo({url: ROUTES.userLogin});
                  return;
              }

              const body = res.data || {};
              if (!body.status || !body.content) {
                  this.setData({loading: false, loadError: true});
                  wx.showToast({title: body.message || '加载失败', icon: 'none'});
                  return;
              }

              const c = body.content;
              this.setData({
                  loading: false,
                  user: {
                      id:        truncate(c.id, 12),
                      phone:     maskPhone(c.phone),
                      name:      c.name || '未设置',
                      status:    displayStatus(c.status),
                      statusRaw: String(c.status || ''),
                      boundText: c.open_id ? '已绑定' : '未绑定',
                      isBound:   !!c.open_id,
                      remark:    c.remark || '--',
                      time:      formatTime(c.time)
                  }
              });
          },
          fail: () => {
              this.setData({loading: false, loadError: true});
              wx.showToast({title: '网络异常，请重试', icon: 'none'});
          },
          complete: () => {
              done && done();
          }
      });
  },

  onRetry() {
      this.fetchDetail();
  },

  /* ==================== 退出登录 ==================== */
  handleLogout() {
    wx.showModal({
      title: '确认退出',
      content: '退出后需要重新登录，确定要退出吗？',
      confirmText: '退出',
      confirmColor: '#FF3B30',
      cancelText: '取消',
      success: (res) => {
        if (!res.confirm) return;

        /* 1. 通知后端注销（失败不阻塞本地清理） */
        const accessToken = getAccessToken();
        if (accessToken) {
          wx.request({
            url: API.removeUrl,
            method: 'POST',
            header: {
              'content-type': 'application/json'
            },
            data: {
              access_token: accessToken
            },
            timeout: REQUEST_TIMEOUT,
            fail: () => {}
          });
        }

        /* 2. 本地清理（统一入口，openid 保留） */
        clearAuth();

        /* 3. 重置为未登录状态 */
        this.setData({
          islogin: false,
          call: ''
        });

        /* 4. 返回首页；非 tabBar 页时回退到 reLaunch */
        wx.switchTab({
          url: ROUTES.index,
          fail: () => {
            wx.reLaunch({
              url: ROUTES.index
            });
          }
        });
      }
    });
  },

  /* ==================== 返回 ==================== */
  goBack() {
      const pages = getCurrentPages();
      if (pages.length > 1) {
          wx.navigateBack();
      } else {
          wx.reLaunch({url: ROUTES.user});
      }
  }
});