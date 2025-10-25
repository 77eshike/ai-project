// pages/api/auth/clear-cookies.js
export default function handler(req, res) {
  // 设置过去时间的过期日期来清理Cookie
  const clearCookies = [
    'next-auth.session-token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=.191413.ai',
    'next-auth.csrf-token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=.191413.ai',
    '__Secure-next-auth.session-token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=.191413.ai; secure',
    '__Secure-next-auth.csrf-token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=.191413.ai; secure',
    '__Host-next-auth.csrf-token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=.191413.ai; secure',
    // 清理旧域名的Cookie
    'next-auth.session-token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=.43.228.124.126',
    'next-auth.csrf-token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=.43.228.124.126'
  ];

  // 设置清理头
  clearCookies.forEach(cookie => {
    res.setHeader('Set-Cookie', cookie);
  });

  res.status(200).json({
    success: true,
    message: 'Cookie已清理，请重新登录',
    clearedCookies: clearCookies.length
  });
}