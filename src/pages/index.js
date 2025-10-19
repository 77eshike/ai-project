import { getServerSession } from 'next-auth/next'
import { authOptions } from '../lib/auth'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { signIn } from 'next-auth/react'
import styles from '../styles/LoginPage.module.css'

export default function Home({ user }) {
  const router = useRouter()
  const [isClient, setIsClient] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [hasRedirected, setHasRedirected] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  // 使用官方推荐的模式检测客户端环境
  useEffect(() => {
    setIsClient(true)
  }, [])

  // 检测设备类型 - 只在客户端执行
  useEffect(() => {
    if (isClient && typeof window !== 'undefined') {
      const userAgent = navigator.userAgent || navigator.vendor || window.opera;
      const isMobileDevice = 
        /android|avantgo|playbook|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od|ad)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(userAgent) ||
        /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(userAgent.substr(0, 4));
      
      setIsMobile(isMobileDevice)
    }
  }, [isClient])

  // 如果用户已登录，重定向到仪表盘 - 使用官方模式
  useEffect(() => {
    if (isClient && user && user.id && !hasRedirected) {
      if (router.pathname !== '/dashboard') {
        setHasRedirected(true)
        const timer = setTimeout(() => {
          router.replace('/dashboard')
        }, 100)
        
        return () => clearTimeout(timer)
      }
    }
  }, [user, router, isClient, hasRedirected, router.pathname])

  // 处理登录表单提交
  const handleLogin = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    const result = await signIn('credentials', {
      redirect: false,
      email,
      password,
    })

    if (result.ok) {
      // 登录成功，重定向到仪表板
      router.push('/dashboard')
    } else {
      // 登录失败，显示错误信息
      setError(result.error || '登录失败，请检查您的邮箱和密码')
      setIsLoading(false)
    }
  }

  // 使用官方模式：服务器端渲染一个简单版本，客户端渲染完整版本
  if (!isClient) {
    // 服务器端渲染的简单版本
    return (
      <div className={styles.container}>
        <Head>
          <title>AI项目平台 - 加载中</title>
          <meta name="description" content="AI项目平台" />
        </Head>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>加载中...</p>
        </div>
      </div>
    )
  }

  // 客户端渲染的完整版本
  return (
    <div className={styles.container}>
      <Head>
        <title>{`AI项目平台 - ${user ? '首页' : '登录'}`}</title>
        <meta name="description" content="AI项目平台 - 登录以访问强大的AI功能和特性" />
      </Head>
      
      <main className={styles.main}>
        {user && user.id ? (
          <div className={styles.welcomeContainer}>
            <h1>欢迎使用AI项目平台</h1>
            <div className={styles.userInfo}>
              <p>您好, {user.name || '用户'}!</p>
              <p>邮箱: {user.email}</p>
              <div className={styles.actionLinks}>
                <Link href="/chat" className={styles.linkButton}>进入聊天</Link>
                <Link href="/upload" className={styles.linkButton}>上传文件</Link>
                <Link href="/api/auth/signout" className={styles.linkButton}>退出登录</Link>
              </div>
            </div>
          </div>
        ) : (
          <div className={styles.loginContainer}>
            <div className={styles.leftPanel}>
              <div className={styles.logo}>
                <i className="fas fa-brain"></i>
                <span>AI项目平台</span>
              </div>
              
              <div className={styles.welcomeText}>
                <h1>欢迎使用AI项目</h1>
                <p>登录以访问强大的AI功能和特性，提升您的工作效率。</p>
              </div>
              
              <ul className={styles.features}>
                <li><i className="fas fa-robot"></i> 先进的AI模型</li>
                <li><i className="fas fa-chart-line"></i> 数据分析功能</li>
                <li><i className="fas fa-bolt"></i> 实时处理能力</li>
                <li><i className="fas fa-shield-alt"></i> 企业级安全保障</li>
              </ul>
              
              <div className={styles.divider}></div>
              <p>体验人工智能带来的变革力量，让复杂任务变得简单高效。</p>
            </div>
            
            <div className={styles.rightPanel}>
              <div className={styles.loginHeader}>
                <h2>登录您的账户</h2>
              </div>
              
              {error && (
                <div className={styles.errorMessage}>
                  <i className="fas fa-exclamation-circle"></i>
                  <span>{error}</span>
                </div>
              )}
              
              <form className={styles.loginForm} onSubmit={handleLogin}>
                <div className={styles.formGroup}>
                  <label htmlFor="email">电子邮箱</label>
                  <div className={styles.inputWithIcon}>
                    <i className="fas fa-envelope"></i>
                    <input 
                      type="email" 
                      id="email" 
                      name="email"
                      placeholder="请输入您的邮箱" 
                      required 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>
                
                <div className={styles.formGroup}>
                  <label htmlFor="password">密码</label>
                  <div className={styles.inputWithIcon}>
                    <i className="fas fa-lock"></i>
                    <input 
                      type="password" 
                      id="password" 
                      name="password"
                      placeholder="请输入您的密码" 
                      required 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                </div>
                
                <div className={styles.options}>
                  <div className={styles.remember}>
                    <input type="checkbox" id="remember" name="remember" />
                    <label htmlFor="remember">记住我</label>
                  </div>
                  <Link href="/auth/forgot-password" className={styles.forgotPassword}>忘记密码？</Link>
                </div>
                
                <button 
                  type="submit" 
                  className={styles.loginButton}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <i className="fas fa-spinner fa-spin"></i>
                      登录中...
                    </>
                  ) : (
                    '登录'
                  )}
                </button>
              </form>
              
              <div className={styles.dividerText}>
                <span></span>
                <p>或使用以下方式登录</p>
                <span></span>
              </div>
              
              <div className={styles.socialLogin}>
                <button 
                  type="button" 
                  className={`${styles.socialButton} ${styles.google}`}
                  onClick={() => signIn('google')}
                >
                  <i className="fab fa-google"></i>
                  Google
                </button>
                <button 
                  type="button" 
                  className={`${styles.socialButton} ${styles.facebook}`}
                  onClick={() => signIn('facebook')}
                >
                  <i className="fab fa-facebook-f"></i>
                  Facebook
                </button>
                <button 
                  type="button" 
                  className={`${styles.socialButton} ${styles.twitter}`}
                  onClick={() => signIn('twitter')}
                >
                  <i className="fab fa-twitter"></i>
                  Twitter
                </button>
              </div>
              
              <div className={styles.register}>
                <p>还没有账户？<Link href="/auth/signup">立即注册</Link></p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export async function getServerSideProps(context) {
  try {
    const session = await getServerSession(context.req, context.res, authOptions)

    // 如果用户已登录，直接重定向到仪表盘
    if (session?.user) {
      return {
        redirect: {
          destination: '/dashboard',
          permanent: false,
        },
      }
    }

    return {
      props: {
        user: null
      }
    }
  } catch (error) {
    console.error('获取会话错误:', error)
    return {
      props: {
        user: null
      }
    }
  }
}