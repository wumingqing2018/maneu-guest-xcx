const app = getApp()
Page({

    /**
     * 页面的初始数据
     */
    data: {},

    /**
     * 生命周期函数--监听页面加载
     */
    onLoad: function () {
        wx.removeStorage({
            key: 'ssk',
        })
    },

    /**
     * 生命周期函数--监听页面初次渲染完成
     */
    onReady: function () {

    },

    /**
     * 生命周期函数--监听页面显示
     */
    onShow: function () {

    },

    /**
     * 生命周期函数--监听页面隐藏
     */
    onHide: function () {

    },

    /**
     * 生命周期函数--监听页面卸载
     */
    onUnload: function () {

    },

    /**
     * 页面相关事件处理函数--监听用户下拉动作
     */
    onPullDownRefresh: function () {

    },

    /**
     * 页面上拉触底事件的处理函数
     */
    onReachBottom: function () {

    },

    /**
     * 用户点击右上角分享
     */
    onShareAppMessage: function () {

    },

    getVerifyCode(e) {
        var code = e.detail.value.input
        var parttern = /^1[3-9]\d{9}$/;
        if (parttern.test(code)) {
            wx.request({
                url: 'https://maneu.online/sendsms/',
                method: 'GET',
                data: {
                    'code': code,
                },
                success: (res) => {
                    if (res.data.status == true) {
                        wx.navigateTo({
                            url: '../userVerify/userVerify?call=' + code,
                        })
                    } else {
                        app.fail_Remind('获取验证码失败，请在次尝试')
                    }
                },
                fail: (res) => {
                    app.fail_Remind('网络异常，请在次尝试')
                }
            })
        } else {
            app.fail_Remind('请输入正确的手机号')
        }
    },

    formReset(e) {
        wx.switchTab({
            url: '../userPage/userPage',
        })
    }
})